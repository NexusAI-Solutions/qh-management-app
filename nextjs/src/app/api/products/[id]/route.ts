import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import type {
  ProductImage,
  ProductVariant,
  ProductContent,
  ProductPrice,
  RepricerData,
  ApiProduct,
} from '@/app/types/product';

// Database query result type (what comes from Supabase)
type DbProduct = {
  id: number;
  brand: string | null;
  title: string | null;
  active_channel_ids: string[] | null;
  product_image: ProductImage[];
  variant: ProductVariant[];
  content: ProductContent[];
};

type PriceMap = Record<
  string,
  Array<{ country_code: string | null; price: number | null }>
>;

/* -------------------------------------------------- */
/* Helper functions                                   */
/* -------------------------------------------------- */

async function fetchPrices(
  supabase: Awaited<ReturnType<typeof createSSRClient>>,
  variantEans: string[]
): Promise<PriceMap> {
  if (variantEans.length === 0) {
    return {};
  }

  const priceResult = await supabase
    .from('price')
    .select('ean_reference, country_code, price')
    .in('ean_reference', variantEans);

  let pricesByEan: PriceMap = {};
  if (!priceResult.error && priceResult.data && Array.isArray(priceResult.data)) {
    pricesByEan = priceResult.data.reduce((acc: PriceMap, row) => {
      if (row && typeof row === 'object' && row.ean_reference) {
        (acc[row.ean_reference] ||= []).push({
          country_code: row.country_code,
          price: row.price
        });
      }
      return acc;
    }, {});
  } else if (priceResult.error) {
    console.error('Error fetching prices:', priceResult.error);
  }

  return pricesByEan;
}

async function fetchRepricerData(
  supabase: Awaited<ReturnType<typeof createSSRClient>>,
  variantEans: string[]
): Promise<Record<string, RepricerData>> {
  if (variantEans.length === 0) {
    return {};
  }

  const repricerResult = await supabase
    .from('repricer')
    .select('id, ean_reference, is_active, minimum_price, urls, created_at')
    .in('ean_reference', variantEans);

  let repricerByEan: Record<string, RepricerData> = {};
  if (!repricerResult.error && repricerResult.data && Array.isArray(repricerResult.data)) {
    repricerByEan = repricerResult.data.reduce((acc: Record<string, RepricerData>, row) => {
      if (row && typeof row === 'object' && row.ean_reference) {
        acc[row.ean_reference] = {
          id: row.id,
          ean_reference: row.ean_reference,
          is_active: row.is_active,
          minimum_price: row.minimum_price,
          urls: row.urls,
          created_at: row.created_at
        };
      }
      return acc;
    }, {});
  } else if (repricerResult.error) {
    console.error('Error fetching repricer data:', repricerResult.error);
  }

  return repricerByEan;
}

/* -------------------------------------------------- */
/* API route                                          */
/* -------------------------------------------------- */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiProduct | { error: string }>> {
  const { id } = await params;

  /* ---------- validation ---------- */
  if (!id) {
    return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
  }

  const numericId = Number.parseInt(id, 10);
  if (Number.isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid product ID format' }, { status: 400 });
  }

  /* ---------- Supabase queries ---------- */
  const supabase = await createSSRClient();

  // Main product query (same as original but optimized)
  const productResult = await supabase
    .from('product')
    .select(`
      id,
      brand,
      title,
      active_channel_ids,
      product_image(id, url, position),
      variant(id, title, ean, position, buyprice),
      content(title, description, content, locale)
    `)
    .eq('id', numericId)
    .single();

  /* ---------- error handling ---------- */
  if (productResult.error) {
    if (productResult.error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    console.error('Database error:', productResult.error);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }

  if (!productResult.data) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  /* ---------- raw data ---------- */
  const product = productResult.data as DbProduct;
  const productContent = product.content ?? [];

  /* ---------- parallel price and repricer lookup ---------- */
  const variantEans = product.variant
    .map((v) => v.ean)
    .filter((ean): ean is string => !!ean);

  // Run price and repricer queries in parallel for better performance
  const [pricesByEan, repricerByEan] = await Promise.all([
    fetchPrices(supabase, variantEans),
    fetchRepricerData(supabase, variantEans)
  ]);

  /* ---------- helpers ---------- */
  const nlContent = productContent.find((c) => c.locale === 'NL');
  const productTitle = product.title || nlContent?.title || 'Onbekend product';

  // Fixed: ensure active_channel_ids is always string array
  const active_channel_ids = Array.isArray(product.active_channel_ids)
    ? product.active_channel_ids
    : [];

  const mainImage =
    product.product_image.find((img) => img.position === 1)?.url ||
    product.product_image[0]?.url ||
    false;

  const images = [...product.product_image]
    .sort((a, b) => (a.position ?? 999) - (b.position ?? 999))
    .map((img) => ({ id: img.id, url: img.url, position: img.position }));

  // Process variants with parallel-fetched price and repricer data
  const variants: ProductVariant[] = product.variant.map((v) => ({
    id: v.id,
    title: v.title,
    ean: v.ean,
    position: v.position,
    price: v.ean && pricesByEan[v.ean]
      ? pricesByEan[v.ean].map((p): ProductPrice => ({
          country_code: p.country_code,
          price: p.price,
          ean_reference: v.ean
        }))
      : null,
    buyprice: v.buyprice,
    repricer: v.ean && repricerByEan[v.ean] ? repricerByEan[v.ean] : null,
  }));

  const content = productContent.map((c) => ({
    title: c.title,
    description: c.description,
    content: c.content,
    locale: c.locale,
  }));

  const description = nlContent?.description ?? '';

  /* ---------- final shape ---------- */
  const transformedProduct: ApiProduct = {
    id: product.id, // Fixed: should be number not string
    title: productTitle,
    brand: product.brand,
    description,
    content,
    mainImage,
    active_channel_ids,
    images,
    variants,
  };

  return NextResponse.json<ApiProduct>(transformedProduct);
}