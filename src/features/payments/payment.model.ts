export interface Payment {
  id: string;
  tenant_id: string;
  provider: 'paystack';
  provider_payment_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'success' | 'failed';
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface Subscription {
  id: string;
  tenant_id: string;
  provider: 'paystack';
  provider_subscription_id: string;
  plan: string;
  status: 'active' | 'cancelled' | 'expired';
  current_period_start: Date;
  current_period_end: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreatePaymentData {
  tenant_id: string;
  provider_payment_id: string;
  amount: number;
  currency: string;
  metadata?: Record<string, any>;
  status: 'pending' | 'success' | 'failed';
}

export interface CreateSubscriptionData {
  tenant_id: string;
  provider_subscription_id: string;
  plan: string;
  current_period_start: Date;
  current_period_end: Date;
}

export interface PaymentInitRequest {
  plan: 'premium';
  callback_url?: string;
}

export interface PaymentInitResponse {
  checkout_url: string;
  reference: string;
}