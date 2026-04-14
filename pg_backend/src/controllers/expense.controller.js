import { v4 as uuidv4 } from 'uuid';
import {
  createExpense,
  deleteExpenseById,
  getExpenseById,
  getExpenses,
  updateExpenseById
} from '../data/expense.store.js';

const VALID_CATEGORIES = new Set(['maintenance', 'salary', 'utilities', 'supplies', 'rent', 'marketing', 'other']);
const VALID_STATUSES = new Set(['paid', 'pending']);

const isValidDateString = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));

const normalizeInput = (payload = {}, { partial = false } = {}) => {
  const errors = [];
  const updates = {};

  if (!partial || payload.title !== undefined) {
    const title = String(payload.title || '').trim();
    if (!title) {
      errors.push('title is required');
    } else {
      updates.title = title;
    }
  }

  if (!partial || payload.category !== undefined) {
    const category = String(payload.category || '').toLowerCase();
    if (!VALID_CATEGORIES.has(category)) {
      errors.push('category is invalid');
    } else {
      updates.category = category;
    }
  }

  if (!partial || payload.amount !== undefined) {
    const amount = Number(payload.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      errors.push('amount must be a non-negative number');
    } else {
      updates.amount = Number(amount.toFixed(2));
    }
  }

  if (!partial || payload.expense_date !== undefined) {
    if (!isValidDateString(payload.expense_date)) {
      errors.push('expense_date must be in YYYY-MM-DD format');
    } else {
      updates.expense_date = String(payload.expense_date);
    }
  }

  if (!partial || payload.status !== undefined) {
    const status = String(payload.status || '').toLowerCase();
    if (!VALID_STATUSES.has(status)) {
      errors.push('status must be paid or pending');
    } else {
      updates.status = status;
    }
  }

  if (!partial || payload.paid_date !== undefined) {
    if (payload.paid_date === null || payload.paid_date === '') {
      updates.paid_date = null;
    } else if (!isValidDateString(payload.paid_date)) {
      errors.push('paid_date must be null or in YYYY-MM-DD format');
    } else {
      updates.paid_date = String(payload.paid_date);
    }
  }

  if (!partial || payload.notes !== undefined) {
    updates.notes = String(payload.notes || '').trim();
  }

  return { errors, updates };
};

export const getExpensesHandler = async (req, res) => {
  try {
    const ownerAccountId = req.admin?.accountOwnerId || req.admin?.id || 'admin';

    const month = String(req.query.month || '').trim();
    const search = String(req.query.search || '').trim().toLowerCase();
    const statusFilter = String(req.query.status || 'all').toLowerCase();

    const rows = await getExpenses(ownerAccountId);

    let filtered = rows;

    if (month) {
      filtered = filtered.filter((expense) => String(expense.expense_date || '').startsWith(month));
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((expense) => String(expense.status || '').toLowerCase() === statusFilter);
    }

    if (search) {
      filtered = filtered.filter((expense) => {
        const title = String(expense.title || '').toLowerCase();
        const notes = String(expense.notes || '').toLowerCase();
        const category = String(expense.category || '').toLowerCase();
        return title.includes(search) || notes.includes(search) || category.includes(search);
      });
    }

    return res.status(200).json(filtered);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch expenses', error: error.message });
  }
};

export const createExpenseHandler = async (req, res) => {
  try {
    const ownerAccountId = req.admin?.accountOwnerId || req.admin?.id || 'admin';
    const { errors, updates } = normalizeInput(req.body, { partial: false });

    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    const payload = {
      id: uuidv4(),
      owner_account_id: ownerAccountId,
      ...updates,
      paid_date: updates.status === 'paid' ? updates.paid_date || updates.expense_date : null,
      created_by: req.admin?.id || 'admin',
      created_at: new Date(),
      updated_at: null
    };

    const created = await createExpense(payload);
    return res.status(201).json(created);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create expense', error: error.message });
  }
};

export const updateExpenseHandler = async (req, res) => {
  try {
    const ownerAccountId = req.admin?.accountOwnerId || req.admin?.id || 'admin';
    const expenseId = req.params.id;

    const existing = await getExpenseById(expenseId, ownerAccountId);
    if (!existing) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    const { errors, updates } = normalizeInput(req.body, { partial: true });
    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    if (updates.status === 'pending' && req.body?.paid_date === undefined) {
      updates.paid_date = null;
    }

    if (updates.status === 'paid' && updates.paid_date === undefined) {
      updates.paid_date = existing.paid_date || existing.expense_date;
    }

    updates.updated_at = new Date();

    const updated = await updateExpenseById(expenseId, ownerAccountId, updates);
    return res.status(200).json(updated);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update expense', error: error.message });
  }
};

export const deleteExpenseHandler = async (req, res) => {
  try {
    const ownerAccountId = req.admin?.accountOwnerId || req.admin?.id || 'admin';
    const deleted = await deleteExpenseById(req.params.id, ownerAccountId);

    if (!deleted) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete expense', error: error.message });
  }
};
