// app/api/products/[productId]/variants/reorder/route.ts
import { createSSRClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { ProductVariant } from '@/app/types/product';
import type { Database } from '@/lib/supabase/types';

type VariantRow = Database['public']['Tables']['variant']['Row'];

interface ReorderVariantsRequest {
  variants: Array<{
    id: number;
    position: number;
  }>;
}

// PUT /api/products/[productId]/variants/reorder - Reorder variants
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const supabase = await createSSRClient();

    // Validate productId
    const productIdNum = parseInt(id, 10);
    if (isNaN(productIdNum)) {
      return NextResponse.json(
        { error: 'Invalid product ID' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json() as ReorderVariantsRequest;
    
    if (!body.variants || !Array.isArray(body.variants)) {
      return NextResponse.json(
        { error: 'Invalid request body: variants array required' },
        { status: 400 }
      );
    }

    // Validate each variant item
    for (const variant of body.variants) {
      if (
        typeof variant.id !== 'number' ||
        typeof variant.position !== 'number' ||
        variant.position < 0
      ) {
        return NextResponse.json(
          { error: 'Invalid variant data: each variant must have a valid id and position' },
          { status: 400 }
        );
      }
    }

    // Verify all variant IDs belong to this product
    const variantIds = body.variants.map(v => v.id);
    const { data: existingVariants, error: verifyError } = await supabase
      .from('variant')
      .select('id')
      .eq('product_id', productIdNum)
      .in('id', variantIds);

    if (verifyError) {
      console.error('Error verifying variants:', verifyError);
      return NextResponse.json(
        { error: 'Failed to verify variants' },
        { status: 500 }
      );
    }

    if (!existingVariants || existingVariants.length !== variantIds.length) {
      return NextResponse.json(
        { error: 'One or more variants do not belong to this product' },
        { status: 400 }
      );
    }

    // Perform batch update using Promise.all for better performance
    // Supabase doesn't support CASE statements directly, so we update each one
    const updatePromises = body.variants.map(variant =>
      supabase
        .from('variant')
        .update({ position: variant.position })
        .eq('id', variant.id)
        .eq('product_id', productIdNum)
    );

    const results = await Promise.all(updatePromises);
    
    // Check if any updates failed
    const failedUpdate = results.find(result => result.error);
    if (failedUpdate) {
      console.error('Error updating variant positions:', failedUpdate.error);
      return NextResponse.json(
        { error: 'Failed to update variant positions' },
        { status: 500 }
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
        { error: 'Variants reordered but failed to fetch updated list' },
        { status: 500 }
      );
    }

    // Transform to ProductVariant type
    const transformedVariants: ProductVariant[] = (allVariants || []).map((variant: VariantRow) => ({
      id: variant.id,
      title: variant.title,
      price: null,
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