import { Request, Response, NextFunction } from 'express';

export interface IpRateLimiterOptions {
  windowMs?: number;
  maxRequests?: number;
  message?: string;
  skip?: (req: Request) => boolean;
}

interface IpRecord {
  count: number;
  resetTime: number;
}

export class IpRateLimiter {
  private records = new Map<string, IpRecord>();
  private windowMs: number;
  private maxRequests: number;
  private message: string;
  private skip?: (req: Request) => boolean;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(options: IpRateLimiterOptions = {}) {
    const rawWindow = options.windowMs ?? parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
    this.windowMs = Math.max(1000, isNaN(rawWindow) ? 60000 : rawWindow);

    const rawMax = options.maxRequests ?? parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '120', 10);
    this.maxRequests = Math.max(1, isNaN(rawMax) ? 120 : rawMax);

    this.message = options.message ?? 'Taxa limite de requisições excedida. Aguarde alguns instantes.';
    this.skip = options.skip;

    // Periodically sweep expired records to prevent memory leak
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, Math.max(30000, this.windowMs));

    // Don't keep Node process alive just for the timer
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  public getMiddleware(skipFn?: (req: Request) => boolean) {
    return (req: Request, res: Response, next: NextFunction) => {
      const activeSkip = skipFn || this.skip;
      if (activeSkip && activeSkip(req)) {
        return next();
      }

      const clientIp = this.getClientIp(req);
      const now = Date.now();

      let record = this.records.get(clientIp);

      if (!record || now >= record.resetTime) {
        record = {
          count: 1,
          resetTime: now + this.windowMs,
        };
        this.records.set(clientIp, record);
      } else {
        record.count++;
      }

      const remaining = Math.max(0, this.maxRequests - record.count);
      const resetInSeconds = Math.ceil((record.resetTime - now) / 1000);

      res.setHeader('X-RateLimit-Limit', this.maxRequests);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', resetInSeconds);

      if (record.count > this.maxRequests) {
        res.setHeader('Retry-After', resetInSeconds);
        return res.status(429).json({
          error: this.message,
          retryAfter: resetInSeconds,
          limit: this.maxRequests,
          windowSeconds: Math.ceil(this.windowMs / 1000),
        });
      }

      next();
    };
  }

  private normalizeIp(ip: string): string {
    if (ip.startsWith('::ffff:')) {
      return ip.slice(7);
    }
    return ip;
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      const first = forwarded.split(',')[0].trim();
      if (first) return this.normalizeIp(first);
    }
    if (Array.isArray(forwarded) && forwarded.length > 0) {
      const first = forwarded[0].trim();
      if (first) return this.normalizeIp(first);
    }
    return this.normalizeIp(req.ip || req.socket.remoteAddress || 'unknown-client');
  }

  public cleanup(): void {
    const now = Date.now();
    for (const [ip, record] of this.records.entries()) {
      if (now >= record.resetTime) {
        this.records.delete(ip);
      }
    }
  }

  public reset(ip?: string): void {
    if (ip) {
      this.records.delete(this.normalizeIp(ip));
    } else {
      this.records.clear();
    }
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.records.clear();
  }

  public getStats() {
    return {
      activeIps: this.records.size,
      windowMs: this.windowMs,
      maxRequests: this.maxRequests,
    };
  }
}

interface QueuedTask {
  resolve: () => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
}

/**
 * Concurrency limiter to prevent hammering external APIs (e.g. TSE)
 * Limits simultaneously active requests, queues the rest up to a max limit,
 * and rejects when saturated to prevent memory exhaustion.
 */
export class ConcurrencyLimiter {
  private activeCount = 0;
  private queue: QueuedTask[] = [];
  private maxConcurrent: number;
  private maxQueueSize: number;
  private queueTimeoutMs: number;

  constructor(maxConcurrent?: number, maxQueueSize?: number, queueTimeoutMs = 15000) {
    const rawConcurrent = maxConcurrent ?? parseInt(process.env.TSE_MAX_CONCURRENT_REQUESTS || '5', 10);
    this.maxConcurrent = Math.max(1, isNaN(rawConcurrent) ? 5 : rawConcurrent);

    const rawQueueSize = maxQueueSize ?? parseInt(process.env.TSE_MAX_QUEUE_SIZE || '100', 10);
    this.maxQueueSize = Math.max(1, isNaN(rawQueueSize) ? 100 : rawQueueSize);

    this.queueTimeoutMs = queueTimeoutMs;
  }

  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (this.activeCount < this.maxConcurrent) {
      this.activeCount++;
      return Promise.resolve();
    }

    if (this.queue.length >= this.maxQueueSize) {
      return Promise.reject(new Error('Fila de requisições simultâneas ao TSE atingiu a capacidade máxima. Tente novamente em instantes.'));
    }

    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.queue.findIndex(item => item.resolve === resolve);
        if (idx !== -1) {
          this.queue.splice(idx, 1);
          reject(new Error('Tempo limite na fila de requisições ao TSE expirou.'));
        }
      }, this.queueTimeoutMs);

      if (timer.unref) timer.unref();

      this.queue.push({
        resolve: () => {
          clearTimeout(timer);
          this.activeCount++;
          resolve();
        },
        reject: (err: Error) => {
          clearTimeout(timer);
          reject(err);
        },
        timer,
      });
    });
  }

  private release(): void {
    this.activeCount = Math.max(0, this.activeCount - 1);
    if (this.queue.length > 0 && this.activeCount < this.maxConcurrent) {
      const next = this.queue.shift();
      if (next) {
        next.resolve();
      }
    }
  }

  public destroy(): void {
    for (const task of this.queue) {
      clearTimeout(task.timer);
      task.reject(new Error('Limitador de concorrência encerrado.'));
    }
    this.queue = [];
    this.activeCount = 0;
  }

  public getStats() {
    return {
      activeRequests: this.activeCount,
      queuedRequests: this.queue.length,
      maxConcurrent: this.maxConcurrent,
      maxQueueSize: this.maxQueueSize,
    };
  }
}

export const globalIpRateLimiter = new IpRateLimiter();
export const globalTseConcurrencyLimiter = new ConcurrencyLimiter();
