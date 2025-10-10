import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../../middleware/apiKeyAuth';
import { PaymentService } from '../../../features/payments/payment.service';
import { PaymentRepository } from '../../../features/payments/payment.repo';
import { TenantService } from '../../../features/tenants/tenant.service';
import { TenantRepository } from '../../../features/tenants/tenant.repo';
import { paymentInitSchema } from '../validators/payment.validator';
import { asyncHandler } from '../../../middleware/errorHandler';

const paymentRepo = new PaymentRepository();
const tenantRepo = new TenantRepository();
const tenantService = new TenantService();
const paymentService = new PaymentService(paymentRepo, tenantService);

export const initializePayment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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
});

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
  const payload = req.body;

  if (!signature) {
    res.status(400).json({
      error: 'Missing signature',
      message: 'Webhook signature is required',
    });
    return;
  }

  try {
    await paymentService.handleWebhook(payload, signature);
    
    res.status(200).json({
      message: 'Webhook processed successfully',
    });
  } catch (error) {
    res.status(400).json({
      error: 'Webhook processing failed',
      message: error.message,
    });
  }
});

export const getPaymentHistory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenant!.id;

  const payments = await paymentService.getPaymentHistory(tenantId);

  res.json({
    payments: payments.map(payment => ({
      id: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      provider_payment_id: payment.provider_payment_id,
      created_at: payment.created_at,
      updated_at: payment.updated_at,
    })),
  });
});
