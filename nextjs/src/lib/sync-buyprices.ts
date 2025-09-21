import { createClient } from '@supabase/supabase-js';
import { Database, TablesInsert } from '@/lib/supabase/types';
import { createPicqerAPIFromEnv, PicqerAPI } from './picqer';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.PRIVATE_SUPABASE_SERVICE_KEY!
);

// Type definitions
type SupabaseBuyprice = TablesInsert<'buyprice'>;

export interface BuypriceSyncResult {
  success: boolean;
  totalEans: number;
  successfulLookups: number;
  failedLookups: number;
  multipleResultsCount: number;
  insertedBuyprices: number;
  skippedNoPrice: number;
  skippedNoResults: number;
  errors: string[];
  duration: string;
}

/**
 * Get all unique EANs from the variant table
 */
async function getAllVariantEANs(): Promise<string[]> {
  const { data: variants, error } = await supabase
    .from('variant')
    .select('ean')
    .not('ean', 'is', null);

  if (error) {
    throw new Error(`Failed to fetch variant EANs: ${error.message}`);
  }

  // Filter out null/empty EANs and get unique values
  const uniqueEANs = [...new Set(
    variants
      .map(v => v.ean)
      .filter((ean): ean is string => !!ean && ean.trim().length > 0)
  )];

  return uniqueEANs;
}

/**
 * Clear all records from the buyprice table
 */
async function clearBuypriceTable(): Promise<void> {
  const { error } = await supabase
    .from('buyprice')
    .delete()
    .neq('id', 0); // Delete all records

  if (error) {
    throw new Error(`Failed to clear buyprice table: ${error.message}`);
  }
}

/**
 * Insert buyprices in batches
 */
async function insertBuyprices(buyprices: SupabaseBuyprice[]): Promise<number> {
  if (buyprices.length === 0) {
    return 0;
  }

  const { error } = await supabase
    .from('buyprice')
    .insert(buyprices);

  if (error) {
    throw new Error(`Failed to insert buyprices: ${error.message}`);
  }

  return buyprices.length;
}

/**
 * Process EANs in batches to avoid overwhelming the API
 */
async function processEANBatch(
  eans: string[],
  picqerAPI: PicqerAPI,
  result: BuypriceSyncResult
): Promise<SupabaseBuyprice[]> {
  const buyprices: SupabaseBuyprice[] = [];

  for (const ean of eans) {
    try {
      console.log(`Processing EAN: ${ean}`);

      const searchResult = await picqerAPI.searchProductByEAN(ean);

      if (!searchResult.product) {
        result.skippedNoResults++;
        console.log(`No results found for EAN: ${ean}`);
        continue;
      }

      if (searchResult.multipleResults) {
        result.multipleResultsCount++;
        console.log(`Multiple results for EAN ${ean}, using first result`);
      }

      const product = searchResult.product;

      // Check if fixedstockprice is available
      if (product.fixedstockprice === null || product.fixedstockprice === undefined) {
        result.skippedNoPrice++;
        console.log(`No fixed stock price for EAN: ${ean}`);
        continue;
      }

      // Create buyprice record
      const buypriceRecord: SupabaseBuyprice = {
        ean_reference: ean,
        buyprice: product.fixedstockprice
      };

      buyprices.push(buypriceRecord);
      result.successfulLookups++;

    } catch (error) {
      result.failedLookups++;
      const errorMessage = `Failed to process EAN ${ean}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.errors.push(errorMessage);
      console.error(errorMessage);
    }
  }

  return buyprices;
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
    insertedBuyprices: 0,
    skippedNoPrice: 0,
    skippedNoResults: 0,
    errors: [],
    duration: ''
  };

  try {
    console.log('Starting buyprice sync...');

    // Initialize Picqer API
    const picqerAPI = createPicqerAPIFromEnv();

    // Step 1: Clear existing buyprice table
    console.log('Clearing existing buyprice table...');
    await clearBuypriceTable();

    // Step 2: Get all EANs from variants
    console.log('Fetching all variant EANs...');
    const eans = await getAllVariantEANs();
    result.totalEans = eans.length;

    if (eans.length === 0) {
      throw new Error('No EANs found in variant table');
    }

    console.log(`Found ${eans.length} unique EANs to process`);

    // Step 3: Process EANs in batches
    const BATCH_SIZE = 50; // Process 50 EANs at a time
    const allBuyprices: SupabaseBuyprice[] = [];

    for (let i = 0; i < eans.length; i += BATCH_SIZE) {
      const batch = eans.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(eans.length / BATCH_SIZE)}`);

      const batchBuyprices = await processEANBatch(batch, picqerAPI, result);
      allBuyprices.push(...batchBuyprices);

      // Insert batch if we have records
      if (batchBuyprices.length > 0) {
        const insertedCount = await insertBuyprices(batchBuyprices);
        result.insertedBuyprices += insertedCount;
        console.log(`Inserted ${insertedCount} buyprice records for batch`);
      }
    }

    // Calculate duration
    const endTime = Date.now();
    result.duration = `${((endTime - startTime) / 1000).toFixed(2)}s`;

    // Determine overall success
    result.success = result.errors.length === 0 || result.insertedBuyprices > 0;

    console.log('Buyprice sync completed:', {
      totalEans: result.totalEans,
      successful: result.successfulLookups,
      failed: result.failedLookups,
      inserted: result.insertedBuyprices,
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