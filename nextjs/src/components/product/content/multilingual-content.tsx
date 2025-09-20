"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Languages, Save, Loader2, AlertCircle, CheckCircle } from "lucide-react"
import { ImageManager } from "@/components/product/content/image-manager"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import { ProductContent, ProductImage } from "@/app/types/product"
import { toast } from "sonner"

const languages = [
  { code: "nl", name: "Nederlands", flag: "🇳🇱", apiCode: "NL" },
  { code: "de", name: "Duits", flag: "🇩🇪", apiCode: "DE" },
  { code: "fr", name: "Frans", flag: "🇫🇷", apiCode: "FR" },
  { code: "es", name: "Spaans", flag: "🇪🇸", apiCode: "ES" },
]

interface ContentData {
  title: string
  description: string
  content: string
}

interface MultilingualContentProps {
  productId: number
  productContent?: ProductContent[]
  productImages?: ProductImage[]
}

interface SaveState {
  [key: string]: 'idle' | 'saving' | 'success' | 'error'
}

export function MultilingualContent({
  productId,
  productContent = [],
  productImages = [],
}: MultilingualContentProps) {
  // Track the original content from the database
  const originalContentRef = useRef<ProductContent[]>(productContent)
  
  // Update the ref when productContent prop changes
  useEffect(() => {
    originalContentRef.current = productContent
  }, [productContent])
  
  const getContentForLocale = (locale: string): ProductContent | undefined => {
    const lang = languages.find(l => l.code === locale)
    if (!lang) return undefined
    
    // Check both the language code and the API code
    return originalContentRef.current.find(content => 
      content.locale?.toUpperCase() === lang.apiCode.toUpperCase()
    )
  }

  const [content, setContent] = useState<Record<string, ContentData>>(() => {
    const initialContent: Record<string, ContentData> = {}
    
    languages.forEach((lang) => {
      const localeContent = getContentForLocale(lang.code)
      initialContent[lang.code] = {
        title: localeContent?.title || "",
        description: localeContent?.description || "",
        content: localeContent?.content || "",
      }
    })
    
    return initialContent
  })

  const [lastSavedContent, setLastSavedContent] = useState<Record<string, ContentData>>(() => {
    const initialContent: Record<string, ContentData> = {}
    
    languages.forEach((lang) => {
      const localeContent = getContentForLocale(lang.code)
      initialContent[lang.code] = {
        title: localeContent?.title || "",
        description: localeContent?.description || "",
        content: localeContent?.content || "",
      }
    })
    
    return initialContent
  })

  const [activeLanguage, setActiveLanguage] = useState("nl")
  const [saveStates, setSaveStates] = useState<SaveState>({})
  const [hasChanges, setHasChanges] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const changes: Record<string, boolean> = {}
    
    languages.forEach((lang) => {
      const savedContent = lastSavedContent[lang.code]
      const currentContent = content[lang.code]
      
      changes[lang.code] = (
        currentContent.title !== savedContent.title ||
        currentContent.description !== savedContent.description ||
        currentContent.content !== savedContent.content
      )
    })
    
    setHasChanges(changes)
  }, [content, lastSavedContent])

  const updateContent = (lang: string, field: keyof ContentData, value: string) => {
    setContent((prev) => ({
      ...prev,
      [lang]: {
        ...prev[lang],
        [field]: value,
      },
    }))
  }

  const saveContent = async (langCode: string) => {
    const lang = languages.find(l => l.code === langCode)
    if (!lang) return

    setSaveStates(prev => ({ ...prev, [langCode]: 'saving' }))

    try {
      const contentData = content[langCode]
      
      // Check if we have any content to save
      const hasContent = contentData.title || contentData.description || contentData.content
      
      if (!hasContent) {
        toast.warning(`Geen content om op te slaan voor ${lang.name}`, {
          description: "Voeg eerst content toe voordat je opslaat.",
        })
        setSaveStates(prev => ({ ...prev, [langCode]: 'idle' }))
        return
      }
      
      const payload = {
        locale: lang.apiCode,
        title: contentData.title || null,
        description: contentData.description || null,
        content: contentData.content || null,
      }

      // Always use PUT - the endpoint will handle create or update
      const response = await fetch(`/api/products/${productId}/content`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save content')
      }
      
      const savedData = await response.json()
      
      // Update the original content ref with the new saved data
      const updatedOriginalContent = [...originalContentRef.current]
      const existingIndex = updatedOriginalContent.findIndex(
        c => c.locale?.toUpperCase() === lang.apiCode.toUpperCase()
      )
      
      if (existingIndex >= 0) {
        updatedOriginalContent[existingIndex] = savedData
      } else {
        updatedOriginalContent.push(savedData)
      }
      
      originalContentRef.current = updatedOriginalContent
      
      setLastSavedContent(prev => ({
        ...prev,
        [langCode]: {
          title: contentData.title,
          description: contentData.description,
          content: contentData.content,
        }
      }))
      
      setSaveStates(prev => ({ ...prev, [langCode]: 'success' }))
      
      toast.success(`${lang.name}e content opgeslagen`, {
        description: "Content is succesvol opgeslagen.",
      })

      setTimeout(() => {
        setSaveStates(prev => ({ ...prev, [langCode]: 'idle' }))
      }, 2000)

    } catch (error) {
      console.error('Failed to save content:', error)
      setSaveStates(prev => ({ ...prev, [langCode]: 'error' }))
      
      toast.error(`Fout bij opslaan ${lang.name} content`, {
        description: error instanceof Error ? error.message : "Er is een onbekende fout opgetreden.",
      })

      setTimeout(() => {
        setSaveStates(prev => ({ ...prev, [langCode]: 'idle' }))
      }, 3000)
    }
  }

  const translateContent = async (targetLang: string) => {
    const dutchContent = content.nl
    if (!dutchContent.title && !dutchContent.description && !dutchContent.content) {
      toast.error("Geen content om te vertalen", {
        description: "Voeg eerst Nederlandse content toe voordat je kunt vertalen.",
      })
      return
    }

    // Here you would integrate with a real translation API
    const translatedTitle = `${dutchContent.title} (${targetLang.toUpperCase()})`
    const translatedDescription = `${dutchContent.description} (${targetLang.toUpperCase()})`
    const translatedContent = `${dutchContent.content} (${targetLang.toUpperCase()})`

    setContent((prev) => ({
      ...prev,
      [targetLang]: {
        title: translatedTitle,
        description: translatedDescription,
        content: translatedContent,
      },
    }))

    const targetLanguage = languages.find(l => l.code === targetLang)
    toast.success("Content vertaald", {
      description: `Nederlandse content is vertaald naar ${targetLanguage?.name}.`,
    })
  }

  const getPlaceholder = (field: string, langName: string) => {
    switch (field) {
      case 'title':
        return `Product titel in ${langName}`
      case 'description':
        return `Product beschrijving in ${langName}`
      case 'content':
        return `Product content in ${langName}`
      default:
        return ''
    }
  }

  const getSaveButtonContent = (langCode: string) => {
    const state = saveStates[langCode] || 'idle'
    
    switch (state) {
      case 'saving':
        return (
          <>
            <Loader2 className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2 animate-spin" />
            <span className="hidden sm:inline">Opslaan...</span>
            <span className="sm:hidden">...</span>
          </>
        )
      case 'success':
        return (
          <>
            <CheckCircle className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Opgeslagen</span>
            <span className="sm:hidden">✓</span>
          </>
        )
      case 'error':
        return (
          <>
            <AlertCircle className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Fout</span>
            <span className="sm:hidden">!</span>
          </>
        )
      default:
        return (
          <>
            <Save className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Wijzigingen opslaan</span>
            <span className="sm:hidden">Opslaan</span>
          </>
        )
    }
  }

  const getSaveButtonVariant = (langCode: string) => {
    const state = saveStates[langCode] || 'idle'
    
    switch (state) {
      case 'success':
        return 'default' as const
      case 'error':
        return 'destructive' as const
      default:
        return 'default' as const
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contentbeheer</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Tabs value={activeLanguage} onValueChange={setActiveLanguage}>
              <TabsList className="grid w-full grid-cols-4">
                {languages.map((lang) => (
                  <TabsTrigger key={lang.code} value={lang.code} className="flex items-center gap-2">
                    <span>{lang.flag}</span>
                    <span className="hidden sm:inline">{lang.code.toUpperCase()}</span>
                    {hasChanges[lang.code] && (
                      <span className="w-2 h-2 bg-orange-500 rounded-full" title="Niet opgeslagen wijzigingen" />
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>

              {languages.map((lang) => (
                <TabsContent key={lang.code} value={lang.code} className="space-y-6 mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{lang.flag}</span>
                      <h3 className="text-lg font-semibold">{lang.name}</h3>
                      <Badge variant="outline">{lang.code.toUpperCase()}</Badge>
                      {hasChanges[lang.code] && (
                        <Badge variant="secondary">Niet opgeslagen</Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {(lang.code === "de" || lang.code === "fr" || lang.code === "es") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => translateContent(lang.code)}
                          className="flex items-center gap-2"
                        >
                          <Languages className="h-3 w-3" />
                          Vertalen
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        className="text-xs md:text-sm"
                        onClick={() => saveContent(lang.code)}
                        disabled={saveStates[lang.code] === 'saving' || !hasChanges[lang.code]}
                        variant={getSaveButtonVariant(lang.code)}
                      >
                        {getSaveButtonContent(lang.code)}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor={`title-${lang.code}`}>Titel</Label>
                      <Input
                        id={`title-${lang.code}`}
                        value={content[lang.code]?.title || ""}
                        onChange={(e) => updateContent(lang.code, "title", e.target.value)}
                        placeholder={getPlaceholder('title', lang.name)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`description-${lang.code}`}>Beschrijving</Label>
                      <div className="border rounded-lg">
                        <Textarea
                          id={`description-${lang.code}`}
                          value={content[lang.code]?.description || ""}
                          onChange={(e) => updateContent(lang.code, "description", e.target.value)}
                          placeholder={getPlaceholder('description', lang.name)}
                          className="min-h-16 border-0 focus-visible:ring-0"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`content-${lang.code}`}>Content</Label>
                      <RichTextEditor
                        value={content[lang.code]?.content || ""}
                        onChange={(value) => updateContent(lang.code, "content", value)}
                        placeholder={getPlaceholder('content', lang.name)}
                        className="min-h-[300px]"
                      />
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>

          <div className="lg:col-span-1">
            <ImageManager initialImages={productImages} productId={productId}/>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}