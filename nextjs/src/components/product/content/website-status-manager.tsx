"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { CheckCircle, XCircle } from "lucide-react"

const websites = [
  { id: "gaslooswonen", name: "Gaslooswonen", url: "gaslooswonen.nl" },
  { id: "infrarood-nl", name: "Infraroodverwarmingstore.nl", url: "infraroodverwarmingstore.nl" },
  { id: "infrarood-be", name: "Infraroodverwarmingstore.be", url: "infraroodverwarmingstore.be" },
  { id: "infrarot-de", name: "Infrarotheizungstore.de", url: "infrarotheizungstore.de" },
  { id: "calefactor-es", name: "Calefctor-electrico.es", url: "calefctor-electrico.es" },
  { id: "chauffage-fr", name: "Chauffageelectrice.fr", url: "chauffageelectrice.fr" },
]

export function WebsiteStatusManager() {
  const [websiteStatus, setWebsiteStatus] = useState<Record<string, { published: boolean; enabled: boolean }>>({
    gaslooswonen: { published: true, enabled: true },
    "infrarood-nl": { published: true, enabled: true },
    "infrarood-be": { published: false, enabled: true },
    "infrarot-de": { published: true, enabled: false },
    "calefactor-es": { published: false, enabled: true },
    "chauffage-fr": { published: true, enabled: true },
  })

  const toggleEnabled = (websiteId: string) => {
    setWebsiteStatus((prev) => ({
      ...prev,
      [websiteId]: {
        ...prev[websiteId],
        enabled: !prev[websiteId]?.enabled,
      },
    }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Website status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {websites.map((website) => {
            const status = websiteStatus[website.id] || { published: false, enabled: false }
            return (
              <div key={website.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {status.published ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <div>
                      <div className="font-medium">{website.name}</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline text-sm text-muted-foreground">Publiceren</span>
                  <Switch checked={status.enabled} onCheckedChange={() => toggleEnabled(website.id)} />
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
