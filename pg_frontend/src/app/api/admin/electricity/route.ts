import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

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

const getAuthHeaders = async (includeJson = false) => {
  const token = (await cookies()).get("admin_session")?.value;

  if (!token) {
    return null;
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  if (includeJson) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
};

export async function GET(request: NextRequest) {
  try {
    const headers = await getAuthHeaders();
    if (!headers) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const search = request.nextUrl.searchParams.toString();
    const response = await fetch(`${backendBaseUrl}/api/electricity${search ? `?${search}` : ""}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    const text = await response.text();
    const body = parseJsonSafely(text);

    if (!response.ok) {
      return NextResponse.json(body || { message: "Failed to fetch electricity summary" }, { status: response.status });
    }

    return NextResponse.json(body || {}, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Backend not reachable" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const headers = await getAuthHeaders(true);
    if (!headers) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json();
    const response = await fetch(`${backendBaseUrl}/api/electricity/readings`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const text = await response.text();
    const body = parseJsonSafely(text);

    if (!response.ok) {
      return NextResponse.json(body || { message: "Failed to save readings" }, { status: response.status });
    }

    return NextResponse.json(body || {}, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Invalid request or backend not reachable" }, { status: 500 });
  }
}
