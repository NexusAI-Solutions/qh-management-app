// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";

/** Endpoints/folders to protect (regex). Add more as needed. */
const PROTECTED: RegExp[] = [
  /^\/api\/airtable$/,      // exact endpoint
  /^\/api\/products(?:\/.*)?$/,
  /^\/api\/channels(?:\/.*)?$/,
  /^\/api\/products(?:\/.*)?$/,           
  // /^\/api\/private(?:\/.*)?$/,   // whole folder
  // /^\/api\/reports$/,            // another example
];

function isProtected(pathname: string) {
  return PROTECTED.some((rx) => rx.test(pathname));
}

export async function middleware(req: NextRequest) {
  // 1) Keep session fresh globally
  const res = await updateSession(req); // ← const is fine; NextResponse is still mutable

  // 2) Only enforce auth for protected paths
  if (!isProtected(req.nextUrl.pathname)) return res;

  // 3) Supabase client bound to middleware cookies (new getAll/setAll API)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    // Empty 404 (no body)
    return new NextResponse(null, { status: 404 });
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
