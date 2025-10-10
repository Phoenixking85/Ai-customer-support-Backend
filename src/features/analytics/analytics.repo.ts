import { db } from '../../db';
import { AnalyticsLog, CreateAnalyticsLogData, UsageStats } from './analytics.model';

export class AnalyticsRepository {
  async create(data: CreateAnalyticsLogData): Promise<AnalyticsLog> {
    const query = `
      INSERT INTO analytics_logs (
        tenant_id, endpoint, tokens_in, tokens_out, 
        latency_ms, confidence, outcome, error_message
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const result = await db.query(query, [
      data.tenant_id,
      data.endpoint,
      data.tokens_in,
      data.tokens_out,
      data.latency_ms,
      data.confidence,
      data.outcome,
      data.error_message,
    ]);
    
    return result.rows[0];
  }

  async getUsageStats(tenantId: string, days = 30): Promise<UsageStats> {
    const query = `
      SELECT 
        COUNT(*) as total_messages,
        SUM(tokens_in) as total_tokens_in,
        SUM(tokens_out) as total_tokens_out,
        AVG(latency_ms) as avg_latency_ms,
        AVG(confidence) as avg_confidence,
        (COUNT(CASE WHEN outcome = 'success' THEN 1 END) * 100.0 / COUNT(*)) as success_rate
      FROM analytics_logs 
      WHERE tenant_id = $1 
        AND created_at >= NOW() - INTERVAL '$2 days'
    `;
    
    const statsResult = await db.query(query, [tenantId, days]);
    const stats = statsResult.rows[0];

    // Get daily usage breakdown
    const dailyQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as messages,
        SUM(tokens_in + tokens_out) as tokens
      FROM analytics_logs 
      WHERE tenant_id = $1 
        AND created_at >= NOW() - INTERVAL '$2 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;
    
    const dailyResult = await db.query(dailyQuery, [tenantId, days]);

    return {
      total_messages: parseInt(stats.total_messages) || 0,
      total_tokens_in: parseInt(stats.total_tokens_in) || 0,
      total_tokens_out: parseInt(stats.total_tokens_out) || 0,
      avg_latency_ms: parseFloat(stats.avg_latency_ms) || 0,
      avg_confidence: parseFloat(stats.avg_confidence) || 0,
      success_rate: parseFloat(stats.success_rate) || 0,
      daily_usage: dailyResult.rows,
    };
  }

  async getSystemStats(): Promise<any> {
    const query = `
      SELECT 
        COUNT(DISTINCT tenant_id) as total_tenants,
        COUNT(*) as total_requests,
        SUM(tokens_in + tokens_out) as total_tokens,
        AVG(latency_ms) as avg_latency,
        (COUNT(CASE WHEN outcome = 'success' THEN 1 END) * 100.0 / COUNT(*)) as success_rate
      FROM analytics_logs 
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `;
    
    const result = await db.query(query);
    return result.rows[0];
  }
}