import { Router } from 'express';
import authRoutes from './auth.routes';
import { chatRoutes } from './chat.routes';
import { kbRoutes } from './kb.routes';
import { analyticsRoutes } from './analytics.routes';
import { adminRoutes } from './admin.routes';

import { subscriptionRoutes } from './subscription.routes';
import { healthRoutes } from './health.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/chat', chatRoutes);
router.use('/kb', kbRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/admin', adminRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/health', healthRoutes);

export { router as v1Routes };