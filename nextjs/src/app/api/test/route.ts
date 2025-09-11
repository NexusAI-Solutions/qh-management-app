// src/app/api/test/route.ts
import { NextResponse } from "next/server";
import { createSSRSassClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export async function GET() {
  // Reuse your SSR helper (it should be wired to Next cookies/headers)
  const supa = await createSSRSassClient();
  const supabase = supa.getSupabaseClient();

  // Validate the session from cookies
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return notFound();
  }

  return NextResponse.json({ message: "Hallo world" });
}