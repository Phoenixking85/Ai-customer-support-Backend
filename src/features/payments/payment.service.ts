import { PaymentRepository } from './payment.repo';
import { TenantService } from '../tenants/tenant.service';
import { config } from '../../config/env';
import { logger } from '../../utils/logger';

// Paystack subscription types
interface PaystackSubscriptionResponse {
  status: boolean;
  message: string;
  data: {
    subscription_code: string;
    email_token: string;
  };
}

export class PaymentService {
  private paystackSecretKey: string;
  private paystackBaseUrl = 'https://api.paystack.co';

  constructor(
    private paymentRepo: PaymentRepository,
    private tenantService: TenantService
  ) {
    this.paystackSecretKey = config.paystack.secretKey;
  }

  async createSubscription(tenantId: string, callbackUrl?: string): Promise<{ checkout_url: string }> {
    const tenant = await this.tenantService.getTenantById(tenantId);
    if (!tenant) throw new Error('Tenant not found');

    const planCode = config.paystack.planId; // Your Paystack plan code

    // CRITICAL: Include tenant_id in metadata for webhook processing
    const subscriptionData = {
      customer: tenant.email,
      plan: planCode,
      callback_url: callbackUrl,
      metadata: {
        tenant_id: tenantId,
      },
    };

    const response = await this.makePaystackRequest<PaystackSubscriptionResponse>(
      'POST',
      '/subscription',
      subscriptionData
    );

    if (!response.status) {
      throw new Error(`Subscription creation failed: ${response.message}`);
    }

    // Paystack returns a checkout URL via email_token
    const checkoutUrl = `https://checkout.paystack.com/${response.data.email_token}`;

    logger.info('Subscription created', {
      tenantId,
      subscriptionCode: response.data.subscription_code,
    });

    return {
      checkout_url: checkoutUrl,
    };
  }

  async handleWebhook(payload: any, signature: string, rawBody: string): Promise<void> {
    const expectedSignature = require('crypto')
      .createHmac('sha512', config.paystack.secretKey)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSignature) {
      throw new Error('Invalid webhook signature');
    }

    const { event, data } = payload;
    
    switch (event) {
      case 'subscription.create':
        await this.handleSubscriptionCreate(data);
        break;
      case 'subscription.disable':
        await this.handleSubscriptionDisable(data);
        break;
      case 'subscription.not_renew':
        await this.handleSubscriptionNotRenew(data);
        break;
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(data);
        break;
      default:
        logger.info('Unhandled webhook event', { event });
    }
  }

  private async handleSubscriptionCreate(data: any): Promise<void> {
    // Try multiple places to find tenant_id
    const tenantId = 
      data.metadata?.tenant_id || 
      data.customer?.metadata?.tenant_id ||
      data.subscription?.metadata?.tenant_id;
    
    if (!tenantId) {
      // If no tenant_id, try to find tenant by email
      const email = data.customer?.email;
      if (email) {
        logger.warn('Subscription webhook missing tenant_id, attempting lookup by email', { email });
        const tenant = await this.tenantService.getTenantByEmail(email);
        if (tenant) {
          await this.createSubscriptionRecord(tenant.id, data);
          return;
        }
      }
      
      logger.error('Subscription webhook missing tenant_id and email lookup failed', { 
        customerEmail: data.customer?.email,
        subscriptionCode: data.subscription_code 
      });
      return;
    }

    await this.createSubscriptionRecord(tenantId, data);
  }

  private async createSubscriptionRecord(tenantId: string, data: any): Promise<void> {
    const subscriptionCode = data.subscription_code;
    const start = new Date();
    const end = new Date();
    end.setMonth(end.getMonth() + 1); // Monthly billing

    await this.paymentRepo.createSubscription({
      tenant_id: tenantId,
      provider_subscription_id: subscriptionCode,
      plan: 'premium',
      current_period_start: start,
      current_period_end: end,
    });

    await this.tenantService.updateTenant(tenantId, {
      plan: 'premium',
      payment_status: 'active',
    });

    logger.info('Subscription activated', { tenantId, subscriptionCode });
  }

  private async handleSubscriptionDisable(data: any): Promise<void> {
    const subscriptionCode = data.subscription_code;
    const tenantId = data.customer?.metadata?.tenant_id;

    await this.paymentRepo.updateSubscriptionStatus(subscriptionCode, 'cancelled');

    if (tenantId) {
      await this.tenantService.updateTenant(tenantId, {
        plan: 'free',
        payment_status: 'expired',
      });
    }

    logger.info('Subscription cancelled', { subscriptionCode, tenantId });
  }

  private async handleSubscriptionNotRenew(data: any): Promise<void> {
    const subscriptionCode = data.subscription_code;
    const tenantId = data.customer?.metadata?.tenant_id;

    await this.paymentRepo.updateSubscriptionStatus(subscriptionCode, 'expired');

    if (tenantId) {
      await this.tenantService.updateTenant(tenantId, {
        plan: 'free',
        payment_status: 'expired',
      });
    }

    logger.info('Subscription not renewed', { subscriptionCode, tenantId });
  }

  private async handlePaymentFailed(data: any): Promise<void> {
    const tenantId = data.customer?.metadata?.tenant_id;

    if (tenantId) {
      await this.tenantService.updateTenant(tenantId, {
        payment_status: 'payment_failed',
      });

      logger.warn('Subscription payment failed', { tenantId });
    }
  }

  async cancelSubscription(subscriptionCode: string, emailToken: string): Promise<void> {
    const response = await this.makePaystackRequest<{ status: boolean; message: string }>(
      'POST',
      '/subscription/disable',
      {
        code: subscriptionCode,
        token: emailToken,
      }
    );

    if (!response.status) {
      throw new Error(`Subscription cancellation failed: ${response.message}`);
    }

    logger.info('Subscription cancelled via API', { subscriptionCode });
  }

  private async makePaystackRequest<T>(
    method: 'GET' | 'POST',
    endpoint: string,
    data?: any
  ): Promise<T> {
    const url = `${this.paystackBaseUrl}${endpoint}`;

    const options: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${this.paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
    };

    if (data && method === 'POST') {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    const result = (await response.json()) as { message?: string };

    if (!response.ok) {
      throw new Error(`Paystack API error: ${result.message || 'Unknown error'}`);
    }

    return result as T;
  }

  async getActiveSubscription(tenantId: string) {
    return this.paymentRepo.findActiveSubscription(tenantId);
  }
}