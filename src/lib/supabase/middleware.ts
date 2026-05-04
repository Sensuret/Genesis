import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key",
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: "", ...options });
        }
      }
    }
  );

  const { pathname } = request.nextUrl;

  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/auth/");
  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/logo");

  // /reset-password and /register need to be reachable even when a session
  // cookie is present:
  //   - /reset-password: Supabase exchanges the recovery code for a session,
  //     so we'd otherwise bounce the user back to /dashboard mid-flow.
  //   - /register: a user who's still signed in (or has a stale cookie) on a
  //     shared device must be able to land on the signup form, sign out
  //     there, and create a fresh account. The form handles the sign-out.
  const allowSessionThrough =
    pathname.startsWith("/reset-password") || pathname.startsWith("/register");

  // Performance: every page navigation runs through this middleware (incl.
  // prefetch RSC requests). We use `getSession()` which reads from cookies
  // (no network round-trip to Supabase Auth) — fast enough to gate redirects.
  // True JWT verification still happens in `(app)/layout.tsx` via
  // `supabase.auth.getUser()`, so security isn't relaxed.
  const {
    data: { session }
  } = await supabase.auth.getSession();
  const hasSession = !!session?.user;

  if (!hasSession && !isAuthRoute && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (hasSession && isAuthRoute && !allowSessionThrough) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
