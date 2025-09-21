import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import type {
  ProductImage,
  ProductVariant,
  ProductContent,
  ProductPrice,
  ApiProduct,
} from '@/app/types/product';

// Database query result type (what comes from Supabase)
type DbProduct = {
  id: number;
  brand: string | null;
  title: string | null;
  active_channel_ids: string[] | null; // Fixed: should be string[] not number[]
  product_image: ProductImage[];
  variant: ProductVariant[];
  content: ProductContent[];
};

type PriceMap = Record<
  string,
  Array<{ country_code: string | null; price: number | null }>
>;

type BuypriceMap = Record<string, number | null>;

/* -------------------------------------------------- */
/* Helper functions                                   */
/* -------------------------------------------------- */

async function fetchPricesAndBuyprices(
  supabase: Awaited<ReturnType<typeof createSSRClient>>,
  variantEans: string[]
): Promise<{ pricesByEan: PriceMap; buypricesByEan: BuypriceMap }> {
  if (variantEans.length === 0) {
    return { pricesByEan: {}, buypricesByEan: {} };
  }

  // Fetch prices and buyprices in parallel
  const [priceResult, buypriceResult] = await Promise.all([
    supabase
      .from('price')
      .select('ean_reference, country_code, price')
      .in('ean_reference', variantEans),
    supabase
      .from('buyprice')
      .select('ean_reference, buyprice')
      .in('ean_reference', variantEans)
  ]);

  // Process prices
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

  // Process buyprices
  let buypricesByEan: BuypriceMap = {};
  if (!buypriceResult.error && buypriceResult.data && Array.isArray(buypriceResult.data)) {
    buypricesByEan = buypriceResult.data.reduce((acc: BuypriceMap, row) => {
      if (row && typeof row === 'object' && row.ean_reference) {
        acc[row.ean_reference] = row.buyprice;
      }
      return acc;
    }, {});
  } else if (buypriceResult.error) {
    console.error('Error fetching buyprices:', buypriceResult.error);
  }

  return { pricesByEan, buypricesByEan };
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

  // Single optimized query with all necessary data
  const productResult = await supabase
    .from('product')
    .select(
      `
      id,
      brand,
      title,
      active_channel_ids,
      product_image(id, url, position),
      variant(id, title, ean, position),
      content(title, description, content, locale)
    `,
    )
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

  /* ---------- price and buyprice lookup ---------- */
  const variantEans = product.variant
    .map((v) => v.ean)
    .filter((ean): ean is string => !!ean);

  const { pricesByEan, buypricesByEan } = await fetchPricesAndBuyprices(supabase, variantEans);

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

  // Fixed: variants now match ProductVariant type with price array and buyprice number
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
    buyprice: v.ean && v.ean in buypricesByEan
      ? buypricesByEan[v.ean]
      : null,
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
    stats: {
      totalSales: 0,
      averagePrice: 0,
      buyPrice: 0,
      averageMargin: 0,
    },
    variants,
  };

  return NextResponse.json<ApiProduct>(transformedProduct);
}