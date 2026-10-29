import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const pushVapidPublicKey = process.env.PUSH_VAPID_PUBLIC_KEY || '';
const pushVapidPrivateKey = process.env.PUSH_VAPID_PRIVATE_KEY || '';
const pushVapidSubject = process.env.PUSH_VAPID_SUBJECT || '';
const pushVapidValues = [pushVapidPublicKey, pushVapidPrivateKey, pushVapidSubject];
const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME || '';
const cloudinaryApiKey = process.env.CLOUDINARY_API_KEY || '';
const cloudinaryApiSecret = process.env.CLOUDINARY_API_SECRET || '';
const cloudinaryValues = [cloudinaryCloudName, cloudinaryApiKey, cloudinaryApiSecret];

if (pushVapidValues.some(Boolean) && pushVapidValues.some((value) => !value)) {
  throw new Error(
    'PUSH_VAPID_PUBLIC_KEY, PUSH_VAPID_PRIVATE_KEY, and PUSH_VAPID_SUBJECT must be set together'
  );
}
if (cloudinaryValues.some(Boolean) && cloudinaryValues.some((value) => !value)) {
  throw new Error(
    'CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET must be set together'
  );
}

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
  pushVapidPublicKey,
  pushVapidPrivateKey,
  pushVapidSubject,
  pushConfigured: pushVapidValues.every(Boolean),
  cloudinaryCloudName,
  cloudinaryApiKey,
  cloudinaryApiSecret,
  mediaConfigured: cloudinaryValues.every(Boolean),
};
