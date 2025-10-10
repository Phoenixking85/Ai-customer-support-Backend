export interface Document {
  id: string;
  tenant_id: string;
  filename: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  b2_url: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  chunk_count?: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateDocumentData {
  tenant_id: string;
  filename: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  b2_url: string;
}

export interface UpdateDocumentData {
  processing_status?: 'pending' | 'processing' | 'completed' | 'failed';
  chunk_count?: number;
}