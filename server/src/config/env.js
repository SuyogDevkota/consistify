import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT || 5000),
  mongoUri: required('MONGODB_URI', 'mongodb://127.0.0.1:27017/consistify'),
  clientUrl: required('CLIENT_URL', 'http://localhost:5173'),
  jwtAccessSecret: required('JWT_ACCESS_SECRET', 'dev-access-secret-consistify-32chars!!'),
  jwtRefreshSecret: required('JWT_REFRESH_SECRET', 'dev-refresh-secret-consistify-32chars!'),
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || '15m',
  refreshTokenTtl: process.env.REFRESH_TOKEN_TTL || '7d',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  cookieSameSite: process.env.COOKIE_SAME_SITE || 'lax',
  csrfSecret: required('CSRF_SECRET', 'dev-csrf-secret-consistify-32chars-ok'),
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 900000),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 100),
  authRateLimitMax: Number(process.env.AUTH_RATE_LIMIT_MAX || 20),
};
