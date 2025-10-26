import { db } from '../../db';
import { Payment, Subscription, CreatePaymentData, CreateSubscriptionData } from './payment.model';

export class PaymentRepository {
async createPayment(data: CreatePaymentData): Promise<Payment> {
  const query = `
    INSERT INTO payments (tenant_id, provider_payment_id, amount, currency, metadata, status)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
  const result = await db.query(query, [
    data.tenant_id,
    data.provider_payment_id,
    data.amount,
    data.currency,
    JSON.stringify(data.metadata),
    data.status,  
  ]);
  return result.rows[0];
}

  async updatePaymentStatus(
    providerPaymentId: string,
    status: 'pending' | 'success' | 'failed'
  ): Promise<Payment | null> {
    const query = `
      UPDATE payments 
      SET status = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE provider_payment_id = $2
      RETURNING *
    `;
    
    const result = await db.query(query, [status, providerPaymentId]);
    return result.rows[0] || null;
  }

  async findPaymentByReference(reference: string): Promise<Payment | null> {
    const query = 'SELECT * FROM payments WHERE provider_payment_id = $1';
    const result = await db.query(query, [reference]);
    return result.rows[0] || null;
  }

  async createSubscription(data: CreateSubscriptionData): Promise<Subscription> {
    const query = `
      INSERT INTO subscriptions (
        tenant_id, provider_subscription_id, plan, 
        current_period_start, current_period_end
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const result = await db.query(query, [
      data.tenant_id,
      data.provider_subscription_id,
      data.plan,
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

  async getPaymentHistory(tenantId: string): Promise<Payment[]> {
    const query = `
      SELECT * FROM payments 
      WHERE tenant_id = $1 
      ORDER BY created_at DESC
    `;
    const result = await db.query(query, [tenantId]);
    return result.rows;
  }
}