import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { Database } from '@/lib/supabase/types'; // Adjust path as needed

// Type definitions
type ContentTable = Database['public']['Tables']['content'];
type ContentInsert = ContentTable['Insert'];
type ContentUpdate = ContentTable['Update'];
type Locale = Database['public']['Enums']['countries'];

interface ContentRequestBody {
  locale: Locale;
  title?: string | null;
  description?: string | null;
  content?: string | null;
}

interface ErrorResponse {
  error: string;
  details?: unknown;
}

// Validation function
function validateContentBody(body: unknown): body is ContentRequestBody {
  if (!body || typeof body !== 'object') {
    return false;
  }
  
  const data = body as Record<string, unknown>;
  
  // locale is required
  if (!data.locale || typeof data.locale !== 'string') {
    return false;
  }
  
  // Validate locale is one of the allowed values
  const allowedLocales = ['NL', 'DE', 'FR', 'ES'];
  if (!allowedLocales.includes(data.locale as string)) {
    return false;
  }
  
  // Optional fields should be string or null/undefined
  if (data.title !== undefined && data.title !== null && typeof data.title !== 'string') {
    return false;
  }
  if (data.description !== undefined && data.description !== null && typeof data.description !== 'string') {
    return false;
  }
  if (data.content !== undefined && data.content !== null && typeof data.content !== 'string') {
    return false;
  }
  
  return true;
}

// GET endpoint to fetch content for a product
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const supabase = await createSSRClient();
    const { id } = await params;
    const productId = parseInt(id, 10);
    
    if (isNaN(productId)) {
      return NextResponse.json(
        { error: 'Invalid product ID' } satisfies ErrorResponse,
        { status: 400 }
      );
    }
    
    // Get locale from query params (optional)
    const searchParams = request.nextUrl.searchParams;
    const locale = searchParams.get('locale') as Locale | null;
    
    // Check if product exists
    const { data: product, error: productError } = await supabase
      .from('product')
      .select('id')
      .eq('id', productId)
      .single();
    
    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' } satisfies ErrorResponse,
        { status: 404 }
      );
    }
    
    // Fetch content
    let query = supabase
      .from('content')
      .select('*')
      .eq('product_id', productId);
    
    if (locale) {
      query = query.eq('locale', locale);
    }
    
    const { data: content, error: contentError } = await query;
    
    if (contentError) {
      return NextResponse.json(
        { error: 'Failed to fetch content', details: contentError } satisfies ErrorResponse,
        { status: 500 }
      );
    }
    
    return NextResponse.json(content || []);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error } satisfies ErrorResponse,
      { status: 500 }
    );
  }
}

// POST endpoint to add content for a product
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const supabase = await createSSRClient();
    const { id } = await params;
    const productId = parseInt(id, 10);
    
    if (isNaN(productId)) {
      return NextResponse.json(
        { error: 'Invalid product ID' } satisfies ErrorResponse,
        { status: 400 }
      );
    }
    
    const body: unknown = await request.json();
    
    if (!validateContentBody(body)) {
      return NextResponse.json(
        { error: 'Invalid request body. Locale is required and must be one of: NL, DE, FR, ES' } satisfies ErrorResponse,
        { status: 400 }
      );
    }
    
    // Check if product exists
    const { data: product, error: productError } = await supabase
      .from('product')
      .select('id')
      .eq('id', productId)
      .single();
    
    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' } satisfies ErrorResponse,
        { status: 404 }
      );
    }
    
    // Check if content already exists for this product and locale
    const { data: existingContent, error: checkError } = await supabase
      .from('content')
      .select('id')
      .eq('product_id', productId)
      .eq('locale', body.locale)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found" error
      return NextResponse.json(
        { error: 'Failed to check existing content', details: checkError } satisfies ErrorResponse,
        { status: 500 }
      );
    }
    
    if (existingContent) {
      return NextResponse.json(
        { error: `Content already exists for locale ${body.locale}. Use PUT to update.` } satisfies ErrorResponse,
        { status: 409 }
      );
    }
    
    // Create new content
    const contentData: ContentInsert = {
      product_id: productId,
      locale: body.locale,
      title: body.title ?? null,
      description: body.description ?? null,
      content: body.content ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: newContent, error: insertError } = await supabase
      .from('content')
      .insert(contentData)
      .select()
      .single();
    
    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to create content', details: insertError } satisfies ErrorResponse,
        { status: 500 }
      );
    }
    
    return NextResponse.json(newContent, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error } satisfies ErrorResponse,
      { status: 500 }
    );
  }
}

