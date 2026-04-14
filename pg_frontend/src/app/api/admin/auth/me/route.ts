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

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_session")?.value;

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const response = await fetch(`${backendBaseUrl}/api/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const text = await response.text();
    const body = parseJsonSafely(text);

    if (!response.ok) {
      return NextResponse.json(body || { message: "Unauthorized" }, { status: response.status });
    }

    return NextResponse.json(body, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Backend not reachable" }, { status: 500 });
  }
}
