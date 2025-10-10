export interface Tenant {
  id: string;
  name: string;
  email: string;
  plan: 'free' | 'premium';
  payment_status: 'pending' | 'active' | 'suspended' | 'expired';
  trial_ends_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Admin {
  id: string;
  email: string;
  password_hash: string;
  created_at: Date;
}

export interface ApiKey {
  id: string;
  tenant_id: string;
  key_hash: string;
  last_used_at?: Date;
  last_rotated_at: Date;
  is_active: boolean;
  created_at: Date;
}

export interface Document {
  id: string;
  tenant_id: string;
  filename: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  b2_url: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  chunk_count?: number;
  created_at: Date;
  updated_at: Date;
}

export interface Embedding {
  id: string;
  tenant_id: string;
  document_id: string;
  chunk_text: string;
  chunk_index: number;
  embedding: number[];
  created_at: Date;
  expires_at?: Date;
}

export interface AnalyticsLog {
  id: string;
  tenant_id: string;
  endpoint: string;
  tokens_in: number;
  tokens_out: number;
  latency_ms: number;
  confidence?: number;
  outcome: 'success' | 'error' | 'quota_exceeded';
  error_message?: string;
  created_at: Date;
}

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

export interface ChatRequest {
  message: string;
  context_limit?: number;
}

export interface ChatResponse {
  response: string;
  confidence?: number;
  tokens_used: number;
  remaining_quota: number;
}

export interface UploadRequest {
  file: Express.Multer.File;
}

export interface QuotaInfo {
  messages_used: number;
  messages_limit: number;
  tokens_used_today: number;
  documents_count: number;
  documents_limit: number;
}

export interface PaymentInitRequest {
  plan: 'premium';
  callback_url?: string;
}

export interface PaymentInitResponse {
  checkout_url: string;
  reference: string;
}
