"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { CheckCircle, XCircle, Loader2, AlertTriangle } from "lucide-react"
import type { ApiProduct } from "@/app/types/product" // Update with correct import path

// Module-level cache for channels and status data
interface CacheEntry {
  channels: Channel[]
  status: Record<string, WebsiteStatus>
  timestamp: number
}

const channelsCache: Record<number, CacheEntry> = {}
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

interface Channel {
  id: number
  name: string
}

interface WebsiteStatus {
  published: boolean
  enabled: boolean
  loading?: boolean
  error?: boolean
}

interface WebsiteStatusManagerProps {
  product: ApiProduct
  onChannelUpdate?: (channelIds: number[]) => void // Optional callback for parent component
}

export function WebsiteStatusManager({ product, onChannelUpdate }: WebsiteStatusManagerProps) {
  const [channels, setChannels] = useState<Channel[]>([])
  const [websiteStatus, setWebsiteStatus] = useState<Record<string, WebsiteStatus>>({})
  const [isLoadingChannels, setIsLoadingChannels] = useState(true)
  // Helper function to normalize active_channel_ids to number array
  const normalizeChannelIds = (ids: (string | number)[] | undefined): number[] => {
    if (!ids) return []

    // Convert string or number array to number array
    return ids
      .map(id => typeof id === "number" ? id : parseInt(id, 10))
      .filter(id => !isNaN(id))
  }

  const [activeChannelIds, setActiveChannelIds] = useState<number[]>(() =>
    normalizeChannelIds(product?.active_channel_ids)
  )
  const [updatingChannel, setUpdatingChannel] = useState<number | null>(null)

  // Cache helper functions
  const getCachedData = (productId: number): CacheEntry | null => {
    const cached = channelsCache[productId]
    if (!cached) return null

    // Check if cache is still valid (TTL)
    if (Date.now() - cached.timestamp > CACHE_TTL) {
      delete channelsCache[productId]
      return null
    }

    return cached
  }

  const setCachedData = (productId: number, channels: Channel[], status: Record<string, WebsiteStatus>) => {
    channelsCache[productId] = {
      channels,
      status,
      timestamp: Date.now()
    }
  }


  const checkProductOnChannel = async (channelId: number, ean: string): Promise<{ published: boolean, error: boolean }> => {
    try {
      const response = await fetch(`/api/channels/${channelId}/check-product?ean=${ean}`)
      if (response.status === 200) {
        return { published: true, error: false }
      } else if (response.status === 404) {
        return { published: false, error: false }
      } else {
        return { published: false, error: true }
      }
    } catch (error) {
      console.error(`Error checking product on channel ${channelId}:`, error)
      return { published: false, error: true }
    }
  }

  const handleToggleChannel = async (channelId: number, isEnabled: boolean) => {
    if (!product?.id) return

    setUpdatingChannel(channelId)
    try {
      // Update local state optimistically
      let newActiveChannelIds: number[]
      if (isEnabled) {
        // Add channel if not already present
        newActiveChannelIds = activeChannelIds.includes(channelId)
          ? activeChannelIds
          : [...activeChannelIds, channelId]
      } else {
        // Remove channel
        newActiveChannelIds = activeChannelIds.filter(id => id !== channelId)
      }

      // Make API call to update active_channel_ids
      const response = await fetch(`/api/products/${product.id}/channels`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          active_channel_ids: newActiveChannelIds.map(id => id.toString())
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to update product: ${response.statusText}`)
      }

      // Update local state after successful API call
      setActiveChannelIds(newActiveChannelIds)

      // Call optional parent callback
      if (onChannelUpdate) {
        onChannelUpdate(newActiveChannelIds)
      }

    } catch (error) {
      console.error('Error updating channel status:', error)
      // You might want to show a toast or error message to the user here
      alert('Failed to update channel status. Please try again.')
    } finally {
      setUpdatingChannel(null)
    }
  }

  useEffect(() => {
    // Update local state when product prop changes
    const normalizedIds = normalizeChannelIds(product?.active_channel_ids)
    setActiveChannelIds(normalizedIds)
    
    // Debug log to see what we're receiving
    console.log('Product active_channel_ids:', product?.active_channel_ids)
    console.log('Normalized to:', normalizedIds)
  }, [product?.active_channel_ids])

  useEffect(() => {
    const loadChannelsAndStatus = async () => {
      if (!product?.variants || !product?.id) {
        return
      }

      // Check if we have cached data for this product
      const cachedData = getCachedData(product.id)
      if (cachedData) {
        setChannels(cachedData.channels)
        setWebsiteStatus(cachedData.status)
        setIsLoadingChannels(false)
        return
      }

      // No cache found, load from API
      setIsLoadingChannels(true)

      // Move the function inside the useEffect to avoid dependency issues
      const getEanFromVariants = (variants: Array<{ ean?: string | null; position?: number | null }>): string | null => {
        if (!variants || variants.length === 0) return null
        
        const sortedVariants = [...variants].sort((a, b) => 
          (a.position ?? 0) - (b.position ?? 0)
        )
        return sortedVariants[0]?.ean || null
      }

      try {
        // Fetch channels using the API endpoint
        const channelsResponse = await fetch('/api/channels')
        if (!channelsResponse.ok) {
          throw new Error(`Failed to fetch channels: ${channelsResponse.statusText}`)
        }

        const { channels: channelsData } = await channelsResponse.json()
        
        if (!channelsData || channelsData.length === 0) {
          console.warn("No channels found")
          return
        }

        setChannels(channelsData.map((channel: { id: number; name: string | null }) => ({
          id: channel.id,
          name: channel.name ?? "",
        })))

        const ean = getEanFromVariants(product.variants)
        if (!ean) {
          console.warn("No EAN found in variants")
          return
        }

        // Initialize websiteStatus with loading state for all channels
        const initialStatus: Record<number, WebsiteStatus> = channelsData.reduce((acc: Record<number, WebsiteStatus>, channel: { id: number }) => {
          acc[channel.id] = { published: false, enabled: false, loading: true, error: false }
          return acc
        }, {})
        
        setWebsiteStatus(initialStatus)

        // Collect all async channel checks into a promise array
        const statusUpdates = channelsData.map(async (channel: { id: number }) => {
          try {
            const result = await checkProductOnChannel(channel.id, ean)
            return { id: channel.id, ...result }
          } catch (error) {
            console.error(`Error checking channel ${channel.id}:`, error)
            return { id: channel.id, published: false, error: true }
          }
        })

        // Wait for all channel status checks to complete
        const results = await Promise.all(statusUpdates)

        // Update the websiteStatus state with results
        setWebsiteStatus(prevStatus => {
          const updatedStatus = { ...prevStatus }
          results.forEach(({ id, published, error }) => {
            updatedStatus[id] = {
              ...updatedStatus[id],
              published,
              error,
              loading: false
            }
          })

          // Cache the results for future use
          setCachedData(product.id, channelsData.map((channel: { id: number; name: string | null }) => ({
            id: channel.id,
            name: channel.name ?? "",
          })), updatedStatus)

          return updatedStatus
        })
      } catch (error) {
        console.error("Error loading channels:", error)
      } finally {
        setIsLoadingChannels(false)
      }
    }

    loadChannelsAndStatus()
  }, [product?.variants, product?.id]) // Triggers when product changes

  if (!product) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Website status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Niet beschikbaar</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Website status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isLoadingChannels ? (
            // Show skeleton loaders while loading channels
            Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-6 w-11 rounded-full" />
                  </div>
                </div>
              </div>
            ))
          ) : (
            channels.map((channel) => {
            const status = websiteStatus[channel.id] || { published: false, enabled: false, loading: false }
            // Use activeChannelIds state which is synced with the database
            const isChannelActive = activeChannelIds.includes(channel.id)
            const isUpdating = updatingChannel === channel.id

            return (
              <div key={channel.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    {status.loading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                    ) : status.error ? (
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    ) : status.published ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{channel.name}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Publiceren</span>
                    <div className="relative">
                      <Switch
                        checked={isChannelActive}
                        disabled={isUpdating}
                        onCheckedChange={(checked) => handleToggleChannel(channel.id, checked)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )
          })
          )}
        </div>
      </CardContent>
    </Card>
  )
}