import { db } from '../../db';
import { ApiKey, ApiKeyInfo } from './apikey.model';
import { Helpers } from '../../utils/helpers';

export class ApiKeyRepository {
  async create(tenantId: string, keyHash: string): Promise<ApiKey> {
    const query = `
      INSERT INTO api_keys (tenant_id, key_hash)
      VALUES ($1, $2)
      RETURNING *
    `;
    
    const result = await db.query(query, [tenantId, keyHash]);
    return result.rows[0];
  }

  async deactivateAllForTenant(tenantId: string): Promise<void> {
    const query = 'UPDATE api_keys SET is_active = false WHERE tenant_id = $1';
    await db.query(query, [tenantId]);
  }

  async findActiveByTenant(tenantId: string): Promise<ApiKey | null> {
    const query = `
      SELECT * FROM api_keys 
      WHERE tenant_id = $1 AND is_active = true 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    const result = await db.query(query, [tenantId]);
    return result.rows[0] || null;
  }

  async updateLastUsed(apiKeyId: string): Promise<void> {
    const query = 'UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1';
    await db.query(query, [apiKeyId]);
  }

  async getKeyInfo(tenantId: string): Promise<ApiKeyInfo | null> {
    const query = `
      SELECT id, last_used_at, last_rotated_at, is_active, created_at
      FROM api_keys 
      WHERE tenant_id = $1 AND is_active = true
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    const result = await db.query(query, [tenantId]);
    return result.rows[0] || null;
  }
}