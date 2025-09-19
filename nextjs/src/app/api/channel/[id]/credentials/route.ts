import { NextRequest, NextResponse } from 'next/server';
import { apiCredentials } from '@/lib/api-credentials';

const isDevelopment = process.env.NODE_ENV === 'development';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isDevelopment) {
    return NextResponse.json({ error: 'Not allowed in production environment' }, { status: 403 });
  }

  try {
    const { id } = await params;
    console.log(id)
    const credentials = await apiCredentials.get(id);

    if (!credentials) {
      return NextResponse.json({ error: 'No credentials found' }, { status: 404 });
    }

    return NextResponse.json({ credentials });
  } catch (error) {
    console.error('Failed to get credentials:', error);
    return NextResponse.json({ error: 'Failed to get credentials' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isDevelopment) {
    return NextResponse.json({ error: 'Not allowed in production environment' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    await apiCredentials.store(id, body);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to store credentials:', error);
    return NextResponse.json({ error: 'Failed to store credentials' }, { status: 500 });
  }
}