import { VectorRepository } from './vector.repo';
import { GeminiClient } from '../ai/GeminiClient';
import { VectorSearchResult } from './pgvector.client';

export class VectorService {
  constructor(
    private vectorRepo: VectorRepository,
    private geminiClient: GeminiClient
  ) {}

  // Search vector DB for relevant chunks
  async search(tenantId: string, query: string, limit = 5): Promise<VectorSearchResult[]> {
    const embedding = await this.geminiClient.createEmbedding(query);
    return this.vectorRepo.search(tenantId, embedding, limit);
  }

  async addEmbedding(
    tenantId: string,
    documentId: string,
    chunkText: string,
    chunkIndex: number,
    expiresAt?: Date
  ): Promise<string> {
    const embedding = await this.geminiClient.createEmbedding(chunkText);
    return this.vectorRepo.insertEmbedding(
      tenantId,
      documentId,
      chunkText,
      chunkIndex,
      embedding,
      expiresAt
    );
  }

  async deleteDocumentEmbeddings(documentId: string): Promise<void> {
    return this.vectorRepo.deleteByDocument(documentId);
  }

  async deleteTenantEmbeddings(tenantId: string): Promise<void> {
    return this.vectorRepo.deleteByTenant(tenantId);
  }
}
