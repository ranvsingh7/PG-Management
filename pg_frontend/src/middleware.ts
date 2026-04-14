import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ADMIN_PATHS = new Set(["/admin/login", "/admin/signup"]);

const applyNoStoreHeaders = (response: NextResponse) => {
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
};

const isExpiredJwt = (token: string | undefined) => {
  if (!token) {
    return true;
  }

  const parts = token.split(".");
  if (parts.length < 2) {
    return true;
  }

  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))) as { exp?: number };
    if (!payload.exp) {
      return false;
    }

    return payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const rawSessionCookie = request.cookies.get("admin_session")?.value;
  const hasValidSession = !isExpiredJwt(rawSessionCookie);

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const isPublicAdminPath = PUBLIC_ADMIN_PATHS.has(pathname);

  if (isPublicAdminPath) {
    return applyNoStoreHeaders(NextResponse.next());
  }

  if (!hasValidSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    return applyNoStoreHeaders(NextResponse.redirect(url));
  }

  return applyNoStoreHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/admin/:path*"],
};
