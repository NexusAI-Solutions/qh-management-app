import { createClient } from '@supabase/supabase-js';
import { Database, TablesInsert } from '@/lib/supabase/types'; // Adjust path as needed
import { 
  getLightspeedAPI, 
  LightspeedProduct, 
  LightspeedBrand,
  LightspeedImage,
  LightspeedVariant,
  LightspeedAPI
} from './lightspeed';

const supabase = createClient<Database>(
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

// Type definitions using the Database types
type SupabaseProduct = TablesInsert<'product'>;
type SupabaseContent = TablesInsert<'content'>;
type SupabaseProductImage = TablesInsert<'product_image'>;
type SupabaseVariant = TablesInsert<'variant'>;
type SupabasePrice = TablesInsert<'price'>;

export interface SyncResult {
  success: boolean;
  totalProducts: number;
  totalVariants: number;
  totalImages: number;
  totalPrices: number;
  totalContent: number;
  totalExcluded: number;
  duplicateEans: string[];
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
  content: SupabaseContent;
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

  const productData: SupabaseProduct = {
    gaslooswonen_id: product.id,
    title: product.title || null,
    brand: brand?.title || null,
  };

  const contentData: SupabaseContent = {
    title: product.title || null,
    content: product.content || null,
    description: product.description || null,
    locale: 'NL',
    product_id: null, // Will be set after product is created
  };

  return {
    product: productData,
    content: contentData,
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
  let totalContent = 0;
  let totalExcluded = 0;
  const duplicateEans: string[] = [];
  const errors: string[] = [];
  let pageCount = 0;

  // Track processed items for cleanup
  const processedVariantEans: string[] = [];

  // Get all existing EANs to check for duplicates
  const { data: allExistingVariants } = await supabase
    .from('variant')
    .select('ean')
    .not('ean', 'is', null);
  
  const existingEans = new Set(
    allExistingVariants?.map(v => v.ean).filter((ean): ean is string => ean !== null) || []
  );

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

      console.log(`Page ${pageCount}: Processing ${filteredProducts.length} products (${excludedCount} excluded)`);

      // Process each product with its related data
      for (const product of filteredProducts) {
        try {
          console.log(`\nProcessing product ${product.id}: ${product.title}`);
          
          // Fetch all related data
          const { 
            product: productData, 
            content: contentData,
            images, 
            variants 
          } = await processProduct(product, lightspeed);

          // 1. Upsert product
          console.log(`  - Upserting product with data:`, productData);
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
            console.error(`Product data was:`, productData);
            continue;
          }

          if (!upsertedProduct) {
            errors.push(`Product ${product.id}: No data returned after upsert`);
            console.error(`Product ${product.id}: No data returned after upsert`);
            continue;
          }

          totalProducts++;
          const supabaseProductId = upsertedProduct.id;
          console.log(`  - Product upserted with ID: ${supabaseProductId}`);

          // 2. Delete existing NL content for this product and insert new one
          console.log(`  - Updating NL content for product ${product.id}`);
          
          // Delete only NL content for this product
          const { error: deleteContentError } = await supabase
            .from('content')
            .delete()
            .eq('product_id', supabaseProductId)
            .eq('locale', 'NL');

          if (deleteContentError) {
            console.error(`Failed to delete existing NL content:`, deleteContentError);
          }

          // Insert new NL content
          contentData.product_id = supabaseProductId;
          const { error: contentError } = await supabase
            .from('content')
            .insert(contentData);

          if (contentError) {
            errors.push(`Content for product ${product.id}: ${contentError.message}`);
            console.error(`Failed to insert content for product ${product.id}:`, contentError);
          } else {
            totalContent++;
            console.log(`  - Successfully inserted NL content`);
          }

          // 3. Delete ALL existing images for this product and insert new ones
          // Delete all existing images for this product first
          const { error: deleteImagesError } = await supabase
            .from('product_image')
            .delete()
            .eq('product_id', supabaseProductId);

          if (deleteImagesError) {
            console.error(`Failed to delete existing images:`, deleteImagesError);
          }

          if (images.length > 0) {
            console.log(`  - Found ${images.length} images for product ${product.id}`);
            
            // Insert new images
            const imageData: SupabaseProductImage[] = images.map((img, index) => ({
              product_id: supabaseProductId,
              url: img.src,
              position: img.sortOrder || index,
            }));

            console.log(`  - Inserting ${imageData.length} images`);

            const { error: imageError } = await supabase
              .from('product_image')
              .insert(imageData);

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

          // 4. Delete ALL existing variants for this product first
          console.log(`  - Deleting existing variants for product ${product.id}`);
          
          // Get existing variant EANs for price cleanup
          const { data: existingProductVariants } = await supabase
            .from('variant')
            .select('ean')
            .eq('product_id', supabaseProductId)
            .not('ean', 'is', null);

          const existingVariantEans = existingProductVariants?.map(v => v.ean).filter((ean): ean is string => ean !== null) || [];

          // Delete existing variants
          await supabase
            .from('variant')
            .delete()
            .eq('product_id', supabaseProductId);

          // Delete associated NL prices for those variants using EAN reference
          if (existingVariantEans.length > 0) {
            for (const ean of existingVariantEans) {
              await supabase
                .from('price')
                .delete()
                .eq('ean_reference', ean)
                .eq('country_code', 'NL');
            }
          }

          // 5. Process new variants and prices
          if (variants.length > 0) {
            console.log(`  - Processing ${variants.length} variants`);
            
            for (const variant of variants) {
              // Check for duplicate EAN (skip if already exists in another product)
              if (variant.ean && existingEans.has(variant.ean)) {
                const dupMsg = `Duplicate EAN ${variant.ean} found for variant ${variant.id} (product: ${product.title})`;
                console.warn(`  - ${dupMsg}`);
                duplicateEans.push(dupMsg);
                continue; // Skip this variant
              }

              // Insert variant
              const variantData: SupabaseVariant = {
                ean: variant.ean || null,
                product_id: supabaseProductId,
                title: variant.title || null,
                position: variant.sortOrder || null,
              };

              console.log(`    - Inserting variant with EAN: ${variant.ean}`);
              const { data: insertedVariant, error: variantError } = await supabase
                .from('variant')
                .insert(variantData)
                .select('id, ean')
                .single();

              if (variantError) {
                if (variantError.code === '23505' && variantError.message.includes('ean')) {
                  const dupMsg = `Duplicate EAN ${variant.ean} for variant ${variant.id}`;
                  console.warn(`    - ${dupMsg}`);
                  duplicateEans.push(dupMsg);
                  continue;
                }
                errors.push(`Variant ${variant.id}: ${variantError.message}`);
                console.error(`Failed to insert variant ${variant.id}:`, variantError);
                continue;
              }

              if (!insertedVariant) {
                errors.push(`Variant ${variant.id}: No data returned after insert`);
                continue;
              }

              totalVariants++;
              
              // Track processed EAN for cleanup
              if (insertedVariant.ean) {
                processedVariantEans.push(insertedVariant.ean);
              }
              
              // Add to existing EANs set to prevent duplicates within this sync
              if (variant.ean) {
                existingEans.add(variant.ean);
              }

              // Insert NL price for this variant using EAN reference
              if (insertedVariant.ean) {
                const priceData: SupabasePrice = {
                  ean_reference: insertedVariant.ean,
                  price: variant.priceIncl || null,
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
                  console.log(`    - Successfully inserted price: €${variant.priceIncl}`);
                }
              } else {
                console.log(`    - Skipping price insert: variant has no EAN`);
              }
            }
          } else {
            console.log(`  - No variants found for product ${product.id}`);
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
    
    const result: SyncResult = {
      success: errors.length === 0,
      totalProducts,
      totalVariants,
      totalImages,
      totalPrices,
      totalContent,
      totalExcluded,
      duplicateEans: duplicateEans.slice(0, 20), // Limit duplicates array
      errors: errors.slice(0, 20), // Limit errors array
      duration: `${duration}s`,
    };

    console.log('\n=== SYNC COMPLETED ===');
    console.log(`Duration: ${result.duration}`);
    console.log(`Products: ${totalProducts}`);
    console.log(`Variants: ${totalVariants}`);
    console.log(`Images: ${totalImages}`);
    console.log(`Prices: ${totalPrices}`);
    console.log(`Content: ${totalContent}`);
    console.log(`Excluded: ${totalExcluded}`);
    console.log(`Duplicate EANs: ${duplicateEans.length}`);
    console.log(`Errors: ${errors.length}`);
    
    return result;

  } catch (error) {
    console.error('Fatal sync error:', error);
    throw error;
  }
}