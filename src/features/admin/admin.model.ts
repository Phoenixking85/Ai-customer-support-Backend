export interface Admin {
  id: string;
  email: string;
  password_hash: string;
  created_at: Date;
}

export interface CreateAdminData {
  email: string;
  password: string;
}

export interface AdminLoginData {
  email: string;
  password: string;
}

export interface AdminJwtPayload {
  adminId: string;
  email: string;
  iat?: number;
  exp?: number;
}