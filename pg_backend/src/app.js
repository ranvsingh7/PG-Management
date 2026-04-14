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

export default app;
