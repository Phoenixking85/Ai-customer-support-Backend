import { Response } from 'express';
import { AuthenticatedRequest } from '../../../middleware/apiKeyAuth';
import { AnalyticsService } from '../../../features/analytics/analytics.service';
import { AnalyticsRepository } from '../../../features/analytics/analytics.repo';
import { TenantService } from '../../../features/tenants/tenant.service';
import { TenantRepository } from '../../../features/tenants/tenant.repo';
import { asyncHandler } from '../../../middleware/errorHandler';

const analyticsRepo = new AnalyticsRepository();
const analyticsService = new AnalyticsService(analyticsRepo);
const tenantRepo = new TenantRepository();
const tenantService = new TenantService();

export const getUsageStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenant!.id;
  const plan = req.tenant!.plan;

  if (plan !== 'premium') {
    res.status(403).json({
      error: 'Premium feature',
      message: 'Analytics dashboard is only available for premium users. Upgrade to view detailed usage statistics.',
    });
    return;
  }

  const days = parseInt(req.query.days as string) || 30;
  const maxDays = 90;

  if (days > maxDays) {
    res.status(400).json({
      error: 'Invalid range',
      message: `Maximum range is ${maxDays} days`,
    });
    return;
  }

  const stats = await analyticsService.getTenantUsageStats(tenantId, days);
  const quotaInfo = (req as any).quotaInfo; 


  res.json({
    usage_stats: stats,
    current_quota: quotaInfo,
    period_days: days,
  });
});
