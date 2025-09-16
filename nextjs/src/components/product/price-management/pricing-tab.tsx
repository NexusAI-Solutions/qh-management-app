"use client"

import { PriceManagementTable } from "@/components/product/price-management/price-management-table"
import { Repricer } from "@/components/product/price-management/repricer"

interface PricingTabProps {
  product: {
    id: string
    variants: Array<{
      id: string
      name: string
      ean: string
    }>
  }
}

export function PricingTab({ product }: PricingTabProps) {
  return (
    <div className="space-y-8">
      {/* Price Management Table */}
      <PriceManagementTable variants={product.variants} />

      <Repricer variants={product.variants} />
    </div>
  )
}
