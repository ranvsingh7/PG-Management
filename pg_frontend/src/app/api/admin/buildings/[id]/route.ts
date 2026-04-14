import { NextResponse } from "next/server";
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

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ message: "Building ID is required" }, { status: 400 });
    }

    const payload = await request.json();
    const headers = await getAuthHeaders(true);
    if (!headers) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const response = await fetch(`${backendBaseUrl}/api/buildings/${id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const text = await response.text();
    const body = parseJsonSafely(text);

    if (!response.ok) {
      return NextResponse.json(
        body || { message: "Failed to update building" },
        { status: response.status }
      );
    }

    return NextResponse.json(body, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: "Invalid request or backend not reachable" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ message: "Building ID is required" }, { status: 400 });
    }

    const headers = await getAuthHeaders();
    if (!headers) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const response = await fetch(`${backendBaseUrl}/api/buildings/${id}`, {
      method: "DELETE",
      headers,
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text();
      const body = parseJsonSafely(text);
      return NextResponse.json(
        body || { message: "Failed to delete building" },
        { status: response.status }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json(
      { message: "Invalid request or backend not reachable" },
      { status: 500 }
    );
  }
}
