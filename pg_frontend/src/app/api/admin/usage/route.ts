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

const getAuthHeaders = async () => {
  const token = (await cookies()).get("admin_session")?.value;

  if (!token) {
    return null;
  }

  return {
    Authorization: `Bearer ${token}`,
  };
};

export async function GET() {
  try {
    const headers = await getAuthHeaders();
    if (!headers) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const response = await fetch(`${backendBaseUrl}/api/usage`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    const text = await response.text();
    const body = parseJsonSafely(text);

    if (!response.ok) {
      return NextResponse.json(body || { message: "Failed to fetch usage" }, { status: response.status });
    }

    return NextResponse.json(body, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Backend not reachable" }, { status: 500 });
  }
}
