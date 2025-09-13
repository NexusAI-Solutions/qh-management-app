"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye } from "lucide-react";
import Link from "next/link";

type AirtableRecord<T = Record<string, unknown>> = {
  id: string;
  createdTime: string;
  fields: T;
};

type AirtableListResponse<T = unknown> = {
  records: AirtableRecord<T>[];
  offset?: string;
};

type Row = {
  Aanvraagnummer?: string | number;
  Voorkeur?: string;
  Herkomst?: string; // store name
  Status?: string;
  "Aangemaakt op"?: string;
};

const AIRTABLE_VIEW_URL = (recordId: string) =>
  `https://airtable.com/appDlunDo94dSnp9d/pagYGQH9DQXxDFE5L?Mh8hy=${recordId}`;

function formatDate(d?: string) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Consistent badge color per store name (Herkomst) */
const STORE_BADGE_CLASSES = [
  "bg-blue-100 text-blue-800 hover:!bg-blue-100 hover:!text-blue-800",
  "bg-green-100 text-green-800 hover:!bg-green-100 hover:!text-green-800",
  "bg-yellow-100 text-yellow-800 hover:!bg-yellow-100 hover:!text-yellow-800",
  "bg-purple-100 text-purple-800 hover:!bg-purple-100 hover:!text-purple-800",
  "bg-pink-100 text-pink-800 hover:!bg-pink-100 hover:!text-pink-800",
  "bg-indigo-100 text-indigo-800 hover:!bg-indigo-100 hover:!text-indigo-800",
  "bg-rose-100 text-rose-800 hover:!bg-rose-100 hover:!text-rose-800",
  "bg-teal-100 text-teal-800 hover:!bg-teal-100 hover:!text-teal-800",
  "bg-amber-100 text-amber-800 hover:!bg-amber-100 hover:!text-amber-800",
  "bg-cyan-100 text-cyan-800 hover:!bg-cyan-100 hover:!text-cyan-800",
];

const storeColorCache = new Map<string, string>();

function getStoreBadgeClass(store?: string) {
  if (!store) return "bg-gray-100 text-gray-800 hover:!bg-gray-100 hover:!text-gray-800";
  const hit = storeColorCache.get(store);
  if (hit) return hit;
  let hash = 0;
  for (let i = 0; i < store.length; i++) hash = (hash * 31 + store.charCodeAt(i)) >>> 0;
  const cls = STORE_BADGE_CLASSES[hash % STORE_BADGE_CLASSES.length];
  storeColorCache.set(store, cls);
  return cls;
}

/* ---------- Skeletons ---------- */

function SkeletonBar({ className }: { className?: string }) {
  return <div className={`h-4 rounded bg-gray-200 animate-pulse ${className ?? ""}`} />;
}

function SkeletonBadge() {
  return <div className="inline-block h-6 w-20 rounded-full bg-gray-200 animate-pulse" />;
}

function SkeletonTable({ rows = 8 }: { rows?: number }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Aanvraagnummer</TableHead>
            <TableHead>Voorkeur</TableHead>
            <TableHead>Herkomst</TableHead>
            <TableHead>Aangemaakt op</TableHead>
            <TableHead>Acties</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRow key={i}>
              <TableCell className="w-[180px]"><SkeletonBar className="w-3/4" /></TableCell>
              <TableCell className="w-[240px]"><SkeletonBar className="w-5/6" /></TableCell>
              <TableCell className="w-[200px]"><SkeletonBadge /></TableCell>
              <TableCell className="w-[220px]"><SkeletonBar className="w-2/3" /></TableCell>
              <TableCell className="w-[140px]">
                <div className="h-9 w-24 rounded-md bg-gray-200 animate-pulse" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <span className="sr-only">Inhoud wordt geladen…</span>
    </div>
  );
}

function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3 p-3" role="status" aria-busy="true" aria-live="polite">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="border border-gray-200">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <SkeletonBar className="w-32" />
                <div className="mt-2"><SkeletonBadge /></div>
              </div>
              <div className="h-8 w-20 rounded-md bg-gray-200 animate-pulse" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <SkeletonBar className="w-24" />
              <SkeletonBar className="w-28" />
            </div>
          </CardContent>
        </Card>
      ))}
      <span className="sr-only">Inhoud wordt geladen…</span>
    </div>
  );
}

/* ---------- Page ---------- */

export default function OrdersPage() {
  const [data, setData] = useState<AirtableListResponse<Row> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/airtable", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: AirtableListResponse<Row> = await res.json();
        if (!cancelled) setData(json);
        } catch (e: unknown) {
          const message =
            e instanceof Error ? e.message : typeof e === "string" ? e : "Onbekende fout";
          if (!cancelled) setError(String(message));
        } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="py-3 sm:py-6">
      <div className="mb-4 sm:mb-6">
        <h1>Aanvragen</h1>
        <p className="text-sm sm:text-base text-gray-600">
          Overzicht van alle aanvragen met Status = Ontvangen
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">
            Openstaande adviesaanvragen
            {loading && " (…)"} 
            {!loading && !error && data && ` (${data.records.length})`}
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0 sm:p-6">
          {/* Loading skeletons */}
          {loading && (
            <>
              <div className="hidden md:block">
                <SkeletonTable rows={8} />
              </div>
              <div className="md:hidden">
                <SkeletonCards count={3} />
              </div>
            </>
          )}

          {/* Error */}
          {error && (
            <div className="p-6 text-sm text-red-600">Fout bij laden: {error}</div>
          )}

          {/* Data */}
          {!loading && !error && (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Aanvraagnummer</TableHead>
                      <TableHead>Voorkeur</TableHead>
                      <TableHead>Herkomst</TableHead>
                      <TableHead>Aangemaakt op</TableHead>
                      <TableHead>Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.records?.map((r) => {
                      const f = r.fields || {};
                      const created = (f["Aangemaakt op"] as string) || r.createdTime;
                      const store = f.Herkomst as string | undefined;
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{f.Aanvraagnummer ?? "—"}</TableCell>
                          <TableCell>{f.Voorkeur ?? "—"}</TableCell>
                          <TableCell>
                            <Badge className={`${getStoreBadgeClass(store)} whitespace-nowrap`}>
                              {store ?? "—"}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(created)}</TableCell>
                          <TableCell>
                            <Link href={AIRTABLE_VIEW_URL(r.id)} target="_blank" rel="noopener noreferrer">
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-1" />
                                Bekijk
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3 p-3">
                {data?.records?.map((r) => {
                  const f = r.fields || {};
                  const created = (f["Aangemaakt op"] as string) || r.createdTime;
                  const store = f.Herkomst as string | undefined;
                  return (
                    <Card key={r.id} className="border border-gray-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-medium text-sm">Aanvraag {String(f.Aanvraagnummer ?? "—")}</p>
                            <div className="mt-1">
                              <Badge className={`${getStoreBadgeClass(store)} text-xs`}>
                                {store ?? "—"}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="text-sm grid grid-cols-2 gap-2 mb-3">
                          <div>
                            <div className="text-gray-500">Voorkeur</div>
                            <div className="font-medium break-words">{f.Voorkeur ?? "—"}</div>
                          </div>
                          <div>
                            <div className="text-gray-500">Aangemaakt op</div>
                            <div className="font-medium">{formatDate(created)}</div>
                          </div>
                        </div>

                        <Link href={AIRTABLE_VIEW_URL(r.id)} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm" className="text-xs bg-transparent">
                            <Eye className="h-3 w-3 mr-1" />
                            Bekijk
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
