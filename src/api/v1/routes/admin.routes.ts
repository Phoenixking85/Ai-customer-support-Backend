import { Router } from 'express';
import { login, getTenants, updateTenant, getSystemStats } from '../controllers/admin.controller';
import { adminAuth } from '../../../middleware/adminAuth';

const router = Router();

router.post('/login', login);
router.get('/tenants', adminAuth, getTenants);
router.patch('/tenants/:id', adminAuth, updateTenant);
router.get('/stats', adminAuth, getSystemStats);

export { router as adminRoutes };