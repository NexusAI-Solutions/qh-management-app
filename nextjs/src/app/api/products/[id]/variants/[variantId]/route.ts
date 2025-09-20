// app/api/products/[productId]/variants/[id]/route.ts
import { createSSRClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { ProductVariant } from '@/app/types/product';
import type { Database } from '@/lib/supabase/types';

type VariantRow = Database['public']['Tables']['variant']['Row'];

// PUT /api/products/[productId]/variants/[id] - Update a variant
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
): Promise<NextResponse> {
  try {
    const { id, variantId } = await params;
    const supabase = await createSSRClient();

    // Validate IDs
    const productIdNum = parseInt(id, 10);
    const variantIdNum = parseInt(variantId, 10);
    
    if (isNaN(productIdNum) || isNaN(variantIdNum)) {
      return NextResponse.json(
        { error: 'Invalid product or variant ID' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { title, ean } = body as { title?: string; ean?: string | null };

    // Validate that at least one field is being updated
    if (title === undefined && ean === undefined) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Build update object
    const updateData: Partial<VariantRow> = {};
    if (title !== undefined) updateData.title = title;
    if (ean !== undefined) updateData.ean = ean;

    // Update the variant
    const { data: updatedVariant, error: updateError } = await supabase
      .from('variant')
      .update(updateData)
      .eq('id', variantIdNum)
      .eq('product_id', productIdNum)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating variant:', updateError);
      return NextResponse.json(
        { error: 'Failed to update variant' },
        { status: 500 }
      );
    }

    if (!updatedVariant) {
      return NextResponse.json(
        { error: 'Variant not found' },
        { status: 404 }
      );
    }

    // Fetch all variants for the product to return
    const { data: allVariants, error: fetchError } = await supabase
      .from('variant')
      .select('*')
      .eq('product_id', productIdNum)
      .order('position', { ascending: true, nullsFirst: false });

    if (fetchError) {
      console.error('Error fetching variants:', fetchError);
      return NextResponse.json(
        { error: 'Variant updated but failed to fetch updated list' },
        { status: 500 }
      );
    }

    // Transform to ProductVariant type
    const transformedVariants: ProductVariant[] = (allVariants || []).map((variant: VariantRow) => ({
      id: variant.id,
      title: variant.title,
      ean: variant.ean,
      position: variant.position,
    }));

    return NextResponse.json(transformedVariants);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/products/[productId]/variants/[id] - Delete a variant
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
): Promise<NextResponse> {
  try {
    const { id, variantId } = await params;
    const supabase = await createSSRClient();

    // Validate IDs
    const productIdNum = parseInt(id, 10);
    const variantIdNum = parseInt(variantId, 10);
    
    if (isNaN(productIdNum) || isNaN(variantIdNum)) {
      return NextResponse.json(
        { error: 'Invalid product or variant ID' },
        { status: 400 }
      );
    }

    // Delete the variant
    const { error: deleteError } = await supabase
      .from('variant')
      .delete()
      .eq('id', variantIdNum)
      .eq('product_id', productIdNum);

    if (deleteError) {
      console.error('Error deleting variant:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete variant' },
        { status: 500 }
      );
    }

    // Fetch all remaining variants for the product
    const { data: allVariants, error: fetchError } = await supabase
      .from('variant')
      .select('*')
      .eq('product_id', productIdNum)
      .order('position', { ascending: true, nullsFirst: false });

    if (fetchError) {
      console.error('Error fetching variants:', fetchError);
      return NextResponse.json(
        { error: 'Variant deleted but failed to fetch updated list' },
        { status: 500 }
      );
    }

    // Transform to ProductVariant type
    const transformedVariants: ProductVariant[] = (allVariants || []).map((variant: VariantRow) => ({
      id: variant.id,
      title: variant.title,
      ean: variant.ean,
      position: variant.position,
    }));

    return NextResponse.json(transformedVariants);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}