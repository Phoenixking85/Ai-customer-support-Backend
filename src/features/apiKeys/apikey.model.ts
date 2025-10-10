export interface ApiKey {
  id: string;
  tenant_id: string;
  key_hash: string;
  is_active: boolean;
  created_at: Date;
  last_used_at: Date | null;
  last_rotated_at: Date | null;
}

export interface ApiKeyWithKey extends ApiKey {
  key: string;
}

export interface ApiKeyInfo {
  id: string;
  is_active: boolean;
  created_at: Date;
  last_used_at: Date | null;
  last_rotated_at: Date | null;
}
