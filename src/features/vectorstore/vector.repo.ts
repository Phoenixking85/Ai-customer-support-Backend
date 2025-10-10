import { PgVectorClient, VectorSearchResult } from './pgvector.client';

export class VectorRepository {
  constructor(private pgVectorClient: PgVectorClient) {}

  async search(tenantId: string, embedding: number[], limit = 5): Promise<VectorSearchResult[]> {
    return this.pgVectorClient.search(tenantId, embedding, limit);
  }

  async insertEmbedding(
    tenantId: string,
    documentId: string,
    chunkText: string,
    chunkIndex: number,
    embedding: number[],
    expiresAt?: Date
  ): Promise<string> {
    return this.pgVectorClient.insert(
      tenantId,
      documentId,
      chunkText,
      chunkIndex,
      embedding,
      expiresAt
    );
  }

  async deleteByDocument(documentId: string): Promise<void> {
    return this.pgVectorClient.deleteByDocument(documentId);
  }

  async deleteByTenant(tenantId: string): Promise<void> {
    return this.pgVectorClient.deleteByTenant(tenantId);
  }
}
