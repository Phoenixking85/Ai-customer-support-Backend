import { Router } from 'express';
import { sendMessage } from '../controllers/chat.controller';
import { apiKeyAuth } from '../../../middleware/apiKeyAuth';
import { messageQuotaEnforcer } from '../../../middleware/messageQuotaEnforcer';

const router = Router();

router.post('/send', apiKeyAuth, messageQuotaEnforcer, sendMessage);

export { router as chatRoutes };
