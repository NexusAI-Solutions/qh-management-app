import { NextRequest, NextResponse } from 'next/server'
import { createSSRClient } from '@/lib/supabase/server'

// Type definitions
interface ProductImage {
  url: string;
  position: number;
}

interface ProductVariant {
  id: number;
  title: string;
  ean: string;
  position: number;
}

interface ProductData {
  id: number;
  title: string;
  brand: string;
  description: string;
  active_channel_ids: string[];
  content: string;
  product_image: ProductImage[];
  variant: ProductVariant[];
}

interface UpdateVariant {
  title?: string;
  ean?: string;
  position?: number;
}

interface UpdateProductBody {
  title?: string;
  brand?: string;
  description?: string;
  content?: string;
  active_channel_ids?: string[];
  images?: string[];
  variants?: UpdateVariant[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params   

  try {

    
    const productId = id;

    // Validate product ID
    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      )
    }
    
    const numericId = Number.parseInt(productId, 10)
    if (isNaN(numericId)) {
      return NextResponse.json(
        { error: 'Invalid product ID format' },
        { status: 400 }
      )
    }
    
    // Create Supabase client (auth handled by middleware if protected)
    const supabase = await createSSRClient()
    
    // Fetch product with related data
    const { data, error } = await supabase
      .from('product')
      .select(`
        id,
        title,
        brand,
        description,
        active_channel_ids,
        content,
        product_image(url, position),
        variant(id, title, ean, position)
      `)
      .eq('id', numericId)
      .single()
    
    if (error) {
      console.error('Database error:', error)
      
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch product' },
        { status: 500 }
      )
    }
    
    if (!data) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }
    
    // Transform the data
    const productData = {
      ...data,
      active_channel_ids: Array.isArray(data.active_channel_ids)
        ? data.active_channel_ids.map(String)
        : [],
    } as ProductData;
    const mainImage = productData.product_image?.find((img: ProductImage) => img.position === 1)?.url 
      || productData.product_image?.[0]?.url
      || false
    
    const allImages = productData.product_image
      ?.sort((a: ProductImage, b: ProductImage) => (a.position || 999) - (b.position || 999))
      ?.map((img: ProductImage) => img.url) || []
    
    const variants = productData.variant?.map((variant: ProductVariant) => ({
      id: variant.id.toString(),
      title: variant.title || '',
      ean: variant.ean || '',
      position: variant.position || 1,
    })) || []
    
    const transformedProduct = {
      id: productData.id.toString(),
      title: productData.title || 'Onbekend product',
      brand: productData.brand || 'Onbekend merk',
      description: productData.description || '',
      content: productData.content || '',
      mainImage,
      active_channel_ids: productData.active_channel_ids || [],
      images: allImages,
      stats: {
        totalSales: 0,
        averagePrice: 0,
        buyPrice: 0,
        averageMargin: 0,
      },
      variants,
    }
    
    return NextResponse.json(transformedProduct)
    
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}




