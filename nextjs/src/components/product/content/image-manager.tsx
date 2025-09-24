"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { X, Upload, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { ProductImage } from "@/app/types/product"
import { useImageManager, type ImageItem } from "@/app/hooks/useImageManager"
import { ImageLightbox } from "./image-lightbox"

interface ImageManagerProps {
  productId: number
  initialImages?: ProductImage[]
  onImagesChange?: (images: ProductImage[]) => void
}

// Component functions
function DeleteButton({ onDelete, isVisible, isDisabled }: { 
  onDelete: () => void
  isVisible: boolean
  isDisabled?: boolean 
}) {
  return (
    <button
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (!isDisabled) onDelete()
      }}
      disabled={isDisabled}
      className={cn(
        "absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full",
        "flex items-center justify-center cursor-pointer transition-all duration-200 z-50",
        "disabled:cursor-not-allowed disabled:opacity-50",
        isVisible ? "opacity-100 scale-100" : "opacity-0 scale-75"
      )}
    >
      <X size={12} className="text-white" />
    </button>
  )
}

function ImageGridItem({
  image,
  index,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onDelete,
  onImageClick
}: {
  image: ImageItem
  index: number
  isDragging: boolean
  isDragOver: boolean
  onDragStart: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onDragEnd: () => void
  onDelete: () => void
  onImageClick: () => void
}) {
  const [isHovered, setIsHovered] = useState(false)
  const [isDragStarted, setIsDragStarted] = useState(false)

  const handleClick = () => {
    // Only trigger click if we're not in the middle of a drag operation
    if (!isDragStarted && !image.isUploading) {
      onImageClick()
    }
  }

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragStarted(true)
    onDragStart(e)
  }

  const handleDragEnd = () => {
    // Reset drag state after a short delay to prevent click
    setTimeout(() => setIsDragStarted(false), 100)
    onDragEnd()
  }

  return (
    <div
      draggable={!image.isUploading}
      onDragStart={handleDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={handleDragEnd}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      className={cn(
        "relative transition-all duration-200 aspect-square",
        "border-2 border-gray-200 rounded-lg overflow-hidden",
        isDragging && "opacity-50 scale-95",
        isDragOver && "ring-2 ring-primary ring-offset-2",
        image.isUploading ? "opacity-50 cursor-wait" : "cursor-pointer hover:scale-105",
        !image.isUploading && "hover:border-primary/50"
      )}
    >
      <Image
        src={image.url}
        alt={image.file?.name || `Image ${index + 1}`}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 25vw"
        priority={index === 0}
      />

      {image.isUploading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        </div>
      )}

      <DeleteButton 
        onDelete={onDelete} 
        isVisible={isHovered && !image.isUploading}
        isDisabled={image.isUploading}
      />

      {isHovered && !image.isUploading && (
        <div className="absolute inset-0 bg-black/20 pointer-events-none" />
      )}
    </div>
  )
}

function UploadArea({ onUpload, isDisabled }: { 
  onUpload: (files: FileList | null) => void
  isDisabled?: boolean 
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const dragCounter = useRef(0)

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    if (!isDisabled) {
      dragCounter.current++
      if (dragCounter.current === 1) {
        setIsDragOver(true)
      }
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current--
    if (dragCounter.current === 0) {
      setIsDragOver(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current = 0
    setIsDragOver(false)
    if (!isDisabled) {
      onUpload(e.dataTransfer.files)
    }
  }

  const handleClick = () => {
    if (!isDisabled) {
      fileInputRef.current?.click()
    }
  }

  // Reset drag counter when component unmounts or on drag end
  const handleDragEnd = () => {
    dragCounter.current = 0
    setIsDragOver(false)
  }

  return (
    <Card
      className={cn(
        "p-8 border-2 border-dashed transition-all duration-200",
        isDisabled && "opacity-50 cursor-not-allowed",
        isDragOver 
          ? "border-primary bg-primary/5 scale-[1.02] shadow-lg" 
          : "border-muted-foreground/25 hover:border-muted-foreground/50"
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
    >
      <div className={cn(
        "text-center transition-all duration-200 pointer-events-none",
        isDragOver && "scale-105"
      )}>
        <Upload className={cn(
          "mx-auto h-12 w-12 mb-4 transition-all duration-200",
          isDragOver ? "text-primary scale-110" : "text-muted-foreground"
        )} />
        <h3 className="text-lg font-semibold mb-2">
          {isDragOver ? "Drop hier om te uploaden" : "Upload afbeeldingen"}
        </h3>
        <p className={cn(
          "mb-4 transition-all duration-200",
          isDragOver ? "text-primary font-medium" : "text-muted-foreground"
        )}>
          {isDragOver 
            ? "Laat los om afbeeldingen toe te voegen" 
            : "Sleep afbeeldingen, of klik om te selecteren"}
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          JPG, PNG, WebP • Max 2MB
        </p>
        <Button 
          onClick={handleClick} 
          variant={isDragOver ? "default" : "outline"}
          disabled={isDisabled}
          className={cn(
            "transition-all duration-200 pointer-events-auto",
            isDragOver && "hidden"
          )}
        >
          Afbeeldingen selecteren
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={(e) => onUpload(e.target.files)}
          className="hidden"
        />
      </div>
    </Card>
  )
}

// Main component
export function ImageManager({
  productId,
  initialImages = [],
  onImagesChange
}: ImageManagerProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)

  const {
    // State
    images,
    isLoading,
    uploadQueueLength,

    // Image operations
    addImages,
    deleteImage,

    // Drag and drop
    draggedIndex,
    dragOverIndex,
    handleDragStart,
    handleDragOver,
    handleDrop,
    resetDragState
  } = useImageManager({ productId, initialImages, onImagesChange })

  const hasReachedLimit = images.filter(img => img.isProductImage).length >= 8

  // Lightbox functions
  const openLightbox = (index: number) => {
    setSelectedImageIndex(index)
    setIsLightboxOpen(true)
  }

  const closeLightbox = () => {
    setIsLightboxOpen(false)
    setSelectedImageIndex(null)
  }

  const navigateImage = (direction: 'prev' | 'next') => {
    if (selectedImageIndex === null) return

    if (direction === 'prev' && selectedImageIndex > 0) {
      setSelectedImageIndex(selectedImageIndex - 1)
    } else if (direction === 'next' && selectedImageIndex < images.length - 1) {
      setSelectedImageIndex(selectedImageIndex + 1)
    }
  }

  if (isLoading && images.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {images.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            Afbeeldingen ({images.filter(img => img.isProductImage).length}/8)
            {uploadQueueLength > 0 && (
              <span className="ml-2 text-sm text-muted-foreground">
                ({uploadQueueLength} uploading...)
              </span>
            )}
          </h3>
          <div className="grid grid-cols-4 gap-4">
            {images.map((image, index) => (
              <ImageGridItem
                key={image.id}
                image={image}
                index={index}
                isDragging={draggedIndex === index}
                isDragOver={dragOverIndex === index && draggedIndex !== index}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={resetDragState}
                onDelete={() => deleteImage(image.id)}
                onImageClick={() => openLightbox(index)}
              />
            ))}
          </div>
        </div>
      )}

      <UploadArea
        onUpload={addImages}
        isDisabled={hasReachedLimit || uploadQueueLength > 0}
      />

      <ImageLightbox
        images={images}
        selectedIndex={selectedImageIndex}
        isOpen={isLightboxOpen}
        onClose={closeLightbox}
        onNavigate={navigateImage}
      />
    </div>
  )
}