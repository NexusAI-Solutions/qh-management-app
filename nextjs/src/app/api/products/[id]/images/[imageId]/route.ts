import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { ProductImage } from '@/app/types/product';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
): Promise<NextResponse> {
  try {
    const { id, imageId } = await params;
    const productId = parseInt(id);
    const imageIdNum = parseInt(imageId);
    const supabase = await createSSRClient();
    
    // Get the image to check if it's stored in Supabase
    const { data: imageData, error: fetchError } = await supabase
      .from('product_image')
      .select('url')
      .eq('id', imageIdNum)
      .eq('product_id', productId)
      .single();

    if (fetchError || !imageData) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Check if it's a Supabase storage URL and delete the file
    if (imageData.url.includes('supabase') && imageData.url.includes('/storage/')) {
      const urlParts = imageData.url.split('/storage/v1/object/public/images_temp/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from('images_temp').remove([filePath]);
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('product_image')
      .delete()
      .eq('id', imageIdNum)
      .eq('product_id', productId);

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
    }

    // Return all remaining images (no reordering needed)
    const { data: allImages, error: allFetchError } = await supabase
      .from('product_image')
      .select('id, url, position')
      .eq('product_id', productId)
      .order('position', { ascending: true });

    if (allFetchError) {
      return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 });
    }

    const images: ProductImage[] = allImages || [];
    return NextResponse.json({ images });

  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}