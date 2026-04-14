import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

export type InvoiceStatus = "pending" | "paid" | "partial";
export type EffectiveStatus = "pending" | "paid" | "partial" | "overdue";

export type StoredInvoice = {
  id: string;
  invoice_number: string;
  tenant_name: string;
  building_id: string;
  building_name: string;
  room_number: string;
  period: string;
  rent_amount: number;
  electricity_amount: number;
  security_deposit_amount: number;
  security_deposit_paid_amount: number;
  amount: number;
  due_date: string;
  status: InvoiceStatus;
  effective_status: EffectiveStatus;
  paid_amount: number;
  outstanding_amount: number;
  is_first_invoice?: boolean;
};

type InvoiceStore = {
  invoices: StoredInvoice[];
};

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_PATH = path.join(DATA_DIR, "invoices.json");

const sampleBuildings = [
  { id: "bld-1", name: "Indiranagar Hub" },
  { id: "bld-2", name: "Koramangala Nest" },
  { id: "bld-3", name: "HSR Residency" },
];

const sampleTenants = [
  "Arjun Mehta",
  "Riya Sharma",
  "Kabir Nair",
  "Neha Verma",
  "Vikram Rao",
  "Sara Khan",
  "Ishaan Gupta",
  "Ananya Iyer",
  "Rahul Jain",
  "Meera Das",
];

const toNumber = (value: unknown) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const computeEffectiveStatus = (status: InvoiceStatus, dueDate: string) => {
  if (status === "paid") {
    return "paid";
  }
  if (status === "partial") {
    return "partial";
  }
  if (!dueDate) {
    return "pending";
  }

  const today = new Date();
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) {
    return "pending";
  }

  return due < today ? "overdue" : "pending";
};

const computeAmounts = (invoice: StoredInvoice) => {
  const rent = toNumber(invoice.rent_amount);
  const electricity = toNumber(invoice.electricity_amount);
  const security = toNumber(invoice.security_deposit_amount);
  const amount = Number((rent + electricity + security).toFixed(2));

  let paidAmount = toNumber(invoice.paid_amount);
  if (invoice.status === "paid") {
    paidAmount = amount;
  }

  const securityPaid = toNumber(invoice.security_deposit_paid_amount);
  const outstanding = Math.max(Number((amount - paidAmount - securityPaid).toFixed(2)), 0);

  return {
    amount,
    paid_amount: paidAmount,
    outstanding_amount: outstanding,
    effective_status: computeEffectiveStatus(invoice.status, invoice.due_date),
  };
};

export const readStore = async () => {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as InvoiceStore;
    return {
      invoices: Array.isArray(parsed.invoices) ? parsed.invoices : [],
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { invoices: [] };
    }
    throw error;
  }
};

export const writeStore = async (store: InvoiceStore) => {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
};

const createInvoiceNumber = (period: string, count: number) => {
  const normalized = period.replace("-", "");
  return `INV-${normalized}-${String(count).padStart(4, "0")}`;
};

const createSeedInvoice = (period: string, building: { id: string; name: string }, index: number) => {
  const rentAmount = 6500 + index * 350;
  const electricityAmount = 450 + index * 90;
  const isFirst = index % 3 === 0;
  const securityAmount = isFirst ? 4000 : 0;
  const dueDate = `${period}-10`;
  const invoice: StoredInvoice = {
    id: randomUUID(),
    invoice_number: "",
    tenant_name: sampleTenants[index % sampleTenants.length],
    building_id: building.id,
    building_name: building.name,
    room_number: `R-${100 + index}`,
    period,
    rent_amount: rentAmount,
    electricity_amount: electricityAmount,
    security_deposit_amount: securityAmount,
    security_deposit_paid_amount: 0,
    amount: 0,
    due_date: dueDate,
    status: "pending",
    effective_status: "pending",
    paid_amount: 0,
    outstanding_amount: 0,
    is_first_invoice: isFirst,
  };

  return { ...invoice, ...computeAmounts(invoice) };
};

