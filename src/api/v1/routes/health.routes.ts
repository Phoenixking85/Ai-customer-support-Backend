import { Router, Request, Response } from 'express';
import { db } from '../../../db';
import { redisClient } from '../../../queue/redis.client';
import { asyncHandler } from '../../../middleware/errorHandler';

const router = Router();

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const healthCheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: new Date().toISOString(),
    services: {
      database: 'checking',
      redis: 'checking',
      openai: 'ok',
    },
  };

  try {
    await db.query('SELECT 1');
    healthCheck.services.database = 'ok';
  } catch (error) {
    healthCheck.services.database = 'error';
    healthCheck.message = 'Database connection failed';
  }

  try {
    await redisClient.get('health-check');
    healthCheck.services.redis = 'ok';
  } catch (error) {
    healthCheck.services.redis = 'error';
    if (healthCheck.message === 'OK') {
      healthCheck.message = 'Redis connection failed';
    }
  }

  const statusCode = healthCheck.message === 'OK' ? 200 : 503;
  res.status(statusCode).json(healthCheck);
}));

export { router as healthRoutes };