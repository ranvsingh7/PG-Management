import { v4 as uuidv4 } from 'uuid';
import InvoiceSetting from './invoice-setting.model.js';

export const getOrCreateInvoiceSetting = async (ownerAccountId) => {
  const setting = await InvoiceSetting.findOneAndUpdate(
    { owner_account_id: ownerAccountId },
    {
      $setOnInsert: {
        id: uuidv4(),
        owner_account_id: ownerAccountId,
        due_day_of_month: 2,
        updated_at: new Date()
      }
    },
    { new: true, upsert: true }
  );

  return setting.toJSON();
};

export const updateInvoiceSetting = async (ownerAccountId, dueDayOfMonth) => {
  const updated = await InvoiceSetting.findOneAndUpdate(
    { owner_account_id: ownerAccountId },
    {
      $set: {
        due_day_of_month: dueDayOfMonth,
        updated_at: new Date()
      },
      $setOnInsert: {
        id: uuidv4(),
        owner_account_id: ownerAccountId
      }
    },
    { new: true, upsert: true }
  );

  return updated.toJSON();
};

