import { NextRequest, NextResponse } from "next/server";
import {
  EffectiveStatus,
  ensureSeeded,
  generateInvoices,
  listInvoices,
  readStore,
} from "./store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "";
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 10);
    const status = (searchParams.get("status") || "all") as EffectiveStatus | "all";
    const search = searchParams.get("search") || "";
    const buildingId = searchParams.get("building_id") || undefined;

    if (period) {
      await ensureSeeded(period, buildingId);
    }

    const store = await readStore();
    const filtered = listInvoices(store, { period, status, search, buildingId });
    const total = filtered.length;
    const totalPages = Math.max(Math.ceil(total / limit), 1);
    const safePage = Math.min(Math.max(page, 1), totalPages);
    const start = (safePage - 1) * limit;
    const items = filtered.slice(start, start + limit);

    const summary = filtered.reduce(
      (acc, invoice) => {
        acc.total_invoice += 1;
        if (invoice.effective_status === "paid") acc.paid += 1;
        if (invoice.effective_status === "pending") acc.pending += 1;
        if (invoice.effective_status === "overdue") acc.overdue += 1;
        return acc;
      },
      { total_invoice: 0, pending: 0, paid: 0, overdue: 0 }
    );

    return NextResponse.json(
      {
        items,
        summary,
        pagination: {
          page: safePage,
          limit,
          total,
          totalPages,
          hasNextPage: safePage < totalPages,
          hasPrevPage: safePage > 1,
        },
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ message: "Failed to fetch invoices" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { period?: string; building_id?: string };
    if (!body.period) {
      return NextResponse.json({ message: "Period is required" }, { status: 400 });
    }

    const { createdCount } = await generateInvoices(body.period, body.building_id);
    return NextResponse.json(
      { message: `Generated ${createdCount} invoice(s)`, created_count: createdCount },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ message: "Failed to generate invoices" }, { status: 500 });
  }
}
