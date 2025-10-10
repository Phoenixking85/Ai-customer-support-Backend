// features/tenants/tenant.repo.ts
import { db } from '../../db';
import { Tenant } from '../../types';
import { CreateTenantData, UpdateTenantData, TenantFull } from './tenant.model';

export class TenantRepository {
  async create(data: CreateTenantData): Promise<TenantFull> {
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14); // 14-day trial

    const query = `
      INSERT INTO tenants (name, email, plan, trial_ends_at, is_verified, supabase_user_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, email, plan, payment_status, is_verified, supabase_user_id,
                trial_ends_at, created_at, updated_at
    `;

    const result = await db.query(query, [
      data.name,
      data.email,
      data.plan || 'free',
      trialEndsAt,
      data.is_verified ?? false,
      data.supabase_user_id || null,
    ]);

    return result.rows[0];
  }

  async findById(id: string): Promise<TenantFull | null> {
    const result = await db.query(
      `SELECT id, name, email, plan, payment_status, is_verified, supabase_user_id,
              trial_ends_at, created_at, updated_at
       FROM tenants WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async findByEmail(email: string): Promise<TenantFull | null> {
    const result = await db.query(
      `SELECT id, name, email, plan, payment_status, is_verified, supabase_user_id,
              trial_ends_at, created_at, updated_at
       FROM tenants WHERE email = $1`,
      [email]
    );
    return result.rows[0] || null;
  }

  async findBySupabaseUserId(supabaseUserId: string): Promise<TenantFull | null> {
    const result = await db.query(
      `SELECT id, name, email, plan, payment_status, is_verified, supabase_user_id,
              trial_ends_at, created_at, updated_at
       FROM tenants WHERE supabase_user_id = $1`,
      [supabaseUserId]
    );
    return result.rows[0] || null;
  }

  async update(id: string, data: UpdateTenantData): Promise<TenantFull | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let index = 1;

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        fields.push(`${key} = $${index++}`);
        values.push(value);
      }
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);

    const query = `
      UPDATE tenants
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${index}
      RETURNING id, name, email, plan, payment_status, is_verified, supabase_user_id,
                trial_ends_at, created_at, updated_at
    `;

    const result = await db.query(query, values);
    return result.rows[0] || null;
  }

  async updateByEmail(email: string, data: UpdateTenantData): Promise<TenantFull | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let index = 1;

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        fields.push(`${key} = $${index++}`);
        values.push(value);
      }
    }

    if (fields.length === 0) return this.findByEmail(email);

    values.push(email);

    const query = `
      UPDATE tenants
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE email = $${index}
      RETURNING id, name, email, plan, payment_status, is_verified, supabase_user_id,
                trial_ends_at, created_at, updated_at
    `;

    const result = await db.query(query, values);
    return result.rows[0] || null;
  }

  async listAll(limit = 50, offset = 0): Promise<TenantFull[]> {
    const result = await db.query(
      `SELECT id, name, email, plan, payment_status, is_verified, supabase_user_id,
              trial_ends_at, created_at, updated_at 
       FROM tenants ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }

  async suspend(id: string): Promise<TenantFull | null> {
    const result = await db.query(
      `UPDATE tenants 
       SET payment_status = 'suspended', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING id, name, email, plan, payment_status, is_verified, supabase_user_id,
                 trial_ends_at, created_at, updated_at`,
      [id]
    );
    return result.rows[0] || null;
  }

  async activate(id: string): Promise<TenantFull | null> {
    const result = await db.query(
      `UPDATE tenants 
       SET payment_status = 'active', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING id, name, email, plan, payment_status, is_verified, supabase_user_id,
                 trial_ends_at, created_at, updated_at`,
      [id]
    );
    return result.rows[0] || null;
  }

  async delete(id: string): Promise<void> {
    await db.query(`DELETE FROM tenants WHERE id = $1`, [id]);
  }
}

export const tenantRepo = new TenantRepository();