export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params 
  try {
    const productId = id;

    // Validate product ID
    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const numericId = Number.parseInt(productId, 10);
    if (isNaN(numericId)) {
      return NextResponse.json(
        { error: 'Invalid product ID format' },
        { status: 400 }
      );
    }

    // Parse the incoming JSON body
    const body = await request.json() as UpdateProductBody;
    const {
      title,
      brand,
      description,
      content,
      active_channel_ids,
      images,
      variants
    } = body;

    // Create Supabase client
    const supabase = await createSSRClient();

    // Prepare product update fields
    const productUpdateFields: Record<string, unknown> = {};
    if (title !== undefined) productUpdateFields.title = title;
    if (brand !== undefined) productUpdateFields.brand = brand;
    if (description !== undefined) productUpdateFields.description = description;
    if (content !== undefined) productUpdateFields.content = content;
    if (active_channel_ids !== undefined) productUpdateFields.active_channel_ids = active_channel_ids;

    // Update main product fields if any were provided
    if (Object.keys(productUpdateFields).length > 0) {
      const { error: productError } = await supabase
        .from('product')
        .update(productUpdateFields)
        .eq('id', numericId);

      if (productError) {
        console.error('Database error updating product:', productError);
        return NextResponse.json(
          { error: 'Failed to update product' },
          { status: 500 }
        );
      }
    }

    // Handle image updates if provided
    if (images !== undefined) {
      // Delete existing images
      const { error: deleteImagesError } = await supabase
        .from('product_image')
        .delete()
        .eq('product_id', numericId);

      if (deleteImagesError) {
        console.error('Error deleting images:', deleteImagesError);
        return NextResponse.json(
          { error: 'Failed to update product images' },
          { status: 500 }
        );
      }

      // Prepare new images
      const imagesToInsert: { product_id: number; url: string; position: number }[] = [];
      
      if (images && Array.isArray(images)) {
        // Use provided images array
        images.forEach((url, index) => {
          imagesToInsert.push({
            product_id: numericId,
            url: url,
            position: index + 1
          });
        });
      }

      // Insert new images if any
      if (imagesToInsert.length > 0) {
        const { error: insertImagesError } = await supabase
          .from('product_image')
          .insert(imagesToInsert);

        if (insertImagesError) {
          console.error('Error inserting images:', insertImagesError);
          return NextResponse.json(
            { error: 'Failed to update product images' },
            { status: 500 }
          );
        }
      }
    }

    // Handle variant updates if provided
    if (variants !== undefined && Array.isArray(variants)) {
      // Delete existing variants
      const { error: deleteVariantsError } = await supabase
        .from('variant')
        .delete()
        .eq('product_id', numericId);

      if (deleteVariantsError) {
        console.error('Error deleting variants:', deleteVariantsError);
        return NextResponse.json(
          { error: 'Failed to update product variants' },
          { status: 500 }
        );
      }

      // Prepare new variants
      const variantsToInsert = variants.map((variant) => ({
        product_id: numericId,
        title: variant.title || '',
        ean: variant.ean || '',
        position: variant.position || 1
      }));

      // Insert new variants if any
      if (variantsToInsert.length > 0) {
        const { error: insertVariantsError } = await supabase
          .from('variant')
          .insert(variantsToInsert);

        if (insertVariantsError) {
          console.error('Error inserting variants:', insertVariantsError);
          return NextResponse.json(
            { error: 'Failed to update product variants' },
            { status: 500 }
          );
        }
      }
    }

    // Fetch the updated product with all related data
    const { data, error } = await supabase
      .from('product')
      .select(`
        id,
        title,
        brand,
        description,
        active_channel_ids,
        content,
        product_image(url, position),
        variant(id, title, ean, position)
      `)
      .eq('id', numericId)
      .single();

    if (error) {
      console.error('Error fetching updated product:', error);
      
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch updated product' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Transform the data (same as GET)
    const updatedProductData = {
      ...data,
      active_channel_ids: Array.isArray(data.active_channel_ids)
        ? data.active_channel_ids.map(String)
        : [],
    } as ProductData;
    const updatedMainImage = updatedProductData.product_image?.find((img: ProductImage) => img.position === 1)?.url 
      || updatedProductData.product_image?.[0]?.url
      || false;
    
    const allImages = updatedProductData.product_image
      ?.sort((a: ProductImage, b: ProductImage) => (a.position || 999) - (b.position || 999))
      ?.map((img: ProductImage) => img.url) || [];
    
    const updatedVariants = updatedProductData.variant?.map((variant: ProductVariant) => ({
      id: variant.id.toString(),
      title: variant.title || '',
      ean: variant.ean || '',
      position: variant.position || 1,
    })) || [];
    
    const transformedProduct = {
      id: updatedProductData.id.toString(),
      title: updatedProductData.title || 'Onbekend product',
      brand: updatedProductData.brand || 'Onbekend merk',
      description: updatedProductData.description || '',
      content: updatedProductData.content || '',
      mainImage: updatedMainImage,
      active_channel_ids: updatedProductData.active_channel_ids || [],
      images: allImages,
      stats: {
        totalSales: 0,
        averagePrice: 0,
        buyPrice: 0,
        averageMargin: 0,
      },
      variants: updatedVariants,
    };

    return NextResponse.json(transformedProduct);

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}