import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { Helpers } from '../utils/helpers';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  tenant?: {
    id: string;
    plan: 'free' | 'premium';
    payment_status: string;
  };
}

export async function apiKeyAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      res.status(401).json({
        error: 'API key required',
        message: 'Please provide a valid API key in the X-API-Key header',
      });
      return;
    }

    // Find API key and tenant
    const query = `
      SELECT 
        ak.id,
        ak.tenant_id,
        ak.key_hash,
        ak.is_active,
        t.plan,
        t.payment_status,
        t.trial_ends_at
      FROM api_keys ak
      JOIN tenants t ON ak.tenant_id = t.id
      WHERE ak.is_active = true
    `;

    const result = await db.query(query);
    let validApiKey = null;

    // Check each active API key
    for (const row of result.rows) {
      const isValid = await Helpers.verifyApiKey(apiKey, row.key_hash);
      if (isValid) {
        validApiKey = row;
        break;
      }
    }

    if (!validApiKey) {
      res.status(401).json({
        error: 'Invalid API key',
        message: 'The provided API key is not valid or has been deactivated',
      });
      return;
    }

    // Check if trial expired for free plans
    if (validApiKey.plan === 'free' && validApiKey.trial_ends_at) {
      const trialExpired = new Date() > new Date(validApiKey.trial_ends_at);
      if (trialExpired) {
        res.status(403).json({
          error: 'Trial expired',
          message: 'Your free trial has expired. Please upgrade to premium to continue.',
        });
        return;
      }
    }

    // Check if account is suspended
    if (validApiKey.payment_status === 'suspended') {
      res.status(403).json({
        error: 'Account suspended',
        message: 'Your account has been suspended. Please contact support.',
      });
      return;
    }

    // Update last_used_at
    await db.query(
      'UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1',
      [validApiKey.id]
    );

    // Attach tenant info to request
    req.tenant = {
      id: validApiKey.tenant_id,
      plan: validApiKey.plan,
      payment_status: validApiKey.payment_status,
    };

    next();
  } catch (error) {
    logger.error('API key authentication error:', error);
    res.status(500).json({
      error: 'Authentication failed',
      message: 'An error occurred during authentication',
    });
  }
}