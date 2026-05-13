import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ADMIN_PATHS = new Set(["/admin/login", "/admin/signup"]);
const PUBLIC_TENANT_PATHS = new Set(["/tenant/login"]);
const backendBaseUrl = process.env.BACKEND_API_BASE_URL || "http://localhost:4000";

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

const isSessionValid = async (token: string | undefined) => {
  if (!token || isExpiredJwt(token)) {
    return false;
  }

  try {
    const response = await fetch(`${backendBaseUrl}/api/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    return response.ok;
  } catch {
    return false;
  }
};

const isTenantSessionValid = async (token: string | undefined) => {
  if (!token || isExpiredJwt(token)) {
    return false;
  }

  try {
    const response = await fetch(`${backendBaseUrl}/api/tenant/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    return response.ok;
  } catch {
    return false;
  }
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const rawAdminSessionCookie = request.cookies.get("admin_session")?.value;
  const rawTenantSessionCookie = request.cookies.get("tenant_session")?.value;
  const hasValidAdminSession = await isSessionValid(rawAdminSessionCookie);
  const hasValidTenantSession = await isTenantSessionValid(rawTenantSessionCookie);

  if (pathname.startsWith("/admin")) {
    const isPublicAdminPath = PUBLIC_ADMIN_PATHS.has(pathname);

    if (isPublicAdminPath) {
      return applyNoStoreHeaders(NextResponse.next());
    }

    if (!hasValidAdminSession) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      return applyNoStoreHeaders(NextResponse.redirect(url));
    }

    return applyNoStoreHeaders(NextResponse.next());
  }

  if (pathname.startsWith("/tenant")) {
    const isPublicTenantPath = PUBLIC_TENANT_PATHS.has(pathname);

    if (isPublicTenantPath) {
      return applyNoStoreHeaders(NextResponse.next());
    }

    if (!hasValidTenantSession) {
      const url = request.nextUrl.clone();
      url.pathname = "/tenant/login";
      return applyNoStoreHeaders(NextResponse.redirect(url));
    }

    return applyNoStoreHeaders(NextResponse.next());
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/tenant/:path*"],
};