export const ensureSeeded = async (period: string, buildingId?: string) => {
  const store = await readStore();
  const targetBuildings = buildingId
    ? sampleBuildings.filter((building) => building.id === buildingId)
    : sampleBuildings;

  const existingForPeriod = store.invoices.filter((invoice) => invoice.period === period);
  if (existingForPeriod.length > 0) {
    return store;
  }

  let counter = store.invoices.length;
  const newInvoices: StoredInvoice[] = [];

  targetBuildings.forEach((building, buildingIndex) => {
    for (let i = 0; i < 4; i += 1) {
      counter += 1;
      const invoice = createSeedInvoice(period, building, buildingIndex * 4 + i);
      invoice.invoice_number = createInvoiceNumber(period, counter);
      newInvoices.push(invoice);
    }
  });

  const nextStore = {
    invoices: [...store.invoices, ...newInvoices],
  };
  await writeStore(nextStore);
  return nextStore;
};

export const generateInvoices = async (period: string, buildingId?: string) => {
  const store = await readStore();
  const targetBuildings = buildingId
    ? sampleBuildings.filter((building) => building.id === buildingId)
    : sampleBuildings;

  let counter = store.invoices.length;
  const newInvoices: StoredInvoice[] = [];

  targetBuildings.forEach((building, buildingIndex) => {
    const existing = store.invoices.filter(
      (invoice) => invoice.period === period && invoice.building_id === building.id
    );

    if (existing.length > 0) {
      return;
    }

    for (let i = 0; i < 4; i += 1) {
      counter += 1;
      const invoice = createSeedInvoice(period, building, buildingIndex * 4 + i);
      invoice.invoice_number = createInvoiceNumber(period, counter);
      newInvoices.push(invoice);
    }
  });

  const nextStore = {
    invoices: [...store.invoices, ...newInvoices],
  };

  await writeStore(nextStore);
  return { store: nextStore, createdCount: newInvoices.length };
};

export const listInvoices = (store: InvoiceStore, filters: {
  period?: string;
  status?: EffectiveStatus | "all";
  search?: string;
  buildingId?: string;
}) => {
  const search = filters.search?.toLowerCase().trim() || "";
  return store.invoices.filter((invoice) => {
    if (filters.period && invoice.period !== filters.period) {
      return false;
    }

    if (filters.buildingId && invoice.building_id !== filters.buildingId) {
      return false;
    }

    if (filters.status && filters.status !== "all" && invoice.effective_status !== filters.status) {
      return false;
    }

    if (search) {
      const haystack = `${invoice.invoice_number} ${invoice.tenant_name} ${invoice.building_name} ${invoice.room_number}`.toLowerCase();
      if (!haystack.includes(search)) {
        return false;
      }
    }

    return true;
  });
};

export const updateInvoice = async (
  invoiceId: string,
  updates: Partial<Pick<StoredInvoice, "rent_amount" | "electricity_amount" | "security_deposit_paid_amount" | "due_date" | "status">>
) => {
  const store = await readStore();
  const index = store.invoices.findIndex((invoice) => invoice.id === invoiceId);
  if (index < 0) {
    return null;
  }

  const existing = store.invoices[index];
  const next: StoredInvoice = {
    ...existing,
    rent_amount: updates.rent_amount ?? existing.rent_amount,
    electricity_amount: updates.electricity_amount ?? existing.electricity_amount,
    security_deposit_paid_amount: updates.security_deposit_paid_amount ?? existing.security_deposit_paid_amount,
    due_date: updates.due_date ?? existing.due_date,
    status: updates.status ?? existing.status,
  };

  const computed = computeAmounts(next);
  const updated = { ...next, ...computed };
  store.invoices[index] = updated;
  await writeStore(store);
  return updated;
};

export const getInvoice = async (invoiceId: string) => {
  const store = await readStore();
  return store.invoices.find((invoice) => invoice.id === invoiceId) || null;
};

export const deleteInvoice = async (invoiceId: string) => {
  const store = await readStore();
  const next = store.invoices.filter((invoice) => invoice.id !== invoiceId);
  if (next.length === store.invoices.length) {
    return false;
  }
  await writeStore({ invoices: next });
  return true;
};
