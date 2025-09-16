"use client"
import { VariantManager } from "@/components/product/content/variant-manager"
import { MultilingualContent } from "@/components/product/content/multilingual-content"
import { WebsiteStatusManager } from "@/components/product/content/website-status-manager"

interface ContentTabProps {
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

export function ContentTab({ product }: ContentTabProps) {
  return (
    <div className="space-y-6 md:space-y-8">
      {/* Website Status Management - 2/3 width */}
      {/* Variant Management - 1/3 width */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Website Status Management */}
        <WebsiteStatusManager />
        {/* Variant Management */}
        <VariantManager variants={product.variants} />
      </div>

      <div>
        <MultilingualContent />
      </div>
    </div>
  )
}
