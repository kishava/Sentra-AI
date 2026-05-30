import { type NextRequest, NextResponse } from "next/server";
import { parseLocalSessionCookie, LOCAL_SESSION_COOKIE } from "@/lib/local-auth/session-cookie";
import { updateSession } from "@/lib/supabase/middleware";

const workspacePrefixes = ["/dashboard", "/chat", "/alerts", "/reports", "/analyst", "/settings", "/workspace"];
const protectedPrefixes = [...workspacePrefixes, "/onboarding"];
const authPaths = ["/sign-in", "/sign-up"];

function isAuthPath(pathname: string) {
  return authPaths.some((path) => pathname === path);
}

function isProtectedPath(pathname: string) {
  return protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function hasLocalSession(request: NextRequest) {
  return Boolean(parseLocalSessionCookie(request.cookies.get(LOCAL_SESSION_COOKIE)?.value));
}

export async function middleware(request: NextRequest) {
  const supabaseConfigured =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) &&
    Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
    );

  const { pathname } = request.nextUrl;

  if (!supabaseConfigured) {
    if (isProtectedPath(pathname) && !hasLocalSession(request)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/sign-in";
      redirectUrl.search = "";
      redirectUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(redirectUrl);
    }

    if (isAuthPath(pathname) && hasLocalSession(request)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/dashboard";
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }

    return NextResponse.next();
  }

  const { supabaseResponse, user } = await updateSession(request);

  if (isProtectedPath(pathname) && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/sign-in";
    redirectUrl.search = "";
    redirectUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(redirectUrl);
  }

  if (isAuthPath(pathname) && user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/chat",
    "/chat/:path*",
    "/alerts",
    "/alerts/:path*",
    "/reports",
    "/reports/:path*",
    "/analyst",
    "/analyst/:path*",
    "/settings",
    "/settings/:path*",
    "/workspace",
    "/workspace/:path*",
    "/onboarding",
    "/sign-in",
    "/sign-up",
  ],
};
