import { jest } from '@jest/globals';

const mockGetTenantByLoginId = jest.fn();
const mockUpdateTenant = jest.fn();

jest.unstable_mockModule('../src/data/tenant.store.js', () => ({
  getTenantByLoginId: mockGetTenantByLoginId,
  getTenantById: jest.fn(),
  updateTenant: mockUpdateTenant
}));

jest.unstable_mockModule('bcryptjs', () => ({
  default: {
    compare: jest.fn(),
    hash: jest.fn()
  }
}));

const bcrypt = (await import('bcryptjs')).default;
const { tenantLoginHandler } = await import('../src/controllers/tenant-auth.controller.js');

const createRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('tenant-auth.controller', () => {
  beforeEach(() => {
    mockGetTenantByLoginId.mockReset();
    mockUpdateTenant.mockReset();
    bcrypt.compare.mockReset();
  });

  it('logs in tenant with valid credentials', async () => {
    const tenant = {
      id: 'tenant-1',
      owner_account_id: 'owner-1',
      login_id: '9999999999',
      password_hash: 'hash',
      status: 'active'
    };

    mockGetTenantByLoginId.mockResolvedValue(tenant);
    bcrypt.compare.mockResolvedValue(true);
    mockUpdateTenant.mockResolvedValue({ ...tenant, last_login_at: new Date() });

    const req = { body: { login_id: '9999999999', password: '123456' } };
    const res = createRes();

    await tenantLoginHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        token: expect.any(String),
        tenant: expect.objectContaining({ id: 'tenant-1' })
      })
    );
  });

  it('rejects login with missing password', async () => {
    const req = { body: { login_id: '9999999999', password: '' } };
    const res = createRes();

    await tenantLoginHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});
