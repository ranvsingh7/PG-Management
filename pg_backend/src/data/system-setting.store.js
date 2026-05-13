import { v4 as uuidv4 } from 'uuid';
import SystemSetting from '../models/system-setting.model.js';

const defaultFreeLimits = {
  max_tenants: 50,
  max_buildings: 2,
  max_admins: 2,
  support: 'community'
};

export const getOrCreateSystemSetting = async () => {
  const setting = await SystemSetting.findOneAndUpdate(
    {},
    {
      $setOnInsert: {
        id: uuidv4(),
        free_limits: defaultFreeLimits,
        updated_at: new Date()
      }
    },
    { new: true, upsert: true }
  );

  return setting.toJSON();
};

export const updateSystemSetting = async (updates) => {
  const updated = await SystemSetting.findOneAndUpdate(
    {},
    {
      $set: {
        free_limits: {
          max_tenants: updates.max_tenants,
          max_buildings: updates.max_buildings,
          max_admins: updates.max_admins,
          support: updates.support || defaultFreeLimits.support
        },
        updated_at: new Date()
      },
      $setOnInsert: {
        id: uuidv4()
      }
    },
    { new: true, upsert: true }
  );

  return updated.toJSON();
};

export const getDefaultFreeLimits = () => ({ ...defaultFreeLimits });
