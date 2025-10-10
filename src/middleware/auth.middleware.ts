import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Extend the Request interface to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        tenantId: string;
        email: string;
      };
    }
  }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  // Get token from Authorization header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: 'Access denied',
      message: 'No token provided. Please include Authorization header with Bearer token.'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as { tenantId: string; email: string };
    req.user = {
      tenantId: decoded.tenantId,
      email: decoded.email
    };
    next();
  } catch (error) {
    return res.status(403).json({
      error: 'Invalid token',
      message: 'The provided token is invalid or has expired.'
    });
  }
};