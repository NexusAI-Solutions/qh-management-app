"use client"

import { useState, useEffect, useCallback } from "react"
import { ProductImage } from "@/app/types/product"
import { toast } from "sonner"

// Types
export interface ImageItem extends Omit<ProductImage, 'id' | 'position'> {
  id: string
  file?: File
  url: string
  isProductImage?: boolean
  productImageId?: number
  position?: number
  isUploading?: boolean
}

interface UseImageManagerProps {
  productId: number
  initialImages?: ProductImage[]
  onImagesChange?: (images: ProductImage[]) => void
}

interface UseImageManagerReturn {
  // State
  images: ImageItem[]
  isLoading: boolean
  uploadQueueLength: number
  
  // Image operations
  addImages: (files: FileList | null) => void
  deleteImage: (id: string) => Promise<void>
  reorderImages: (fromIndex: number, toIndex: number) => Promise<void>
  
  // Drag and drop
  draggedIndex: number | null
  dragOverIndex: number | null
  handleDragStart: (index: number) => void
  handleDragOver: (e: React.DragEvent, index: number) => void
  handleDrop: (e: React.DragEvent, dropIndex: number) => void
  resetDragState: () => void
}

// API helper functions (private to this hook)
const imageAPI = {
  async fetch(productId: number): Promise<ProductImage[]> {
    const response = await fetch(`/api/products/${productId}/images`)
    if (!response.ok) throw new Error('Failed to fetch images')
    const data = await response.json()
    return data.images
  },

  async upload(productId: number, file: File): Promise<ProductImage[]> {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await fetch(`/api/products/${productId}/images`, {
      method: 'POST',
      body: formData
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to upload image')
    }
    
    const data = await response.json()
    return data.images
  },

  async delete(productId: number, imageId: number): Promise<ProductImage[]> {
    const response = await fetch(`/api/products/${productId}/images/${imageId}`, {
      method: 'DELETE'
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to delete image')
    }
    
    const data = await response.json()
    return data.images
  },

  async reorder(productId: number, images: { id: number; position: number }[]): Promise<ProductImage[]> {
    const response = await fetch(`/api/products/${productId}/images/reorder`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ images })
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to reorder images')
    }
    
    const data = await response.json()
    return data.images
  }
}

// Main hook
export function useImageManager({
  productId,
  initialImages = [],
  onImagesChange
}: UseImageManagerProps): UseImageManagerReturn {
  // Image state
  const [images, setImages] = useState<ImageItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [uploadQueue, setUploadQueue] = useState<File[]>([])
  
  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // Helper function to convert ProductImage to ImageItem
  const convertToImageItems = useCallback((productImages: ProductImage[]): ImageItem[] => {
    return productImages
      .sort((a, b) => a.position - b.position)
      .map((productImage) => ({
        id: `product-${productImage.id}`,
        url: productImage.url,
        isProductImage: true,
        productImageId: productImage.id,
        position: productImage.position,
      }))
  }, [])

  // Initialize with provided images or fetch from API
  useEffect(() => {
    if (initialImages && initialImages.length > 0) {
      setImages(convertToImageItems(initialImages))
    } else {
      setIsLoading(true)
      imageAPI.fetch(productId)
        .then(fetchedImages => {
          setImages(convertToImageItems(fetchedImages))
          onImagesChange?.(fetchedImages)
        })
        .catch(error => {
          console.error('Failed to fetch images:', error)
          toast.error("Failed to load images")
        })
        .finally(() => setIsLoading(false))
    }
  }, [productId, initialImages, convertToImageItems, onImagesChange])

  // Process upload queue
  useEffect(() => {
    if (uploadQueue.length === 0) return

    const uploadNext = async () => {
      const file = uploadQueue[0]
      if (!file) return

      const tempId = crypto.randomUUID()
      const tempImage: ImageItem = {
        id: tempId,
        file,
        url: URL.createObjectURL(file),
        isUploading: true
      }
      setImages(prev => [...prev, tempImage])

      try {
        const updatedImages = await imageAPI.upload(productId, file)
        setImages(convertToImageItems(updatedImages))
        onImagesChange?.(updatedImages)
        toast.success("Image uploaded successfully")
      } catch (error) {
        setImages(prev => prev.filter(img => img.id !== tempId))
        URL.revokeObjectURL(tempImage.url)
        toast.error(error instanceof Error ? error.message : "Failed to upload image")
      }

      setUploadQueue(prev => prev.slice(1))
    }

    uploadNext()
  }, [uploadQueue, productId, convertToImageItems, onImagesChange])

  // Image operations
  const addImages = useCallback((files: FileList | null) => {
    if (!files) return

    const validFiles = Array.from(files).filter(file => {
      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
        toast.error(`${file.name} is not a valid image type`)
        return false
      }
      
      if (file.size > 2 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 2MB limit`)
        return false
      }
      
      return true
    })

    const currentCount = images.filter(img => img.isProductImage).length
    const remainingSlots = 8 - currentCount
    
    if (validFiles.length > remainingSlots) {
      toast.error(`You can only add ${remainingSlots} more image(s)`)
      validFiles.splice(remainingSlots)
    }

    setUploadQueue(prev => [...prev, ...validFiles])
  }, [images])

  const deleteImage = useCallback(async (id: string) => {
    const imageToDelete = images.find(img => img.id === id)
    if (!imageToDelete) return

    if (imageToDelete.isProductImage && imageToDelete.productImageId) {
      setIsLoading(true)
      try {
        const updatedImages = await imageAPI.delete(productId, imageToDelete.productImageId)
        setImages(convertToImageItems(updatedImages))
        onImagesChange?.(updatedImages)
        toast.success("Image deleted successfully")
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to delete image")
      } finally {
        setIsLoading(false)
      }
    } else {
      if (imageToDelete.file) {
        URL.revokeObjectURL(imageToDelete.url)
      }
      setImages(prev => prev.filter(img => img.id !== id))
    }
  }, [images, productId, convertToImageItems, onImagesChange])

  const reorderImages = useCallback(async (fromIndex: number, toIndex: number) => {
    // Store previous state for rollback
    const previousImages = images
    
    // Optimistically update UI
    const reorderedImages = [...images]
    const [moved] = reorderedImages.splice(fromIndex, 1)
    reorderedImages.splice(toIndex, 0, moved)
    
    const updatedWithPositions = reorderedImages.map((img, index) => ({
      ...img,
      position: index
    }))
    
    setImages(updatedWithPositions)

    // Prepare API call with only product images
    const productImagesOnly = updatedWithPositions
      .filter(img => img.isProductImage && img.productImageId)
      .map((img, index) => ({
        id: img.productImageId!,
        position: index
      }))

    try {
      const updatedImages = await imageAPI.reorder(productId, productImagesOnly)
      setImages(convertToImageItems(updatedImages))
      onImagesChange?.(updatedImages)
    } catch (error) {
      setImages(previousImages) // Rollback on error
      toast.error(error instanceof Error ? error.message : "Failed to reorder images")
    }
  }, [images, productId, convertToImageItems, onImagesChange])

  // Drag and drop handlers
  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      reorderImages(draggedIndex, dropIndex)
    }
    resetDragState()
  }, [draggedIndex, reorderImages])

  const resetDragState = useCallback(() => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }, [])

  return {
    // State
    images,
    isLoading,
    uploadQueueLength: uploadQueue.length,
    
    // Image operations
    addImages,
    deleteImage,
    reorderImages,
    
    // Drag and drop
    draggedIndex,
    dragOverIndex,
    handleDragStart,
    handleDragOver,
    handleDrop,
    resetDragState
  }
}