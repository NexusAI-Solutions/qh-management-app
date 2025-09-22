import { NextRequest, NextResponse } from 'next/server';
import { createServerAdminClient } from "@/lib/supabase/serverAdminClient";
import { encryption } from '@/lib/encryption';
import { LightspeedAPI } from '@/lib/apis/lightspeed';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
    }

    // Step 1: Fetch the channel data
    const supabase = await createServerAdminClient();
    const { data: channel, error } = await supabase
      .from('channel')
      .select('name, country_code, api_credentials')
      .eq('id', id)
      .single();

    if (error || !channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    // Step 2: Decrypt API credentials
    if (!channel.api_credentials) {
      return NextResponse.json({ error: 'Channel API credentials are missing' }, { status: 500 });
    }
    const decrypted = encryption.decrypt(channel.api_credentials);
    let api_key: string | undefined, api_secret: string | undefined;
    if (typeof decrypted === 'string') {
      // If decrypted is a JSON string, parse it
      ({ api_key, api_secret } = JSON.parse(decrypted));
    } else if (decrypted && typeof decrypted === 'object') {
      ({ api_key, api_secret } = decrypted as { api_key: string, api_secret: string });
    } else {
      return NextResponse.json({ error: 'Invalid API credentials format' }, { status: 500 });
    }

    // Step 3: Ensure credentials are defined and initialize Lightspeed API
    if (!api_key || !api_secret) {
      return NextResponse.json({ error: 'API key or secret is missing' }, { status: 500 });
    }
    const lightspeedAPI = new LightspeedAPI({
      apiKey: api_key,
      apiSecret: api_secret,
      language: channel.country_code,
    });

    // Step 4: Get the EAN from query parameters
    const ean = req.nextUrl.searchParams.get('ean');

    if (!ean || typeof ean !== 'string') {
      return NextResponse.json({ error: 'EAN is required and should be a string' }, { status: 400 });
    }

    // Step 5: Fetch the product variant by EAN from Lightspeed
    const variants = await lightspeedAPI.getProductVariantsByEAN(ean);

    if (variants.length === 0) {
      return NextResponse.json({ error: 'No product found for the given EAN' }, { status: 404 });
    }
    if (variants.length >= 1) {
      return NextResponse.json({ succes: `Product found in ${channel.name} for the given EAN. Variant ID: ${variants[0].id}` }, { status: 200 });
    }
    
  } catch (error) {
    console.error('Error fetching product variant:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
