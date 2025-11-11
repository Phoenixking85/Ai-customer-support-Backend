import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { asyncHandler } from '../../../middleware/errorHandler';
import { supabase, config } from '../../../config/env';
import { TenantService } from '../../../features/tenants/tenant.service';
import { ApiKeyService } from '../../../features/apiKeys/apikey.service';
import { ApiKeyRepository } from '../../../features/apiKeys/apikey.repo';

const tenantService = new TenantService();
const apiKeyService = new ApiKeyService(new ApiKeyRepository());

const JWT_SECRET = config.jwt.secret;
const JWT_EXPIRES_IN = config.jwt.expiresIn;

export const requestMagicLink = asyncHandler(async (req: Request, res: Response) => {
  const { email, name } = req.body;

  if (!email || !name) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: process.env.SUPABASE_REDIRECT_URL,
      data: { full_name: name },
    },
  });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ message: 'Magic link sent successfully. Please check your email.' });
});

export const supabaseLogin = asyncHandler(async (req: Request, res: Response) => {
  const { access_token } = req.body;

  if (!access_token) {
    return res.status(400).json({ error: 'Access token required' });
  }

  const { data, error } = await supabase.auth.getUser(access_token);
  if (error || !data?.user) {
    return res.status(401).json({ error: 'Invalid or expired Supabase token' });
  }

  const user = data.user;
  const email = user.email;
  const name = user.user_metadata?.full_name || 'Anonymous';

  if (!email) {
    return res.status(400).json({ error: 'User email missing from Supabase profile' });
  }

  const tenant = await tenantService.registerOrGetTenantFromSupabase({
    access_token,
    name,
  });

  const token = jwt.sign(
    { tenantId: tenant.id, email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  res.json({
    message: 'Login successful',
    tenant,
    token,
  });
});

export const generateApiKey = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user?.tenantId;
  if (!tenantId) return res.status(401).json({ error: 'Unauthorized' });

  const tenant = await tenantService.getTenantById(tenantId);
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

  const apiKey = await apiKeyService.generateApiKey(tenant.id);
  res.json({
    message: 'API key generated successfully',
    api_key: apiKey,
    tenant,
  });
});

export const getApiKey = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user?.tenantId;
  if (!tenantId) return res.status(401).json({ error: 'Unauthorized' });

  const tenant = await tenantService.getTenantById(tenantId);
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

  const apiKeyInfo = await apiKeyService.getApiKeyInfo(tenant.id);
  if (!apiKeyInfo) {
    return res.status(404).json({ error: 'No API key found' });
  }

  res.json({
    api_key_info: apiKeyInfo,
    tenant,
  });
});
