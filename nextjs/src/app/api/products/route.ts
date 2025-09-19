// app/api/products/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSSRClient } from '@/lib/supabase/server'

// Type definitions
interface ProductImage {
  url: string;
}

interface ProductData {
  id: number;
  title: string;
  brand: string;
  product_image: ProductImage[];
}

interface BrandData {
  brand: string;
}

export async function GET(request: NextRequest) {
  try {
    // Middleware already verified auth, so we can proceed directly
    // User is guaranteed to exist at this point
    const supabase = await createSSRClient()
    
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const brand = searchParams.get('brand') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '25')

    // Build the query - no need to check auth again
    let query = supabase
      .from('product')
      .select(`
        id,
        title,
        brand,
        product_image(url)
      `)
      .eq('product_image.position', 1)

    if (search) {
      query = query.ilike('title', `%${search}%`)
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

    // Transform the data
    const transformedProducts = (data as ProductData[])?.map((item: ProductData) => ({
      id: item.id,
      title: item.title,
      brand: item.brand,
      image: item.product_image?.[0]?.url,
    })) || []

    // Get total count
    let countQuery = supabase
      .from('product')
      .select('*', { count: 'exact', head: true })

    if (search) {
      countQuery = countQuery.ilike('title', `%${search}%`)
    }
    if (brand && brand !== 'all') {
      countQuery = countQuery.eq('brand', brand)
    }

    const { count: totalCount } = await countQuery

    // Get all brands
    const { data: brandsData } = await supabase
      .from('product')
      .select('brand')
      .not('brand', 'is', null)

    const brands = [...new Set((brandsData as BrandData[])?.map(item => item.brand))].sort()

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