import Expense from '../models/expense.model.js';

const ownerScopeQuery = (ownerAccountId) => ({
  $or: [
    { owner_account_id: ownerAccountId },
    { owner_account_id: { $exists: false }, created_by: ownerAccountId }
  ]
});

export const getExpenses = async (ownerAccountId) =>
  Expense.find(ownerScopeQuery(ownerAccountId)).sort({ expense_date: -1, created_at: -1 }).lean();

export const createExpense = async (expense) => {
  const created = await Expense.create(expense);
  return created.toJSON();
};

export const getExpenseById = async (id, ownerAccountId) =>
  Expense.findOne({ id, ...ownerScopeQuery(ownerAccountId) }).lean();

export const updateExpenseById = async (id, ownerAccountId, updates) => {
  const updated = await Expense.findOneAndUpdate(
    { id, ...ownerScopeQuery(ownerAccountId) },
    updates,
    { new: true, runValidators: true }
  );

  return updated ? updated.toJSON() : null;
};

export const deleteExpenseById = async (id, ownerAccountId) => {
  const deleted = await Expense.findOneAndDelete({ id, ...ownerScopeQuery(ownerAccountId) });
  return Boolean(deleted);
};
