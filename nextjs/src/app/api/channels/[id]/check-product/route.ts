import { NextRequest, NextResponse } from 'next/server';
import { checkProductOnChannel } from '@/lib/utils/channel-checker';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
    }

    // Get the EAN from query parameters
    const ean = req.nextUrl.searchParams.get('ean');

    if (!ean || typeof ean !== 'string') {
      return NextResponse.json({ error: 'EAN is required and should be a string' }, { status: 400 });
    }

    // Use the shared channel checking logic
    const result = await checkProductOnChannel(parseInt(id), ean);

    if (result.error) {
      return NextResponse.json({ error: 'Error checking product on channel' }, { status: 500 });
    }

    if (!result.exists) {
      return NextResponse.json({ error: 'No product found for the given EAN' }, { status: 404 });
    }

    return NextResponse.json({
      success: `Product found on channel ${result.channelId} for the given EAN`
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching product variant:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
