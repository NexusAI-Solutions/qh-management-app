// app/api/products/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSSRClient } from '@/lib/supabase/server'

// Simple in-memory cache for brands (resets on server restart)
let brandsCache: { data: string[], timestamp: number } | null = null
const BRANDS_CACHE_TTL = 60 * 60 * 1000 // 1 hour in milliseconds

// Additional type for brand query
interface BrandData {
  brand: string | null;
}

// Type for the simplified query result
interface ProductQueryResult {
  id: number;
  title: string | null;
  brand: string | null;
  product_image: Array<{
    url: string;
    position: number;
  }>;
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

    // Remove the separate variant query - we'll handle search in main query

    // Build the optimized main query with only needed data
    let query = supabase
      .from('product')
      .select(`
        id,
        title,
        brand,
        product_image!left(url, position)
      `)

    // Apply search filter using efficient OR condition
    if (search) {
      // Search both product title and variant EAN in single query
      query = query.or(`title.ilike.%${search}%,variant.ean.ilike.%${search}%`)
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

    // Transform the optimized data structure
    const transformedProducts: TransformedProduct[] = data?.map((item: ProductQueryResult) => {
      // Find the primary image (position 1) or first available image
      const primaryImage = item.product_image?.find((img) => img.position === 1)
        || item.product_image?.[0]

      return {
        id: item.id,
        title: item.title,
        brand: item.brand,
        image: primaryImage?.url,
      }
    }) || []

    // Get total count with the same optimized search conditions
    let countQuery = supabase
      .from('product')
      .select('id', { count: 'exact', head: true })

    if (search) {
      // Use same search logic as main query
      countQuery = countQuery.or(`title.ilike.%${search}%,variant.ean.ilike.%${search}%`)
    }

    if (brand && brand !== 'all') {
      countQuery = countQuery.eq('brand', brand)
    }

    const { count: totalCount } = await countQuery

    // Get brands with caching
    let brands: string[] = []
    const now = Date.now()

    if (brandsCache && (now - brandsCache.timestamp) < BRANDS_CACHE_TTL) {
      // Use cached brands
      brands = brandsCache.data
    } else {
      // Fetch fresh brands and cache them
      const { data: brandsData } = await supabase
        .from('product')
        .select('brand')
        .not('brand', 'is', null)
        .order('brand')

      brands = [...new Set(
        (brandsData as BrandData[])
          ?.map(item => item.brand)
          .filter((b): b is string => b !== null)
      )].sort()

      // Cache the result
      brandsCache = { data: brands, timestamp: now }
    }

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