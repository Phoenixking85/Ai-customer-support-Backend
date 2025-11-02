import { db } from '../../db';
import { Subscription, CreateSubscriptionData } from './payment.model';

export class PaymentRepository {
  async createSubscription(data: CreateSubscriptionData): Promise<Subscription> {
    const query = `
      INSERT INTO subscriptions (
        tenant_id, provider_subscription_id, plan, status,
        current_period_start, current_period_end
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const result = await db.query(query, [
      data.tenant_id,
      data.provider_subscription_id,
      data.plan,
      'active', // Default status when creating subscription
      data.current_period_start,
      data.current_period_end,
    ]);
    return result.rows[0];
  }

  async updateSubscriptionStatus(
    providerSubscriptionId: string,
    status: 'active' | 'cancelled' | 'expired'
  ): Promise<Subscription | null> {
    const query = `
      UPDATE subscriptions 
      SET status = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE provider_subscription_id = $2
      RETURNING *
    `;
    const result = await db.query(query, [status, providerSubscriptionId]);
    return result.rows[0] || null;
  }

  async updateSubscriptionPeriod(
    providerSubscriptionId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<Subscription | null> {
    const query = `
      UPDATE subscriptions 
      SET current_period_start = $1, 
          current_period_end = $2, 
          updated_at = CURRENT_TIMESTAMP 
      WHERE provider_subscription_id = $3
      RETURNING *
    `;
    const result = await db.query(query, [periodStart, periodEnd, providerSubscriptionId]);
    return result.rows[0] || null;
  }

  async findActiveSubscription(tenantId: string): Promise<Subscription | null> {
    const query = `
      SELECT * FROM subscriptions 
      WHERE tenant_id = $1 AND status = 'active' 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    const result = await db.query(query, [tenantId]);
    return result.rows[0] || null;
  }

  async findSubscriptionByCode(subscriptionCode: string): Promise<Subscription | null> {
    const query = `
      SELECT * FROM subscriptions 
      WHERE provider_subscription_id = $1
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    const result = await db.query(query, [subscriptionCode]);
    return result.rows[0] || null;
  }

  async getSubscriptionHistory(tenantId: string): Promise<Subscription[]> {
    const query = `
      SELECT * FROM subscriptions 
      WHERE tenant_id = $1 
      ORDER BY created_at DESC
    `;
    const result = await db.query(query, [tenantId]);
    return result.rows;
  }
}