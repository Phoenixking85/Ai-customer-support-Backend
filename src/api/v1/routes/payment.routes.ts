import { Router } from 'express';
import { 
  initializePayment, 
  verifyPayment, 
  handleWebhook, 
  getPaymentHistory 
} from '../controllers/payment.controller';
import { apiKeyAuth } from '../../../middleware/apiKeyAuth';

const router = Router();


router.post('/initialize', apiKeyAuth, initializePayment);

router.get('/verify', verifyPayment);

router.post('/webhook', handleWebhook);

router.get('/history', apiKeyAuth, getPaymentHistory);

export { router as  paymentRoutes };
