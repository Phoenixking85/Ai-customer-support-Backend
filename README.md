# AI Customer Support Backend

A multi-tenant AI-powered customer support backend system that enables businesses to deploy intelligent chatbots trained on their own knowledge bases. Built with Node.js, TypeScript, PostgreSQL, and Google Gemini AI.

## 🌟 Features

### Core Functionality
- **Multi-tenant Architecture**: Isolated data and resources per tenant with secure API key authentication
- **AI-Powered Responses**: Leverages Google Gemini AI for intelligent, context-aware customer support
- **Knowledge Base Management**: Upload and process documents (PDF, DOCX, TXT) to train your chatbot
- **Vector Similarity Search**: Semantic search using pgvector for relevant context retrieval
- **Real-time Chat API**: RESTful endpoints for seamless chatbot integration
- **Usage Analytics**: Track message volume, token usage, confidence scores, and latency

### Enterprise Features
- **Subscription Management**: Free and premium tiers with Paystack integration
- **Rate Limiting**: Protect your API from abuse with configurable limits
- **Quota Enforcement**: Message and document limits based on subscription plans
- **Background Job Processing**: Asynchronous document processing with BullMQ and Redis
- **Admin Dashboard API**: System-wide analytics and tenant management
- **Secure Authentication**: JWT + Supabase integration for user management

### Security & Performance
- **API Key Authentication**: Secure tenant access with hashed API keys
- **Helmet.js**: Enhanced security headers
- **CORS Configuration**: Controlled cross-origin access
- **Graceful Shutdown**: Safe cleanup of connections and resources
- **Comprehensive Logging**: Winston-based logging for debugging and monitoring
- **Error Handling**: Centralized error handling with detailed logging

