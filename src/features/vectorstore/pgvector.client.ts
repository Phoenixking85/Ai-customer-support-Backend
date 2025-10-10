import { db } from '../../db';

export interface VectorSearchResult {
  id: string;
  document_id: string;
  chunk_text: string;
  chunk_index: number;
  score: number;
}

export class PgVectorClient {
  async search(
    tenantId: string,
    embedding: number[],
    limit: number = 5,
    threshold: number = 0.7
  ): Promise<VectorSearchResult[]> {
    const query = `
      SELECT 
        e.id,
        e.document_id,
        e.chunk_text,
        e.chunk_index,
        1 - (e.embedding <=> $1::vector) as score
      FROM embeddings e
      WHERE e.tenant_id = $2
        AND (e.expires_at IS NULL OR e.expires_at > NOW())
        AND 1 - (e.embedding <=> $1::vector) >= $3
      ORDER BY e.embedding <=> $1::vector ASC
      LIMIT $4
    `;

    const result = await db.query(query, [
      `[${embedding.join(',')}]`,
      tenantId,
      threshold,
      limit,
    ]);

    return result.rows;
  }

  async insert(
    tenantId: string,
    documentId: string,
    chunkText: string,
    chunkIndex: number,
    embedding: number[],
    expiresAt?: Date
  ): Promise<string> {
    const query = `
      INSERT INTO embeddings (tenant_id, document_id, chunk_text, chunk_index, embedding, expires_at)
      VALUES ($1, $2, $3, $4, $5::vector, $6)
      RETURNING id
    `;

    const result = await db.query(query, [
      tenantId,
      documentId,
      chunkText,
      chunkIndex,
      `[${embedding.join(',')}]`,
      expiresAt,
    ]);

    return result.rows[0].id;
  }

  async deleteByDocument(documentId: string): Promise<void> {
    const query = 'DELETE FROM embeddings WHERE document_id = $1';
    await db.query(query, [documentId]);
  }

  async deleteByTenant(tenantId: string): Promise<void> {
    const query = 'DELETE FROM embeddings WHERE tenant_id = $1';
    await db.query(query, [tenantId]);
  }

  async cleanupExpired(): Promise<number> {
    const query = 'DELETE FROM embeddings WHERE expires_at IS NOT NULL AND expires_at <= NOW()';
    const result = await db.query(query);
    return result.rowCount || 0;
  }
}