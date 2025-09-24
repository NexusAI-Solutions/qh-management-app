"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { ShoppingCart, DollarSign, TrendingUp, Euro, Loader2, Tag } from "lucide-react"
import { ProductVariant } from "@/app/types/product"
import { AnalyticsResponse, ProductAnalyticsData } from "@/app/types/analytics"


interface Product {
  id: number
  title: string | null
  variants: ProductVariant[]
}

interface AnalyticsTabProps {
  product: Product
}

export function AnalyticsTab({ product }: AnalyticsTabProps) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    product.variants[0] || null
  )
  const [analyticsData, setAnalyticsData] = useState<ProductAnalyticsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSales, setShowSales] = useState(false)
  const [showQuantity, setShowQuantity] = useState(true)

  const fetchAnalytics = async (variant: ProductVariant) => {
    if (!variant.ean) {
      setError("Geen EAN beschikbaar voor deze variant")
      setAnalyticsData(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/analytics/product/${variant.ean}`)
      const data: AnalyticsResponse = await response.json()

      if (data.success && data.data?.analytics) {
        setAnalyticsData(data.data.analytics)
      } else {
        setError("Geen analytics data beschikbaar")
        setAnalyticsData(null)
      }
    } catch {
      setError("Fout bij ophalen analytics data")
      setAnalyticsData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedVariant) {
      fetchAnalytics(selectedVariant)
    }
  }, [selectedVariant])


  // Get display value for variant in select
  const getVariantDisplayValue = (variant: ProductVariant): string => {
    return variant.title || `Variant ${variant.id}`
  }

  // Handle variant selection change
  const handleVariantChange = (value: string) => {
    const variant = product.variants.find(v => v.id.toString() === value)
    setSelectedVariant(variant || null)
  }

  // Calculate domains for both axes
  const maxQuantity = analyticsData?.weekly_sales
    ? Math.max(...analyticsData.weekly_sales.map(week => week.quantity))
    : 0;
  const quantityDomainMax = Math.ceil(maxQuantity * 1.2);

  const maxSales = analyticsData?.weekly_sales
    ? Math.max(...analyticsData.weekly_sales.map(week => week.sales))
    : 0;
  const salesDomainMax = Math.ceil(maxSales * 1.2);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground">Gegevens van de afgelopen 52 weken.</p>
        </div>
        <Select
          value={selectedVariant?.id.toString() || ""}
          onValueChange={handleVariantChange}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Selecteer variant" />
          </SelectTrigger>
          <SelectContent>
            {product.variants.sort((a, b) => (a.position ?? 999) - (b.position ?? 999)).map((variant) => (
              <SelectItem key={variant.id} value={variant.id.toString()}>
                {getVariantDisplayValue(variant)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-chart-1/10 rounded-lg">
                <ShoppingCart className="h-6 w-6 text-chart-1" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Totale verkopen</p>
                <p className="text-3xl font-bold">
                  {loading ? <Loader2 className="h-8 w-8 animate-spin" /> : analyticsData?.period_summary.total_quantity?.toLocaleString() || "0"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-chart-4/10 rounded-lg">
                <Euro className="h-6 w-6 text-chart-4" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Omzet</p>
                <p className="text-3xl font-bold">
                  {loading ? <Loader2 className="h-8 w-8 animate-spin" /> : `€${((analyticsData?.period_summary.total_sales || 0) / 1000).toFixed(1)}K`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-chart-3/10 rounded-lg">
                <TrendingUp className="h-6 w-6 text-chart-3" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gem. verkoopprijs</p>
                <p className="text-3xl font-bold">
                  {loading ? <Loader2 className="h-8 w-8 animate-spin" /> : analyticsData?.period_summary.total_quantity && analyticsData?.period_summary.total_sales
                    ? `€${(analyticsData.period_summary.total_sales / analyticsData.period_summary.total_quantity).toFixed(2)}`
                    : "€0.00"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-chart-2/10 rounded-lg">
                <Tag className="h-6 w-6 text-chart-2" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Inkoopprijs</p>
                <p className="text-3xl font-bold">
                  €{selectedVariant?.buyprice?.toFixed(2) || "0.00"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Verkopen per week</CardTitle>
              <p className="text-sm text-muted-foreground">
                Afgelopen 52 weken - {analyticsData?.period_start} tot {analyticsData?.period_end}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={showSales ? "default" : "outline"}
                size="sm"
                onClick={() => setShowSales(!showSales)}
                className="flex items-center gap-2"
              >
                <DollarSign className="h-4 w-4" />
                Omzet
              </Button>
              <Button
                variant={showQuantity ? "default" : "outline"}
                size="sm"
                onClick={() => setShowQuantity(!showQuantity)}
                className="flex items-center gap-2"
              >
                <ShoppingCart className="h-4 w-4" />
                Aantal
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-80">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-80">
              <div className="text-center">
                <p className="text-muted-foreground">{error}</p>
              </div>
            </div>
          ) : analyticsData?.weekly_sales.length && (showSales || showQuantity) ? (
            <ChartContainer
              config={{
                sales: {
                  label: "Omzet (€)",
                  color: "hsl(var(--chart-1))",
                },
                quantity: {
                  label: "Aantal",
                  color: "hsl(var(--chart-2))",
                },
              }}
              className="h-80 w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={analyticsData.weekly_sales.map((week, index) => ({
                    weekLabel: `Week ${week.week}`,
                    week: week.week,
                    year: week.year,
                    sales: week.sales,
                    quantity: week.quantity,
                    index: index + 1,
                  }))}
                  margin={{ top: 30, right: 80, left: 80, bottom: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="index"
                    tickFormatter={(value) => {
                      const dataPoint = analyticsData.weekly_sales[value - 1];
                      return dataPoint ? `${dataPoint.week}` : '';
                    }}
                  />
                  {showSales && (
                    <YAxis
                      yAxisId="sales"
                      orientation="left"
                      domain={[0, salesDomainMax]}
                      allowDataOverflow={false}
                      scale="linear"
                      tickFormatter={(value) => `€${value.toFixed(0)}`}
                    />
                  )}
                  {showQuantity && (
                    <YAxis
                      yAxisId="quantity"
                      orientation="right"
                      domain={[0, quantityDomainMax]}
                      allowDataOverflow={false}
                      scale="linear"
                      tickFormatter={(value) => value.toString()}
                    />
                  )}
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-sm">
                            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${1 + (showSales ? 1 : 0) + (showQuantity ? 1 : 0)}, 1fr)` }}>
                              <div className="flex flex-col">
                                <span className="text-[0.70rem] uppercase text-muted-foreground">
                                  Week
                                </span>
                                <span className="font-bold">
                                  {data.week} ({data.year})
                                </span>
                              </div>
                              {showSales && (
                                <div className="flex flex-col">
                                  <span className="text-[0.70rem] uppercase text-muted-foreground">
                                    Omzet
                                  </span>
                                  <span className="font-bold text-chart-1">
                                    €{data.sales.toFixed(2)}
                                  </span>
                                </div>
                              )}
                              {showQuantity && (
                                <div className="flex flex-col">
                                  <span className="text-[0.70rem] uppercase text-muted-foreground">
                                    Aantal
                                  </span>
                                  <span className="font-bold text-chart-2">
                                    {data.quantity}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {showSales && (
                    <Line
                      yAxisId="sales"
                      type="monotone"
                      dataKey="sales"
                      stroke="var(--color-sales)"
                      strokeWidth={2}
                      dot={false}
                    />
                  )}
                  {showQuantity && (
                    <Line
                      yAxisId="quantity"
                      type="monotone"
                      dataKey="quantity"
                      stroke="var(--color-quantity)"
                      strokeWidth={2}
                      dot={false}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : analyticsData?.weekly_sales.length && !showSales && !showQuantity ? (
            <div className="flex items-center justify-center h-80">
              <div className="text-center">
                <p className="text-muted-foreground">Selecteer ten minste één datatype om de grafiek te bekijken</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-80">
              <div className="text-center">
                <p className="text-muted-foreground">Geen verkoop data beschikbaar</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}