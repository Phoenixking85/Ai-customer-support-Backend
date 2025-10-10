export interface CreateTenantData {
  name: string;
  email: string;
  plan?: 'free' | 'premium';
  supabase_user_id?: string;
  is_verified?: boolean;
}

export interface UpdateTenantData {
  name?: string;
  plan?: 'free' | 'premium';
  payment_status?: 'pending' | 'active' | 'suspended' | 'expired';
  is_verified?: boolean;
  supabase_user_id?: string;
  trial_ends_at?: Date;
}

export interface SupabaseLoginData {
  access_token: string;
}

export interface TenantFull {
  id: string;
  name: string;
  email: string;
  plan: 'free' | 'premium';
  payment_status?: 'pending' | 'active' | 'suspended' | 'expired';
  is_verified: boolean;
  supabase_user_id?: string;
  trial_ends_at?: Date;
  created_at: Date;
  updated_at: Date;
}
