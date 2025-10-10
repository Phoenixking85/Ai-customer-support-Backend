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

export interface CreateAnalyticsLogData {
  tenant_id: string;
  endpoint: string;
  tokens_in: number;
  tokens_out: number;
  latency_ms: number;
  confidence?: number;
  outcome: 'success' | 'error' | 'quota_exceeded';
  error_message?: string;
}

export interface UsageStats {
  total_messages: number;
  total_tokens_in: number;
  total_tokens_out: number;
  avg_latency_ms: number;
  avg_confidence: number;
  success_rate: number;
  daily_usage: Array<{
    date: string;
    messages: number;
    tokens: number;
  }>;
}