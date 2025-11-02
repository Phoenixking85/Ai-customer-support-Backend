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

export interface CreateSubscriptionData {
  tenant_id: string;
  provider_subscription_id: string;
  plan: string;
  current_period_start: Date;
  current_period_end: Date;
}

export interface SubscriptionInitRequest {
  callback_url?: string;
}