"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { ProductVariant } from "@/app/types/product"
import { toast } from "sonner"
import { Save, Loader2, CheckCircle, AlertCircle, AlertTriangle } from "lucide-react"

const MARGIN = 30 // Minimum acceptable margin percentage

interface PriceData {
  variantId: number
  prices: Record<string, number | null>
  margins: Record<string, number>
  buyPrice: number
  hasChanges: boolean
}

const countries = [
  { code: "nl", name: "Netherlands", currency: "EUR", flag: "🇳🇱" },
  { code: "de", name: "Germany", currency: "EUR", flag: "🇩🇪" },
  { code: "fr", name: "France", currency: "EUR", flag: "🇫🇷" },
  { code: "es", name: "Spain", currency: "EUR", flag: "🇪🇸" },
]

export function PriceManagementTable({ variants }: { variants: ProductVariant[] }) {
  const [priceData, setPriceData] = useState<PriceData[]>(
    variants.map((variant) => {
      const buyPrice = 125.0

      // Initialize prices from ProductVariant's price array or use defaults
      const initialPrices: Record<string, number | null> = {}
      const initialMargins: Record<string, number> = {}

      countries.forEach((country) => {
        // Try to find existing price for this country from variant.price array
        const existingPrice = variant.price?.find(p =>
          p.country_code?.toLowerCase() === country.code.toLowerCase()
        )
        const price = existingPrice?.price ?? null

        initialPrices[country.code] = price
        initialMargins[country.code] = price && price > 0 ? ((price - buyPrice) / buyPrice) * 100 : 0
      })

      return {
        variantId: variant.id,
        buyPrice,
        prices: initialPrices,
        margins: initialMargins,
        hasChanges: false,
      }
    }),
  )

  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [showMarginDialog, setShowMarginDialog] = useState(false)
  const [lowMarginVariants, setLowMarginVariants] = useState<Array<{variant: ProductVariant, margin: number, country: string}>>([])


  const updatePrice = (variantId: number, countryCode: string, price: number | null) => {
    setPriceData((prev) =>
      prev.map((data) => {
        if (data.variantId === variantId) {
          const newMargin = price && price > 0 ? ((price - data.buyPrice) / data.buyPrice) * 100 : 0
          return {
            ...data,
            prices: { ...data.prices, [countryCode]: price },
            margins: { ...data.margins, [countryCode]: newMargin },
            hasChanges: true,
          }
        }
        return data
      }),
    )
  }

  const hasAnyChanges = priceData.some(data => data.hasChanges)

  // Validate margins and collect variants with low margins
  const validateMargins = () => {
    const lowMargins: Array<{variant: ProductVariant, margin: number, country: string}> = []

    for (const data of priceData) {
      if (!data.hasChanges) continue

      const variant = variants.find(v => v.id === data.variantId)
      if (!variant) continue

      countries.forEach((country) => {
        const margin = data.margins[country.code]
        const price = data.prices[country.code]

        // Only check if there's a price set and margin is below 20%
        if (price && price > 0 && margin < MARGIN) {
          lowMargins.push({
            variant,
            margin,
            country: country.name
          })
        }
      })
    }

    return lowMargins
  }

  // Function to handle the actual save process
  const performSave = async () => {
    setSaveState('saving')
    let successCount = 0
    let errorCount = 0

    try {
      for (const data of priceData) {
        if (!data.hasChanges) continue

        const variant = variants.find(v => v.id === data.variantId)
        if (!variant?.ean) {
          errorCount++
          continue
        }

        const priceUpdates = countries
          .filter(country => data.prices[country.code] !== null)
          .map(country => ({
            country_code: country.code.toUpperCase(),
            price: data.prices[country.code],
          }))

        try {
          const response = await fetch(`/api/prices/${encodeURIComponent(variant.ean)}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(priceUpdates),
          })

          if (response.ok) {
            successCount++
          } else {
            errorCount++
            console.error(`Failed to save prices for variant ${variant.id}:`, await response.text())
          }
        } catch (error) {
          errorCount++
          console.error(`Error saving prices for variant ${variant.id}:`, error)
        }
      }

      if (successCount > 0) {
        setPriceData(prev => prev.map(data => ({ ...data, hasChanges: false })))
        setSaveState('success')
        toast.success(`Prijzen opgeslagen`, {
          description: `Prijzen succesvol opgeslagen voor ${successCount} variant${successCount > 1 ? 'en' : ''}.`
        })

        setTimeout(() => {
          setSaveState('idle')
        }, 2000)
      } else if (errorCount > 0) {
        setSaveState('error')
        toast.error(`Fout bij opslaan prijzen`, {
          description: `Kon prijzen niet opslaan voor ${errorCount} variant${errorCount > 1 ? 'en' : ''}.`
        })

        setTimeout(() => {
          setSaveState('idle')
        }, 3000)
      }
    } catch (error) {
      setSaveState('error')
      toast.error('Onverwachte fout', {
        description: 'Er is een onverwachte fout opgetreden bij het opslaan van prijzen.'
      })
      console.error('Save prices error:', error)

      setTimeout(() => {
        setSaveState('idle')
      }, 3000)
    }
  }

  // Main save function with margin validation
  const saveAllPrices = async () => {
    // First, validate margins
    const lowMargins = validateMargins()

    if (lowMargins.length > 0) {
      // Show dialog for confirmation
      setLowMarginVariants(lowMargins)
      setShowMarginDialog(true)
      return
    }

    // No low margins, proceed with save
    await performSave()
  }

  // Handle dialog confirmation
  const handleConfirmSave = async () => {
    setShowMarginDialog(false)
    await performSave()
  }

  // Handle dialog cancellation
  const handleCancelSave = () => {
    setShowMarginDialog(false)
    setLowMarginVariants([])
  }

  const formatMargin = (margin: number) => `${margin.toFixed(1)}%`

  const getSaveButtonContent = () => {
    switch (saveState) {
      case 'saving':
        return (
          <>
            <Loader2 className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2 animate-spin" />
            <span className="hidden sm:inline">Opslaan...</span>
            <span className="sm:hidden">...</span>
          </>
        )
      case 'success':
        return (
          <>
            <CheckCircle className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Opgeslagen</span>
            <span className="sm:hidden">✓</span>
          </>
        )
      case 'error':
        return (
          <>
            <AlertCircle className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Fout</span>
            <span className="sm:hidden">!</span>
          </>
        )
      default:
        return (
          <>
            <Save className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Wijzigingen opslaan</span>
            <span className="sm:hidden">Opslaan</span>
          </>
        )
    }
  }

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg md:text-xl">Prijsbeheer</CardTitle>
          <Button
            size="sm"
            className="text-xs md:text-sm ml-auto"
            onClick={saveAllPrices}
            disabled={saveState === 'saving' || !hasAnyChanges}
            variant={saveState === 'error' ? 'destructive' : 'default'}
          >
            {getSaveButtonContent()}
          </Button>
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
                        <div className="font-medium text-xs md:text-sm">
                          {variant.title || `Variant ${variant.id}`}
                        </div>
                        {variant.ean && (
                          <div className="text-xs text-muted-foreground font-mono break-all">
                            {variant.ean}
                          </div>
                        )}
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
                                value={variantPriceData?.prices[country.code] || ""}
                                onChange={(e) =>
                                  updatePrice(variant.id, country.code, e.target.value === "" ? null : Number.parseFloat(e.target.value) || 0)
                                }
                                className="text-center font-mono text-xs md:text-sm h-7 md:h-8 pl-6 md:pl-8 w-24 md:w-32"
                                placeholder="0.00"
                                disabled={!variant.ean}
                              />
                            </div>
                          </div>
                          <div className="text-center">
                            <Badge
                              variant="outline"
                              className={`text-xs font-medium ${
                                (variantPriceData?.margins[country.code] || 0) > 50
                                  ? "border-green-200 text-green-700 bg-green-50"
                                  : (variantPriceData?.margins[country.code] || 0) > MARGIN
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

    {/* Low Margin Warning Dialog */}
    <Dialog open={showMarginDialog} onOpenChange={setShowMarginDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Lage marges gedetecteerd
          </DialogTitle>
          <DialogDescription>
            De volgende prijzen hebben een marge onder de {MARGIN}%. Weet je zeker dat je wilt doorgaan?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-60 overflow-y-auto">
          {lowMarginVariants.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex-1">
                <div className="font-medium text-sm">
                  {item.variant.title || `Variant ${item.variant.id}`}
                </div>
                <div className="text-xs text-muted-foreground">
                  {item.country}
                </div>
              </div>
              <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-100">
                {item.margin.toFixed(1)}% marge
              </Badge>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancelSave}>
            Annuleren
          </Button>
          <Button onClick={handleConfirmSave} className="bg-amber-600 hover:bg-amber-700">
            Toch opslaan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
  )
}