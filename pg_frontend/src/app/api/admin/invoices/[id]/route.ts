import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { deleteInvoice, getInvoice, updateInvoice } from "../store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_API_BASE_URL || "http://localhost:4000";

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

const readResponseBody = async (response: Response) => {
  const text = await response.text();
  return parseJsonSafely(text);
};

const getAuthHeaders = async () => {
  const token = (await cookies()).get("admin_session")?.value;
  if (!token) {
    return null;
  }
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const headers = await getAuthHeaders();
    if (headers) {
      try {
        const response = await fetch(`${BACKEND_URL}/api/invoices/${id}`, {
          method: "GET",
          headers,
          cache: "no-store",
        });
        const data = await readResponseBody(response);
        return NextResponse.json(data ?? { message: "Failed to fetch invoice" }, { status: response.status });
      } catch {
        // fallback
      }
    }

    const invoice = await getInvoice(id);
    if (!invoice) {
      return NextResponse.json({ message: "Invoice not found" }, { status: 404 });
    }
    return NextResponse.json(invoice, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Failed to fetch invoice" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const headers = await getAuthHeaders();
    if (headers) {
      try {
        const response = await fetch(`${BACKEND_URL}/api/invoices/${id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(body),
        });
        const data = await readResponseBody(response);
        return NextResponse.json(data ?? { message: "Failed to update invoice" }, { status: response.status });
      } catch {
        // fallback
      }
    }

    const payload = body as {
      rent_amount?: number;
      electricity_amount?: number;
      security_deposit_paid_amount?: number;
      due_date?: string;
      status?: "pending" | "paid" | "partial";
    };

    const updated = await updateInvoice(id, payload);
    if (!updated) {
      return NextResponse.json({ message: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json(updated, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Failed to update invoice" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const headers = await getAuthHeaders();
    if (headers) {
      try {
        const response = await fetch(`${BACKEND_URL}/api/invoices/${id}`, {
          method: "DELETE",
          headers,
        });
        if (response.status === 204) {
          return NextResponse.json({}, { status: 204 });
        }
        const data = await readResponseBody(response);
        return NextResponse.json(data ?? { message: "Failed to delete invoice" }, { status: response.status });
      } catch {
        // fallback
      }
    }

    const deleted = await deleteInvoice(id);
    if (!deleted) {
      return NextResponse.json({ message: "Invoice not found" }, { status: 404 });
    }
    return NextResponse.json({}, { status: 204 });
  } catch {
    return NextResponse.json({ message: "Failed to delete invoice" }, { status: 500 });
  }
}
