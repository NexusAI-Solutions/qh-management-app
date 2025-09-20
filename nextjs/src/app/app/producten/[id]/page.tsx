"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, FileText, Euro, BarChart3, Save } from "lucide-react"
import { ProductHeader } from "@/components/product/product-header"
import { ContentTab } from "@/components/product/content/content-tab"
import { PricingTab } from "@/components/product/price-management/pricing-tab"
import { AnalyticsTab } from "@/components/product/analytics/analytics-tab"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ApiProduct } from "@/app/types/product"   // <-- use ApiProduct

// Skeleton component for the product header
function ProductHeaderSkeleton() {
  return (
    <div className="py-6 space-y-4">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Image skeleton */}
        <Skeleton className="w-20 h-20 rounded-lg" />
        
        {/* Product info skeleton */}
        <div className="flex-1 space-y-3">
          <Skeleton className="h-6 w-64" />
          <div className="flex gap-4 pt-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </div>
    </div>
  )
}

// Skeleton component for tab content
function TabContentSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-24 w-full" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    </div>
  )
}

export default function ProductDetailPage() {
  const [activeTab, setActiveTab] = useState("content")
  const [productData, setProductData] = useState<ApiProduct | null>(null)  // <-- ApiProduct
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const params = useParams()
  const router = useRouter()
  const productId = Array.isArray(params.id) ? params.id[0] : params.id

  useEffect(() => {
    async function fetchProduct() {
      if (!productId || productId === "[id]") {
        console.log("[v0] No valid product ID found")
        setError("No product ID provided")
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        // Call the API endpoint instead of direct Supabase
        const response = await fetch(`/api/products/${productId}`, {
          credentials: 'include', // Important for auth cookies
          headers: {
            'Content-Type': 'application/json',
          }
        })

        if (!response.ok) {
          // Handle different error statuses
          if (response.status === 401) {
            // Unauthorized - redirect to login
            router.push('/auth/login')
            return
          } else if (response.status === 404) {
            throw new Error('Product not found')
          } else if (response.status === 400) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Invalid request')
          } else {
            throw new Error('Failed to fetch product')
          }
        }

        const data: ApiProduct = await response.json()     // <-- ApiProduct
        console.log("[v0] Product data received:", data)
        setProductData(data)
        
      } catch (err) {
        console.log("[v0] Error caught:", err)
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch product"
        console.log("[v0] Error message:", errorMessage)
        setError(errorMessage)
      } finally {
        console.log("[v0] Setting loading to false")
        setLoading(false)
      }
    }

    fetchProduct()
  }, [productId, params, router])

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        {/* Fixed header bar - visible even in error state */}
        <div className="fixed top-16 left-0 right-0 z-50 border-b bg-card/50 backdrop-blur-sm py-4">
          <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto">
            <div className="flex items-center gap-4">
              <Button asChild variant="outline" size="sm" className="text-xs md:text-sm bg-transparent">
                <Link href="/app/producten" aria-label="Terug naar producten">
                  <ArrowLeft className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Terug naar producten</span>
                  <span className="sm:hidden">Terug</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Error content */}
        <div className="pt-32 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-lg font-semibold mb-2">Product niet gevonden</h2>
            <p className="text-muted-foreground mb-4">{error || "Het product kon niet worden geladen."}</p>
            <Button asChild variant="outline">
              <Link href="/app/producten" aria-label="Terug naar Producten">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Terug naar Producten
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed header bar - always visible */}
      <div className="fixed top-16 left-0 right-0 z-50 border-b bg-card/50 backdrop-blur-sm py-4">
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto">
          <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="sm" className="text-xs md:text-sm bg-transparent">
              <Link href="/app/producten" aria-label="Terug naar producten">
                <ArrowLeft className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Terug naar producten</span>
                <span className="sm:hidden">Terug</span>
              </Link>
            </Button>
            <div className="text-xs md:text-sm text-muted-foreground hidden md:block">
              {loading ? (
                <Skeleton className="h-4 w-48" />
              ) : (
                <>Producten / {productData?.title || "Onbekend Product"}</>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              className="text-xs md:text-sm"
              disabled={loading || !productData}
            >
              <Save className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Wijzigingen opslaan</span>
              <span className="sm:hidden">Opslaan</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="">
        {/* Fixed Product Header */}
        <div className="pt-16 bg-white shadow-sm mx-[calc(50%-50vw)] w-screen border-b">
          <div className="px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto">
            {loading ? (
              <ProductHeaderSkeleton />
            ) : (
              productData && <ProductHeader product={productData} />
            )}
          </div>
        </div>

        {/* Main Content Tabs */}
        <div className="py-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList variant="white" className="grid w-full grid-cols-3 max-w-lg">
              <TabsTrigger 
                variant="white" 
                value="content" 
                className="flex items-center gap-2"
                disabled={loading}
              >
                <FileText className="h-4 w-4" />
                Content
              </TabsTrigger>
              <TabsTrigger 
                variant="white" 
                value="pricing" 
                className="flex items-center gap-2"
                disabled={loading}
              >
                <Euro className="h-4 w-4" />
                Prijsbeheer
              </TabsTrigger>
              <TabsTrigger 
                variant="white" 
                value="analytics" 
                className="flex items-center gap-2"
                disabled={loading}
              >
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="mt-6">
              {loading ? (
                <TabContentSkeleton />
              ) : (
                productData && <ContentTab product={productData} />
              )}
            </TabsContent>

            <TabsContent value="pricing" className="mt-6">
              {loading ? (
                <TabContentSkeleton />
              ) : (
                productData && <PricingTab product={productData} />
              )}
            </TabsContent>

            <TabsContent value="analytics" className="mt-6">
              {loading ? (
                <TabContentSkeleton />
              ) : (
                productData && <AnalyticsTab product={productData} />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
