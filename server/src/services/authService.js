import { User } from '../models/User.js';
import { Membership } from '../models/Membership.js';
import { AppError } from '../utils/AppError.js';
import {
  signAccessToken,
  createRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  setAuthCookies,
  clearAuthCookies,
} from './tokenService.js';

export async function register({ name, email, password }, res, meta) {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new AppError('An account with that email already exists', 409, 'DUPLICATE_EMAIL');
  }
  const passwordHash = await User.hashPassword(password);
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
  });
  await issueSession(user, res, meta);
  return user.toSafeJSON();
}

export async function login({ email, password }, res, meta) {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user || user.deletedAt) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }
  const ok = await user.comparePassword(password);
  if (!ok) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }
  await issueSession(user, res, meta);
  return user.toSafeJSON();
}

export async function logout(req, res) {
  await revokeRefreshToken(req.cookies?.refreshToken);
  clearAuthCookies(res);
}

export async function refreshSession(req, res, meta) {
  const raw = req.cookies?.refreshToken;
  if (!raw) throw new AppError('No refresh session', 401, 'UNAUTHORIZED');
  const rotated = await rotateRefreshToken(raw, meta);
  if (!rotated) {
    clearAuthCookies(res);
    throw new AppError('Invalid or expired session', 401, 'UNAUTHORIZED');
  }
  const user = await User.findById(rotated.userId);
  if (!user || user.deletedAt) {
    clearAuthCookies(res);
    throw new AppError('Invalid or expired session', 401, 'UNAUTHORIZED');
  }
  const accessToken = signAccessToken(user._id.toString());
  setAuthCookies(res, accessToken, rotated.raw, rotated.expiresAt);
  return user.toSafeJSON();
}

async function issueSession(user, res, meta) {
  const accessToken = signAccessToken(user._id.toString());
  const refresh = await createRefreshToken(user._id.toString(), meta);
  setAuthCookies(res, accessToken, refresh.raw, refresh.expiresAt);
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');
  const ok = await user.comparePassword(currentPassword);
  if (!ok) throw new AppError('Current password is incorrect', 400, 'INVALID_PASSWORD');
  user.passwordHash = await User.hashPassword(newPassword);
  await user.save();
  await revokeAllUserTokens(userId);
}

export async function updateProfile(userId, data) {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');
  if (data.name) user.name = data.name;
  if (data.avatarColor) user.avatarColor = data.avatarColor;
  await user.save();
  return user.toSafeJSON();
}

/**
 * Soft-delete account. Memberships marked left. Ownership must be transferred first
 * if the user is the sole owner of any group.
 */
export async function deleteAccount(userId, { password }) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');
  const ok = await user.comparePassword(password);
  if (!ok) throw new AppError('Password is incorrect', 400, 'INVALID_PASSWORD');

  const owned = await Membership.find({
    user: userId,
    role: 'owner',
    status: 'active',
  });
  for (const m of owned) {
    const otherOwners = await Membership.countDocuments({
      group: m.group,
      role: 'owner',
      status: 'active',
      user: { $ne: userId },
    });
    if (otherOwners === 0) {
      throw new AppError(
        'Transfer ownership of your groups before deleting your account. Data retention: your completion history in shared groups is anonymized after account deletion; personal profile data is soft-deleted.',
        400,
        'OWNERSHIP_BLOCK'
      );
    }
  }

  await Membership.updateMany(
    { user: userId, status: 'active' },
    { $set: { status: 'left', leftAt: new Date() } }
  );
  user.deletedAt = new Date();
  user.email = `deleted_${user._id}@deleted.local`;
  user.name = 'Deleted User';
  await user.save();
  await revokeAllUserTokens(userId);
}
