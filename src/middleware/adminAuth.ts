import { Request, Response, NextFunction } from 'express';
import { AdminService } from '../features/admin/admin.service';
import { AdminRepository } from '../features/admin/admin.repo';
import { logger } from '../utils/logger';

export interface AdminRequest extends Request {
  admin?: {
    adminId: string;
    email: string;
  };
}

const adminRepo = new AdminRepository();
const adminService = new AdminService(adminRepo);

export async function adminAuth(
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({
        error: 'Authorization token required',
        message: 'Please provide a valid JWT token',
      });
      return;
    }

    const payload = await adminService.verifyToken(token);

    req.admin = {
      adminId: payload.adminId,
      email: payload.email,
    };

    next();
  } catch (error: any) {
    logger.error('Admin authentication failed', { error: error.message });

    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token',
    });
  }
}
