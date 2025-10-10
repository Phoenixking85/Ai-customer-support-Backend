import { Router } from 'express';
import {
  requestMagicLink,
  supabaseLogin,
  generateApiKey,
  getApiKey,
} from '../controllers/auth.controller';
import { authenticateToken } from '../../../middleware/auth.middleware';

const router = Router();

router.post('/magic-link', requestMagicLink);
router.post('/supabase-login', supabaseLogin);

router.post('/apikey', authenticateToken, generateApiKey);
router.get('/apikey', authenticateToken, getApiKey);


export default router;
