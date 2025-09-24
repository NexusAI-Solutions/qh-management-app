import { createSSRClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { Database, Json } from '@/lib/supabase/types';

type RepricerInsert = Database['public']['Tables']['repricer']['Insert'];

interface RepricerUpdateInput {
  is_active?: boolean;
  minimum_price?: number;
  urls?: {
    url1?: string;
    url2?: string;
    url3?: string;
  };
}

interface RepricerResponse {
  ean: string;
  repricer: {
    id: number;
    ean_reference: string | null;
    is_active: boolean | null;
    minimum_price: number | null;
    urls: Json | null;
    created_at: string;
  } | null;
}

// Validate URL format
function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Validate EAN format (basic check for 13 digits)
function validateEAN(ean: string): boolean {
  return /^\d{13}$/.test(ean);
}

// PATCH /api/prices/[ean]/repricer - Update repricer data for an EAN
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ ean: string }> }
): Promise<NextResponse> {
  try {
    const { ean } = await params;
    const supabase = await createSSRClient();

    // Validate EAN format
    if (!validateEAN(ean)) {
      return NextResponse.json(
        { error: 'Invalid EAN format. Must be 13 digits.' },
        { status: 400 }
      );
    }

    // Parse request body
    const body: RepricerUpdateInput = await request.json();

    // Validate input
    if (body.is_active !== undefined && typeof body.is_active !== 'boolean') {
      return NextResponse.json(
        { error: 'is_active must be a boolean' },
        { status: 400 }
      );
    }

    // Validate minimum_price if provided
    if (body.minimum_price !== undefined) {
      if (typeof body.minimum_price !== 'number' || isNaN(body.minimum_price)) {
        return NextResponse.json(
          { error: 'minimum_price must be a valid number' },
          { status: 400 }
        );
      }

      if (body.minimum_price < 0) {
        return NextResponse.json(
          { error: 'minimum_price must be non-negative' },
          { status: 400 }
        );
      }
    }

    // Validate URLs if provided
    if (body.urls) {
      const urlEntries = Object.entries(body.urls);
      for (const [key, url] of urlEntries) {
        if (!['url1', 'url2', 'url3'].includes(key)) {
          return NextResponse.json(
            { error: 'URLs must be named url1, url2, or url3' },
            { status: 400 }
          );
        }

        if (url && typeof url === 'string' && url.trim() !== '' && !validateUrl(url)) {
          return NextResponse.json(
            { error: `Invalid URL format for ${key}` },
            { status: 400 }
          );
        }
      }
    }

    // Prepare upsert data
    const upsertData: RepricerInsert = {
      ean_reference: ean,
      ...(body.is_active !== undefined && { is_active: body.is_active }),
      ...(body.minimum_price !== undefined && { minimum_price: body.minimum_price }),
      ...(body.urls && { urls: body.urls }),
    };

    // Upsert repricer data
    const { data: repricerData, error: upsertError } = await supabase
      .from('repricer')
      .upsert(upsertData, {
        onConflict: 'ean_reference'
      })
      .select()
      .single();

    if (upsertError) {
      console.error('Error upserting repricer data:', upsertError);
      return NextResponse.json(
        { error: 'Failed to update repricer data' },
        { status: 500 }
      );
    }

    const response: RepricerResponse = {
      ean,
      repricer: repricerData
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}