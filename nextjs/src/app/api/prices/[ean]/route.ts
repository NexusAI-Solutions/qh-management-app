import { createSSRClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/lib/supabase/types';

type PriceInsert = Database['public']['Tables']['price']['Insert'];

interface PriceResponse {
  ean: string;
  prices: Array<{
    id: number;
    country_code: string | null;
    price: number | null;
    created_at: string;
    updated_at: string | null;
  }>;
}

interface PriceInput {
  country_code: string;
  price: number;
}


// Validate country code (ISO 3166-1 alpha-2)
function validateCountryCode(countryCode: string): boolean {
  return /^[A-Z]{2}$/.test(countryCode);
}


// GET /api/prices/[ean] - Retrieve all prices for a specific EAN
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ean: string }> }
): Promise<NextResponse> {
  try {
    const { ean } = await params;
    const supabase = await createSSRClient();


    // Fetch prices for the EAN
    const { data: prices, error } = await supabase
      .from('price')
      .select('*')
      .eq('ean_reference', ean)
      .order('country_code', { ascending: true });

    if (error) {
      console.error('Error fetching prices:', error);
      return NextResponse.json(
        { error: 'Failed to fetch prices' },
        { status: 500 }
      );
    }

    const response: PriceResponse = {
      ean,
      prices: prices || []
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

// POST /api/prices/[ean] - Create new price(s) for an EAN
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ean: string }> }
): Promise<NextResponse> {
  try {
    const { ean } = await params;
    const supabase = await createSSRClient();


    // Parse request body
    const body = await request.json();
    const priceInputs: PriceInput[] = Array.isArray(body) ? body : [body];

    // Validate input
    for (const priceInput of priceInputs) {
      if (!priceInput.country_code || typeof priceInput.price !== 'number') {
        return NextResponse.json(
          { error: 'Invalid price data. Required: country_code (string), price (number)' },
          { status: 400 }
        );
      }

      if (!validateCountryCode(priceInput.country_code)) {
        return NextResponse.json(
          { error: 'Invalid country code format. Must be ISO 3166-1 alpha-2 (e.g., "US", "NL")' },
          { status: 400 }
        );
      }

      if (priceInput.price < 0) {
        return NextResponse.json(
          { error: 'Price must be non-negative' },
          { status: 400 }
        );
      }
    }

    // Prepare insert data
    const insertData: PriceInsert[] = priceInputs.map(input => ({
      ean_reference: ean,
      country_code: input.country_code,
      price: input.price
    }));

    // Insert prices
    const { error: insertError } = await supabase
      .from('price')
      .insert(insertData);

    if (insertError) {
      console.error('Error creating prices:', insertError);

      // Check for unique constraint violation
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'Price already exists for this EAN and country combination' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to create prices' },
        { status: 500 }
      );
    }

    // Fetch updated prices
    const { data: prices, error: fetchError } = await supabase
      .from('price')
      .select('*')
      .eq('ean_reference', ean)
      .order('country_code', { ascending: true });

    if (fetchError) {
      console.error('Error fetching updated prices:', fetchError);
      return NextResponse.json(
        { error: 'Prices created but failed to fetch updated list' },
        { status: 500 }
      );
    }

    const response: PriceResponse = {
      ean,
      prices: prices || []
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/prices/[ean] - Replace all prices for an EAN
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ ean: string }> }
): Promise<NextResponse> {
  try {
    const { ean } = await params;
    const supabase = await createSSRClient();


    // Parse request body
    const body = await request.json();
    const priceInputs: PriceInput[] = Array.isArray(body) ? body : [body];

    // Validate input
    for (const priceInput of priceInputs) {
      if (!priceInput.country_code || typeof priceInput.price !== 'number') {
        return NextResponse.json(
          { error: 'Invalid price data. Required: country_code (string), price (number)' },
          { status: 400 }
        );
      }

      if (!validateCountryCode(priceInput.country_code)) {
        return NextResponse.json(
          { error: 'Invalid country code format. Must be ISO 3166-1 alpha-2 (e.g., "US", "NL")' },
          { status: 400 }
        );
      }

      if (priceInput.price < 0) {
        return NextResponse.json(
          { error: 'Price must be non-negative' },
          { status: 400 }
        );
      }
    }

    // Delete existing prices
    const { error: deleteError } = await supabase
      .from('price')
      .delete()
      .eq('ean_reference', ean);

    if (deleteError) {
      console.error('Error deleting existing prices:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete existing prices' },
        { status: 500 }
      );
    }

    // Insert new prices
    const insertData: PriceInsert[] = priceInputs.map(input => ({
      ean_reference: ean,
      country_code: input.country_code,
      price: input.price
    }));

    const { error: insertError } = await supabase
      .from('price')
      .insert(insertData);

    if (insertError) {
      console.error('Error creating new prices:', insertError);

      // Check for unique constraint violation
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'Price already exists for this EAN and country combination' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to create new prices' },
        { status: 500 }
      );
    }

    // Fetch updated prices
    const { data: prices, error: fetchError } = await supabase
      .from('price')
      .select('*')
      .eq('ean_reference', ean)
      .order('country_code', { ascending: true });

    if (fetchError) {
      console.error('Error fetching updated prices:', fetchError);
      return NextResponse.json(
        { error: 'Prices updated but failed to fetch updated list' },
        { status: 500 }
      );
    }

    const response: PriceResponse = {
      ean,
      prices: prices || []
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

// PATCH /api/prices/[ean] - Update specific price(s) for an EAN
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ ean: string }> }
): Promise<NextResponse> {
  try {
    const { ean } = await params;
    const supabase = await createSSRClient();


    // Parse request body
    const body = await request.json();
    const priceInputs: PriceInput[] = Array.isArray(body) ? body : [body];

    // Validate input
    for (const priceInput of priceInputs) {
      if (!priceInput.country_code || typeof priceInput.price !== 'number') {
        return NextResponse.json(
          { error: 'Invalid price data. Required: country_code (string), price (number)' },
          { status: 400 }
        );
      }

      if (!validateCountryCode(priceInput.country_code)) {
        return NextResponse.json(
          { error: 'Invalid country code format. Must be ISO 3166-1 alpha-2 (e.g., "US", "NL")' },
          { status: 400 }
        );
      }

      if (priceInput.price < 0) {
        return NextResponse.json(
          { error: 'Price must be non-negative' },
          { status: 400 }
        );
      }
    }

    // Update each price
    for (const priceInput of priceInputs) {
      const { error: upsertError } = await supabase
        .from('price')
        .upsert({
          ean_reference: ean,
          country_code: priceInput.country_code,
          price: priceInput.price,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'ean_reference,country_code'
        });

      if (upsertError) {
        console.error('Error upserting price:', upsertError);
        return NextResponse.json(
          { error: 'Failed to update prices' },
          { status: 500 }
        );
      }
    }

    // Fetch updated prices
    const { data: prices, error: fetchError } = await supabase
      .from('price')
      .select('*')
      .eq('ean_reference', ean)
      .order('country_code', { ascending: true });

    if (fetchError) {
      console.error('Error fetching updated prices:', fetchError);
      return NextResponse.json(
        { error: 'Prices updated but failed to fetch updated list' },
        { status: 500 }
      );
    }

    const response: PriceResponse = {
      ean,
      prices: prices || []
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