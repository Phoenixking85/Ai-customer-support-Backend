import { Worker, Job } from 'bullmq';
import { redisClient } from './redis.client';
import { EmbeddingJobProcessor, EmbeddingJobData } from './embedding.job';
import { DocumentService } from '../features/knowledgebase/document.service';
import { VectorService } from '../features/vectorstore/vector.service';
import { DocumentRepository } from '../features/knowledgebase/document.repo';
import { TenantService } from '../features/tenants/tenant.service';
import { TenantRepository } from '../features/tenants/tenant.repo';
import { VectorRepository } from '../features/vectorstore/vector.repo';
import { PgVectorClient } from '../features/vectorstore/pgvector.client';
import { logger } from '../utils/logger';
import { GeminiClient } from '../features/ai/GeminiClient';

class WorkerManager {
  private embeddingWorker!: Worker;
  private embeddingProcessor!: EmbeddingJobProcessor;

  constructor() {
    this.initializeServices();
    this.setupWorkers();
  }

  private initializeServices() {
    const tenantRepo = new TenantRepository();
    const tenantService = new TenantService();
    const documentRepo = new DocumentRepository();
    const documentService = new DocumentService(documentRepo);
    const pgVectorClient = new PgVectorClient();
    const vectorRepo = new VectorRepository(pgVectorClient);
    const openaiClient = new GeminiClient();
    const vectorService = new VectorService(vectorRepo, openaiClient);

    this.embeddingProcessor = new EmbeddingJobProcessor(
      documentService,
      vectorService,
      documentRepo,
      tenantService
    );
  }

  private setupWorkers() {
    
    this.embeddingWorker = new Worker(
      'embedding-queue',
      async (job: Job<EmbeddingJobData>) => {
        await this.embeddingProcessor.process(job);
      },
      {
        connection: redisClient.getConnection().connection,
        concurrency: 3, 
        removeOnComplete: { count: 10 }, 
        removeOnFail: { count: 50 }, 
      }
    );

    // Worker event handlers
    this.embeddingWorker.on('completed', (job) => {
      logger.info('Embedding job completed', {
        jobId: job.id,
        documentId: job.data.documentId,
        tenantId: job.data.tenantId,
      });
    });

    this.embeddingWorker.on('failed', (job, err) => {
      logger.error('Embedding job failed', {
        jobId: job?.id,
        documentId: job?.data?.documentId,
        tenantId: job?.data?.tenantId,
        error: err.message,
      });
    });

    this.embeddingWorker.on('error', (err) => {
      logger.error('Embedding worker error', err);
    });

    logger.info('Workers initialized successfully');
  }

  async start() {
    await redisClient.connect();
    logger.info('Workers started');
  }

  async stop() {
    await this.embeddingWorker.close();
    await redisClient.close();
    logger.info('Workers stopped');
  }
}

if (require.main === module) {
  const workerManager = new WorkerManager();
  
  workerManager.start().catch((error) => {
    logger.error('Failed to start workers', error);
    process.exit(1);
  });
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    await workerManager.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    await workerManager.stop();
    process.exit(0);
  });
}

export { WorkerManager };