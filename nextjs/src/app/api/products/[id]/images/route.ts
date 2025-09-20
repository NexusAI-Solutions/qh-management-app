import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { ProductImage } from '@/app/types/product';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_IMAGES = 8;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const productId = parseInt(id);
    const supabase = await createSSRClient();
    
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPG, PNG and WebP are allowed' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 2MB limit' },
        { status: 400 }
      );
    }

    // Check current image count
    const { data: existingImages, error: countError } = await supabase
      .from('product_image')
      .select('id')
      .eq('product_id', productId);

    if (countError) {
      console.error('Count error:', countError);
      return NextResponse.json({ error: 'Failed to check image count' }, { status: 500 });
    }

    if (existingImages && existingImages.length >= MAX_IMAGES) {
      return NextResponse.json(
        { error: `Maximum of ${MAX_IMAGES} images allowed per product` },
        { status: 400 }
      );
    }

    // Get the highest position
    const { data: maxPositionData } = await supabase
      .from('product_image')
      .select('position')
      .eq('product_id', productId)
      .order('position', { ascending: false })
      .limit(1)
      .single();

    const nextPosition = maxPositionData ? maxPositionData.position + 1 : 0;

    // Convert File to ArrayBuffer then to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `files/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('images_temp')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: `Failed to upload file: ${uploadError.message}` }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('images_temp')
      .getPublicUrl(filePath);

    // Insert into database
    const { error: insertError } = await supabase
      .from('product_image')
      .insert({
        product_id: productId,
        url: publicUrl,
        position: nextPosition,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      // Clean up uploaded file if database insert fails
      await supabase.storage.from('images_temp').remove([filePath]);
      return NextResponse.json({ error: `Failed to save image record: ${insertError.message}` }, { status: 500 });
    }

    // Return all images for this product
    const { data: allImages, error: fetchError } = await supabase
      .from('product_image')
      .select('id, url, position')
      .eq('product_id', productId)
      .order('position', { ascending: true });

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 });
    }

    const images: ProductImage[] = allImages || [];
    return NextResponse.json({ images });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const productId = parseInt(id);
    const supabase = await createSSRClient();
    

    const { data: images, error } = await supabase
      .from('product_image')
      .select('id, url, position')
      .eq('product_id', productId)
      .order('position', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 });
    }

    const typedImages: ProductImage[] = images || [];
    return NextResponse.json({ images: typedImages });

  } catch (error) {
    console.error('Fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}