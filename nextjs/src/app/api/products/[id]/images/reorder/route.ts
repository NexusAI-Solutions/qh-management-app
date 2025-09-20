import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { ProductImage } from '@/app/types/product';

interface ReorderRequest {
  id: number;
  position: number;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const productId = parseInt(id);
    const supabase = await createSSRClient();


    const body = await request.json() as { images: ReorderRequest[] };
    
    if (!body.images || !Array.isArray(body.images)) {
      return NextResponse.json({ error: 'Invalid reorder data' }, { status: 400 });
    }

    // Validate all images belong to this product
    const imageIds = body.images.map(img => img.id);
    const { data: existingImages, error: validateError } = await supabase
      .from('product_image')
      .select('id')
      .eq('product_id', productId)
      .in('id', imageIds);

    if (validateError) {
      console.error('Validation error:', validateError);
      return NextResponse.json({ error: 'Failed to validate images' }, { status: 500 });
    }

    if (!existingImages || existingImages.length !== imageIds.length) {
      return NextResponse.json(
        { error: `Invalid image IDs provided. Expected ${existingImages?.length || 0} images, got ${imageIds.length}` },
        { status: 400 }
      );
    }

    // Update all positions
    const updates = body.images.map(({ id, position }) => 
      supabase
        .from('product_image')
        .update({ 
          position: position,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('product_id', productId)
    );

    const results = await Promise.all(updates);
    const errors = results.filter(result => result.error);
    
    if (errors.length > 0) {
      console.error('Update errors:', errors);
      return NextResponse.json({ error: 'Failed to update positions' }, { status: 500 });
    }

    // Return all images with updated positions
    const { data: allImages, error: fetchError } = await supabase
      .from('product_image')
      .select('id, url, position')
      .eq('product_id', productId)
      .order('position', { ascending: true });

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 });
    }

    const images: ProductImage[] = allImages || [];
    return NextResponse.json({ images });

  } catch (error) {
    console.error('Reorder error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}