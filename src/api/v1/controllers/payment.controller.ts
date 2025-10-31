import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../../middleware/apiKeyAuth';
import { PaymentService } from '../../../features/payments/payment.service';
import { PaymentRepository } from '../../../features/payments/payment.repo';
import { TenantService } from '../../../features/tenants/tenant.service';
import { paymentInitSchema } from '../validators/payment.validator';
import { asyncHandler } from '../../../middleware/errorHandler';
import { logger } from '../../../utils/logger';

const paymentRepo = new PaymentRepository();
const tenantService = new TenantService();
const paymentService = new PaymentService(paymentRepo, tenantService);

export const initializePayment = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.tenant!.id;
    const { error, value } = paymentInitSchema.validate(req.body);

    if (error) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.details,
      });
      return;
    }

    const result = await paymentService.initializePayment(tenantId, value);

    res.json({
      message: 'Payment initialized successfully',
      checkout_url: result.checkout_url,
      reference: result.reference,
    });
  }
);

export const verifyPayment = asyncHandler(async (req: Request, res: Response) => {
  const { reference } = req.query;

  if (!reference) {
    res.status(400).json({
      error: 'Missing reference',
      message: 'Payment reference is required',
    });
    return;
  }

  const result = await paymentService.verifyPayment(reference as string);
  res.json(result);
});

export const handleWebhook = asyncHandler(async (req: Request, res: Response) => {
  const signature = req.headers['x-paystack-signature'] as string;

  if (!signature) {
    logger.error('Webhook received without signature');
    return res.status(400).json({ error: 'Missing signature' });
  }

  // CRITICAL: req.body is a Buffer when using bodyParser.raw()
  if (!Buffer.isBuffer(req.body)) {
    logger.error('Webhook body is not a Buffer - middleware misconfigured', {
      bodyType: typeof req.body,
    });
    return res.status(500).json({ 
      error: 'Server misconfiguration',
      message: 'Webhook handler expects raw body' 
    });
  }

  // Convert Buffer to string for signature verification
  const rawBody = req.body.toString('utf8');
  
  // Parse JSON for processing
  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch (error) {
    logger.error('Failed to parse webhook payload', { error });
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  try {
    // Pass rawBody as the third parameter for signature verification
    await paymentService.handleWebhook(payload, signature, rawBody);
    
    logger.info('Webhook processed successfully', {
      event: payload.event,
      reference: payload.data?.reference,
    });

    res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (err: any) {
    logger.error('Webhook processing failed', {
      error: err.message,
      event: payload?.event,
    });

    res.status(400).json({
      error: 'Webhook processing failed',
      message: err.message,
    });
  }
});

export const getPaymentHistory = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.tenant!.id;
    const payments = await paymentService.getPaymentHistory(tenantId);

    res.json({
      payments: payments.map((payment) => ({
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        provider_payment_id: payment.provider_payment_id,
        created_at: payment.created_at,
        updated_at: payment.updated_at,
      })),
    });
  }
);