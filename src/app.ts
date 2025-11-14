import express from 'express';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { v1Routes } from './api/v1/routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import { handleWebhook } from './api/v1/controllers/subscription.controller';

const app = express();


app.set('trust proxy', true);

app.use(helmet());

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
}));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: { error: 'Too many requests', message: 'Rate limit exceeded.' },
  standardHeaders: true,
  legacyHeaders: false,
}));


app.post(
  '/api/v1/subscriptions/webhook',
  bodyParser.raw({ type: 'application/json' }),
  handleWebhook
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
  logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });
  next();
});

app.get('/', (req, res) => {
  res.json({
    message: 'AI Customer Support Backend API',
    version: '1.0.0',
    status: 'operational',
    documentation: '/api/v1/health',
  });
});

app.use('/api/v1', v1Routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;