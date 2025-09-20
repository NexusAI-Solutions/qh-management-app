import Image from "next/image"

interface ProductHeaderProps {
  product: {
    id: number
    title: string
    mainImage: string | false
    brand: string | null
  }
}

export function ProductHeader({ product }: ProductHeaderProps) {
  return (
<div className="bg-whitebackground">
  <div className="py-6">
    <div className="flex items-center gap-3">
      {/* Product Image */}
      <div className="h-20 w-20 relative rounded-lg overflow-hidden bg-muted flex-shrink-0">
        <Image
          src={product.mainImage || "/74e6e7e382d0ff5d7773ca9a87e6f6f8817a68a6.jpeg"}
          alt={product.title}
          fill
          className="object-cover"
        />
      </div>

      {/* Title + Brand */}
      <div className="flex-1">
        <h1>{product.title}</h1>
        <p className="text-md text-muted-foreground">Merk: {product.brand || "onbekend"}</p>
      </div>
    </div>
  </div>
</div>

  )
}
