import { db } from '../../db';
import { Admin, CreateAdminData } from './admin.model';
import bcrypt from 'bcryptjs';

export class AdminRepository {
  async create(data: CreateAdminData): Promise<Admin> {
    const hashedPassword = await bcrypt.hash(data.password, 12);
    
    const query = `
      INSERT INTO admins (email, password_hash)
      VALUES ($1, $2)
      RETURNING id, email, password_hash, created_at
    `;
    
    const result = await db.query(query, [data.email, hashedPassword]);
    return result.rows[0];
  }

  async findByEmail(email: string): Promise<Admin | null> {
    const query = 'SELECT * FROM admins WHERE email = $1';
    const result = await db.query(query, [email]);
    return result.rows[0] || null;
  }

  async findById(id: string): Promise<Admin | null> {
    const query = 'SELECT * FROM admins WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  }

  async verifyPassword(email: string, password: string): Promise<Admin | null> {
    const admin = await this.findByEmail(email);
    if (!admin) return null;

    const isValidPassword = await bcrypt.compare(password, admin.password_hash);
    return isValidPassword ? admin : null;
  }
}