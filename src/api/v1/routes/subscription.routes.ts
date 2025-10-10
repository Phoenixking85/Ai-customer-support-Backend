import { Router } from 'express';
import { createSubscription, cancelSubscription, getSubscription } from '../controllers/subscription.controller';
import { apiKeyAuth } from '../../../middleware/apiKeyAuth';

const router = Router();

router.post('/create', apiKeyAuth, createSubscription);
router.post('/cancel', apiKeyAuth, cancelSubscription);
router.get('/current', apiKeyAuth, getSubscription);

export { router as subscriptionRoutes };
