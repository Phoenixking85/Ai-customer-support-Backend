import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './apiKeyAuth';
import { redisClient } from '../queue/redis.client';
import { config } from '../config/env';
import { logger } from '../utils/logger';

export async function messageQuotaEnforcer(
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

    const messagesUsed = plan === 'premium'
      ? await redisClient.getMonthlyQuota(tenantId, 'messages')
      : await redisClient.getQuota(tenantId, 'messages');

    if (messagesUsed >= planLimits.messageLimit) {
      const upgradeMessage = plan === 'free'
        ? 'Your free trial message limit has been reached. Please upgrade to premium.'
        : 'Your monthly message limit has been reached. Your quota will reset next month.';

      res.status(429).json({
        error: 'Quota exceeded',
        message: upgradeMessage,
        quota: {
          messages_used: messagesUsed,
          messages_limit: planLimits.messageLimit,
          messages_remaining: 0,
        },
      });
      return;
    }

    if (plan === 'premium') {
      await redisClient.incrementMonthlyQuota(tenantId, 'messages');
    } else {
      await redisClient.incrementQuota(tenantId, 'messages');
    }

    (req as any).quotaInfo = {
      messages_used: messagesUsed + 1,
      messages_limit: planLimits.messageLimit,
      messages_remaining: Math.max(0, planLimits.messageLimit - messagesUsed - 1),
      token_limit: planLimits.tokenLimit,
    };

    next();
  } catch (error) {
    logger.error('Message quota enforcement error:', error);
    res.status(500).json({
      error: 'Quota check failed',
      message: 'An error occurred while checking your message quota',
    });
  }
}
