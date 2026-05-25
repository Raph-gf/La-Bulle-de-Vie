import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

// Pages that require a logged-in session
const PROTECTED_PAGES = ["/dashboard", "/compte"]

// API prefixes that return 401 (instead of redirect) when unauthenticated
const PROTECTED_API = ["/api/dashboard", "/api/user"]

export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Graceful skip in local dev without Supabase configured
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next()
  }

  // Build response early so refreshed cookies can be forwarded
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      // Write refreshed tokens onto both request (for downstream SSR) and response (for browser)
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request: { headers: request.headers } })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  // getUser() validates the JWT server-side — cannot be spoofed unlike getSession()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // ── Protected API routes → 401 ──────────────────────────────────────────────
  if (PROTECTED_API.some((prefix) => pathname.startsWith(prefix)) && !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // ── Protected page routes → redirect to /login ──────────────────────────────
  if (PROTECTED_PAGES.some((prefix) => pathname.startsWith(prefix)) && !user) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // ── Already logged in, hitting /login or /register → send home ─────────────
  if (user && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/compte", request.url))
  }

  return response
}

export const config = {
  matcher: [
    // Run on all routes except Next.js internals and static files
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
}
