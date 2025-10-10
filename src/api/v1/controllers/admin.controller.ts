import { Response } from 'express';
import { AdminRequest } from '../../../middleware/adminAuth';
import { AdminService } from '../../../features/admin/admin.service';
import { AdminRepository } from '../../../features/admin/admin.repo';
import { TenantService } from '../../../features/tenants/tenant.service';
import { TenantRepository } from '../../../features/tenants/tenant.repo';
import { AnalyticsService } from '../../../features/analytics/analytics.service';
import { AnalyticsRepository } from '../../../features/analytics/analytics.repo';
import { asyncHandler } from '../../../middleware/errorHandler';

const adminRepo = new AdminRepository();
const adminService = new AdminService(adminRepo);
const tenantRepo = new TenantRepository();
const tenantService = new TenantService();
const analyticsRepo = new AnalyticsRepository();
const analyticsService = new AnalyticsService(analyticsRepo);

export const login = asyncHandler(async (req: AdminRequest, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({
      error: 'Missing credentials',
      message: 'Email and password are required',
    });
    return;
  }

  try {
    const result = await adminService.login({ email, password });
    
    res.json({
      message: 'Login successful',
      token: result.token,
      admin: result.admin,
    });
  } catch (error) {
    res.status(401).json({
      error: 'Login failed',
      message: error.message,
    });
  }
});

export const getTenants = asyncHandler(async (req: AdminRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;

const tenants = await tenantService.listTenants(limit, offset);

  res.json({
    tenants,
    pagination: {
      page,
      limit,
      total: tenants.length,
    },
  });
});

export const updateTenant = asyncHandler(async (req: AdminRequest, res: Response) => {
  const { id } = req.params;
  const { payment_status, plan } = req.body;

  const allowedStatuses = ['pending', 'active', 'suspended', 'expired'];
  const allowedPlans = ['free', 'premium'];

  if (payment_status && !allowedStatuses.includes(payment_status)) {
    res.status(400).json({
      error: 'Invalid payment status',
      message: 'Status must be one of: ' + allowedStatuses.join(', '),
    });
    return;
  }

  if (plan && !allowedPlans.includes(plan)) {
    res.status(400).json({
      error: 'Invalid plan',
      message: 'Plan must be one of: ' + allowedPlans.join(', '),
    });
    return;
  }

  const updatedTenant = await tenantService.updateTenant(id, {
    payment_status,
    plan,
  });

  if (!updatedTenant) {
    res.status(404).json({
      error: 'Tenant not found',
      message: 'No tenant found with the provided ID',
    });
    return;
  }

  res.json({
    message: 'Tenant updated successfully',
    tenant: updatedTenant,
  });
});

export const getSystemStats = asyncHandler(async (req: AdminRequest, res: Response) => {
  const stats = await analyticsService.getSystemStats();

  res.json({
    system_stats: stats,
    generated_at: new Date().toISOString(),
  });
});