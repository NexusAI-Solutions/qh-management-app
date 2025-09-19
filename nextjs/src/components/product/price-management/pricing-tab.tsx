"use client"

import { PriceManagementTable } from "@/components/product/price-management/price-management-table"
import { Repricer } from "@/components/product/price-management/repricer"

interface PricingTabProps {
  product: {
    id: string
    variants: Array<{
      id: string
      title: string
      ean: string
    }>
  }
}

export function PricingTab({ product }: PricingTabProps) {
  return (
    <div className="space-y-8">
      {/* Price Management Table */}
      <PriceManagementTable variants={product.variants} />

      <div className="max-w-3xl">
      <Repricer variants={product.variants} />
      </div>
    </div>
  )
}
