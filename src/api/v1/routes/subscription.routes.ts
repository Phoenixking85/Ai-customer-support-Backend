import { Router } from 'express';
import { 
  createSubscription, 
  cancelSubscription, 
  getSubscription, 
  getSubscriptionHistory,
  handleWebhook 
} from '../controllers/subscription.controller';
import { apiKeyAuth } from '../../../middleware/apiKeyAuth';

const router = Router();

// Authenticated routes (require API key)
router.post('/create', apiKeyAuth, createSubscription);
router.post('/cancel', apiKeyAuth, cancelSubscription);
router.get('/current', apiKeyAuth, getSubscription);
router.get('/history', apiKeyAuth, getSubscriptionHistory);

// Webhook route (no auth - Paystack will send signature)
router.post('/webhook', handleWebhook);

export { router as subscriptionRoutes };