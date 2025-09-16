import Image from "next/image"

interface ProductHeaderProps {
  product: {
    id: string
    title: string
    mainImage: string
    brand: string
    stats: {
      totalSales: number
      averagePrice: number
      buyPrice: number
      averageMargin: number
    }
  }
}

export function ProductHeader({ product }: ProductHeaderProps) {
  return (
    <div className="bg-whitebackground border-b">
      <div className="py-6 space-y-6">
        <div className="flex items-start gap-6">
          {/* Product Image - removed card wrapper */}
          <div className="h-20 w-20 relative rounded-lg overflow-hidden bg-muted flex-shrink-0">
            <Image src={product.mainImage || "/placeholder.svg"} alt={product.title} fill className="object-cover" />
          </div>

          {/* Title and Status - moved next to image */}
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-balance">{product.title}</h1>
            </div>
            <p className="text-muted-foreground">Merk: {product.brand}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
