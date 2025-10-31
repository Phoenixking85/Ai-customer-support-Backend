import { Response } from 'express';
import { AuthenticatedRequest } from '../../../middleware/apiKeyAuth';
import { PaymentService } from '../../../features/payments/payment.service';
import { PaymentRepository } from '../../../features/payments/payment.repo';
import { TenantService } from '../../../features/tenants/tenant.service';
import { TenantRepository } from '../../../features/tenants/tenant.repo';
import { asyncHandler } from '../../../middleware/errorHandler';
import { config } from '../../../config/env';

const paymentRepo = new PaymentRepository();
const tenantRepo = new TenantRepository();
const tenantService = new TenantService();
const paymentService = new PaymentService(paymentRepo, tenantService);

export const createSubscription = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenant!.id;
  const { plan = 'premium' } = req.body;

  if (plan !== 'premium') {
    res.status(400).json({
      error: 'Invalid plan',
      message: 'Only premium subscriptions are available',
    });
    return;
  }

  const tenant = await tenantService.getTenantById(tenantId);
  if (!tenant) {
    res.status(404).json({
      error: 'Tenant not found',
    });
    return;
  }

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
    const subscriptionData = {
      email: tenant.email,
      plan: 'premium',
      amount: config.plans.premium.price,
        plan_code: config.paystack.planId,
    };

    // For now, we'll use the payment initialization flow
    // In a full implementation, you'd use Paystack's subscription API
    const result = await paymentService.initializePayment(tenantId, {
      plan: 'premium',
    });

    res.json({
      message: 'Subscription initialization successful',
      checkout_url: result.checkout_url,
      reference: result.reference,
    });

  } catch (error) {
    res.status(500).json({
      error: 'Subscription creation failed',
      message: error.message,
    });
  }
});

export const cancelSubscription = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenant!.id;

  const subscription = await paymentRepo.findActiveSubscription(tenantId);
  if (!subscription) {
    res.status(404).json({
      error: 'No active subscription',
      message: 'No active subscription found for your account',
    });
    return;
  }

  await paymentRepo.updateSubscriptionStatus(subscription.provider_subscription_id, 'cancelled');

  await tenantService.updateTenant(tenantId, {
    plan: 'free',
    payment_status: 'expired',
  });

  res.json({
    message: 'Subscription cancelled successfully',
  });
});

export const getSubscription = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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
});