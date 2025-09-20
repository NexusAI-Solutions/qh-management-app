// app/api/products/[id]/variants/route.ts
import { createSSRClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { ProductVariant } from '@/app/types/product';
import type { Database } from '@/lib/supabase/types';

type VariantRow = Database['public']['Tables']['variant']['Row'];

// GET /api/products/[id]/variants - List all variants for a product
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ variantId: string }> }
): Promise<NextResponse> {
  try {
    const { variantId } = await params;
    const supabase = await createSSRClient();

    // Validate id
    const idNum = parseInt(variantId, 10);
    if (isNaN(idNum)) {
      return NextResponse.json(
        { error: 'Invalid product ID' },
        { status: 400 }
      );
    }

    // Fetch variants ordered by position
    const { data: variants, error } = await supabase
      .from('variant')
      .select('*')
      .eq('product_id', idNum)
      .order('position', { ascending: true, nullsFirst: false });

    if (error) {
      console.error('Error fetching variants:', error);
      return NextResponse.json(
        { error: 'Failed to fetch variants' },
        { status: 500 }
      );
    }

    // Transform to ProductVariant type
    // Note: Assuming price is fetched separately or via a join
    const transformedVariants: ProductVariant[] = (variants || []).map((variant: VariantRow) => ({
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

// POST /api/products/[id]/variants - Create a new variant
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const supabase = await createSSRClient();

    // Validate id
    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) {
      return NextResponse.json(
        { error: 'Invalid product ID' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { title, ean } = body as { title?: string; ean?: string };

    // Validate required fields
    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Get the maximum position for this product
    const { data: maxPositionData, error } = await supabase
      .from('variant')
      .select('position')
      .eq('product_id', idNum)
      .order('position', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "no rows returned", which is fine for empty results
      console.error('Error fetching max position:', error);
      return NextResponse.json(
        { error: 'Failed to determine variant position' },
        { status: 500 }
      );
    }

    let newPosition = 0;
    if (maxPositionData?.position !== null && maxPositionData?.position !== undefined) {
      newPosition = maxPositionData.position + 1;
    }

    // Create the new variant
    const { error: createError } = await supabase
      .from('variant')
      .insert({
        product_id: idNum,
        title,
        ean: ean || null,
        position: newPosition,
      });

    if (createError) {
      console.error('Error creating variant:', createError);
      return NextResponse.json(
        { error: 'Failed to create variant' },
        { status: 500 }
      );
    }

    // Fetch all variants for the product to return
    const { data: allVariants, error: fetchError } = await supabase
      .from('variant')
      .select('*')
      .eq('product_id', idNum)
      .order('position', { ascending: true, nullsFirst: false });

    if (fetchError) {
      console.error('Error fetching variants:', fetchError);
      return NextResponse.json(
        { error: 'Variant created but failed to fetch updated list' },
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

    return NextResponse.json(transformedVariants, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}