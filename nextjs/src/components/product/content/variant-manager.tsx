"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Trash2, Edit3, Check, GripVertical, Loader2, AlertCircle, X } from "lucide-react"
import type { ProductVariant } from "@/app/types/product"
import { useProductVariants } from "@/app/hooks/useProductVariants"

interface VariantManagerProps {
  productId: number
  variants: ProductVariant[]
}

// Interface for local unsaved variants
interface LocalVariant extends ProductVariant {
  isLocal?: boolean
  tempId?: string
}

export function VariantManager({ productId, variants: initialVariants }: VariantManagerProps) {
  const {
    variants: apiVariants,
    isLoading,
    error,
    createVariant,
    updateVariant,
    deleteVariant,
    reorderVariants,
    setVariants,
  } = useProductVariants({ productId, initialVariants })

  // Combine API variants with local unsaved variants
  const [localVariants, setLocalVariants] = useState<LocalVariant[]>([])
  const [editingId, setEditingId] = useState<number | string | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [pendingUpdates, setPendingUpdates] = useState<Map<number | string, { title?: string; ean?: string | null }>>(new Map())
  const [localErrors, setLocalErrors] = useState<Map<number | string, string>>(new Map())
  const [savingIds, setSavingIds] = useState<Set<number | string>>(new Set())
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set())
  
  // Combine API variants with local variants
  const allVariants = [...apiVariants, ...localVariants]
  const sortedVariants = allVariants.sort((a, b) => (a.position ?? 999) - (b.position ?? 999))

  // Add new local variant
  const addVariant = () => {
    const tempId = `temp_${Date.now()}`
    const newVariant: LocalVariant = {
      id: 0, // Temporary ID, will be replaced when saved
      tempId,
      title: "",
      ean: "",
      price: null,
      position: Math.max(...sortedVariants.map((v) => v.position || 0), 0) + 1,
      isLocal: true,
    }
    setLocalVariants(prev => [...prev, newVariant])
    setEditingId(tempId)
  }

  // Update local state for form fields
  const updateLocalVariant = (id: number | string, field: 'title' | 'ean', value: string) => {
    // Update pending changes
    setPendingUpdates(prev => {
      const updated = new Map(prev)
      const current = updated.get(id) || {}
      updated.set(id, { ...current, [field]: value === '' && field === 'ean' ? null : value })
      return updated
    })

    // Clear any errors for this field
    if (field === 'ean' && isValidEAN(value)) {
      setLocalErrors(prev => {
        const updated = new Map(prev)
        updated.delete(id)
        return updated
      })
    }
  }

  // Save pending updates for a variant
  const savePendingUpdates = async (id: number | string) => {
    const variant = sortedVariants.find(v => 
      v.id === id || (v as LocalVariant).tempId === id
    ) as LocalVariant | undefined
    
    if (!variant) return

    const updates = pendingUpdates.get(id)
    const currentTitle = updates?.title ?? variant.title
    const currentEan = updates?.ean ?? variant.ean

    // For local variants, we need a title to create
    if (variant.isLocal) {
      if (!currentTitle || currentTitle.trim() === '') {
        setLocalErrors(prev => {
          const updated = new Map(prev)
          updated.set(id, 'Naam is verplicht')
          return updated
        })
        return
      }

      // Validate EAN if present
      if (currentEan && !isValidEAN(currentEan)) {
        setLocalErrors(prev => {
          const updated = new Map(prev)
          updated.set(id, 'EAN moet 8-13 cijfers bevatten')
          return updated
        })
        return
      }

      try {
        setSavingIds(prev => new Set(prev).add(id))
        
        // Create the variant via API
        await createVariant(currentTitle, currentEan || undefined)
        
        // Remove from local variants
        setLocalVariants(prev => prev.filter(v => v.tempId !== id))
        
        // Clear pending updates
        setPendingUpdates(prev => {
          const updated = new Map(prev)
          updated.delete(id)
          return updated
        })
        
        setEditingId(null)
        setLocalErrors(prev => {
          const updated = new Map(prev)
          updated.delete(id)
          return updated
        })
      } catch (err) {
        console.error('Failed to create variant:', err)
        setLocalErrors(prev => {
          const updated = new Map(prev)
          updated.set(id, 'Opslaan mislukt')
          return updated
        })
      } finally {
        setSavingIds(prev => {
          const updated = new Set(prev)
          updated.delete(id)
          return updated
        })
      }
    } else {
      // Update existing variant
      if (!updates || Object.keys(updates).length === 0) {
        setEditingId(null)
        return
      }

      // Validate EAN if present
      if (updates.ean && !isValidEAN(updates.ean)) {
        setLocalErrors(prev => {
          const updated = new Map(prev)
          updated.set(id, 'EAN moet 8-13 cijfers bevatten')
          return updated
        })
        return
      }

      try {
        setSavingIds(prev => new Set(prev).add(id))
        await updateVariant(id as number, updates)
        
        // Clear pending updates for this variant
        setPendingUpdates(prev => {
          const updated = new Map(prev)
          updated.delete(id)
          return updated
        })
        
        setEditingId(null)
        setLocalErrors(prev => {
          const updated = new Map(prev)
          updated.delete(id)
          return updated
        })
      } catch (err) {
        console.error('Failed to update variant:', err)
        setLocalErrors(prev => {
          const updated = new Map(prev)
          updated.set(id, 'Opslaan mislukt')
          return updated
        })
      } finally {
        setSavingIds(prev => {
          const updated = new Set(prev)
          updated.delete(id)
          return updated
        })
      }
    }
  }

  // Cancel editing (for local variants, this removes them)
  const cancelEditing = (id: number | string) => {
    const variant = sortedVariants.find(v => 
      v.id === id || (v as LocalVariant).tempId === id
    ) as LocalVariant | undefined

    if (variant?.isLocal) {
      // Remove unsaved local variant
      setLocalVariants(prev => prev.filter(v => v.tempId !== id))
    }
    
    // Clear any pending updates
    setPendingUpdates(prev => {
      const updated = new Map(prev)
      updated.delete(id)
      return updated
    })
    
    setEditingId(null)
    setLocalErrors(prev => {
      const updated = new Map(prev)
      updated.delete(id)
      return updated
    })
  }

  // Delete variant
  const handleDeleteVariant = async (id: number | string) => {
    const variant = sortedVariants.find(v => 
      v.id === id || (v as LocalVariant).tempId === id
    ) as LocalVariant | undefined

    if (sortedVariants.length === 1) {
      return // Don't allow deleting the last variant
    }

    // If it's a local variant, just remove it
    if (variant?.isLocal) {
      setLocalVariants(prev => prev.filter(v => v.tempId !== id))
      if (editingId === id) {
        setEditingId(null)
      }
      setPendingUpdates(prev => {
        const updated = new Map(prev)
        updated.delete(id)
        return updated
      })
      return
    }

    // Delete from API
    try {
      setDeletingIds(prev => new Set(prev).add(id as number))
      await deleteVariant(id as number)
      
      if (editingId === id) {
        setEditingId(null)
      }
      
      // Clear any pending updates for deleted variant
      setPendingUpdates(prev => {
        const updated = new Map(prev)
        updated.delete(id)
        return updated
      })
    } catch (err) {
      console.error('Failed to delete variant:', err)
    } finally {
      setDeletingIds(prev => {
        const updated = new Set(prev)
        updated.delete(id as number)
        return updated
      })
    }
  }

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    // Don't allow dragging local unsaved variants
    const variant = sortedVariants[index] as LocalVariant
    if (variant?.isLocal) {
      e.preventDefault()
      return
    }
    
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === dropIndex) return

    // Filter out local variants for reordering
    const apiOnlyVariants = sortedVariants.filter(v => !(v as LocalVariant).isLocal)
    const newVariants = [...apiOnlyVariants]
    const draggedVariant = newVariants[draggedIndex]

    // Remove the dragged item
    newVariants.splice(draggedIndex, 1)
    // Insert it at the new position
    newVariants.splice(dropIndex, 0, draggedVariant)

    // Update positions
    const reorderedVariants = newVariants.map((variant, index) => ({
      id: variant.id,
      position: index
    }))

    // Optimistically update UI
    setVariants(newVariants.map((v, i) => ({ ...v, position: i })))
    
    try {
      await reorderVariants(reorderedVariants)
    } catch (err) {
      console.error('Failed to reorder variants:', err)
      // The hook will handle reverting the optimistic update
    }
    
    setDraggedIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const startEditing = (id: number | string) => {
    // Save any pending edits from the previous variant
    if (editingId !== null && editingId !== id) {
      const prevVariant = sortedVariants.find(v => 
        v.id === editingId || (v as LocalVariant).tempId === editingId
      ) as LocalVariant | undefined
      
      // Don't auto-save empty local variants
      if (!prevVariant?.isLocal) {
        savePendingUpdates(editingId)
      }
    }
    setEditingId(id)
  }

  const isValidEAN = (ean: string) => {
    return !ean || ean.length === 0 || /^\d{8,13}$/.test(ean)
  }

  // Get display value for a field (pending update or current value)
  const getFieldValue = (variant: LocalVariant, field: 'title' | 'ean'): string => {
    const id = variant.tempId || variant.id
    const pending = pendingUpdates.get(id)
    if (pending && field in pending) {
      return field === 'ean' ? (pending.ean ?? '') : (pending.title ?? '')
    }
    return variant[field] ?? ''
  }

  // Get variant identifier (tempId for local, id for saved)
  const getVariantId = (variant: LocalVariant): number | string => {
    return variant.tempId || variant.id
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle>Product varianten</CardTitle>
            {isLoading && !savingIds.size && !deletingIds.size && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          <Button 
            onClick={addVariant} 
            size="sm" 
            aria-label="Variant toevoegen" 
            className="sm:gap-2"
            disabled={isLoading || localVariants.some(v => v.isLocal)}
          >
            <Plus className="h-4 w-4 hidden sm:inline" aria-hidden="true" />
            <span className="sm:hidden">+ Variant</span>
            <span className="hidden sm:inline">Variant toevoegen</span>
          </Button>
        </div>
        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive mt-2">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sortedVariants.map((variant, index) => {
            const variantId = getVariantId(variant as LocalVariant)
            const isSaving = savingIds.has(variantId)
            const isDeleting = deletingIds.has(variant.id)
            const hasError = localErrors.has(variantId)
            const isLocal = (variant as LocalVariant).isLocal
            
            return (
              <div
                key={variantId}
                draggable={!isDeleting && !editingId && !isLocal}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-3 p-2 border rounded-lg transition-all ${
                  editingId === variantId ? "border-primary bg-primary/5 shadow-sm" : "hover:border-muted-foreground/30"
                } ${draggedIndex === index ? "opacity-50" : ""} ${
                  isDeleting ? "opacity-50 pointer-events-none" : isLocal ? "" : "cursor-move"
                } ${hasError ? "border-destructive" : ""} ${
                  isLocal ? "border-dashed border-2" : ""
                }`}
              >
                <div className="flex items-center justify-center">
                  <GripVertical 
                    className={`h-4 w-4 ${
                      isLocal ? "text-muted-foreground/30" : "text-muted-foreground hover:text-foreground"
                    } transition-colors`} 
                  />
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor={`title-${variantId}`} className="text-xs font-medium text-muted-foreground">
                      Naam {isLocal && <span className="text-destructive">*</span>}
                    </Label>
                    {editingId === variantId ? (
                      <Input
                        id={`title-${variantId}`}
                        value={getFieldValue(variant as LocalVariant, 'title')}
                        onChange={(e) => updateLocalVariant(variantId, "title", e.target.value)}
                        placeholder="bijv. Zwart, Wit, Large"
                        className="h-7 text-sm focus:ring-2 focus:ring-primary/20"
                        autoFocus
                        disabled={isSaving}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            savePendingUpdates(variantId)
                          } else if (e.key === 'Escape') {
                            cancelEditing(variantId)
                          }
                        }}
                      />
                    ) : (
                      <div
                        className="flex items-center cursor-pointer hover:text-primary transition-colors h-7"
                        onClick={() => startEditing(variantId)}
                      >
                        <span className="text-sm font-medium">
                          {getFieldValue(variant as LocalVariant, 'title') || `Variant ${index + 1}`}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`ean-${variantId}`} className="text-xs font-medium text-muted-foreground">
                      EAN
                    </Label>
                    {editingId === variantId ? (
                      <div className="space-y-1">
                        <Input
                          id={`ean-${variantId}`}
                          value={getFieldValue(variant as LocalVariant, 'ean')}
                          onChange={(e) => updateLocalVariant(variantId, "ean", e.target.value)}
                          placeholder="1234567890123"
                          className={`h-7 text-sm font-mono focus:ring-2 focus:ring-primary/20 ${
                            getFieldValue(variant as LocalVariant, 'ean') && 
                            !isValidEAN(getFieldValue(variant as LocalVariant, 'ean')) 
                              ? "border-destructive focus:ring-destructive/20" 
                              : ""
                          }`}
                          disabled={isSaving}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              savePendingUpdates(variantId)
                            } else if (e.key === 'Escape') {
                              cancelEditing(variantId)
                            }
                          }}
                        />
                        {getFieldValue(variant as LocalVariant, 'ean') && 
                         !isValidEAN(getFieldValue(variant as LocalVariant, 'ean')) && (
                          <p className="text-xs text-destructive">EAN moet 8-13 cijfers bevatten</p>
                        )}
                      </div>
                    ) : (
                      <div
                        className="cursor-pointer hover:text-primary transition-colors h-7 flex items-center"
                        onClick={() => startEditing(variantId)}
                      >
                        <span className="text-muted-foreground font-mono text-xs">
                          {getFieldValue(variant as LocalVariant, 'ean') || "Geen EAN"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {editingId === variantId ? (
                    <>
                      <Button
                        onClick={() => savePendingUpdates(variantId)}
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-xs gap-1"
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Check className="h-3 w-3" />
                        )}
                        {isSaving ? "Opslaan..." : isLocal ? "Opslaan" : "Klaar"}
                      </Button>
                      {isLocal && (
                        <Button
                          onClick={() => cancelEditing(variantId)}
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 hover:bg-destructive/10"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </>
                  ) : (
                    <Button
                      onClick={() => startEditing(variantId)}
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 hover:bg-primary/10"
                      disabled={isDeleting}
                    >
                      <Edit3 className="h-3 w-3" />
                    </Button>
                  )}
                  {sortedVariants.length > 1 && (
                    <Button
                      onClick={() => handleDeleteVariant(variantId)}
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      disabled={isDeleting || isSaving}
                    >
                      {isDeleting ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
          {sortedVariants.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <div className="space-y-2">
                <p className="text-lg">Geen varianten toegevoegd</p>
                <p className="text-sm">Voeg een variant toe om te beginnen</p>
              </div>
            </div>
          )}
        </div>
        {localErrors.size > 0 && editingId && (
          <div className="mt-2 text-sm text-destructive">
            {localErrors.get(editingId)}
          </div>
        )}
      </CardContent>
    </Card>
  )
}