## 📋 Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Subscription Plans](#subscription-plans)
- [Project Structure](#project-structure)
- [Development](#development)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## 🏗️ Architecture

### System Overview

```
┌─────────────┐
│   Client    │
│ Application │
└──────┬──────┘
       │ HTTP/REST
       ▼
┌─────────────────────────────────────┐
│        Express.js Server            │
│  ┌────────────────────────────┐    │
│  │   Auth & Rate Limiting     │    │
│  └─────────┬──────────────────┘    │
│            ▼                         │
│  ┌────────────────────────────┐    │
│  │    API Routes (v1)         │    │
│  │  • Auth  • Chat            │    │
│  │  • KB    • Analytics       │    │
│  │  • Admin • Subscriptions   │    │
│  └─────────┬──────────────────┘    │
└────────────┼─────────────────────────┘
             │
      ┌──────┴──────┬───────────────┐
      ▼             ▼               ▼
┌──────────┐  ┌──────────┐   ┌─────────┐
│PostgreSQL│  │  Redis   │   │ Gemini  │
│ +pgvector│  │  Queue   │   │   AI    │
└──────────┘  └──────────┘   └─────────┘
      │
      ▼
┌─────────────┐
│  Backblaze  │
│ B2 Storage  │
└─────────────┘
```

### Key Components

1. **API Layer**: Express.js REST API with route versioning
2. **Authentication**: Multi-layered (JWT, API Keys, Admin tokens)
3. **AI Processing**: Google Gemini for text generation and embeddings
4. **Vector Store**: PostgreSQL with pgvector for semantic search
5. **Queue System**: BullMQ + Redis for background document processing
6. **Storage**: Backblaze B2 for document storage
7. **Payment Processing**: Paystack for subscription management

## 🛠️ Tech Stack

### Core Technologies
- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL 14+ with pgvector extension
- **Cache/Queue**: Redis + BullMQ
- **AI/ML**: Google Gemini AI (gemini-2.5-pro, text-embedding-004)

### Key Libraries
- **Authentication**: Supabase Auth, jsonwebtoken, bcryptjs
- **Validation**: Joi
- **Security**: Helmet, express-rate-limit, CORS
- **File Processing**: Multer, pdf-parse, mammoth
- **Logging**: Winston
- **Payment**: Paystack
- **Storage**: AWS SDK (Backblaze B2 compatible)

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 18.x
- **npm** >= 9.x or **yarn**
- **PostgreSQL** >= 14.x with **pgvector** extension
- **Redis** >= 6.x
- **Git**

### External Services Required

1. **Google Gemini AI Account**: Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. **Supabase Project**: Sign up at [Supabase](https://supabase.com)
3. **Paystack Account**: Register at [Paystack](https://paystack.com) (for payments)
4. **Backblaze B2**: Create account at [Backblaze](https://www.backblaze.com/b2/cloud-storage.html) (for file storage)

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/ai-customer-support-backend.git
cd ai-customer-support-backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Install PostgreSQL pgvector Extension

Connect to your PostgreSQL database and run:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/ai_support_db

# Redis
REDIS_URL=redis://127.0.0.1:6379

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key_here

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_REDIRECT_URL=http://localhost:8080/

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# Backblaze B2 Storage (S3-compatible)
AWS_ACCESS_KEY_ID=your_b2_key_id
AWS_SECRET_ACCESS_KEY=your_b2_application_key
BACKBLAZE_BUCKET_NAME=your_bucket_name
AWS_ENDPOINT=https://s3.us-east-005.backblazeb2.com
AWS_REGION=us-east-005

# Paystack
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx
PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxx
PAYSTACK_PLAN_ID=PLN_xxxxxxxxxxxxx

# Admin
ADMIN_EMAIL=admin@yourcompany.com
```

### Configuration Files

The application uses centralized configuration in `src/config/env.ts`:

- **Plan Limits**: Message/token/document limits for free and premium tiers
- **AI Settings**: Model selection and embedding dimensions
- **Security**: JWT expiration, rate limiting

## 🗄️ Database Setup

### 1. Create Database

```bash
createdb ai_support_db
```

### 2. Run Schema

```bash
npm run db:setup
```

Or manually:

```bash
psql -d ai_support_db -f src/db/schema.sql
```

### Database Schema

The system includes the following main tables:

- **tenants**: Multi-tenant organizations with subscription plans
- **admins**: System administrators
- **api_keys**: Tenant API key authentication
- **documents**: Uploaded knowledge base files
- **embeddings**: Vector embeddings for semantic search
- **analytics_logs**: Usage tracking and metrics
- **payments**: Payment transaction history
- **subscriptions**: Active subscription records

## 🏃 Running the Application

### Development Mode

Start the development server with auto-reload:

```bash
npm run dev
```

Server will start at `http://localhost:3000`

### Start Background Worker

In a separate terminal, start the document processing worker:

```bash
npm run worker
```

### Production Mode

1. **Build the application**:
```bash
npm run build
```

2. **Start the server**:
```bash
npm start
```

3. **Start the worker**:
```bash
node dist/queue/worker.js
```

### Verify Installation

Check the health endpoint:

```bash
curl http://localhost:3000/api/v1/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

## 📚 API Documentation

### Base URL

```
http://localhost:3000/api/v1
```

### Authentication

The API uses three authentication methods:

1. **API Key** (for chat endpoints): `X-API-Key` header
2. **JWT Bearer Token** (for tenant dashboard): `Authorization: Bearer <token>`
3. **Admin Token** (for admin endpoints): `Authorization: Bearer <admin_token>`

### Main Endpoints

#### Authentication

**POST** `/auth/register`
- Register a new tenant account
- Body: `{ "name": "string", "email": "string", "password": "string" }`

**POST** `/auth/login`
- Login with email/password
- Body: `{ "email": "string", "password": "string" }`
- Returns: JWT token and tenant info

**POST** `/auth/verify-email`
- Verify email with OTP from Supabase
- Body: `{ "email": "string", "token": "string" }`

**GET** `/auth/profile`
- Get current tenant profile
- Requires: JWT Bearer token

#### Chat (Customer-Facing)

**POST** `/chat/send`
- Send a message to the AI chatbot
- Headers: `X-API-Key: your_api_key`
- Body: `{ "message": "string", "context_limit": number }`
- Returns: AI response, confidence score, token usage

#### Knowledge Base

**POST** `/kb/upload`
- Upload documents to train your chatbot
- Requires: JWT Bearer token
- Content-Type: `multipart/form-data`
- Body: `file` (PDF, DOCX, or TXT)

**GET** `/kb/documents`
- List all uploaded documents
- Requires: JWT Bearer token

**DELETE** `/kb/documents/:id`
- Delete a document and its embeddings
- Requires: JWT Bearer token

#### Analytics

**GET** `/analytics/overview`
- Get usage statistics and metrics
- Requires: JWT Bearer token
- Query params: `start_date`, `end_date`

**GET** `/analytics/messages`
- Message-level analytics
- Requires: JWT Bearer token

#### Subscriptions

**POST** `/subscriptions/initialize`
- Initialize Paystack payment for premium plan
- Requires: JWT Bearer token

**POST** `/subscriptions/webhook`
- Paystack webhook for payment confirmations
- Public endpoint (signature verified)

#### Admin

**POST** `/admin/login`
- Admin login
- Body: `{ "email": "string", "password": "string" }`

**GET** `/admin/tenants`
- List all tenants (paginated)
- Requires: Admin token

**GET** `/admin/analytics/system`
- System-wide analytics
- Requires: Admin token

### Request Examples

#### Chat Request

```bash
curl -X POST http://localhost:3000/api/v1/chat/send \
  -H "X-API-Key: your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How do I reset my password?",
    "context_limit": 1500
  }'
```

Response:
```json
{
  "response": "To reset your password, go to the login page and click...",
  "confidence": 0.89,
  "tokens_used": 245,
  "quota": {
    "messages_used": 15,
    "messages_limit": 200,
    "documents_used": 2,
    "documents_limit": 5
  },
  "response_time_ms": 1234
}
```

#### Upload Document

```bash
curl -X POST http://localhost:3000/api/v1/kb/upload \
  -H "Authorization: Bearer your_jwt_token" \
  -F "file=@/path/to/document.pdf"
```

## 💳 Subscription Plans

### Free Tier (14-day Trial)
- **Messages**: 200/month
- **Tokens per request**: 1,000
- **Documents**: 1 upload
- **Document size**: 3 MB max
- **Duration**: 14 days

### Premium Tier
- **Messages**: 2,000/month
- **Tokens per request**: 2,500
- **Documents**: 5 uploads
- **Document size**: 100 MB max
- **Price**: GHS 380.00/month
- **Payment**: Paystack

Plans are configured in `src/config/env.ts` and can be adjusted as needed.

## 📁 Project Structure

```
ai-customer-support-backend/
├── src/
│   ├── api/
│   │   └── v1/
│   │       ├── controllers/       # Request handlers
│   │       ├── routes/            # Route definitions
│   │       └── validators/        # Request validation schemas
│   ├── config/
│   │   └── env.ts                # Environment configuration
│   ├── db/
│   │   ├── index.ts              # Database connection
│   │   └── schema.sql            # Database schema
│   ├── features/
│   │   ├── admin/                # Admin management
│   │   ├── ai/                   # AI service & Gemini client
│   │   ├── analytics/            # Usage analytics
│   │   ├── apiKeys/              # API key management
│   │   ├── knowledgebase/        # Document handling
│   │   ├── payments/             # Payment processing
│   │   ├── tenants/              # Tenant management
│   │   └── vectorstore/          # Vector search & embeddings
│   ├── middleware/
│   │   ├── auth.middleware.ts    # JWT authentication
│   │   ├── apiKeyAuth.ts         # API key authentication
│   │   ├── adminAuth.ts          # Admin authentication
│   │   ├── errorHandler.ts       # Error handling
│   │   ├── messageQuotaEnforcer.ts # Message quota checks
│   │   └── documentQuotaEnforcer.ts # Document quota checks
│   ├── queue/
│   │   ├── embedding.job.ts      # Document processing jobs
│   │   ├── redis.client.ts       # Redis connection
│   │   └── worker.ts             # Background worker
│   ├── types/
│   │   └── index.d.ts            # TypeScript type definitions
│   ├── utils/
│   │   ├── logger.ts             # Winston logger
│   │   └── helpers.ts            # Utility functions
│   ├── app.ts                    # Express app setup
│   └── server.ts                 # Server entry point
├── logs/                         # Application logs
├── .env                          # Environment variables
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

### Feature Module Pattern

Each feature follows a consistent structure:
- `*.model.ts`: Data types and interfaces
- `*.repo.ts`: Database access layer
- `*.service.ts`: Business logic

## 🔧 Development

### Code Style

The project uses TypeScript with strict mode enabled. Key conventions:

- **Async/Await**: Preferred over callbacks
- **Error Handling**: Use custom error classes and centralized handler
- **Type Safety**: Avoid `any` types where possible
- **Repository Pattern**: Database logic isolated in repository classes

### Testing

```bash
npm test
```

### Linting

```bash
npm run lint
```

### Building

```bash
npm run build
```

Output goes to `dist/` directory.

## 🚀 Deployment

### Environment Preparation

1. Set `NODE_ENV=production` in your `.env`
2. Update `DATABASE_URL` with production credentials
3. Configure `ALLOWED_ORIGINS` for your frontend domain
4. Use strong `JWT_SECRET` (64+ random characters)
5. Set up production Redis instance
6. Configure Backblaze B2 production bucket

### Deployment Options

#### Option 1: Traditional VPS (DigitalOcean, AWS EC2, etc.)

```bash
# Install dependencies
npm ci --production

# Build application
npm run build

# Run migrations
npm run db:setup

# Start with process manager
pm2 start dist/server.js --name "ai-support-api"
pm2 start dist/queue/worker.js --name "ai-support-worker"
pm2 save
pm2 startup
```

#### Option 2: Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

#### Option 3: Platform-as-a-Service

- **Render**: Connect GitHub repo, set environment variables
- **Railway**: One-click deploy with PostgreSQL add-on
- **Heroku**: Use Procfile for web and worker dynos

### Post-Deployment Checklist

- [ ] Database migrations applied
- [ ] Redis connection verified
- [ ] Environment variables set correctly
- [ ] CORS origins configured for production domain
- [ ] SSL/TLS certificate installed
- [ ] Paystack webhook URL updated
- [ ] Background worker running
- [ ] Logs configured and monitored
- [ ] Health check endpoint responding
- [ ] Rate limiting tested

## 🐛 Troubleshooting

### Common Issues

#### 1. "Cannot find module" errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### 2. Database connection fails

- Verify `DATABASE_URL` format: `postgresql://user:pass@host:port/dbname`
- Check PostgreSQL is running: `pg_isready`
- Ensure database exists: `psql -l`
- Verify network access and firewall rules

#### 3. Redis connection errors

```bash
# Check Redis is running
redis-cli ping
# Should return: PONG

# If not running, start it:
redis-server
```

#### 4. pgvector extension not found

```sql
-- Connect to your database
\c ai_support_db

-- Install extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify
\dx
```

#### 5. Paystack webhook fails

- Ensure webhook URL is publicly accessible
- Check Paystack dashboard for failed deliveries
- Verify `PAYSTACK_SECRET_KEY` is correct
- Review logs for signature verification errors

#### 6. Document processing stuck

- Check worker is running: `npm run worker`
- Verify Redis connection
- Check logs in `logs/` directory
- Monitor BullMQ dashboard if configured

#### 7. High latency on chat responses

- Check Gemini API rate limits
- Optimize context_limit parameter
- Review database query performance
- Add indexes if needed

### Logs

Application logs are stored in `logs/` directory:

- `error.log`: Error-level logs
- `combined.log`: All logs

View real-time logs:

```bash
tail -f logs/combined.log
```

### Health Checks

```bash
# API health
curl http://localhost:3000/api/v1/health

# Database connection
psql $DATABASE_URL -c "SELECT 1;"

# Redis connection
redis-cli -u $REDIS_URL ping
```

## 📄 License

This project is proprietary software. All rights reserved.

## 🤝 Contributing

This is a private project. Contact the maintainer for contribution guidelines.

## 📞 Support

For issues, questions, or feature requests:
- Email: 
- Documentation: [Link to full docs]
- Issue Tracker: [GitHub Issues]

## 🙏 Acknowledgments

- Google Gemini AI for powerful language models
- Supabase for authentication infrastructure
- PostgreSQL + pgvector for semantic search capabilities
- The Node.js and TypeScript communities

---

**Version**: 1.0.0  
**Last Updated**: 2025 
**Maintained by**: Your Team Name
