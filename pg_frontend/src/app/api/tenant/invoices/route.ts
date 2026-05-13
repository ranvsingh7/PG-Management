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
    const token = (await cookies()).get("tenant_session")?.value;
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const response = await fetch(`${backendBaseUrl}/api/tenant/invoices`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const text = await response.text();
    const body = parseJsonSafely(text);

    return NextResponse.json(body || { message: "Failed to fetch invoices" }, { status: response.status });
  } catch {
    return NextResponse.json({ message: "Backend not reachable" }, { status: 500 });
  }
}
