import { createClient } from '@supabase/supabase-js';
import { 
  getLightspeedAPI, 
  LightspeedProduct, 
  LightspeedBrand,
  LightspeedImage,
  LightspeedVariant,
  LightspeedAPI
} from './lightspeed';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.PRIVATE_SUPABASE_SERVICE_KEY!
);

// Configuration
const EXCLUDED_WORDS = [
  'vloerverwarming',
  'ALU-foil',
  '2ekans',
  'folie set',
  'QH Grid',
  'mat set',
  'QH-Grid',
  'Stickymat',
  'mat zonder thermostaat'
  // Add more excluded words here as needed
];

// Supabase Types
interface SupabaseProduct {
  gaslooswonen_id: number;
  title: string;
  content: string;
  description: string;
  brand?: string;
}

interface SupabaseProductImage {
  product_id: string;
  url: string;
  position: number;
}

interface SupabaseVariant {
  gaslooswonen_id: number;
  ean: string;
  product_id: string;
  title: string;
  position: number;
}

interface SupabasePrice {
  variant_id: string;
  price: number;
  country_code: string;
}

export interface SyncResult {
  success: boolean;
  totalProducts: number;
  totalVariants: number;
  totalImages: number;
  totalPrices: number;
  totalExcluded: number;
  errors: string[];
  duration: string;
}

function shouldExcludeProduct(title: string): boolean {
  const lowerTitle = title.toLowerCase();
  return EXCLUDED_WORDS.some(word => lowerTitle.includes(word.toLowerCase()));
}

