"use client"

import { useEffect } from "react"
import { Dialog, DialogContent, DialogOverlay, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { cn } from "@/lib/utils"
import Image from "next/image"
import type { ImageItem } from "@/app/hooks/useImageManager"

// Simple screen-reader-only component for accessibility
const VisuallyHidden = ({ children }: { children: React.ReactNode }) => (
  <span className="sr-only">{children}</span>
)

interface ImageLightboxProps {
  images: ImageItem[]
  selectedIndex: number | null
  isOpen: boolean
  onClose: () => void
  onNavigate: (direction: 'prev' | 'next') => void
}

export function ImageLightbox({
  images,
  selectedIndex,
  isOpen,
  onClose,
  onNavigate
}: ImageLightboxProps) {
  const currentImage = selectedIndex !== null ? images[selectedIndex] : null
  const totalImages = images.length

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowLeft':
          e.preventDefault()
          onNavigate('prev')
          break
        case 'ArrowRight':
          e.preventDefault()
          onNavigate('next')
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, onNavigate])

  if (!currentImage || selectedIndex === null) {
    return null
  }

  const hasPrev = selectedIndex > 0
  const hasNext = selectedIndex < totalImages - 1

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogOverlay className="bg-black/40" />
      <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] sm:max-h-[80vh] p-0 border-0 bg-white rounded-lg overflow-hidden [&>button]:hidden">
        <VisuallyHidden>
          <DialogTitle>Image Viewer - {currentImage?.file?.name || `Image ${(selectedIndex || 0) + 1}`}</DialogTitle>
        </VisuallyHidden>
        <div className="relative w-full h-full">
          {/* Close button */}
          <Button
            variant="outline"
            size="icon"
            onClick={onClose}
            className="absolute top-2 right-2 sm:top-4 sm:right-4 z-50 bg-white/90 border-gray-300 text-gray-700 hover:bg-white hover:text-gray-900"
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Image counter */}
          <div className="absolute top-2 left-2 sm:top-4 sm:left-4 z-50 bg-gray-900/80 text-white px-2 py-1 sm:px-3 rounded-md text-xs sm:text-sm">
            {selectedIndex + 1} / {totalImages}
          </div>

          {/* Previous button */}
          {hasPrev && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => onNavigate('prev')}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-50 bg-white/90 border-gray-300 text-gray-700 hover:bg-white hover:text-gray-900"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}

          {/* Next button */}
          {hasNext && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => onNavigate('next')}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-50 bg-white/90 border-gray-300 text-gray-700 hover:bg-white hover:text-gray-900"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}

          {/* Main image container with responsive spacing */}
          <div className="relative w-full h-full flex items-center justify-center px-4 py-8 sm:px-12 sm:py-12 md:px-16 md:py-16 lg:px-20">
            <div className="relative w-full h-full max-w-full max-h-full min-h-0 min-w-0">
              <Image
                src={currentImage.url}
                alt={currentImage.file?.name || `Image ${selectedIndex + 1}`}
                width={1200}
                height={800}
                className="max-w-full max-h-full w-full h-full object-contain rounded-md"
                priority
              />
            </div>
          </div>

          {/* Image info */}
          {currentImage.file?.name && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 sm:bottom-4 bg-gray-900/80 text-white px-2 py-1 sm:px-4 sm:py-2 rounded-md text-xs sm:text-sm max-w-[90%] truncate">
              {currentImage.file.name}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}