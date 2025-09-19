"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

interface Variant {
  id: string
  title: string
  ean: string
}

interface PriceData {
  variantId: string
  prices: Record<string, number>
  margins: Record<string, number>
  buyPrice: number // Added buy price per variant
}

const countries = [
  { code: "nl", name: "Netherlands", currency: "EUR", flag: "🇳🇱" },
  { code: "de", name: "Germany", currency: "EUR", flag: "🇩🇪" },
  { code: "fr", name: "France", currency: "EUR", flag: "🇫🇷" },
  { code: "es", name: "Spain", currency: "EUR", flag: "🇪🇸" },
]

export function PriceManagementTable({ variants }: { variants: Variant[] }) {
  const [priceData, setPriceData] = useState<PriceData[]>(
    variants.map((variant) => {
      const buyPrice = 125.0
      return {
        variantId: variant.id,
        buyPrice,
        prices: {
          nl: 249.99,
          de: 259.99,
          fr: 269.99,
          es: 239.99,
        },
        margins: {
          nl: ((249.99 - buyPrice) / 249.99) * 100,
          de: ((259.99 - buyPrice) / 259.99) * 100,
          fr: ((269.99 - buyPrice) / 269.99) * 100,
          es: ((239.99 - buyPrice) / 239.99) * 100,
        },
      }
    }),
  )

  const updatePrice = (variantId: string, countryCode: string, price: number) => {
    setPriceData((prev) =>
      prev.map((data) => {
        if (data.variantId === variantId) {
          const newMargin = ((price - data.buyPrice) / price) * 100
          return {
            ...data,
            prices: { ...data.prices, [countryCode]: price },
            margins: { ...data.margins, [countryCode]: newMargin },
          }
        }
        return data
      }),
    )
  }

  const formatMargin = (margin: number) => `${margin.toFixed(1)}%`

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg md:text-xl">Prijsbeheer</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 md:p-4 font-medium w-32 md:w-48">
                  <span className="text-sm md:text-base">Variant</span>
                </th>
                {countries.map((country) => (
                  <th key={country.code} className="text-center p-2 md:p-4 font-medium min-w-28 md:min-w-36">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-base md:text-lg">{country.flag}</span>
                      <span className="text-xs md:text-sm font-medium hidden sm:block">{country.name}</span>
                      <span className="text-xs font-medium sm:hidden">{country.code.toUpperCase()}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {variants.map((variant, index) => {
                const variantPriceData = priceData.find((data) => data.variantId === variant.id)
                return (
                  <tr
                    key={variant.id}
                    className={`${index !== variants.length - 1 ? "border-b" : ""} hover:bg-muted/25 transition-colors`}
                  >
                    <td className="p-2 md:p-4">
                      <div className="space-y-1 md:space-y-2">
                        <div className="font-medium text-xs md:text-sm">{variant.title}</div>
                        <div className="text-xs text-muted-foreground font-mono break-all">{variant.ean}</div>
                        <div className="text-xs text-muted-foreground">
                          <span className="hidden sm:inline">Inkoopprijs: </span>
                          <span className="sm:hidden">Inkoop: </span>
                          <span className="font-medium">€{variantPriceData?.buyPrice.toFixed(2) || "0.00"}</span>
                        </div>
                      </div>
                    </td>
                    {countries.map((country) => (
                      <td key={country.code} className="p-2 md:p-4">
                        <div className="space-y-2 md:space-y-3">
                          <div className="space-y-1">
                            <div className="relative flex justify-center">
                              <span className="absolute left-2 md:left-14 top-1/2 transform -translate-y-1/2 text-xs md:text-sm text-muted-foreground font-medium">
                                €
                              </span>
                              <Input
                                type="number"
                                step="0.01"
                                value={variantPriceData?.prices[country.code] || 0}
                                onChange={(e) =>
                                  updatePrice(variant.id, country.code, Number.parseFloat(e.target.value) || 0)
                                }
                                className="text-center font-mono text-xs md:text-sm h-7 md:h-8 pl-6 md:pl-8 w-24 md:w-32"
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                          <div className="text-center">
                            <Badge
                              variant="outline"
                              className={`text-xs font-medium ${
                                (variantPriceData?.margins[country.code] || 0) > 40
                                  ? "border-green-200 text-green-700 bg-green-50"
                                  : (variantPriceData?.margins[country.code] || 0) > 20
                                    ? "border-yellow-200 text-yellow-700 bg-yellow-50"
                                    : "border-red-200 text-red-700 bg-red-50"
                              }`}
                            >
                              {formatMargin(variantPriceData?.margins[country.code] || 0)}
                            </Badge>
                          </div>
                        </div>
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
