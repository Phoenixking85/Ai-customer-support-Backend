import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './apiKeyAuth';
import { redisClient } from '../queue/redis.client';
import { config } from '../config/env';
import { logger } from '../utils/logger';

export async function documentQuotaEnforcer(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.tenant) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const tenantId = req.tenant.id;
    const plan = req.tenant.plan;

    const planLimits = plan === 'premium'
      ? config.plans.premium
      : config.plans.free;

    // === Document quota ===
    const documentsUsed = await redisClient.getQuota(tenantId, 'documents');
    const canUploadDocument = documentsUsed < planLimits.documentLimit;

    if (!canUploadDocument) {
      const message = plan === 'free'
        ? `Document limit reached (${planLimits.documentLimit}). Upgrade to premium for more documents.`
        : `Document limit reached (${planLimits.documentLimit}).`;

      res.status(429).json({
        error: 'Document limit exceeded',
        message,
        quota: {
          documents_used: documentsUsed,
          documents_limit: planLimits.documentLimit,
          can_upload_document: false,
        },
      });
      return;
    }

    // Attach quota info to request
    (req as any).quotaInfo = {
      documents_used: documentsUsed,
      documents_limit: planLimits.documentLimit,
      can_upload_document: canUploadDocument,
    };

    next();
  } catch (error) {
    logger.error('Document quota enforcement error:', error);
    res.status(500).json({
      error: 'Quota check failed',
      message: 'An error occurred while checking your document quota',
    });
  }
}
