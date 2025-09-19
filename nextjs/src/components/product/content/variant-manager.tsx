"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Trash2, Edit3, Check, GripVertical } from "lucide-react"

interface Variant {
  id: string
  title: string
  ean: string
  position?: number // Add position field to interface
}

interface VariantManagerProps {
  variants: Variant[]
}

export function VariantManager({ variants: initialVariants }: VariantManagerProps) {
  const [variants, setVariants] = useState<Variant[]>(
    initialVariants.sort((a, b) => (a.position || 999) - (b.position || 999)),
  )
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const addVariant = () => {
    const newVariant: Variant = {
      id: `var-${Date.now()}`,
      title: "",
      ean: "",
      position: Math.max(...variants.map((v) => v.position || 0)) + 1, // Set position for new variant
    }
    setVariants([...variants, newVariant])
    setEditingId(newVariant.id)
  }

  const updateVariant = (id: string, field: keyof Variant, value: string) => {
    setVariants(variants.map((v) => (v.id === id ? { ...v, [field]: value } : v)))
  }

  const deleteVariant = (id: string) => {
    if (variants.length === 1) {
      // Don't allow deleting the last variant
      return
    }
    setVariants(variants.filter((v) => v.id !== id))
    if (editingId === id) {
      setEditingId(null)
    }
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === dropIndex) return

    const newVariants = [...variants]
    const draggedVariant = newVariants[draggedIndex]

    // Remove the dragged item
    newVariants.splice(draggedIndex, 1)
    // Insert it at the new position
    newVariants.splice(dropIndex, 0, draggedVariant)

    setVariants(newVariants)
    setDraggedIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const saveAndEdit = (newId: string) => {
    setEditingId(newId)
  }

  const isValidEAN = (ean: string) => {
    return ean.length === 0 || /^\d{8,13}$/.test(ean)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle>Product varianten</CardTitle>
          </div>
          <Button onClick={addVariant} size="sm" aria-label="Variant toevoegen" className="sm:gap-2">
            {/* Icon only from sm and up */}
            <Plus className="h-4 w-4 hidden sm:inline" aria-hidden="true" />

            {/* Small screens: "+ Variant" */}
            <span className="sm:hidden">+ Variant</span>

            {/* sm and up: "Variant toevoegen" */}
            <span className="hidden sm:inline">Variant toevoegen</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {variants.map((variant, index) => (
            <div
              key={variant.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-3 p-2 border rounded-lg transition-all cursor-move ${
                editingId === variant.id ? "border-primary bg-primary/5 shadow-sm" : "hover:border-muted-foreground/30"
              } ${draggedIndex === index ? "opacity-50" : ""}`}
            >
              <div className="flex items-center justify-center">
                <GripVertical className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
              </div>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor={`title-${variant.id}`} className="text-xs font-medium text-muted-foreground">
                    Naam
                  </Label>
                  {editingId === variant.id ? (
                    <Input
                      id={`title-${variant.id}`}
                      value={variant.title}
                      onChange={(e) => updateVariant(variant.id, "title", e.target.value)}
                      placeholder="bijv. Zwart, Wit, Large"
                      className="h-7 text-sm focus:ring-2 focus:ring-primary/20"
                      autoFocus
                    />
                  ) : (
                    <div
                      className="flex items-center cursor-pointer hover:text-primary transition-colors h-7"
                      onClick={() => saveAndEdit(variant.id)}
                    >
                      <span className="text-sm font-medium">{variant.title || `Variant ${index + 1}`}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`ean-${variant.id}`} className="text-xs font-medium text-muted-foreground">
                    EAN
                  </Label>
                  {editingId === variant.id ? (
                    <div className="space-y-1">
                      <Input
                        id={`ean-${variant.id}`}
                        value={variant.ean}
                        onChange={(e) => updateVariant(variant.id, "ean", e.target.value)}
                        placeholder="1234567890123"
                        className={`h-7 text-sm font-mono focus:ring-2 focus:ring-primary/20 ${
                          variant.ean && !isValidEAN(variant.ean) ? "border-destructive focus:ring-destructive/20" : ""
                        }`}
                      />
                      {variant.ean && !isValidEAN(variant.ean) && (
                        <p className="text-xs text-destructive">EAN moet 8-13 cijfers bevatten</p>
                      )}
                    </div>
                  ) : (
                    <div
                      className="cursor-pointer hover:text-primary transition-colors h-7 flex items-center"
                      onClick={() => saveAndEdit(variant.id)}
                    >
                      <span className="text-muted-foreground font-mono text-xs">{variant.ean || "Geen EAN"}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                {editingId === variant.id ? (
                  <Button
                    onClick={() => setEditingId(null)}
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-xs gap-1"
                  >
                    <Check className="h-3 w-3" />
                    Klaar
                  </Button>
                ) : (
                  <Button
                    onClick={() => saveAndEdit(variant.id)}
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 hover:bg-primary/10"
                  >
                    <Edit3 className="h-3 w-3" />
                  </Button>
                )}
                {variants.length > 1 && (
                  <Button
                    onClick={() => deleteVariant(variant.id)}
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          {variants.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <div className="space-y-2">
                <p className="text-lg">Geen varianten toegevoegd</p>
                <p className="text-sm">Voeg een variant toe om te beginnen</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
