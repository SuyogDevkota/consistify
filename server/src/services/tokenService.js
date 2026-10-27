import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { RefreshToken } from '../models/RefreshToken.js';

function parseDurationMs(ttl) {
  const match = /^(\d+)([smhd])$/.exec(ttl);
  if (!match) return 15 * 60 * 1000;
  const n = Number(match[1]);
  const unit = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[match[2]];
  return n * unit;
}

export function signAccessToken(userId) {
  return jwt.sign({ sub: userId }, env.jwtAccessSecret, { expiresIn: env.accessTokenTtl });
}

export async function createRefreshToken(userId, meta = {}) {
  const raw = crypto.randomBytes(48).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
  const expiresAt = new Date(Date.now() + parseDurationMs(env.refreshTokenTtl));
  await RefreshToken.create({
    user: userId,
    tokenHash,
    expiresAt,
    userAgent: meta.userAgent || '',
    ip: meta.ip || '',
  });
  return { raw, expiresAt };
}

export async function rotateRefreshToken(rawToken, meta = {}) {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const existing = await RefreshToken.findOne({ tokenHash });
  if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
    return null;
  }
  existing.revokedAt = new Date();
  await existing.save();
  const next = await createRefreshToken(existing.user.toString(), meta);
  return { userId: existing.user.toString(), ...next };
}

export async function revokeRefreshToken(rawToken) {
  if (!rawToken) return;
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  await RefreshToken.updateOne({ tokenHash }, { $set: { revokedAt: new Date() } });
}

export async function revokeAllUserTokens(userId) {
  await RefreshToken.updateMany(
    { user: userId, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
}

export function cookieOptions(maxAgeMs) {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSameSite,
    path: '/',
    maxAge: maxAgeMs,
  };
}

export function setAuthCookies(res, accessToken, refreshToken, refreshExpiresAt) {
  const accessMs = parseDurationMs(env.accessTokenTtl);
  const refreshMs = refreshExpiresAt
    ? Math.max(0, refreshExpiresAt.getTime() - Date.now())
    : parseDurationMs(env.refreshTokenTtl);

  res.cookie('accessToken', accessToken, cookieOptions(accessMs));
  res.cookie('refreshToken', refreshToken, {
    ...cookieOptions(refreshMs),
    path: '/api/v1/auth',
  });
}

export function clearAuthCookies(res) {
  const base = {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSameSite,
  };
  res.clearCookie('accessToken', { ...base, path: '/' });
  res.clearCookie('refreshToken', { ...base, path: '/api/v1/auth' });
  res.clearCookie('csrfToken', { ...base, path: '/', httpOnly: false });
}
