import { NextRequest, NextResponse } from "next/server";
import { deleteInvoice, getInvoice, updateInvoice } from "../store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: { id: string };
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
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
    const deleted = await deleteInvoice(context.params.id);
    if (!deleted) {
      return NextResponse.json({ message: "Invoice not found" }, { status: 404 });
    }
    return NextResponse.json({}, { status: 204 });
  } catch {
    return NextResponse.json({ message: "Failed to delete invoice" }, { status: 500 });
  }
}
