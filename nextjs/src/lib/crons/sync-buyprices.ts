import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import { createPicqerAPIFromEnv, PicqerAPI } from '../apis/picqer';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.PRIVATE_SUPABASE_SERVICE_KEY!
);


export interface BuypriceSyncResult {
  success: boolean;
  totalEans: number;
  successfulLookups: number;
  failedLookups: number;
  multipleResultsCount: number;
  updatedVariants: number;
  skippedNoPrice: number;
  skippedNoResults: number;
  errors: string[];
  duration: string;
}

/**
 * Get all variants with EANs for buyprice sync
 */
async function getAllVariantsWithEANs(): Promise<Array<{ id: number; ean: string }>> {
  const { data: variants, error } = await supabase
    .from('variant')
    .select('id, ean')
    .not('ean', 'is', null);

  if (error) {
    throw new Error(`Failed to fetch variant EANs: ${error.message}`);
  }

  // Filter out null/empty EANs
  const validVariants = variants
    .filter((v): v is { id: number; ean: string } =>
      !!v.ean && v.ean.trim().length > 0
    );

  return validVariants;
}

/**
 * Clear all buyprices from variant table (set to null)
 */
async function clearVariantBuyprices(): Promise<void> {
  const { error } = await supabase
    .from('variant')
    .update({ buyprice: null })
    .not('id', 'is', null); // Update all variants

  if (error) {
    throw new Error(`Failed to clear variant buyprices: ${error.message}`);
  }
}

/**
 * Update variant buyprices in batches
 */
async function updateVariantBuyprices(updates: Array<{ id: number; buyprice: number }>): Promise<number> {
  if (updates.length === 0) {
    return 0;
  }

  let successCount = 0;

  // Update variants individually for now (could be optimized with bulk operations)
  for (const update of updates) {
    const { error } = await supabase
      .from('variant')
      .update({ buyprice: update.buyprice })
      .eq('id', update.id);

    if (error) {
      console.error(`Failed to update variant ${update.id} buyprice:`, error.message);
    } else {
      successCount++;
    }
  }

  return successCount;
}

/**
 * Process variants in batches to avoid overwhelming the API
 */
async function processVariantBatch(
  variants: Array<{ id: number; ean: string }>,
  picqerAPI: PicqerAPI,
  result: BuypriceSyncResult
): Promise<Array<{ id: number; buyprice: number }>> {
  const variantUpdates: Array<{ id: number; buyprice: number }> = [];

  for (const variant of variants) {
    try {
      console.log(`Processing variant ${variant.id} with EAN: ${variant.ean}`);

      const searchResult = await picqerAPI.searchProductByEAN(variant.ean);

      if (!searchResult.product) {
        result.skippedNoResults++;
        console.log(`No results found for EAN: ${variant.ean}`);
        continue;
      }

      if (searchResult.multipleResults) {
        result.multipleResultsCount++;
        console.log(`Multiple results for EAN ${variant.ean}, using first result`);
      }

      const product = searchResult.product;

      // Check if fixedstockprice is available
      if (product.fixedstockprice === null || product.fixedstockprice === undefined) {
        result.skippedNoPrice++;
        console.log(`No fixed stock price for EAN: ${variant.ean}`);
        continue;
      }

      // Create variant update record
      const variantUpdate = {
        id: variant.id,
        buyprice: product.fixedstockprice
      };

      variantUpdates.push(variantUpdate);
      result.successfulLookups++;

    } catch (error) {
      result.failedLookups++;
      const errorMessage = `Failed to process EAN ${variant.ean}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.errors.push(errorMessage);
      console.error(errorMessage);
    }
  }

  return variantUpdates;
}

/**
 * Main function to sync buyprices from Picqer
 */
export async function syncBuyprices(): Promise<BuypriceSyncResult> {
  const startTime = Date.now();

  const result: BuypriceSyncResult = {
    success: false,
    totalEans: 0,
    successfulLookups: 0,
    failedLookups: 0,
    multipleResultsCount: 0,
    updatedVariants: 0,
    skippedNoPrice: 0,
    skippedNoResults: 0,
    errors: [],
    duration: ''
  };

  try {
    console.log('Starting buyprice sync...');

    // Initialize Picqer API
    const picqerAPI = createPicqerAPIFromEnv();

    // Step 1: Clear existing buyprices from variants
    console.log('Clearing existing variant buyprices...');
    await clearVariantBuyprices();

    // Step 2: Get all variants with EANs
    console.log('Fetching all variants with EANs...');
    const variants = await getAllVariantsWithEANs();
    result.totalEans = variants.length;

    if (variants.length === 0) {
      throw new Error('No variants with EANs found');
    }

    console.log(`Found ${variants.length} variants with EANs to process`);

    // Step 3: Process variants in batches
    const BATCH_SIZE = 50; // Process 50 variants at a time

    for (let i = 0; i < variants.length; i += BATCH_SIZE) {
      const batch = variants.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(variants.length / BATCH_SIZE);

      console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} variants)`);

      // Log rate limit status before processing batch
      const rateLimitStatus = picqerAPI.getRateLimitStatus();
      console.log(`Picqer API status: ${rateLimitStatus.remaining}/${rateLimitStatus.limit} requests remaining`);

      const variantUpdates = await processVariantBatch(batch, picqerAPI, result);

      // Update variants if we have updates
      if (variantUpdates.length > 0) {
        const updatedCount = await updateVariantBuyprices(variantUpdates);
        result.updatedVariants += updatedCount;
        console.log(`Updated ${updatedCount} variant buyprices for batch ${batchNumber}`);
      }

      // Log final rate limit status after batch
      const finalRateLimitStatus = picqerAPI.getRateLimitStatus();
      console.log(`Batch ${batchNumber} complete. API requests used: ${finalRateLimitStatus.requestCount - rateLimitStatus.requestCount}`);
    }

    // Calculate duration
    const endTime = Date.now();
    result.duration = `${((endTime - startTime) / 1000).toFixed(2)}s`;

    // Determine overall success
    result.success = result.errors.length === 0 || result.updatedVariants > 0;

    console.log('Buyprice sync completed:', {
      totalVariants: result.totalEans,
      successful: result.successfulLookups,
      failed: result.failedLookups,
      updated: result.updatedVariants,
      duration: result.duration
    });

    return result;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    result.errors.push(errorMessage);
    result.success = false;

    const endTime = Date.now();
    result.duration = `${((endTime - startTime) / 1000).toFixed(2)}s`;

    console.error('Buyprice sync failed:', errorMessage);
    return result;
  }
}