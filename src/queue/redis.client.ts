import { Redis } from 'ioredis';
import { config } from '../config/env';
import { logger } from '../utils/logger';

class RedisClient {
  private client: Redis;
  private pubClient: Redis;
  private subClient: Redis;

  constructor() {
    const redisConfig = {
      maxRetriesPerRequest: null,
      retryDelayOnFailover: 100,
      lazyConnect: true,
    };

    this.client = new Redis(config.redis.url, redisConfig);
    this.pubClient = new Redis(config.redis.url, redisConfig);
    this.subClient = new Redis(config.redis.url, redisConfig);

    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.client.on('connect', () => logger.info('Redis connected'));
    this.client.on('error', (err) => logger.error('Redis error:', err));
    this.client.on('ready', () => logger.info('Redis ready'));
  }

 async connect() {
  const clients = [this.client, this.pubClient, this.subClient];

  for (const c of clients) {
    if (c.status === "wait" || c.status === "end") {
      await c.connect();
    }
  }
}


  // Quota methods
  async incrementQuota(tenantId: string, type: 'messages' | 'tokens', amount = 1): Promise<number> {
    const key = `quota:${tenantId}:${type}:${this.getDateKey()}`;
    const result = await this.client.incrby(key, amount);
    await this.client.expire(key, 86400); // Expire after 24 hours
    return result;
  }

  async getQuota(tenantId: string, type: 'messages' | 'tokens'): Promise<number> {
    const key = `quota:${tenantId}:${type}:${this.getDateKey()}`;
    const result = await this.client.get(key);
    return result ? parseInt(result) : 0;
  }

  async resetQuota(tenantId: string): Promise<void> {
    const pattern = `quota:${tenantId}:*`;
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }

  // Monthly quota for premium users
  async getMonthlyQuota(tenantId: string, type: 'messages'): Promise<number> {
    const key = `quota:${tenantId}:${type}:${this.getMonthKey()}`;
    const result = await this.client.get(key);
    return result ? parseInt(result) : 0;
  }

  async incrementMonthlyQuota(tenantId: string, type: 'messages', amount = 1): Promise<number> {
    const key = `quota:${tenantId}:${type}:${this.getMonthKey()}`;
    const result = await this.client.incrby(key, amount);
    await this.client.expire(key, 2592000); // Expire after 30 days
    return result;
  }

  // Rate limiting
  async checkRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
    const current = await this.client.incr(key);
    if (current === 1) {
      await this.client.expire(key, Math.ceil(windowMs / 1000));
    }
    return current <= limit;
  }

  // Generic cache methods
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setex(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  private getDateKey(): string {
    return new Date().toISOString().split('T')[0];
  }

  private getMonthKey(): string {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  // For BullMQ
  getConnection() {
    return {
      connection: this.client,
      prefix: 'bull',
    };
  }

  async close() {
    await Promise.all([
      this.client.disconnect(),
      this.pubClient.disconnect(),
      this.subClient.disconnect(),
    ]);
  }
}

export const redisClient = new RedisClient();