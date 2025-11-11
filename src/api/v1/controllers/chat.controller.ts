import { Response } from 'express';
import { AuthenticatedRequest } from '../../../middleware/apiKeyAuth';
import { AIService } from '../../../features/ai/ai.service';
import { geminiClient } from '../../../features/ai/GeminiClient';
import { VectorService } from '../../../features/vectorstore/vector.service';
import { VectorRepository } from '../../../features/vectorstore/vector.repo';
import { PgVectorClient } from '../../../features/vectorstore/pgvector.client';
import { AnalyticsService } from '../../../features/analytics/analytics.service';
import { AnalyticsRepository } from '../../../features/analytics/analytics.repo';
import { chatSchema } from '../validators/chat.validator';
import { asyncHandler } from '../../../middleware/errorHandler';
import { config } from '../../../config/env';
import { Helpers } from '../../../utils/helpers';

const pgVectorClient = new PgVectorClient();
const vectorRepo = new VectorRepository(pgVectorClient);
const vectorService = new VectorService(vectorRepo, geminiClient);
const analyticsRepo = new AnalyticsRepository();
const analyticsService = new AnalyticsService(analyticsRepo);
const aiService = new AIService(geminiClient, vectorService);

export const sendMessage = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const startTime = Date.now();
  const tenantId = req.tenant!.id;
  const plan = req.tenant!.plan;

  const { error, value } = chatSchema.validate(req.body);
  if (error) return res.status(400).json({ error: 'Validation failed', details: error.details });

  const { message, context_limit } = value;
  const planLimits = plan === 'premium' ? config.plans.premium : config.plans.free;
  const maxTokens = context_limit || planLimits.tokenLimit;
  const tokensIn = Helpers.calculateTokens(message);

  try {
    const result = await aiService.processQuery(tenantId, message, maxTokens);
    const latency = Date.now() - startTime;

    await analyticsService.logRequest({
      tenant_id: tenantId,
      endpoint: '/chat/send',
      tokens_in: tokensIn,
      tokens_out: result.tokensUsed,
      latency_ms: latency,
      confidence: result.confidence,
      outcome: 'success',
    });

    const quotaInfo = (req as any).quotaInfo;

    res.json({
      response: result.response,
      confidence: result.confidence,
      tokens_used: result.tokensUsed,
      quota: quotaInfo,
      response_time_ms: latency,
    });
  } catch (error: any) {
    const latency = Date.now() - startTime;

    await analyticsService.logRequest({
      tenant_id: tenantId,
      endpoint: '/chat/send',
      tokens_in: tokensIn,
      tokens_out: 0,
      latency_ms: latency,
      outcome: 'error',
      error_message: error.message,
    });

    throw error;
  }
});
