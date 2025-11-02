import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../../middleware/apiKeyAuth';
import { PaymentService } from '../../../features/payments/payment.service';
import { PaymentRepository } from '../../../features/payments/payment.repo';
import { TenantService } from '../../../features/tenants/tenant.service';
import { asyncHandler } from '../../../middleware/errorHandler';
import { logger } from '../../../utils/logger';

const paymentRepo = new PaymentRepository();
const tenantService = new TenantService();
const paymentService = new PaymentService(paymentRepo, tenantService);

// Create a new subscription
export const createSubscription = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.tenant!.id;
    const { callback_url } = req.body;

    const tenant = await tenantService.getTenantById(tenantId);
    if (!tenant) {
      res.status(404).json({
        error: 'Tenant not found',
      });
      return;
    }

    // Check if tenant is already on premium
    if (tenant.plan === 'premium') {
      res.status(409).json({
        error: 'Already subscribed',
        message: 'You already have an active premium subscription',
      });
      return;
    }

    // Check if there's already an active subscription
    const activeSubscription = await paymentRepo.findActiveSubscription(tenantId);
    if (activeSubscription) {
      res.status(409).json({
        error: 'Subscription already exists',
        message: 'You already have an active subscription',
        subscription: activeSubscription,
      });
      return;
    }

    try {
      const result = await paymentService.createSubscription(tenantId, callback_url);

      res.json({
        message: 'Subscription created successfully. Complete payment to activate.',
        checkout_url: result.checkout_url,
      });
    } catch (error: any) {
      res.status(500).json({
        error: 'Subscription creation failed',
        message: error.message,
      });
    }
  }
);

// Cancel existing subscription
export const cancelSubscription = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.tenant!.id;

    const subscription = await paymentRepo.findActiveSubscription(tenantId);
    if (!subscription) {
      res.status(404).json({
        error: 'No active subscription',
        message: 'No active subscription found for your account',
      });
      return;
    }

    await paymentRepo.updateSubscriptionStatus(
      subscription.provider_subscription_id,
      'cancelled'
    );

    await tenantService.updateTenant(tenantId, {
      plan: 'free',
      payment_status: 'expired',
    });

    res.json({
      message: 'Subscription cancelled successfully',
    });
  }
);

// Get current subscription
export const getSubscription = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.tenant!.id;

    const subscription = await paymentRepo.findActiveSubscription(tenantId);

    if (!subscription) {
      res.json({
        subscription: null,
        message: 'No active subscription found',
      });
      return;
    }

    res.json({
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        created_at: subscription.created_at,
      },
    });
  }
);


export const getSubscriptionHistory = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.tenant!.id;

    const subscriptions = await paymentRepo.getSubscriptionHistory(tenantId);

    res.json({
      subscriptions: subscriptions.map((sub) => ({
        id: sub.id,
        plan: sub.plan,
        status: sub.status,
        current_period_start: sub.current_period_start,
        current_period_end: sub.current_period_end,
        created_at: sub.created_at,
      })),
    });
  }
);

// Handle Paystack webhooks
export const handleWebhook = asyncHandler(async (req: Request, res: Response) => {
  const signature = req.headers['x-paystack-signature'] as string;

  if (!signature) {
    logger.error('Webhook received without signature');
    return res.status(400).json({ error: 'Missing signature' });
  }

  if (!Buffer.isBuffer(req.body)) {
    logger.error('Webhook body is not a Buffer - middleware misconfigured', {
      bodyType: typeof req.body,
    });
    return res.status(500).json({
      error: 'Server misconfiguration',
      message: 'Webhook handler expects raw body',
    });
  }

  const rawBody = req.body.toString('utf8');

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch (error) {
    logger.error('Failed to parse webhook payload', { error });
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  try {
    await paymentService.handleWebhook(payload, signature, rawBody);
    
    logger.info('Webhook processed successfully', {
      event: payload.event,
      subscriptionCode: payload.data?.subscription_code,
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