import { NextResponse } from "next/server";

const backendBaseUrl = process.env.BACKEND_API_BASE_URL || "http://localhost:4000";

const parseJsonSafely = (value: string) => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const setSessionCookie = (response: NextResponse, token: string) => {
  response.cookies.set({
    name: "tenant_session",
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
};

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    const response = await fetch(`${backendBaseUrl}/api/tenant/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const text = await response.text();
    const body = parseJsonSafely(text);

    if (!response.ok) {
      return NextResponse.json(body || { message: "Login failed" }, { status: response.status });
    }

    const token = body?.token;
    const tenant = body?.tenant;

    if (!token || !tenant) {
      return NextResponse.json({ message: "Invalid auth response" }, { status: 500 });
    }

    const result = NextResponse.json({ tenant }, { status: 200 });
    setSessionCookie(result, token);
    return result;
  } catch {
    return NextResponse.json({ message: "Invalid request or backend not reachable" }, { status: 500 });
  }
}
