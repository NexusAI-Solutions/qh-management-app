"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ExternalLink, Save, X } from "lucide-react"
import { toast } from "sonner"

import { ProductVariant } from "@/app/types/product"

export interface RepricerState {
  ean: string
  urls: {
    url1: string
    url2: string
    url3: string
  }
  minimumPrice: number
  isRepricingEnabled: boolean
}

export function Repricer({ variants }: { variants: ProductVariant[] }) {
  const [selectedVariant, setSelectedVariant] = useState(variants[0]?.ean || "")
  const [repricerData, setRepricerData] = useState<RepricerState[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [modifiedEans, setModifiedEans] = useState<Set<string>>(new Set())

  // Initialize repricer data from variants
  useEffect(() => {
    const initializeRepricerData = () => {
      try {
        const initialData = variants
          .filter((variant) => variant.ean) // Only variants with EAN
          .map((variant) => {
            const repricer = variant.repricer;
            const urls = repricer?.urls as { url1?: string; url2?: string; url3?: string } | null;
            return {
              ean: variant.ean!,
              urls: {
                url1: urls?.url1 || "",
                url2: urls?.url2 || "",
                url3: urls?.url3 || "",
              },
              minimumPrice: repricer?.minimum_price || 0,
              isRepricingEnabled: repricer?.is_active || false,
            };
          });

        // Only update data for EANs that haven't been locally modified
        setRepricerData((prevData) => {
          const newData = [...prevData];

          initialData.forEach((variantData) => {
            if (!modifiedEans.has(variantData.ean)) {
              // Find existing data index or add new
              const existingIndex = newData.findIndex(d => d.ean === variantData.ean);
              if (existingIndex >= 0) {
                newData[existingIndex] = variantData;
              } else {
                newData.push(variantData);
              }
            }
          });

          return newData;
        });

        // Set first variant with EAN as selected if current selection is empty
        if (!selectedVariant && initialData.length > 0) {
          setSelectedVariant(initialData[0].ean);
        }
      } catch (err) {
        setError("Failed to initialize repricer data");
        console.error("Error initializing repricer data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeRepricerData();
  }, [variants, selectedVariant, modifiedEans]);

  const updateCompetitorUrl = (ean: string, urlKey: string, url: string) => {
    setRepricerData((prev) =>
      prev.map((data) =>
        data.ean === ean
          ? {
              ...data,
              urls: { ...data.urls, [urlKey]: url },
            }
          : data,
      ),
    )
  }

  const clearCompetitorUrl = (ean: string, urlKey: string) => {
    updateCompetitorUrl(ean, urlKey, "");
  }

  const updateMinimumPrice = (ean: string, price: number) => {
    setRepricerData((prev) =>
      prev.map((data) => (data.ean === ean ? { ...data, minimumPrice: price } : data)),
    )
  }

  const toggleRepricing = (ean: string, enabled: boolean) => {
    setRepricerData((prev) =>
      prev.map((data) => (data.ean === ean ? { ...data, isRepricingEnabled: enabled } : data)),
    )
  }

  const handleSave = async () => {
    if (!selectedVariant) return;

    const currentData = repricerData.find((data) => data.ean === selectedVariant);
    if (!currentData) {
      toast.error("Geen data gevonden voor geselecteerde variant");
      return;
    }

    // Validate that at least one URL is filled (only when repricer is enabled)
    if (currentData.isRepricingEnabled && !hasAtLeastOneUrl(currentData)) {
      toast.error("Vul tenminste één concurrent URL in wanneer repricing is ingeschakeld");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {

      const response = await fetch(`/api/prices/${selectedVariant}/repricer`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_active: currentData.isRepricingEnabled,
          minimum_price: currentData.minimumPrice,
          urls: currentData.urls,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save repricer data');
      }

      const result = await response.json();
      console.log('Repricer data saved successfully:', result);

      // Update the local state with the server response
      if (result.repricer) {
        const urls = result.repricer.urls as { url1?: string; url2?: string; url3?: string } | null;
        setRepricerData((prev) =>
          prev.map((data) =>
            data.ean === selectedVariant
              ? {
                  ...data,
                  isRepricingEnabled: result.repricer.is_active || false,
                  minimumPrice: result.repricer.minimum_price || 0,
                  urls: {
                    url1: urls?.url1 || "",
                    url2: urls?.url2 || "",
                    url3: urls?.url3 || "",
                  },
                }
              : data,
          ),
        );

        // Mark this EAN as modified to prevent re-initialization from stale variant data
        setModifiedEans((prev) => new Set([...prev, selectedVariant]));

        // Show success toast
        toast.success("Repricer data opgeslagen");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      toast.error(`Fout bij opslaan: ${errorMessage}`);
      console.error('Error saving repricer data:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const currentVariant = variants.find((v) => v.ean === selectedVariant);
  const variantData = repricerData.find((data) => data.ean === selectedVariant);

  // Get display value for variant in select (identical to analytics tab)
  const getVariantDisplayValue = (variant: ProductVariant): string => {
    return variant.title || `Variant ${variant.id}`
  }

  // Check if current variant has at least one URL filled
  const hasAtLeastOneUrl = (data: RepricerState): boolean => {
    return data.urls.url1.trim() !== "" || data.urls.url2.trim() !== "" || data.urls.url3.trim() !== "";
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Repricer</CardTitle>
          <div className="flex items-center gap-3">
            <Select value={selectedVariant} onValueChange={setSelectedVariant}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Selecteer variant" />
              </SelectTrigger>
              <SelectContent>
                {variants.filter(v => v.ean).sort((a, b) => (a.position ?? 999) - (b.position ?? 999)).map((variant) => (
                  <SelectItem key={variant.id} value={variant.ean!}>
                    {getVariantDisplayValue(variant)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleSave} disabled={isSaving || isLoading || !currentVariant || !variantData || (variantData.isRepricingEnabled && !hasAtLeastOneUrl(variantData))} size="sm">
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Wijzigingen opslaan..." : "Wijzigingen opslaan"}
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground pt-2">
          <strong>Let op:</strong> de repricer past enkel de prijzen aan op nederlandstalige Lightspeed kanalen.
        </p>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Repricer data wordt geladen...</div>
          </div>
        ) : !currentVariant ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Geen variant geselecteerd met EAN code.</div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Repricing inschakelen</Label>
                <p className="text-xs text-muted-foreground">
                  Schakel automatische prijsaanpassingen in voor {currentVariant.title || `Variant ${currentVariant.id}`}
                </p>
              </div>
              <Switch
                checked={variantData?.isRepricingEnabled || false}
                onCheckedChange={(checked) => toggleRepricing(currentVariant.ean!, checked)}
              />
            </div>

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
                          value={variantData?.urls[`url${num}` as keyof typeof variantData.urls] || ""}
                          onChange={(e) => updateCompetitorUrl(currentVariant.ean!, `url${num}`, e.target.value)}
                          className="text-sm pr-16"
                          disabled={!variantData?.isRepricingEnabled} // Disable inputs when repricing is off
                        />
                        {variantData?.urls[`url${num}` as keyof typeof variantData.urls] && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="absolute right-8 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                              onClick={() => clearCompetitorUrl(currentVariant.ean!, `url${num}`)}
                              title="Clear URL"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                              onClick={() =>
                                window.open(
                                  variantData.urls[`url${num}` as keyof typeof variantData.urls],
                                  "_blank",
                                )
                              }
                              title="Open URL"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Inkoopprijs: €{currentVariant.buyprice?.toFixed(2) || '0,00'}
                </Label>
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
                      onChange={(e) => updateMinimumPrice(currentVariant.ean!, Number.parseFloat(e.target.value) || 0)}
                      className="text-center font-mono text-sm pl-8"
                      placeholder="0.00"
                      disabled={!variantData?.isRepricingEnabled} // Disable input when repricing is off
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
