import { PaymentRepository } from './payment.repo';
import { TenantService } from '../tenants/tenant.service';
import { PaymentInitRequest, PaymentInitResponse, CreatePaymentData } from './payment.model';
import { config } from '../../config/env';
import { Helpers } from '../../utils/helpers';
import { redisClient } from '../../queue/redis.client';
import { logger } from '../../utils/logger';

// Paystack types
interface PaystackInitResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
    message?: string;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata: Record<string, any>;
    customer: {
      id: number;
      first_name?: string;
      last_name?: string;
      email: string;
 customer_code: string;
      phone?: string;
      metadata?: Record<string, any>;
      risk_action: string;
    };
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

  async initializePayment(
  tenantId: string,
  request: PaymentInitRequest
): Promise<PaymentInitResponse> {
  const tenant = await this.tenantService.getTenantById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const reference = Helpers.generateReference();
  const amount = config.plans.premium.price; // Amount in kobo/pesewa

  const paymentData = {
    email: tenant.email,
    amount,
    reference,
    currency: config.plans.premium.currency,
    callback_url: request.callback_url,
    metadata: {
      tenant_id: tenantId,
      plan: request.plan,
    },
  };

  try {
    const response = await this.makePaystackRequest<PaystackInitResponse>(
      'POST',
      '/transaction/initialize',
      paymentData
    );

    if (!response.status) {
      throw new Error(`Payment initialization failed: ${response.message}`);
    }

    // Prepare data for DB insert
    const createPaymentData: CreatePaymentData = {
      tenant_id: tenantId,
      provider_payment_id: reference,
      amount,
      currency: config.plans.premium.currency,
      metadata: paymentData.metadata,
      status: 'pending', // Must never be null!
    };

    // Validate status
    if (!createPaymentData.status) {
      throw new Error('Payment status is missing');
    }

    logger.debug('Creating payment with data:', createPaymentData);

    await this.paymentRepo.createPayment(createPaymentData);

    logger.info('Payment initialized', {
      tenantId,
      reference,
      amount,
    });

    return {
      checkout_url: response.data.authorization_url,
      reference: response.data.reference,
    };
  } catch (error) {
    logger.error('Payment initialization failed', error);
    throw new Error('Failed to initialize payment');
  }
}


  async verifyPayment(reference: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.makePaystackRequest<PaystackVerifyResponse>(
        'GET',
        `/transaction/verify/${reference}`
      );

      if (!response.status) {
        throw new Error(`Payment verification failed: ${response.message}`);
      }

      const { data } = response;
      const tenantId = data.metadata.tenant_id;

      if (data.status === 'success') {
        // Update payment status
        await this.paymentRepo.updatePaymentStatus(reference, 'success');

        // Upgrade tenant to premium
        await this.tenantService.updateTenant(tenantId, {
          plan: 'premium',
          payment_status: 'active',
        });

        // Reset quota for premium plan
        await redisClient.resetQuota(tenantId);

        logger.info('Payment verified and tenant upgraded', {
          tenantId,
          reference,
          amount: data.amount,
        });

        return {
          success: true,
          message: 'Payment successful. Your account has been upgraded to Premium!',
        };
      } else {
        // Update payment status to failed
        await this.paymentRepo.updatePaymentStatus(reference, 'failed');

        return {
          success: false,
          message: 'Payment was not successful',
        };
      }
    } catch (error) {
      logger.error('Payment verification failed', error);
      await this.paymentRepo.updatePaymentStatus(reference, 'failed');
      
      return {
        success: false,
        message: 'Payment verification failed',
      };
    }
  }

  async handleWebhook(payload: any, signature: string): Promise<void> {
    // Verify webhook signature
    const expectedSignature = require('crypto')
      .createHmac('sha512', config.paystack.webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (signature !== expectedSignature) {
      throw new Error('Invalid webhook signature');
    }

    const { event, data } = payload;

    switch (event) {
      case 'charge.success':
        await this.handleSuccessfulCharge(data);
        break;
      case 'subscription.create':
        await this.handleSubscriptionCreate(data);
        break;
      case 'subscription.disable':
        await this.handleSubscriptionDisable(data);
        break;
      default:
        logger.info('Unhandled webhook event', { event });
    }
  }

  private async handleSuccessfulCharge(data: any): Promise<void> {
    const reference = data.reference;
    const tenantId = data.metadata?.tenant_id;

    if (tenantId) {
      await this.verifyPayment(reference);
    }
  }

  private async handleSubscriptionCreate(data: any): Promise<void> {
    // Handle subscription creation logic
    logger.info('Subscription created', { data });
  }

  private async handleSubscriptionDisable(data: any): Promise<void> {
    // Handle subscription cancellation logic
    logger.info('Subscription disabled', { data });
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
        'Authorization': `Bearer ${this.paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
    };

    if (data && method === 'POST') {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    const result = await response.json() as { message?: string };

    if (!response.ok) {
      throw new Error(`Paystack API error: ${result.message || 'Unknown error'}`);
    }

    return result as T;
  }

  async getPaymentHistory(tenantId: string) {
    return this.paymentRepo.getPaymentHistory(tenantId);
  }
}