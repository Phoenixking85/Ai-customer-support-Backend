import { ApiKeyRepository } from './apikey.repo';
import { ApiKeyWithKey, ApiKeyInfo } from './apikey.model';
import { Helpers } from '../../utils/helpers';

export class ApiKeyService {
  constructor(private apiKeyRepo: ApiKeyRepository) {}

  async generateApiKey(tenantId: string): Promise<ApiKeyWithKey> {
    await this.apiKeyRepo.deactivateAllForTenant(tenantId);

    const newKey = Helpers.generateApiKey();
    const keyHash = await Helpers.hashApiKey(newKey);

    const apiKey = await this.apiKeyRepo.create(tenantId, keyHash);

    return {
      ...apiKey,
      key: newKey,
    };
  }

  async getApiKeyInfo(tenantId: string): Promise<ApiKeyInfo | null> {
    return this.apiKeyRepo.getKeyInfo(tenantId);
  }
}