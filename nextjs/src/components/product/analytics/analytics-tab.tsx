"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { ShoppingCart, DollarSign, TrendingUp, Euro } from "lucide-react"

const variantData = {
  Black: {
    totalSales: 5420,
    revenue: 1355000,
    avgPrice: 249.99,
    buyPrice: 125.0,
    priceHistory: [
      { month: "Jan", price: 245.99 },
      { month: "Feb", price: 249.99 },
      { month: "Mar", price: 249.99 },
      { month: "Apr", price: 254.99 },
      { month: "May", price: 249.99 },
      { month: "Jun", price: 249.99 },
      { month: "Jul", price: 249.99 },
      { month: "Aug", price: 259.99 },
      { month: "Sep", price: 249.99 },
      { month: "Oct", price: 249.99 },
      { month: "Nov", price: 239.99 },
      { month: "Dec", price: 249.99 },
    ],
    salesHistory: [
      { month: "Jan", sales: 420 },
      { month: "Feb", sales: 380 },
      { month: "Mar", sales: 450 },
      { month: "Apr", sales: 520 },
      { month: "May", sales: 480 },
      { month: "Jun", sales: 550 },
      { month: "Jul", sales: 620 },
      { month: "Aug", sales: 580 },
      { month: "Sep", sales: 490 },
      { month: "Oct", sales: 460 },
      { month: "Nov", sales: 510 },
      { month: "Dec", sales: 570 },
    ],
  },
  White: {
    totalSales: 4180,
    revenue: 1045000,
    avgPrice: 249.99,
    buyPrice: 125.0,
    priceHistory: [
      { month: "Jan", price: 245.99 },
      { month: "Feb", price: 249.99 },
      { month: "Mar", price: 249.99 },
      { month: "Apr", price: 254.99 },
      { month: "May", price: 249.99 },
      { month: "Jun", price: 249.99 },
      { month: "Jul", price: 249.99 },
      { month: "Aug", price: 259.99 },
      { month: "Sep", price: 249.99 },
      { month: "Oct", price: 249.99 },
      { month: "Nov", price: 239.99 },
      { month: "Dec", price: 249.99 },
    ],
    salesHistory: [
      { month: "Jan", sales: 320 },
      { month: "Feb", sales: 290 },
      { month: "Mar", sales: 350 },
      { month: "Apr", sales: 380 },
      { month: "May", sales: 360 },
      { month: "Jun", sales: 400 },
      { month: "Jul", sales: 420 },
      { month: "Aug", sales: 390 },
      { month: "Sep", sales: 340 },
      { month: "Oct", sales: 330 },
      { month: "Nov", sales: 370 },
      { month: "Dec", sales: 410 },
    ],
  },
  Silver: {
    totalSales: 3247,
    revenue: 811750,
    avgPrice: 249.99,
    buyPrice: 125.0,
    priceHistory: [
      { month: "Jan", price: 245.99 },
      { month: "Feb", price: 249.99 },
      { month: "Mar", price: 249.99 },
      { month: "Apr", price: 254.99 },
      { month: "May", price: 249.99 },
      { month: "Jun", price: 249.99 },
      { month: "Jul", price: 249.99 },
      { month: "Aug", price: 259.99 },
      { month: "Sep", price: 249.99 },
      { month: "Oct", price: 249.99 },
      { month: "Nov", price: 239.99 },
      { month: "Dec", price: 249.99 },
    ],
    salesHistory: [
      { month: "Jan", sales: 250 },
      { month: "Feb", sales: 220 },
      { month: "Mar", sales: 280 },
      { month: "Apr", sales: 310 },
      { month: "May", sales: 290 },
      { month: "Jun", sales: 320 },
      { month: "Jul", sales: 340 },
      { month: "Aug", sales: 310 },
      { month: "Sep", sales: 270 },
      { month: "Oct", sales: 260 },
      { month: "Nov", sales: 290 },
      { month: "Dec", sales: 320 },
    ],
  },
}

interface AnalyticsTabProps {
  product: {
    id: string
    title: string
    variants: Array<{
      id: string
      name: string
      ean: string
    }>
  }
}

export function AnalyticsTab({ product }: AnalyticsTabProps) {
  const [selectedVariant, setSelectedVariant] = useState(product.variants[0]?.name || "Black")

  const currentData = variantData[selectedVariant as keyof typeof variantData]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics</h2>
          <p className="text-muted-foreground">Prestatie-inzichten per variant</p>
        </div>
        <Select value={selectedVariant} onValueChange={setSelectedVariant}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Selecteer variant" />
          </SelectTrigger>
          <SelectContent>
            {product.variants.map((variant) => (
              <SelectItem key={variant.id} value={variant.name}>
                {variant.name}
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
                <p className="text-sm text-muted-foreground">Totale Verkopen</p>
                <p className="text-3xl font-bold">{currentData.totalSales.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-chart-2/10 rounded-lg">
                <DollarSign className="h-6 w-6 text-chart-2" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Omzet</p>
                <p className="text-3xl font-bold">€{(currentData.revenue / 1000000).toFixed(1)}M</p>
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
                <p className="text-sm text-muted-foreground">Gem. Prijs</p>
                <p className="text-3xl font-bold">€{currentData.avgPrice}</p>
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
                <p className="text-sm text-muted-foreground">Inkoopprijs</p>
                <p className="text-3xl font-bold">€{currentData.buyPrice}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Gemiddelde Prijs</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                price: {
                  label: "Prijs (€)",
                  color: "hsl(var(--chart-1))",
                },
              }}
              className="h-80"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={currentData.priceHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="price" stroke="var(--color-price)" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gemiddelde Verkopen</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                sales: {
                  label: "Verkopen",
                  color: "hsl(var(--chart-2))",
                },
              }}
              className="h-80"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={currentData.salesHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="sales" stroke="var(--color-sales)" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
