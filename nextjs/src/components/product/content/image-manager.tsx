"use client"

import { useState, useRef, useEffect, type DragEvent, type MouseEvent } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { X, Upload } from "lucide-react"
import { cn } from "@/lib/utils"
import Image from "next/image"  

interface ImageItem {
  id: string
  file?: File
  url: string
  isProductImage?: boolean
}

interface ImageManagerProps {
  initialImages?: ImageItem[]
  productImages?: string[]
}

export function ImageManager({ initialImages = [], productImages = [] }: ImageManagerProps) {
  const [images, setImages] = useState<ImageItem[]>(initialImages)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (productImages.length > 0) {
      const productImageItems: ImageItem[] = productImages.map((url, index) => ({
        id: `product-${index}`,
        url,
        isProductImage: true,
      }))
      setImages(productImageItems)
    }
  }, [productImages])

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return

    const newImages: ImageItem[] = []
    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        const id = Math.random().toString(36).substr(2, 9)
        const url = URL.createObjectURL(file)
        newImages.push({ id, file, url })
      }
    })

    setImages((prev) => [...prev, ...newImages])
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleDeleteImage = (e: MouseEvent, id: string) => {
    e.stopPropagation()
    setImages((prev) => {
      const imageToDelete = prev.find((img) => img.id === id)
      if (imageToDelete) {
        URL.revokeObjectURL(imageToDelete.url)
      }
      return prev.filter((img) => img.id !== id)
    })
  }

  const handleDragStart = (e: DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === dropIndex) return

    setImages((prev) => {
      const next = [...prev]
      const [moved] = next.splice(draggedIndex, 1)

      // Insert AFTER the drop target when moving forward, and BEFORE when moving backward.
      // Using dropIndex directly achieves that after we've removed the original.
      const insertIndex = dropIndex
      next.splice(insertIndex, 0, moved)

      return next
    })

    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleUploadDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "copy"
  }

  const handleUploadDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    handleFileSelect(files)
  }

  return (
    <div className="space-y-6">
      {/* Images Grid */}
      {images.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Afbeeldingen ({images.length})</h3>
          <div className="grid grid-cols-4 gap-4">
            {images.map((image, index) => (
                <div
                key={image.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={cn(
                  "relative group cursor-move transition-all duration-200 aspect-square",
                  draggedIndex === index && "opacity-50 scale-95",
                  dragOverIndex === index && draggedIndex !== index && "ring-2 ring-primary ring-offset-2",
                )}
                >
                <Image
                  src={image.url || "/placeholder.svg"}
                  alt={image.file?.name || `Product image ${index + 1}`}
                  fill
                  className="object-cover rounded-lg border shadow-sm"
                  sizes="(max-width: 768px) 100vw, 25vw"
                  style={{ objectFit: "cover" }}
                  priority={index === 0}
                />

                {!image.isProductImage && (
                  <Button
                  variant="destructive"
                  size="sm"
                  onClick={(e) => handleDeleteImage(e, image.id)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-6 w-6 p-0 pointer-events-auto"
                  >
                  <X className="h-3 w-3" />
                  </Button>
                )}

                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg pointer-events-none" />
                </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Area */}
      <Card
        className="p-8 border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors"
        onDragOver={handleUploadDragOver}
        onDrop={handleUploadDrop}
      >
        <div className="text-center">
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Upload afbeeldingen</h3>
          <p className="text-muted-foreground mb-4">Sleep afbeeldingen, of klik om te selecteren</p>
          <Button onClick={handleUploadClick} variant="outline">
            Afbeeldingen selecteren
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />
        </div>
      </Card>
    </div>
  )
}
