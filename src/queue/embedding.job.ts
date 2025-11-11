import { Job } from 'bullmq';
import { DocumentService } from '../features/knowledgebase/document.service';
import { VectorService } from '../features/vectorstore/vector.service';
import { DocumentRepository } from '../features/knowledgebase/document.repo';
import { TenantService } from '../features/tenants/tenant.service';
import { Helpers } from '../utils/helpers';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export interface EmbeddingJobData {
  documentId: string;
  tenantId: string;
}

export class EmbeddingJobProcessor {
  constructor(
    private documentService: DocumentService,
    private vectorService: VectorService,
    private documentRepo: DocumentRepository,
    private tenantService: TenantService
  ) {}

  async process(job: Job<EmbeddingJobData>): Promise<void> {
    const { documentId, tenantId } = job.data;

    try {
      logger.info('Starting embedding job', { documentId, tenantId });

      await this.documentRepo.update(documentId, {
        processing_status: 'processing',
      });

      const document = await this.documentRepo.findById(documentId);
      if (!document) {
        throw new Error('Document not found');
      }

      const tenant = await this.tenantService.getTenantById(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      const fileBuffer = await this.documentService.downloadDocument(documentId);

      let text: string;
      switch (document.mime_type) {
        case 'application/pdf':
          text = await this.extractPdfText(fileBuffer);
          break;
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          text = await this.extractDocxText(fileBuffer);
          break;
        case 'application/msword':
          text = await this.extractDocText(fileBuffer);
          break;
        case 'text/plain':
          text = fileBuffer.toString('utf-8');
          break;
        default:
          throw new Error(`Unsupported file type: ${document.mime_type}`);
      }

      const cleanedText = this.cleanText(text);
      const chunks = Helpers.chunkText(cleanedText, 400);

      if (chunks.length === 0) {
        throw new Error('No text content found in document');
      }

      const expiresAt = tenant.plan === 'free'
        ? new Date(Date.now() + config.plans.free.durationDays * 24 * 60 * 60 * 1000)
        : undefined;

      const embeddingPromises = chunks.map(async (chunk, index) => {
        await this.vectorService.addEmbedding(
          tenantId,
          documentId,
          chunk,
          index,
          expiresAt
        );
      });

      await Promise.all(embeddingPromises);

      await this.documentRepo.update(documentId, {
        processing_status: 'completed',
        chunk_count: chunks.length,
      });

      logger.info('Embedding job completed successfully', {
        documentId,
        tenantId,
        chunkCount: chunks.length,
      });

    } catch (error) {
      logger.error('Embedding job failed', {
        documentId,
        tenantId,
        error: error instanceof Error ? error.message : String(error),
      });

      await this.documentRepo.update(documentId, {
        processing_status: 'failed',
      });

      throw error;
    }
  }

  private async extractPdfText(buffer: Buffer): Promise<string> {
    const pdfData = await pdfParse(buffer);
    return pdfData.text;
  }

  private async extractDocxText(buffer: Buffer): Promise<string> {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  private async extractDocText(buffer: Buffer): Promise<string> {
    return buffer.toString('utf-8');
  }

  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[\r\n]+/g, '\n')
      .trim();
  }
}