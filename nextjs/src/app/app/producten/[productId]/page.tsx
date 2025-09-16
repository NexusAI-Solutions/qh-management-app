"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Save, FileText, Euro, BarChart3 } from "lucide-react"
import { ProductHeader } from "@/components/product/product-header"
import { ContentTab } from "@/components/product/content/content-tab"
import { PricingTab } from "@/components/product/price-management/pricing-tab"
import { AnalyticsTab } from "@/components/product/analytics/analytics-tab"
import Link from "next/link"

// Mock product data
const productData = {
  id: "prod-001",
  title: "Premium Wireless Headphones",
  mainImage: "/331777d9e2a04a46bf61b1f6082a8ddc.png",
  brand: "Qualiy Heating",
  stats: {
    totalSales: 12847,
    averagePrice: 249.99,
    buyPrice: 125.0,
    averageMargin: 49.9,
  },
  variants: [
    { id: "var-001", name: "Black", ean: "1234567890123" },
    { id: "var-002", name: "White", ean: "1234567890124" },
    { id: "var-003", name: "Silver", ean: "1234567890125" },
  ],
}

export default function ProductDetailPage() {
  const [activeTab, setActiveTab] = useState("content")

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed top-16 left-0 right-0 z-50 border-b bg-card/50 backdrop-blur-sm py-4">
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm" className="text-xs md:text-sm">
              <Link href="/app/producten" aria-label="Terug naar Producten">
                <ArrowLeft className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Terug naar Producten</span>
                <span className="sm:hidden">Terug</span>
              </Link>
            </Button>
            <div className="text-xs md:text-sm text-muted-foreground hidden md:block">
              Producten / {productData.title}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" className="text-xs md:text-sm">
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
            <ProductHeader product={productData} />
          </div>
        </div>
        
        {/* Main Content Tabs */}
        <div className="py-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList variant="white" className="grid w-full grid-cols-3 max-w-lg">
              <TabsTrigger variant="white" value="content" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Content
              </TabsTrigger>
              <TabsTrigger variant="white" value="pricing" className="flex items-center gap-2">
                <Euro className="h-4 w-4" />
                Prijsbeheer
              </TabsTrigger>
              <TabsTrigger variant="white" value="analytics" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="mt-6">
              <ContentTab product={productData} />
            </TabsContent>

            <TabsContent value="pricing" className="mt-6">
              <PricingTab product={productData} />
            </TabsContent>

            <TabsContent value="analytics" className="mt-6">
              <AnalyticsTab product={productData} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