// PUT endpoint to update content for a product
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const supabase = await createSSRClient();
    const { id } = await params;
    const productId = parseInt(id, 10);
    
    if (isNaN(productId)) {
      return NextResponse.json(
        { error: 'Invalid product ID' } satisfies ErrorResponse,
        { status: 400 }
      );
    }
    
    const body: unknown = await request.json();
    
    if (!validateContentBody(body)) {
      return NextResponse.json(
        { error: 'Invalid request body. Locale is required and must be one of: NL, DE, FR, ES' } satisfies ErrorResponse,
        { status: 400 }
      );
    }
    
    // Check if product exists
    const { data: product, error: productError } = await supabase
      .from('product')
      .select('id')
      .eq('id', productId)
      .single();
    
    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' } satisfies ErrorResponse,
        { status: 404 }
      );
    }
    
    // Check if content exists for this product and locale
    const { data: existingContent, error: checkError } = await supabase
      .from('content')
      .select('id')
      .eq('product_id', productId)
      .eq('locale', body.locale)
      .single();
    
    if (checkError || !existingContent) {
      // If content doesn't exist, create it instead
      const contentData: ContentInsert = {
        product_id: productId,
        locale: body.locale,
        title: body.title ?? null,
        description: body.description ?? null,
        content: body.content ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { data: newContent, error: insertError } = await supabase
        .from('content')
        .insert(contentData)
        .select()
        .single();
      
      if (insertError) {
        return NextResponse.json(
          { error: 'Failed to create content', details: insertError } satisfies ErrorResponse,
          { status: 500 }
        );
      }
      
      return NextResponse.json(newContent, { status: 201 });
    }
    
    // Update existing content
    const updateData: ContentUpdate = {
      title: body.title ?? null,
      description: body.description ?? null,
      content: body.content ?? null,
      updated_at: new Date().toISOString()
    };
    
    const { data: updatedContent, error: updateError } = await supabase
      .from('content')
      .update(updateData)
      .eq('id', existingContent.id)
      .select()
      .single();
    
    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update content', details: updateError } satisfies ErrorResponse,
        { status: 500 }
      );
    }
    
    return NextResponse.json(updatedContent);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error } satisfies ErrorResponse,
      { status: 500 }
    );
  }
}

// DELETE endpoint to remove content for a product
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const supabase = await createSSRClient();
    const { id } = await params;
    const productId = parseInt(id, 10);
    
    if (isNaN(productId)) {
      return NextResponse.json(
        { error: 'Invalid product ID' } satisfies ErrorResponse,
        { status: 400 }
      );
    }
    
    const searchParams = request.nextUrl.searchParams;
    const locale = searchParams.get('locale') as Locale | null;
    
    if (!locale) {
      return NextResponse.json(
        { error: 'Locale is required as query parameter' } satisfies ErrorResponse,
        { status: 400 }
      );
    }
    
    // Delete content for specific locale
    const { error: deleteError } = await supabase
      .from('content')
      .delete()
      .eq('product_id', productId)
      .eq('locale', locale);
    
    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete content', details: deleteError } satisfies ErrorResponse,
        { status: 500 }
      );
    }
    
    return NextResponse.json({ message: 'Content deleted successfully' }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error } satisfies ErrorResponse,
      { status: 500 }
    );
  }
}