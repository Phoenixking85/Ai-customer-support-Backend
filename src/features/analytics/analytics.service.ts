import { AnalyticsRepository } from './analytics.repo';
import { CreateAnalyticsLogData } from './analytics.model';

export class AnalyticsService {
  constructor(private analyticsRepo: AnalyticsRepository) {}

  async logRequest(data: CreateAnalyticsLogData) {
    return this.analyticsRepo.create(data);
  }

  async getTenantUsageStats(tenantId: string, days = 30) {
    return this.analyticsRepo.getUsageStats(tenantId, days);
  }

  async getSystemStats() {
    return this.analyticsRepo.getSystemStats();
  }
}