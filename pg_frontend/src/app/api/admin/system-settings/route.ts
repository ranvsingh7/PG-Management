import { cookies } from "next/headers";
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

export async function GET() {
  try {
    const headers = await getAuthHeaders();
    if (!headers) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const response = await fetch(`${backendBaseUrl}/api/system-settings`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    const text = await response.text();
    const body = parseJsonSafely(text);

    return NextResponse.json(body || { message: "Failed to fetch system settings" }, { status: response.status });
  } catch {
    return NextResponse.json({ message: "Backend not reachable" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const payload = await request.json();
    const headers = await getAuthHeaders(true);
    if (!headers) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const response = await fetch(`${backendBaseUrl}/api/system-settings`, {
      method: "PUT",
      headers,
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const text = await response.text();
    const body = parseJsonSafely(text);

    return NextResponse.json(body || { message: "Failed to update system settings" }, { status: response.status });
  } catch {
    return NextResponse.json({ message: "Backend not reachable" }, { status: 500 });
  }
}
