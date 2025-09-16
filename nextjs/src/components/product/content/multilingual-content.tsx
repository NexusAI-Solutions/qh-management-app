"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Bold, Italic, List, Link, Languages } from "lucide-react"
import { ImageManager } from "@/components/product/content/image-manager"

const languages = [
  { code: "nl", name: "Nederlands", flag: "🇳🇱" },
  { code: "de", name: "Duits", flag: "🇩🇪" },
  { code: "fr", name: "Frans", flag: "🇫🇷" },
  { code: "es", name: "Spaans", flag: "🇪🇸" },
]

interface ContentData {
  title: string
  description: string
}

export function MultilingualContent() {
  const [content, setContent] = useState<Record<string, ContentData>>({
    nl: {
      title: "Premium Draadloze Koptelefoon",
      description:
        "Ervaar superieure geluidskwaliteit met onze premium draadloze koptelefoon. Uitgerust met actieve ruisonderdrukking en 30 uur batterijduur.",
    },
    de: {
      title: "Premium Wireless Kopfhörer",
      description:
        "Erleben Sie überlegene Klangqualität mit unserem Premium-Wireless-Kopfhörer. Ausgestattet mit aktiver Geräuschunterdrückung und 30 Stunden Akkulaufzeit.",
    },
    fr: {
      title: "Casque Sans Fil Premium",
      description:
        "Découvrez une qualité sonore supérieure avec notre casque sans fil premium. Équipé d'une suppression active du bruit et de 30 heures d'autonomie.",
    },
    es: {
      title: "Auriculares Inalámbricos Premium",
      description:
        "Experimenta una calidad de sonido superior con nuestros auriculares inalámbricos premium. Equipados con cancelación activa de ruido y 30 horas de batería.",
    },
  })

  const [activeLanguage, setActiveLanguage] = useState("nl")

  const updateContent = (lang: string, field: keyof ContentData, value: string) => {
    setContent((prev) => ({
      ...prev,
      [lang]: {
        ...prev[lang],
        [field]: value,
      },
    }))
  }

  const translateContent = async (targetLang: string) => {
    const dutchContent = content.nl
    if (!dutchContent.title && !dutchContent.description) return

    // Simulate translation (in real app, this would call a translation API)
    const translatedTitle = `${dutchContent.title} (${targetLang.toUpperCase()})`
    const translatedDescription = `${dutchContent.description} (${targetLang.toUpperCase()})`

    setContent((prev) => ({
      ...prev,
      [targetLang]: {
        title: translatedTitle,
        description: translatedDescription,
      },
    }))
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
                    </div>

                    {(lang.code === "de" || lang.code === "fr" || lang.code === "es") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => translateContent(lang.code)}
                        className="flex items-center gap-2"
                      >
                        <Languages className="h-4 w-4" />
                        Vertalen
                      </Button>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor={`title-${lang.code}`}>Titel</Label>
                      <Input
                        id={`title-${lang.code}`}
                        value={content[lang.code]?.title || ""}
                        onChange={(e) => updateContent(lang.code, "title", e.target.value)}
                        placeholder={`Product title in ${lang.name}`}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`description-${lang.code}`}>Beschrijving</Label>
                      <div className="border rounded-lg">
                        {/* Rich Text Toolbar */}
                        <div className="flex items-center gap-1 p-2 border-b bg-muted/50">
                          <Button size="sm" variant="ghost">
                            <Bold className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost">
                            <Italic className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost">
                            <List className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost">
                            <Link className="h-4 w-4" />
                          </Button>
                        </div>
                        <Textarea
                          id={`description-${lang.code}`}
                          value={content[lang.code]?.description || ""}
                          onChange={(e) => updateContent(lang.code, "description", e.target.value)}
                          placeholder={`Product description in ${lang.name}`}
                          className="min-h-128 border-0 focus-visible:ring-0"
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>

          <div className="lg:col-span-1">
            <ImageManager />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
