// features/tenants/tenant.service.ts
import { tenantRepo } from './tenant.repo';
import { CreateTenantData, UpdateTenantData, TenantFull } from './tenant.model';
import { supabase } from '../../config/env';
export class TenantService {
  
async registerOrGetTenantFromSupabase({
  access_token,
  name,
}: {
  access_token: string;
  name: string;
}): Promise<TenantFull> {
  const { data, error } = await supabase.auth.getUser(access_token);
  if (error || !data?.user) {
    throw new Error('Invalid or expired Supabase access token');
  }

  const user = data.user;
  const email = user.email!;
  const fullName = user.user_metadata?.full_name || name || 'Anonymous User';

  // Check if tenant already exists
  let tenant = await tenantRepo.findByEmail(email);
  if (tenant) {
    if (!tenant.supabase_user_id) {
      tenant = await tenantRepo.updateByEmail(email, {
        supabase_user_id: user.id,
        is_verified: true,
      });
    }
    return tenant!;
  }

  // Create new tenant
  const newTenant = await tenantRepo.create({
    name: fullName,
    email,
    plan: 'free',
    supabase_user_id: user.id,
    is_verified: true,
  });

  return newTenant;
}

  async getTenantById(id: string): Promise<TenantFull | null> {
    return tenantRepo.findById(id);
  }

  async getTenantByEmail(email: string): Promise<TenantFull | null> {
    return tenantRepo.findByEmail(email);
  }

  async getTenantBySupabaseUserId(supabaseUserId: string): Promise<TenantFull | null> {
    return tenantRepo.findBySupabaseUserId(supabaseUserId);
  }

  async updateTenant(id: string, data: UpdateTenantData): Promise<TenantFull | null> {
    const tenant = await tenantRepo.findById(id);
    if (!tenant) return null;

    return tenantRepo.update(id, data);
  }

  async updateTenantByEmail(email: string, data: UpdateTenantData): Promise<TenantFull | null> {
    return tenantRepo.updateByEmail(email, data);
  }

  async markAsVerified(email: string, supabaseUserId: string): Promise<TenantFull | null> {
    return tenantRepo.updateByEmail(email, {
      is_verified: true,
      supabase_user_id: supabaseUserId,
    });
  }

  async listTenants(limit = 50, offset = 0): Promise<TenantFull[]> {
    return tenantRepo.listAll(limit, offset);
  }

  async suspendTenant(id: string): Promise<TenantFull | null> {
    return tenantRepo.suspend(id);
  }

  async activateTenant(id: string): Promise<TenantFull | null> {
    return tenantRepo.activate(id);
  }

  async deleteTenant(id: string): Promise<void> {
    await tenantRepo.delete(id);
  }

  async verifyTrialStatus(id: string): Promise<boolean> {
    const tenant = await tenantRepo.findById(id);
    if (!tenant) return false;

    if (tenant.plan === 'free' && tenant.trial_ends_at) {
      return new Date(tenant.trial_ends_at) > new Date();
    }

    return true;
  }
}

export const tenantService = new TenantService();
