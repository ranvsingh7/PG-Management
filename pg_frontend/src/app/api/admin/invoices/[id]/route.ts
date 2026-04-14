import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { deleteInvoice, getInvoice, updateInvoice } from "../store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_API_BASE_URL || "http://localhost:4000";

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
  params: { id: string };
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const headers = await getAuthHeaders();
    if (headers) {
      try {
        const response = await fetch(`${BACKEND_URL}/api/invoices/${context.params.id}`, {
          method: "GET",
          headers,
          cache: "no-store",
        });
        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
      } catch {
        // fallback
      }
    }

    const invoice = await getInvoice(context.params.id);
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
    const headers = await getAuthHeaders();
    if (headers) {
      try {
        const body = await request.json();
        const response = await fetch(`${BACKEND_URL}/api/invoices/${context.params.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(body),
        });
        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
      } catch {
        // fallback
      }
    }

    const body = (await request.json()) as {
      rent_amount?: number;
      electricity_amount?: number;
      security_deposit_paid_amount?: number;
      due_date?: string;
      status?: "pending" | "paid" | "partial";
    };

    const updated = await updateInvoice(context.params.id, body);
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
    const headers = await getAuthHeaders();
    if (headers) {
      try {
        const response = await fetch(`${BACKEND_URL}/api/invoices/${context.params.id}`, {
          method: "DELETE",
          headers,
        });
        if (response.status === 204) {
          return NextResponse.json({}, { status: 204 });
        }
        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
      } catch {
        // fallback
      }
    }

    const deleted = await deleteInvoice(context.params.id);
    if (!deleted) {
      return NextResponse.json({ message: "Invoice not found" }, { status: 404 });
    }
    return NextResponse.json({}, { status: 204 });
  } catch {
    return NextResponse.json({ message: "Failed to delete invoice" }, { status: 500 });
  }
}
