import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import buildingRoutes from './routes/building.routes.js';
import roomRoutes from './routes/room.routes.js';
import tenantRoutes from './routes/tenant.routes.js';
import usageRoutes from './routes/usage.routes.js';
import invoiceRoutes from './routes/invoice.routes.js';
import expenseRoutes from './routes/expense.routes.js';
import complaintRoutes from './routes/complaint.routes.js';
import visitorRoutes from './routes/visitor.routes.js';
import securityDepositRoutes from './routes/security-deposit.routes.js';
import pendingApprovalRoutes from './routes/pending-approval.routes.js';
import settingRoutes from './routes/setting.routes.js';
import systemSettingRoutes from './routes/system-setting.routes.js';
import tenantAuthRoutes from './routes/tenant-auth.routes.js';
import tenantProfileRoutes from './routes/tenant-profile.routes.js';
import tenantDocumentRoutes from './routes/tenant-document.routes.js';
import tenantNoticeRoutes from './routes/tenant-notice.routes.js';
import tenantOnboardingRoutes from './routes/tenant-onboarding.routes.js';
import tenantInvoiceRoutes from './routes/tenant-invoice.routes.js';
import tenantSettingRoutes from './routes/tenant-setting.routes.js';
import electricityRoutes from './routes/electricity.routes.js';
import tenantElectricityRoutes from './routes/tenant-electricity.routes.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/buildings', buildingRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/usage', usageRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/security-deposits', securityDepositRoutes);
app.use('/api/pending-approvals', pendingApprovalRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/system-settings', systemSettingRoutes);
app.use('/api/tenant/auth', tenantAuthRoutes);
app.use('/api/tenant/profile', tenantProfileRoutes);
app.use('/api/tenant/documents', tenantDocumentRoutes);
app.use('/api/tenant/notices', tenantNoticeRoutes);
app.use('/api/tenant/onboarding', tenantOnboardingRoutes);
app.use('/api/tenant/invoices', tenantInvoiceRoutes);
app.use('/api/tenant/settings', tenantSettingRoutes);
app.use('/api/electricity', electricityRoutes);
app.use('/api/tenant/electricity', tenantElectricityRoutes);

export default app;
