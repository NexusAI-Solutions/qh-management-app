import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server'; // Adjust import path as needed

interface UpdateProductChannelsBody {
  active_channel_ids: string[];
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Validate product ID
    if (!id) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const numericId = Number.parseInt(id, 10);
    if (isNaN(numericId)) {
      return NextResponse.json(
        { error: 'Invalid product ID format' },
        { status: 400 }
      );
    }

    // Parse the request body
    const body = await request.json() as UpdateProductChannelsBody;
    const { active_channel_ids } = body;

    // Validate that active_channel_ids is provided and is an array
    if (!Array.isArray(active_channel_ids)) {
      return NextResponse.json(
        { error: 'active_channel_ids must be an array' },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = await createSSRClient();

    // Convert string IDs to numbers
    const numericChannelIds = active_channel_ids.map(id => Number(id));

    // Update product channels
    const { error: updateError } = await supabase
      .from('product')
      .update({ active_channel_ids: numericChannelIds })
      .eq('id', numericId);

    if (updateError) {
      console.error('Database error updating product channels:', updateError);
      
      // Check if product exists
      if (updateError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to update product channels' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Product channels updated successfully' 
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}