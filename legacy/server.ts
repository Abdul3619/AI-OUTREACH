import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

// Services & Registries
import { logger } from './server/services/logging.ts';
import { bootstrapPluginConnectors, bootstrapMicroAgents } from './server/services/registry.ts';
import { startJobScheduler } from './server/services/jobs.ts';

// Routers
import authRouter from './server/routes/auth.ts';
import profileRouter from './server/routes/profile.ts';
import settingsRouter from './server/routes/settings.ts';
import tasksRouter from './server/routes/tasks.ts';
import logsRouter from './server/routes/logs.ts';
import registryRouter from './server/routes/registry.ts';
import leadsRouter from './server/routes/leads.ts';
import proposalsRouter from './server/routes/proposals.ts';
import outreachRouter from './server/routes/outreach.ts';
import integrationsRouter from './server/routes/integrations.ts';
import oauthRouter from './server/routes/oauth.ts';
import phase9Router from './server/routes/phase9.ts';

// Load variables
dotenv.config();

// Environment Verification
logger.info('System', 'Verifying environment parameters...');
const requiredEnv = ['NODE_ENV'];
requiredEnv.forEach(variable => {
  if (!process.env[variable]) {
    logger.warn('System', `Missing non-blocking env variable configuration: ${variable}. Defaulting values.`);
  }
});

// Bootstrap modular registries
bootstrapPluginConnectors();
bootstrapMicroAgents();

// Start Background Job Scheduler
startJobScheduler();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 1. SECURITY MIDDLEWARE
  app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  }));

  // Configure Helmet with friendly sandbox-overrides for iframe previews
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'", "https:", "http:", "data:"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:", "http:"],
        styleSrc: ["'self'", "'unsafe-inline'", "https:", "http:", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "https:", "http:", "referrerpolicy:"],
        fontSrc: ["'self'", "https:", "http:", "data:", "https://fonts.gstatic.com"],
        connectSrc: ["'self'", "https:", "http:", "wss:", "ws:"],
        frameAncestors: ["'self'", "https:", "http:"],
      }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false
  }));

  // JSON payload parser
  app.use(express.json({ limit: '10mb' }));

  // LIGHTWEIGHT RATE LIMITER
  const rateLimitCache = new Map<string, { count: number; lastReset: number }>();
  app.use((req: Request, res: Response, next: NextFunction) => {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const maxRequests = 300; // high threshold for CRM interactivity

    const record = rateLimitCache.get(ip) || { count: 0, lastReset: now };
    
    if (now - record.lastReset > windowMs) {
      record.count = 1;
      record.lastReset = now;
    } else {
      record.count++;
    }
    
    rateLimitCache.set(ip, record);

    if (record.count > maxRequests) {
      logger.warn('RateLimiter', `IP exceeded rate limit window threshold: ${ip}`);
      res.status(429).json({
        status: 'error',
        message: 'Too many requests. Please try again in a minute.'
      });
      return;
    }
    next();
  });

  // INPUT SANITIZATION MIDDLEWARE (Simple recursive XSS cleaner)
  const sanitize = (data: any): any => {
    if (typeof data === 'string') {
      return data.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '').trim();
    }
    if (Array.isArray(data)) {
      return data.map(sanitize);
    }
    if (data !== null && typeof data === 'object') {
      const cleaned: any = {};
      for (const key of Object.keys(data)) {
        cleaned[key] = sanitize(data[key]);
      }
      return cleaned;
    }
    return data;
  };

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.body) req.body = sanitize(req.body);
    if (req.query) req.query = sanitize(req.query);
    next();
  });

  // 2. BACKEND API ROUTERS
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/ready', (req: Request, res: Response) => {
    const dbPath = path.join(process.cwd(), 'database-store.json');
    let dbStatus = 'offline';
    try {
      if (fs.existsSync(dbPath)) {
        fs.accessSync(dbPath, fs.constants.R_OK);
        dbStatus = 'online';
      }
    } catch {}
    
    res.json({
      status: dbStatus === 'online' ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        ai: process.env.GEMINI_API_KEY ? 'online' : 'unconfigured'
      }
    });
  });

  app.get('/api/version', (req: Request, res: Response) => {
    res.json({
      version: '1.1.2',
      build: 'v1.1.2-build.4829',
      sha: 'a6f2478f-production',
      compiledAt: '2026-07-12T00:00:00Z'
    });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/profile', profileRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/tasks', tasksRouter);
  app.use('/api/logs', logsRouter);
  app.use('/api/registry', registryRouter);
  app.use('/api/leads', leadsRouter);
  app.use('/api', proposalsRouter);
  app.use('/api', outreachRouter);
  app.use('/api/integrations', integrationsRouter);
  app.use('/api/oauth', oauthRouter);
  app.use('/api/phase9', phase9Router);

  // 3. VITE MIDDLEWARE OR STATIC ASSETS ROUTING
  if (process.env.NODE_ENV !== 'production') {
    logger.info('System', 'Mounting Vite Dev Server Middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    logger.info('System', 'Serving production static build dist folder assets...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // 4. CENTRALIZED SERVER ERROR HANDLER MIDDLEWARE
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    logger.error('APIError', `Express uncaught router error on path [${req.method} ${req.path}]`, {
      message: err.message,
      stack: err.stack,
    });
    
    res.status(err.status || 500).json({
      status: 'error',
      message: err.message || 'An internal application gateway error occurred.',
      code: err.code || 'INTERNAL_SERVER_ERROR'
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    logger.info('System', `Core Server booted successfully. Listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
