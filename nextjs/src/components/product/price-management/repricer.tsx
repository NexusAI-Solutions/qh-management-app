"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { ExternalLink } from "lucide-react"
import { ProductVariant } from "@/app/types/product"

interface CompetitorData {
  variantId: number
  competitors: {
    url1: string
    url2: string
    url3: string
  }
  minimumPrice: number
}

export function Repricer({ variants }: { variants: ProductVariant[] }) {
  const [selectedVariant, setSelectedVariant] = useState(variants[0]?.id.toString() || "")
  const [competitorData, setCompetitorData] = useState<CompetitorData[]>(
    variants.map((variant) => ({
      variantId: variant.id,
      competitors: {
        url1: "",
        url2: "",
        url3: "",
      },
      minimumPrice: 199.99,
    })),
  )

  const updateCompetitorUrl = (variantId: number, urlKey: string, url: string) => {
    setCompetitorData((prev) =>
      prev.map((data) =>
        data.variantId === variantId
          ? {
              ...data,
              competitors: { ...data.competitors, [urlKey]: url },
            }
          : data,
      ),
    )
  }

  const updateMinimumPrice = (variantId: number, price: number) => {
    setCompetitorData((prev) =>
      prev.map((data) => (data.variantId === variantId ? { ...data, minimumPrice: price } : data)),
    )
  }

  const currentVariant = variants.find((v) => v.id.toString() === selectedVariant)
  const variantData = competitorData.find((data) => data.variantId.toString() === selectedVariant)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Repricer</CardTitle>
          <Select value={selectedVariant} onValueChange={setSelectedVariant}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Selecteer variant" />
            </SelectTrigger>
            <SelectContent>
              {variants.map((variant) => (
                <SelectItem key={variant.id} value={variant.id.toString()}>
                  {variant.title || `Variant ${variant.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground">
          <strong>Let op:</strong> de repricer past enkel de prijzen aan op nederlandstalige Lightspeed kanalen.
        </p>
      </CardHeader>
      <CardContent>
        {currentVariant && (
          <div className="space-y-6">
            <div className="grid gap-4">
              <div className="space-y-4">
                <Label className="text-sm font-medium">Concurrent URLs</Label>
                <div className="grid gap-3">
                  {[1, 2, 3].map((num) => (
                    <div key={num} className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground w-20">Concurrent {num}</Label>
                      <div className="flex-1 relative max-w-xl">
                        <Input
                          type="url"
                          placeholder={`https://concurrent${num}.com/product-url`}
                          value={variantData?.competitors[`url${num}` as keyof typeof variantData.competitors] || ""}
                          onChange={(e) => updateCompetitorUrl(currentVariant.id, `url${num}`, e.target.value)}
                          className="text-sm pr-10"
                        />
                        {variantData?.competitors[`url${num}` as keyof typeof variantData.competitors] && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                            onClick={() =>
                              window.open(
                                variantData.competitors[`url${num}` as keyof typeof variantData.competitors],
                                "_blank",
                              )
                            }
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Inkoopprijs: €123,00</Label>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Minimumprijs</Label>
                <div className="flex items-center gap-2">
                  <div className="relative w-32">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground font-medium">
                      €
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      value={variantData?.minimumPrice || 0}
                      onChange={(e) => updateMinimumPrice(currentVariant.id, Number.parseFloat(e.target.value) || 0)}
                      className="text-center font-mono text-sm pl-8"
                      placeholder="0.00"
                    />
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Minimumprijs bescherming
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}