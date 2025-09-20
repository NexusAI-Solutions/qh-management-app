// app/api/channels/route.ts
import { createSSRClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Define the Channel type based on your database structure
interface Channel {
  id: number
  name: string
  type: string
  country_code: string
  locales: string
  api_endpoint: string
  api_credentials: string
  created_at: string
}

// Define response types for better type safety
interface ChannelsSuccessResponse {
  channels: Channel[]
  count: number
}

interface ErrorResponse {
  error: string
}

export async function GET(): Promise<NextResponse<ChannelsSuccessResponse | ErrorResponse>> {
  try {
    const supabase = await createSSRClient()
    
    // Use the Channel type for type safety
    const { data: channelsData, error } = await supabase
      .from('channel')
      .select<string, Channel>(`
        id,
        name,
        type,
        country_code,
        locales,
        api_endpoint,
        api_credentials,
        created_at
      `)
      .order('id')

    if (error) {
      console.error('Error fetching channels:', error)
      return NextResponse.json<ErrorResponse>(
        { error: 'Failed to fetch channels' },
        { status: 500 }
      )
    }

    // With proper typing, TypeScript knows channelsData is Channel[] | null
    if (!channelsData || channelsData.length === 0) {
      return NextResponse.json<ErrorResponse>(
        { error: 'No channels found' },
        { status: 404 }
      )
    }

    return NextResponse.json<ChannelsSuccessResponse>({
      channels: channelsData,
      count: channelsData.length
    })

  } catch (error) {
    // Better error handling with type guards
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('Unexpected error:', errorMessage)
    
    return NextResponse.json<ErrorResponse>(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}