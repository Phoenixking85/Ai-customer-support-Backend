import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  database: {
    url: string;
    ssl: boolean;
  };
  redis: {
    url: string;
  };
  gemini: {
    apiKey: string;
    model: string;
    embeddingModel: string;
  };
  backblaze: {
    keyId: string;
    applicationKey: string;
    bucketName: string;
    endpoint: string;
    region: string;
  };
  paystack: {
    secretKey: string;
    publicKey: string;
 
    planId: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  admin: {
    email: string;
  };
  plans: {
    free: {
      messageLimit: number;
      tokenLimit: number;
      documentLimit: number;
      documentSizeLimit: number;
      durationDays: number;
    };
    premium: {
      messageLimit: number;
      tokenLimit: number;
      documentLimit: number;
      documentSizeLimit: number;
      price: number;
      currency: string;
    };
  };
  supabase: {
    url: string;
    serviceRoleKey: string;
    redirectUrl: string;
  };
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    url: process.env.DATABASE_URL || '',
    ssl: process.env.NODE_ENV === 'production',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: 'gemini-2.5-pro',
    embeddingModel: 'text-embedding-004',
  },

  backblaze: {
    keyId: process.env.AWS_ACCESS_KEY_ID || '',
    applicationKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    bucketName: process.env.BACKBLAZE_BUCKET_NAME || '',
    endpoint: process.env.AWS_ENDPOINT || '',
    region: process.env.AWS_REGION || 'us-east-005',
  },

  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY || '',
    publicKey: process.env.PAYSTACK_PUBLIC_KEY || '',
    planId: process.env.PAYSTACK_PLAN_ID || ''
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    expiresIn: '24h',
  },

  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@yourcompany.com',
  },

  plans: {
    free: {
      messageLimit: 200,
      tokenLimit: 1000,
      documentLimit: 1,
      documentSizeLimit: 3 * 1024 * 1024,
      durationDays: 14,
    },
    premium: {
      messageLimit: 2000,
      tokenLimit: 2500,
      documentLimit: 5,
      documentSizeLimit: 100 * 1024 * 1024,
      price: 38000,
      currency: 'GHS',
    },
  },

  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    redirectUrl: process.env.SUPABASE_REDIRECT_URL || 'http://localhost:8080/',
  },
};

if (!config.supabase.url || !config.supabase.serviceRoleKey) {
  throw new Error('❌ Missing Supabase environment variables');
}

export const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