async function processProduct(
  product: LightspeedProduct,
  lightspeed: LightspeedAPI
): Promise<{
  product: SupabaseProduct;
  brand: LightspeedBrand | null;
  images: LightspeedImage[];
  variants: LightspeedVariant[];
}> {
  console.log(`  Fetching related data for product ${product.id}...`);
  
  // Fetch brand if exists
  let brand: LightspeedBrand | null = null;
  if (product.brand?.resource?.link) {
    console.log(`  - Fetching brand from: ${product.brand.resource.link}`);
    brand = await lightspeed.getBrandByUrl(product.brand.resource.link);
    if (brand) {
      console.log(`  - Found brand: ${brand.title}`);
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Fetch images if exist
  let images: LightspeedImage[] = [];
  if (product.images?.resource?.link) {
    console.log(`  - Fetching images from: ${product.images.resource.link}`);
    images = await lightspeed.getProductImagesByUrl(product.images.resource.link);
    console.log(`  - Found ${images.length} images`);
    await new Promise(resolve => setTimeout(resolve, 100));
  } else if (product.images?.resource?.url) {
    // Sometimes the URL is in 'url' instead of 'link'
    const imageUrl = `${product.images.resource.url}.json`;
    console.log(`  - Fetching images from: ${imageUrl}`);
    images = await lightspeed.getProductImagesByUrl(imageUrl);
    console.log(`  - Found ${images.length} images`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Fetch variants if exist
  let variants: LightspeedVariant[] = [];
  if (product.variants?.resource?.link) {
    console.log(`  - Fetching variants from: ${product.variants.resource.link}`);
    variants = await lightspeed.getProductVariantsByUrl(product.variants.resource.link);
    console.log(`  - Found ${variants.length} variants`);
    await new Promise(resolve => setTimeout(resolve, 100));
  } else if (product.variants?.resource?.url) {
    // Sometimes the URL is in 'url' instead of 'link'
    const variantUrl = `${product.variants.resource.url}.json`;
    console.log(`  - Fetching variants from: ${variantUrl}`);
    variants = await lightspeed.getProductVariantsByUrl(variantUrl);
    console.log(`  - Found ${variants.length} variants`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return {
    product: {
      gaslooswonen_id: product.id,
      title: product.title || '',
      content: product.content || '',
      description: product.description || '',
      brand: brand?.title,
    },
    brand,
    images,
    variants,
  };
}

export async function syncProducts(): Promise<SyncResult> {
  console.log('Starting comprehensive product sync...');
  const startTime = Date.now();
  
  // Initialize Lightspeed API with environment variables
  const lightspeed = getLightspeedAPI({
    apiKey: process.env.LIGHTSPEED_API_KEY!,
    apiSecret: process.env.LIGHTSPEED_API_SECRET!,
    language: process.env.LIGHTSPEED_LANGUAGE || 'nl'
  });
  
  let totalProducts = 0;
  let totalVariants = 0;
  let totalImages = 0;
  let totalPrices = 0;
  let totalExcluded = 0;
  const errors: string[] = [];
  let pageCount = 0;

  try {
    // Use async iterator for clean pagination
    for await (const products of lightspeed.iterateProducts()) {
      pageCount++;
      console.log(`\nProcessing page ${pageCount} with ${products.length} products...`);
      
      // Filter products
      const filteredProducts = products.filter(product => 
        !shouldExcludeProduct(product.title || '')
      );

      const excludedCount = products.length - filteredProducts.length;
      totalExcluded += excludedCount;

      if (filteredProducts.length === 0) {
        console.log(`Page ${pageCount}: All products excluded`);
        continue;
      }

      // Process each product with its related data
      for (const product of filteredProducts) {
        try {
          console.log(`Processing product ${product.id}: ${product.title}`);
          
          // Fetch all related data
          const { 
            product: productData, 
            images, 
            variants 
          } = await processProduct(product, lightspeed);

          // 1. Upsert product
          const { data: upsertedProduct, error: productError } = await supabase
            .from('product')
            .upsert(productData, {
              onConflict: 'gaslooswonen_id',
              ignoreDuplicates: false,
            })
            .select('id')
            .single();

          if (productError) {
            errors.push(`Product ${product.id}: ${productError.message}`);
            console.error(`Failed to upsert product ${product.id}:`, productError);
            continue;
          }

          if (!upsertedProduct) {
            errors.push(`Product ${product.id}: No data returned after upsert`);
            continue;
          }

          totalProducts++;
          const supabaseProductId = upsertedProduct.id;

          // 2. Delete existing images and insert new ones
          if (images.length > 0) {
            console.log(`  - Found ${images.length} images for product ${product.id}`);
            
            // Delete existing images for this product
            const { error: deleteError } = await supabase
              .from('product_image')
              .delete()
              .eq('product_id', supabaseProductId);

            if (deleteError) {
              console.error(`Failed to delete existing images:`, deleteError);
            }

            // Insert new images
            const imageData: SupabaseProductImage[] = images.map((img, index) => ({
              product_id: supabaseProductId,
              url: img.src,
              position: img.sortOrder || index,
            }));

            console.log(`  - Inserting images:`, imageData.map(i => i.url));

            const { error: imageError } = await supabase
              .from('product_image')
              .insert(imageData)
              .select();

            if (imageError) {
              errors.push(`Images for product ${product.id}: ${imageError.message}`);
              console.error(`Failed to insert images for product ${product.id}:`, imageError);
            } else {
              totalImages += images.length;
              console.log(`  - Successfully inserted ${images.length} images`);
            }
          } else {
            console.log(`  - No images found for product ${product.id}`);
          }

          // 3. Process variants and prices
          if (variants.length > 0) {
            for (const variant of variants) {
              // Upsert variant
              const variantData: SupabaseVariant = {
                gaslooswonen_id: variant.id,
                ean: variant.ean || '',
                product_id: supabaseProductId,
                title: variant.title || '',
                position: variant.sortOrder || 1,
              };

              const { data: upsertedVariant, error: variantError } = await supabase
                .from('variant')
                .upsert(variantData, {
                  onConflict: 'gaslooswonen_id',
                  ignoreDuplicates: false,
                })
                .select('id')
                .single();

              if (variantError) {
                errors.push(`Variant ${variant.id}: ${variantError.message}`);
                console.error(`Failed to upsert variant ${variant.id}:`, variantError);
                continue;
              }

              if (!upsertedVariant) {
                errors.push(`Variant ${variant.id}: No data returned after upsert`);
                continue;
              }

              totalVariants++;
              const supabaseVariantId = upsertedVariant.id;

              // Delete existing price and insert new one
              await supabase
                .from('price')
                .delete()
                .eq('variant_id', supabaseVariantId);

              // Insert price (using priceIncl as the price with tax)
              const priceData: SupabasePrice = {
                variant_id: supabaseVariantId,
                price: variant.priceIncl || 0,
                country_code: 'NL',
              };

              const { error: priceError } = await supabase
                .from('price')
                .insert(priceData);

              if (priceError) {
                errors.push(`Price for variant ${variant.id}: ${priceError.message}`);
                console.error(`Failed to insert price for variant ${variant.id}:`, priceError);
              } else {
                totalPrices++;
              }
            }
          }

          // Add small delay between products to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 200));

        } catch (error) {
          const errorMsg = `Product ${product.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    const result = {
      success: errors.length === 0,
      totalProducts,
      totalVariants,
      totalImages,
      totalPrices,
      totalExcluded,
      errors: errors.slice(0, 20), // Limit errors array
      duration: `${duration}s`,
    };

    console.log('\nSync completed:', result);
    return result;

  } catch (error) {
    console.error('Fatal sync error:', error);
    throw error;
  }
}