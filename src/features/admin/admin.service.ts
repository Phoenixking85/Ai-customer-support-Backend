import jwt from 'jsonwebtoken';
import { AdminRepository } from './admin.repo';
import { AdminLoginData, AdminJwtPayload } from './admin.model';
import { config } from '../../config/env';

export class AdminService {
  constructor(private adminRepo: AdminRepository) {}

  async login(data: AdminLoginData) {
    const admin = await this.adminRepo.verifyPassword(data.email, data.password);
    if (!admin) {
      throw new Error('Invalid credentials');
    }

    const payload: AdminJwtPayload = {
      adminId: admin.id,
      email: admin.email,
    };

    const token = jwt.sign(payload, config.jwt.secret, { expiresIn: "1h" });


    return {
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        created_at: admin.created_at,
      },
    };
  }

  async verifyToken(token: string): Promise<AdminJwtPayload> {
    try {
      const payload = jwt.verify(token, config.jwt.secret) as AdminJwtPayload;
      
      // Verify admin still exists
      const admin = await this.adminRepo.findById(payload.adminId);
      if (!admin) {
        throw new Error('Admin not found');
      }

      return payload;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}