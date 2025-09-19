"use client"
import { VariantManager } from "@/components/product/content/variant-manager"
import { MultilingualContent } from "@/components/product/content/multilingual-content"
import { WebsiteStatusManager } from "@/components/product/content/website-status-manager"

interface ContentTabProps {
  product: {
    id: string
    title: string
    description?: string
    content?: string
    images: string[]
    active_channel_ids?: number[]
    variants: Array<{
      id: string
      title: string
      ean: string
      position: number
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
        <WebsiteStatusManager product={product} />
        {/* Variant Management */}
        <VariantManager variants={product.variants} />
      </div>

      <div>
        <MultilingualContent
          productTitle={product.title}
          productDescription={product.description}
          productContent={product.content}
          productImages={product.images}
        />
      </div>
    </div>
  )
}
