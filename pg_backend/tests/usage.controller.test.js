import { jest } from '@jest/globals';

const mockCountTenants = jest.fn();
const mockCountBuildings = jest.fn();
const mockCountAdmins = jest.fn();
const mockSystemSetting = jest.fn();
const mockDefaultLimits = jest.fn();

jest.unstable_mockModule('../src/data/tenant.store.js', () => ({
  countTenantsByOwner: mockCountTenants
}));

jest.unstable_mockModule('../src/data/building.store.js', () => ({
  countBuildingsByOwner: mockCountBuildings
}));

jest.unstable_mockModule('../src/data/admin.store.js', () => ({
  countAdminsByAccountOwnerId: mockCountAdmins
}));

jest.unstable_mockModule('../src/data/system-setting.store.js', () => ({
  getOrCreateSystemSetting: mockSystemSetting,
  getDefaultFreeLimits: mockDefaultLimits
}));

const { getUsageHandler } = await import('../src/controllers/usage.controller.js');

const createRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('usage.controller', () => {
  beforeEach(() => {
    mockCountTenants.mockReset();
    mockCountBuildings.mockReset();
    mockCountAdmins.mockReset();
    mockSystemSetting.mockReset();
    mockDefaultLimits.mockReset();
  });

  it('returns usage payload with system limits', async () => {
    mockCountTenants.mockResolvedValue(9);
    mockCountBuildings.mockResolvedValue(1);
    mockCountAdmins.mockResolvedValue(1);
    mockSystemSetting.mockResolvedValue({
      free_limits: { max_tenants: 10, max_buildings: 2, max_admins: 2, support: 'community' }
    });
    mockDefaultLimits.mockReturnValue({ max_tenants: 50, max_buildings: 2, max_admins: 2, support: 'community' });

    const req = { admin: { accountOwnerId: 'owner-1' } };
    const res = createRes();

    await getUsageHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_count: 9,
        building_count: 1,
        current_tier: 'free',
        limits: expect.objectContaining({ max_tenants: 10 })
      })
    );
  });
});
