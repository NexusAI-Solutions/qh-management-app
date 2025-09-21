import { NextRequest, NextResponse } from 'next/server';
import { syncBuyprices } from '@/lib/sync-buyprices';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (process.env.NODE_ENV !== 'development' && process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('Buyprice sync cron job started');
    const result = await syncBuyprices();

    // Log summary
    console.log('Buyprice sync cron job completed:', {
      success: result.success,
      totalEans: result.totalEans,
      successfulLookups: result.successfulLookups,
      failedLookups: result.failedLookups,
      insertedBuyprices: result.insertedBuyprices,
      duration: result.duration,
      errorCount: result.errors.length
    });

    // Return appropriate status code
    // 200 = full success, 207 = partial success, 500 = complete failure
    let statusCode = 200;
    if (!result.success) {
      statusCode = 500;
    } else if (result.errors.length > 0) {
      statusCode = 207; // Multi-status for partial success
    }

    return NextResponse.json(result, { status: statusCode });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Buyprice sync cron job failed:', errorMessage);

    return NextResponse.json({
      success: false,
      error: 'Buyprice sync failed',
      details: errorMessage,
      totalEans: 0,
      successfulLookups: 0,
      failedLookups: 0,
      multipleResultsCount: 0,
      insertedBuyprices: 0,
      skippedNoPrice: 0,
      skippedNoResults: 0,
      errors: [errorMessage],
      duration: '0s'
    }, { status: 500 });
  }
}