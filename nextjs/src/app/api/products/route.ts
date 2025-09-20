// app/api/products/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSSRClient } from '@/lib/supabase/server'
import type { ProductData, ProductImage, ProductVariant } from '@/app/types/product'

// Additional type for brand query
interface BrandData {
  brand: string | null;
}

// Type for transformed product
interface TransformedProduct {
  id: number;
  title: string | null;
  brand: string | null;
  image: string | undefined;
  matchedEan?: string;
}

export async function GET(request: NextRequest) {
  try {
    // Middleware already verified auth, so we can proceed directly
    const supabase = await createSSRClient()
    
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const brand = searchParams.get('brand') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '25')

    let productIds: number[] = []
    let useProductIdFilter = false

    // If we have a search term, first check if any variants match the EAN
    if (search) {
      // Search for products that have variants with matching EAN
      const { data: variantData } = await supabase
        .from('variant')
        .select('product_id')
        .ilike('ean', `%${search}%`)

      if (variantData && variantData.length > 0) {
        productIds = [...new Set(variantData.map(v => v.product_id).filter((id): id is number => id !== null))]
        useProductIdFilter = true
      }
    }

    // Build the main query
    let query = supabase
      .from('product')
      .select(`
        id,
        title,
        brand,
        active_channel_ids,
        product_image(
          id,
          url,
          position
        ),
        variant(
          id,
          title,
          ean,
          position
        ),
        content(*)
      `)

    // Apply search filter
    if (search) {
      if (useProductIdFilter && productIds.length > 0) {
        // Products that match either by title OR by variant EAN
        query = query.or(`title.ilike.%${search}%,id.in.(${productIds.join(',')})`)
      } else {
        // Just search by title if no EAN matches found
        query = query.ilike('title', `%${search}%`)
      }
    }

    if (brand && brand !== 'all') {
      query = query.eq('brand', brand)
    }

    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error } = await query

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch products' },
        { status: 500 }
      )
    }

    // Transform the data and include matched EAN if applicable
    const transformedProducts: TransformedProduct[] = (data as ProductData[])?.map((item: ProductData) => {
      // Find the first image with position 1, or fallback to first image, or undefined
      const primaryImage = item.product_image?.find(img => img.position === 1) 
        || item.product_image?.[0]
      
      const product: TransformedProduct = {
        id: item.id,
        title: item.title,
        brand: item.brand,
        image: primaryImage?.url,
      }

      // If searching and the match was via EAN (not title), include the matched EAN
      if (search && item.variant) {
        const matchedVariant = item.variant.find(v => 
          v.ean?.toLowerCase().includes(search.toLowerCase())
        )
        if (matchedVariant && !item.title?.toLowerCase().includes(search.toLowerCase())) {
          product.matchedEan = matchedVariant.ean || undefined
        }
      }

      return product
    }) || []

    // Get total count with the same search conditions
    let countQuery = supabase
      .from('product')
      .select('id', { count: 'exact', head: true })

    if (search) {
      if (useProductIdFilter && productIds.length > 0) {
        countQuery = countQuery.or(`title.ilike.%${search}%,id.in.(${productIds.join(',')})`)
      } else {
        countQuery = countQuery.ilike('title', `%${search}%`)
      }
    }
    
    if (brand && brand !== 'all') {
      countQuery = countQuery.eq('brand', brand)
    }

    const { count: totalCount } = await countQuery

    // Get all brands for filter
    const { data: brandsData } = await supabase
      .from('product')
      .select('brand')
      .not('brand', 'is', null)
      .order('brand')

    const brands: string[] = [...new Set(
      (brandsData as BrandData[])
        ?.map(item => item.brand)
        .filter((b): b is string => b !== null)
    )].sort()

    return NextResponse.json({
      products: transformedProducts,
      totalCount: totalCount || 0,
      brands,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil((totalCount || 0) / limit)
      }
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}