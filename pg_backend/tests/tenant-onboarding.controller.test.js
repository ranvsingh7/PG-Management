import { jest } from '@jest/globals';

const mockGetTenantById = jest.fn();
const mockUpdateTenant = jest.fn();
const mockGetProfile = jest.fn();
const mockGetDocuments = jest.fn();

jest.unstable_mockModule('../src/data/tenant.store.js', () => ({
  getTenantById: mockGetTenantById,
  updateTenant: mockUpdateTenant
}));

jest.unstable_mockModule('../src/data/tenant-profile.store.js', () => ({
  getOrCreateTenantProfile: mockGetProfile
}));

jest.unstable_mockModule('../src/data/tenant-document.store.js', () => ({
  getTenantDocuments: mockGetDocuments
}));

const { completeTenantOnboardingHandler } = await import('../src/controllers/tenant-onboarding.controller.js');

const createRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('tenant-onboarding.controller', () => {
  beforeEach(() => {
    mockGetTenantById.mockReset();
    mockUpdateTenant.mockReset();
    mockGetProfile.mockReset();
    mockGetDocuments.mockReset();
  });

  it('returns 400 when onboarding data is incomplete', async () => {
    mockGetTenantById.mockResolvedValue({ id: 'tenant-1', owner_account_id: 'owner-1' });
    mockGetProfile.mockResolvedValue({
      permanent_address: '',
      occupation_type: 'student',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      emergency_contact_relation: '',
      id_proof_type: 'aadhaar',
      pan_number: 'ABCDE1234F',
      secondary_id_type: 'student_id'
    });
    mockGetDocuments.mockResolvedValue([]);

    const req = { tenant: { id: 'tenant-1', ownerAccountId: 'owner-1' } };
    const res = createRes();

    await completeTenantOnboardingHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Onboarding details are incomplete'
      })
    );
  });
});
