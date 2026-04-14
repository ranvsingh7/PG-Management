import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    owner_account_id: { type: String, required: true, index: true },
    title: { type: String, required: true },
    category: {
      type: String,
      required: true,
      enum: ['maintenance', 'salary', 'utilities', 'supplies', 'rent', 'marketing', 'other']
    },
    amount: { type: Number, required: true, min: 0 },
    expense_date: { type: String, required: true },
    paid_date: { type: String, default: null },
    status: { type: String, required: true, enum: ['paid', 'pending'], default: 'paid' },
    notes: { type: String, default: '' },
    created_by: { type: String, default: 'admin' },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: null }
  },
  {
    versionKey: false
  }
);

expenseSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret._id;
    return ret;
  }
});

const Expense = mongoose.model('Expense', expenseSchema);

export default Expense;
