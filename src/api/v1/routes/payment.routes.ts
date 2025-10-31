import { Router } from 'express';
import { 
  initializePayment, 
  verifyPayment, 
  handleWebhook, 
  getPaymentHistory 
} from '../controllers/payment.controller';
import { apiKeyAuth } from '../../../middleware/apiKeyAuth';

const router = Router();

// Initialize payment (protected)
router.post('/initialize', apiKeyAuth, initializePayment);

// Verify payment (can be public or protected depending on your flow)
router.get('/verify', verifyPayment);

// ⚠️ IMPORTANT: Do NOT add bodyParser.raw here!
// The raw parser is already applied in app.ts BEFORE this router is mounted
// This route will receive the raw body automatically
router.post('/webhook', handleWebhook);

// Get payment history (protected)
router.get('/history', apiKeyAuth, getPaymentHistory);

export { router as paymentRoutes };