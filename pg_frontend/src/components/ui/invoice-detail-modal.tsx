"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type InvoiceLike = {
  invoice_number?: string;
  tenant_name?: string;
  building_name?: string;
  room_number?: string;
  period?: string;
  due_date?: string;
  status?: string;
  effective_status?: string;
  rent_amount?: number;
  electricity_amount?: number;
  verification_amount?: number;
  security_deposit_amount?: number;
  amount?: number;
  paid_amount?: number;
  outstanding_amount?: number;
  created_at?: string;
};

type InvoiceDetailModalProps = {
  isOpen: boolean;
  invoice: InvoiceLike | null;
  onClose: () => void;
  title?: string;
  settingsEndpoint?: string;
};

type PropertySetting = {
  property_name?: string;
  contact_phone?: string;
  contact_email?: string;
  address?: string;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);

const toPrettyDate = (value?: string) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

export function InvoiceDetailModal({
  isOpen,
  invoice,
  onClose,
  title = "Invoice Details",
  settingsEndpoint,
}: InvoiceDetailModalProps) {
  const [propertySetting, setPropertySetting] = useState<PropertySetting | null>(null);

  useEffect(() => {
    if (!isOpen || !settingsEndpoint) {
      return;
    }

    let cancelled = false;

    const loadSetting = async () => {
      try {
        const response = await fetch(settingsEndpoint, { cache: "no-store" });
        const data = (await response.json()) as PropertySetting | { message?: string };
        if (!response.ok || cancelled) {
          return;
        }

        setPropertySetting(data as PropertySetting);
      } catch {
        if (!cancelled) {
          setPropertySetting(null);
        }
      }
    };

    loadSetting();
    return () => {
      cancelled = true;
    };
  }, [isOpen, settingsEndpoint]);
  const normalized = useMemo(() => {
    if (!invoice) {
      return null;
    }

    const rent = Number(invoice.rent_amount || 0);
    const electricity = Number(invoice.electricity_amount || 0);
    const verification = Number(invoice.verification_amount || 0);
    const securityDeposit = Number(invoice.security_deposit_amount || 0);
    const subtotal = Number((rent + electricity + verification + securityDeposit).toFixed(2));
    const total = Number(invoice.amount || 0) > 0 ? Number(invoice.amount || 0) : subtotal;
    const paid = Number(invoice.paid_amount || 0);
    const outstanding = Number(invoice.outstanding_amount || 0) > 0
      ? Number(invoice.outstanding_amount || 0)
      : Math.max(Number((total - paid).toFixed(2)), 0);

    return {
      invoiceNumber: String(invoice.invoice_number || "-").trim() || "-",
      tenantName: String(invoice.tenant_name || "").trim() || "-",
      buildingName: String(invoice.building_name || "").trim() || "-",
      roomNumber: String(invoice.room_number || "").trim() || "-",
      period: String(invoice.period || "").trim() || "-",
      dueDate: toPrettyDate(invoice.due_date),
      createdAt: toPrettyDate(invoice.created_at),
      status: String(invoice.effective_status || invoice.status || "pending"),
      rent,
      electricity,
      verification,
      securityDeposit,
      subtotal,
      total,
      paid,
      outstanding,
    };
  }, [invoice]);

  const propertyInfo = useMemo(() => {
    const name = String(propertySetting?.property_name || "").trim();
    const phone = String(propertySetting?.contact_phone || "").trim();
    const email = String(propertySetting?.contact_email || "").trim();
    const address = String(propertySetting?.address || "").trim();

    return {
      name: name || "PG Management",
      phone,
      email,
      address,
    };
  }, [propertySetting]);

  const buildInvoiceHtml = useCallback(() => {
    if (!normalized) {
      return "";
    }

    const rows = [
      { label: "Monthly Rent", value: normalized.rent },
      { label: "Electricity Charges", value: normalized.electricity },
    ];

    if (normalized.verification > 0) {
      rows.push({ label: "Verification Charge", value: normalized.verification });
    }

    if (normalized.securityDeposit > 0) {
      rows.push({ label: "Security Deposit", value: normalized.securityDeposit });
    }

    const rowsHtml = rows
      .map(
        (row) => `
          <tr>
            <td>${escapeHtml(row.label)}</td>
            <td style="text-align:right; font-weight:600;">${escapeHtml(formatCurrency(row.value))}</td>
          </tr>
        `
      )
      .join("");

    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(normalized.invoiceNumber)}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 32px; color: #0f172a; }
            h1 { font-size: 24px; margin: 0 0 8px; }
            .muted { color: #64748b; }
            .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-top: 16px; }
            .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border-bottom: 1px solid #e2e8f0; padding: 8px 6px; font-size: 14px; }
            th { text-align: left; text-transform: uppercase; letter-spacing: 0.08em; font-size: 11px; color: #64748b; }
            .total { display: flex; justify-content: space-between; font-weight: 700; font-size: 16px; margin-top: 12px; }
          </style>
        </head>
        <body>
          <h1>Invoice</h1>
          <div class="muted">Invoice # ${escapeHtml(normalized.invoiceNumber)}</div>

          <div class="grid">
            <div class="card">
              <div class="muted" style="font-size:12px; text-transform:uppercase;">From</div>
              <div style="font-weight:600; margin-top:6px;">${escapeHtml(propertyInfo.name)}</div>
              ${propertyInfo.address ? `<div class="muted">${escapeHtml(propertyInfo.address)}</div>` : ""}
              ${propertyInfo.phone ? `<div class="muted">Phone: ${escapeHtml(propertyInfo.phone)}</div>` : ""}
              ${propertyInfo.email ? `<div class="muted">Email: ${escapeHtml(propertyInfo.email)}</div>` : ""}
            </div>
            <div class="card">
              <div class="muted" style="font-size:12px; text-transform:uppercase;">Bill To</div>
              <div style="font-weight:600; margin-top:6px;">${escapeHtml(normalized.tenantName)}</div>
              <div class="muted">${escapeHtml(normalized.buildingName)}</div>
              <div class="muted">Room ${escapeHtml(normalized.roomNumber)}</div>
            </div>
            <div class="card">
              <div class="muted" style="font-size:12px; text-transform:uppercase;">Invoice Info</div>
              <div style="margin-top:6px;">Period: ${escapeHtml(normalized.period)}</div>
              <div>Due: ${escapeHtml(normalized.dueDate)}</div>
              <div>Status: ${escapeHtml(normalized.status)}</div>
            </div>
          </div>

            <table>
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align:right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="total">
            <span>Total</span>
            <span>${escapeHtml(formatCurrency(normalized.total))}</span>
          </div>
          <div class="muted" style="margin-top:6px;">Paid: ${escapeHtml(formatCurrency(normalized.paid))}</div>
          <div class="muted">Outstanding: ${escapeHtml(formatCurrency(normalized.outstanding))}</div>
        </body>
      </html>
    `;
  }, [normalized]);

  const handlePrint = useCallback(() => {
    const html = buildInvoiceHtml();
    if (!html) {
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }, [buildInvoiceHtml]);

  const handleDownload = useCallback(async () => {
    if (!normalized) {
      return;
    }

    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    doc.setCharSpace(0);
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 18;
    const right = pageWidth - margin;
    const amountX = right - 10;
    const lineGap = 5;
    let y = 18;

    const formatPdfNumber = (value: number) => {
      const safe = Number.isFinite(value) ? value : 0;
      return safe.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const writeWrapped = (text: string, x: number, maxWidth: number, fontSize = 10) => {
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, x, y);
      y += lines.length * lineGap;
    };

    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y - 8, right - margin, 14, "F");
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.text("Invoice", margin + 2, y);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Invoice #: ${normalized.invoiceNumber}`, right - 2, y, { align: "right" });
    y += 10;

    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, right, y);
    y += 6;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("From", margin, y);
    doc.text("Bill To", pageWidth / 2 + 8, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    const startY = y;
    writeWrapped(propertyInfo.name, margin, pageWidth / 2 - margin - 12, 10);
    if (propertyInfo.address) {
      writeWrapped(propertyInfo.address, margin, pageWidth / 2 - margin - 12, 9);
    }
    if (propertyInfo.phone) {
      writeWrapped(`Phone: ${propertyInfo.phone}`, margin, pageWidth / 2 - margin - 12, 9);
    }
    if (propertyInfo.email) {
      writeWrapped(`Email: ${propertyInfo.email}`, margin, pageWidth / 2 - margin - 12, 9);
    }

    y = startY;
    const billToX = pageWidth / 2 + 8;
    writeWrapped(normalized.tenantName, billToX, right - billToX - 6, 10);
    writeWrapped(normalized.buildingName, billToX, right - billToX - 6, 9);
    writeWrapped(`Room ${normalized.roomNumber}`, billToX, right - billToX - 6, 9);

    y = Math.max(y + 2, startY + 24);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, right, y);
    y += 6;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Invoice Info", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Period: ${normalized.period}`, margin, y);
    doc.text(`Due: ${normalized.dueDate}`, pageWidth / 2 + 8, y);
    y += 5;
    doc.text(`Status: ${normalized.status}`, margin, y);
    if (normalized.createdAt !== "-") {
      doc.text(`Created: ${normalized.createdAt}`, pageWidth / 2 + 8, y);
    }
    y += 8;

    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y, right - margin, 9, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Description", margin + 2, y + 6);
    doc.text("Amount", amountX, y + 6, { align: "right" });
    y += 12;

    const rows = [
      { label: "Monthly Rent", value: normalized.rent },
      { label: "Electricity Charges", value: normalized.electricity },
    ];

    if (normalized.verification > 0) {
      rows.push({ label: "Verification Charge", value: normalized.verification });
    }

    if (normalized.securityDeposit > 0) {
      rows.push({ label: "Security Deposit", value: normalized.securityDeposit });
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    rows.forEach((row) => {
      doc.text(row.label, margin + 2, y);
      doc.text(formatPdfNumber(row.value), amountX, y, { align: "right" });
      y += 7;
    });

    y += 4;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, right, y);
    y += 8;

    const summaryWidth = 70;
    const summaryX = right - summaryWidth;
    const summaryTop = y;
    const summaryHeight = 28;

    doc.setFillColor(248, 250, 252);
    doc.rect(summaryX, summaryTop, summaryWidth, summaryHeight, "F");
    doc.setDrawColor(226, 232, 240);
    doc.rect(summaryX, summaryTop, summaryWidth, summaryHeight);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Subtotal", summaryX + 4, summaryTop + 7);
    doc.text(`Rs. ${formatPdfNumber(normalized.subtotal)}`, summaryX + summaryWidth - 4, summaryTop + 7, { align: "right" });
    doc.text("Paid", summaryX + 4, summaryTop + 13);
    doc.text(`Rs. ${formatPdfNumber(normalized.paid)}`, summaryX + summaryWidth - 4, summaryTop + 13, { align: "right" });
    doc.text("Outstanding", summaryX + 4, summaryTop + 19);
    doc.text(`Rs. ${formatPdfNumber(normalized.outstanding)}`, summaryX + summaryWidth - 4, summaryTop + 19, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Total", summaryX + 4, summaryTop + 25);
    doc.text(`Rs. ${formatPdfNumber(normalized.total)}`, summaryX + summaryWidth - 4, summaryTop + 25, { align: "right" });

    doc.save(`${normalized.invoiceNumber || "invoice"}.pdf`);
  }, [normalized, propertyInfo]);

  if (!isOpen || !normalized) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-3xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <h3 className="text-xl font-black text-[var(--color-text-title)]">{title}</h3>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">{normalized.invoiceNumber}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="cursor-pointer rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-soft)]"
            >
              Download PDF
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="cursor-pointer rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-soft)]"
            >
              Print
            </button>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-soft)]"
            >
              Close
            </button>
          </div>
        </div>

        <div className="p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-sm">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">PG Details</p>
              <p className="mt-2 font-semibold text-[var(--color-text-title)]">{propertyInfo.name}</p>
              {propertyInfo.address ? (
                <p className="text-[var(--color-text-secondary)]">{propertyInfo.address}</p>
              ) : null}
              {propertyInfo.phone ? (
                <p className="text-[var(--color-text-secondary)]">Phone: {propertyInfo.phone}</p>
              ) : null}
              {propertyInfo.email ? (
                <p className="text-[var(--color-text-secondary)]">Email: {propertyInfo.email}</p>
              ) : null}
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-sm">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Bill To</p>
              <p className="mt-2 font-semibold text-[var(--color-text-title)]">{normalized.tenantName}</p>
              <p className="text-[var(--color-text-secondary)]">{normalized.buildingName}</p>
              <p className="text-[var(--color-text-secondary)]">Room {normalized.roomNumber}</p>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-sm sm:col-span-2">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Invoice Info</p>
              <div className="mt-2 grid gap-2 text-[var(--color-text-secondary)] sm:grid-cols-3">
                <p><span className="font-semibold">Period:</span> {normalized.period}</p>
                <p><span className="font-semibold">Due Date:</span> {normalized.dueDate}</p>
                <p className="capitalize"><span className="font-semibold">Status:</span> {normalized.status}</p>
                {normalized.createdAt !== "-" ? (
                  <p><span className="font-semibold">Created:</span> {normalized.createdAt}</p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-[var(--color-border)]">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em]">Description</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.08em]">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-[var(--color-border)]">
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">Monthly Rent</td>
                  <td className="px-4 py-3 text-right font-semibold text-[var(--color-text-title)]">
                    {formatCurrency(normalized.rent)}
                  </td>
                </tr>
                <tr className="border-t border-[var(--color-border)]">
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">Electricity Charges</td>
                  <td className="px-4 py-3 text-right font-semibold text-[var(--color-text-title)]">
                    {formatCurrency(normalized.electricity)}
                  </td>
                </tr>
                {normalized.verification > 0 ? (
                  <tr className="border-t border-[var(--color-border)]">
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">Verification Charge</td>
                    <td className="px-4 py-3 text-right font-semibold text-[var(--color-text-title)]">
                      {formatCurrency(normalized.verification)}
                    </td>
                  </tr>
                ) : null}
                {normalized.securityDeposit > 0 ? (
                  <tr className="border-t border-[var(--color-border)]">
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">Security Deposit</td>
                    <td className="px-4 py-3 text-right font-semibold text-[var(--color-text-title)]">
                      {formatCurrency(normalized.securityDeposit)}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="mt-4 ml-auto w-full max-w-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-sm">
            <div className="flex items-center justify-between text-[var(--color-text-secondary)]">
              <span>Subtotal</span>
              <span className="font-semibold text-[var(--color-text-title)]">{formatCurrency(normalized.subtotal)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-[var(--color-border)] pt-2 text-base font-bold text-[var(--color-text-title)]">
              <span>Total</span>
              <span>{formatCurrency(normalized.total)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[var(--color-text-secondary)]">
              <span>Paid</span>
              <span className="font-semibold text-emerald-700">{formatCurrency(normalized.paid)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[var(--color-text-secondary)]">
              <span>Outstanding</span>
              <span className="font-semibold text-rose-600">{formatCurrency(normalized.outstanding)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
