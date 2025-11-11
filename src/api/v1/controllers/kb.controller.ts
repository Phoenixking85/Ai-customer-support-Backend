import { Response } from 'express';
import { Queue } from 'bullmq';
import { AuthenticatedRequest } from '../../../middleware/apiKeyAuth';
import { DocumentService } from '../../../features/knowledgebase/document.service';
import { DocumentRepository } from '../../../features/knowledgebase/document.repo';
import { VectorService } from '../../../features/vectorstore/vector.service';
import { TenantService } from '../../../features/tenants/tenant.service';
import { TenantRepository } from '../../../features/tenants/tenant.repo';
import { redisClient } from '../../../queue/redis.client';
import { EmbeddingJobData } from '../../../queue/embedding.job';
import { asyncHandler } from '../../../middleware/errorHandler';
import { config } from '../../../config/env';

const documentRepo = new DocumentRepository();
const documentService = new DocumentService(documentRepo);
const tenantRepo = new TenantRepository();
const tenantService = new TenantService();

const embeddingQueue = new Queue<EmbeddingJobData>('embedding-queue', {
  connection: redisClient.getConnection().connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 10,
    removeOnFail: 50,
  },
});

export const uploadDocument = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenant!.id;
  const plan = req.tenant!.plan;

  if (!req.file) {
    res.status(400).json({
      error: 'No file provided',
      message: 'Please upload a file',
    });
    return;
  }

const quotaInfo = (req as any).quotaInfo;
  if (!quotaInfo.can_upload_document) {
    const message = plan === 'free' 
      ? `Document limit reached (${quotaInfo.documents_limit}). Upgrade to premium for more documents.`
      : `Document limit reached (${quotaInfo.documents_limit}).`;

    res.status(429).json({
      error: 'Document limit exceeded',
      message,
      quota: quotaInfo,
    });
    return;
  }

  const planLimits = plan === 'premium' 
    ? config.plans.premium 
    : config.plans.free;

  if (req.file.size > planLimits.documentSizeLimit) {
    const sizeMB = Math.round(planLimits.documentSizeLimit / (1024 * 1024));
    res.status(413).json({
      error: 'File too large',
      message: `File size exceeds ${sizeMB}MB limit for ${plan} plan`,
    });
    return;
  }

  try {
    const uploadResult = await documentService.uploadDocument(tenantId, req.file);
await redisClient.incrementQuota(tenantId, 'documents');

    await embeddingQueue.add('process-embeddings', {
      documentId: uploadResult.document.id,
      tenantId,
    });

    res.status(201).json({
      message: 'Document uploaded successfully. Processing embeddings in background.',
      document: {
        id: uploadResult.document.id,
        filename: uploadResult.document.original_name,
        file_size: uploadResult.document.file_size,
        mime_type: uploadResult.document.mime_type,
        processing_status: uploadResult.document.processing_status,
        created_at: uploadResult.document.created_at,
      },
    });

  } catch (error) {
    throw error;
  }
});

export const listDocuments = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenant!.id;

  const documents = await documentService.getDocuments(tenantId);

  res.json({
    documents: documents.map(doc => ({
      id: doc.id,
      filename: doc.original_name,
      file_size: doc.file_size,
      mime_type: doc.mime_type,
      processing_status: doc.processing_status,
      chunk_count: doc.chunk_count,
      created_at: doc.created_at,
      updated_at: doc.updated_at,
    })),
  });
});

export const deleteDocument = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenant!.id;
  const { id } = req.params;

  const deleted = await documentService.deleteDocument(tenantId, id);

  if (!deleted) {
    res.status(404).json({
      error: 'Document not found',
      message: 'Document not found or you do not have permission to delete it',
    });
    return;
  }

  res.json({
    message: 'Document deleted successfully',
  });
});
