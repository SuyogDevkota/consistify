import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const authenticate = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.accessToken;
  if (!token) {
    throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwtAccessSecret);
  } catch {
    throw new AppError('Invalid or expired session', 401, 'UNAUTHORIZED');
  }

  const user = await User.findById(payload.sub);
  if (!user || user.deletedAt) {
    throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
  }

  req.user = user;
  req.auth = { userId: user._id.toString() };
  next();
});

export const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.accessToken;
  if (!token) return next();
  try {
    const payload = jwt.verify(token, env.jwtAccessSecret);
    const user = await User.findById(payload.sub);
    if (user && !user.deletedAt) {
      req.user = user;
      req.auth = { userId: user._id.toString() };
    }
  } catch {
    /* ignore */
  }
  next();
});
