import * as authService from '../services/authService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

function meta(req) {
  return { userAgent: req.get('user-agent') || '', ip: req.ip };
}

export const register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body, res, meta(req));
  res.status(201).json({ success: true, data: { user } });
});

export const login = asyncHandler(async (req, res) => {
  const user = await authService.login(req.body, res, meta(req));
  res.json({ success: true, data: { user } });
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req, res);
  res.json({ success: true, data: { ok: true } });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: req.user.toSafeJSON() } });
});

export const refresh = asyncHandler(async (req, res) => {
  const user = await authService.refreshSession(req, res, meta(req));
  res.json({ success: true, data: { user } });
});

export const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(req.user._id, req.body);
  res.json({
    success: true,
    data: { ok: true, message: 'Password updated. Please sign in again on other devices.' },
  });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await authService.updateProfile(req.user._id, req.body);
  res.json({ success: true, data: { user } });
});

export const deleteAccount = asyncHandler(async (req, res) => {
  await authService.deleteAccount(req.user._id, req.body);
  await authService.logout(req, res);
  res.json({
    success: true,
    data: {
      ok: true,
      policy:
        'Account soft-deleted. Profile PII removed. Shared group completion history retained anonymously for group integrity.',
    },
  });
});
