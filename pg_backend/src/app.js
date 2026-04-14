import express from 'express';
import cors from 'cors';
import authRoutes from './modules/auth/auth.routes.js';
import buildingRoutes from './modules/building/building.routes.js';
import roomRoutes from './modules/room/room.routes.js';
import tenantRoutes from './modules/tenant/tenant.routes.js';
import usageRoutes from './modules/usage/usage.routes.js';
import invoiceRoutes from './modules/invoice/invoice.routes.js';
import electricityRoutes from './modules/electricity/electricity.routes.js';
import expenseRoutes from './modules/expense/expense.routes.js';
import complaintRoutes from './modules/complaint/complaint.routes.js';
import visitorRoutes from './modules/visitor/visitor.routes.js';
import securityDepositRoutes from './modules/security-deposit/security-deposit.routes.js';
import pendingApprovalRoutes from './modules/pending-approval/pending-approval.routes.js';
import settingRoutes from './modules/setting/setting.routes.js';

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
app.use('/api/electricity', electricityRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/security-deposits', securityDepositRoutes);
app.use('/api/pending-approvals', pendingApprovalRoutes);
app.use('/api/settings', settingRoutes);

export default app;
