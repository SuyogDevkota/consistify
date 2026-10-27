import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import { doubleCsrf } from 'csrf-csrf';
import { env } from './config/env.js';
import apiRoutes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const clientDistPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../client/dist'
);

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(
    cors({
      origin: env.clientUrl,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(mongoSanitize());
  if (env.nodeEnv !== 'test') {
    app.use(morgan(env.isProd ? 'combined' : 'dev'));
  }

  app.use(
    rateLimit({
      windowMs: env.rateLimitWindowMs,
      max: env.rateLimitMax,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  const { generateToken, doubleCsrfProtection } = doubleCsrf({
    getSecret: () => env.csrfSecret,
    getSessionIdentifier: (req) => req.cookies?.accessToken || req.ip || 'anon',
    cookieName: 'csrfToken',
    cookieOptions: {
      httpOnly: false,
      sameSite: env.cookieSameSite,
      secure: env.cookieSecure,
      path: '/',
    },
    getTokenFromRequest: (req) => req.headers['x-csrf-token'],
  });

  app.get('/api/v1/csrf', (req, res) => {
    res.set('Cache-Control', 'no-store');
    const token = generateToken(req, res, false, false);
    res.json({ success: true, data: { csrfToken: token } });
  });

  // CSRF for cookie-authenticated mutating requests (skip auth login/register/refresh)
  app.use('/api/v1', (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const path = req.path || '';
    const skip =
      path === '/auth/login' ||
      path === '/auth/register' ||
      path === '/auth/refresh' ||
      path === '/auth/logout' ||
      path === '/csrf' ||
      path === '/health';
    if (skip) return next();
    // Only enforce when an access cookie is present (authenticated mutations)
    if (!req.cookies?.accessToken) return next();
    return doubleCsrfProtection(req, res, next);
  });

  app.use('/api/v1', apiRoutes);

  if (env.isProd) {
    app.use(express.static(clientDistPath));
    app.get('*', (req, res, next) => {
      if (req.path === '/api' || req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
        if (err) next(err);
      });
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
