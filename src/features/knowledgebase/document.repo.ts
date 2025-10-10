import { db } from '../../db';
import { Document, CreateDocumentData, UpdateDocumentData } from './document.model';

export class DocumentRepository {
  async create(data: CreateDocumentData): Promise<Document> {
    const query = `
      INSERT INTO documents (tenant_id, filename, original_name, file_size, mime_type, b2_url)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const result = await db.query(query, [
      data.tenant_id,
      data.filename,
      data.original_name,
      data.file_size,
      data.mime_type,
      data.b2_url,
    ]);
    
    return result.rows[0];
  }

  async findById(id: string): Promise<Document | null> {
    const query = 'SELECT * FROM documents WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  }

  async findByTenant(tenantId: string): Promise<Document[]> {
    const query = `
      SELECT * FROM documents 
      WHERE tenant_id = $1 
      ORDER BY created_at DESC
    `;
    const result = await db.query(query, [tenantId]);
    return result.rows;
  }

  async update(id: string, data: UpdateDocumentData): Promise<Document | null> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    const query = `
      UPDATE documents 
      SET ${fields.join(', ')} 
      WHERE id = $${paramCount}
      RETURNING *
    `;
    values.push(id);

    const result = await db.query(query, values);
    return result.rows[0] || null;
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM documents WHERE id = $1';
    const result = await db.query(query, [id]);
    return (result.rowCount || 0) > 0;
  }

  async countByTenant(tenantId: string, status?: string): Promise<number> {
    let query = 'SELECT COUNT(*) as count FROM documents WHERE tenant_id = $1';
    const params = [tenantId];

    if (status) {
      query += ' AND processing_status = $2';
      params.push(status);
    }

    const result = await db.query(query, params);
    return parseInt(result.rows[0].count);
  }
}