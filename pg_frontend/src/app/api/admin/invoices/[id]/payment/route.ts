import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { addPayment } from "../../store";

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

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      amount: number;
      method: "cash" | "upi" | "bank" | "card" | "wallet";
      paid_at?: string;
      note?: string;
      status?: "success" | "failed";
    };

    if (!body?.amount || !body.method) {
      return NextResponse.json({ message: "amount and method are required" }, { status: 400 });
    }

    const headers = await getAuthHeaders();
    if (headers) {
      try {
        const invoiceResponse = await fetch(`${BACKEND_URL}/api/invoices/${id}`, {
          method: "GET",
          headers,
          cache: "no-store",
        });
        const invoice = await readResponseBody(invoiceResponse);
        if (!invoiceResponse.ok) {
          return NextResponse.json(invoice ?? { message: "Failed to fetch invoice" }, { status: invoiceResponse.status });
        }

        const currentPaid = Number(invoice.paid_amount || 0);
        const totalAmount = Number(invoice.amount || 0);
        const attemptedAmount = Number(body.amount || 0);
        const status = body.status || "success";

        const nextPaid =
          status === "success" ? Number((currentPaid + attemptedAmount).toFixed(2)) : currentPaid;

        const nextStatus =
          status === "failed"
            ? invoice.status || "pending"
            : nextPaid >= totalAmount
              ? "paid"
              : nextPaid > 0
                ? "partial"
                : "pending";

        const patchResponse = await fetch(`${BACKEND_URL}/api/invoices/${id}/status`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            status: nextStatus,
            paid_amount: nextPaid,
            payment_method: body.method,
            payment_note: body.note,
            payment_date: body.paid_at,
            payment_status: status,
            payment_amount: attemptedAmount,
          }),
        });

        const patchData = await readResponseBody(patchResponse);
        return NextResponse.json(patchData ?? { message: "Failed to record payment" }, { status: patchResponse.status });
      } catch {
        // fallback
      }
    }

    const updated = await addPayment(id, body);
    if (!updated) {
      return NextResponse.json({ message: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json(updated, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Failed to record payment" }, { status: 500 });
  }
}
