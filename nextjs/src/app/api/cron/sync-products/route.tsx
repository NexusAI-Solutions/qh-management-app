import { NextRequest, NextResponse } from 'next/server';
import { syncProducts } from '@/lib/sync-products';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (process.env.NODE_ENV !== 'development' && process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await syncProducts();
    return NextResponse.json(result, { 
      status: result.success ? 200 : 207 
    });
  } catch (error) {
    console.error('Sync endpoint error:', error);
    return NextResponse.json({
      error: 'Sync failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}