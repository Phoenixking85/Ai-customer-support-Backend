import { Router } from 'express';
import { getUsageStats } from '../controllers/analytics.controller';
import { apiKeyAuth } from '../../../middleware/apiKeyAuth';
 
const router = Router();

router.get('/usage', apiKeyAuth, getUsageStats);

export { router as analyticsRoutes }; 