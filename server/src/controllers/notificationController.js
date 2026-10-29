import * as notificationService from '../services/notificationService.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { env } from '../config/env.js';

export const inbox = asyncHandler(async (req, res) => {
  const data = await notificationService.getInbox(req.group._id, req.user._id);
  res.json({ success: true, data });
});

export const updatePreferences = asyncHandler(async (req, res) => {
  const preferences = await notificationService.updatePreferences(
    req.group._id,
    req.user._id,
    req.body
  );
  if (!preferences) throw new AppError('Membership not found', 404, 'NOT_FOUND');
  if (preferences.error === 'PUSH_NOT_READY') {
    throw new AppError('Enable browser push by subscribing this browser first', 400, 'PUSH_NOT_READY');
  }
  res.json({ success: true, data: preferences });
});

export const subscribe = asyncHandler(async (req, res) => {
  if (!env.pushConfigured) {
    throw new AppError('Browser push is not configured on this server', 503, 'PUSH_UNAVAILABLE');
  }
  const saved = await notificationService.registerSubscription(
    req.group._id,
    req.user._id,
    req.body
  );
  if (!saved) throw new AppError('Invalid browser push endpoint', 400, 'INVALID_PUSH_SUBSCRIPTION');
  res.status(201).json({ success: true, data: { browserPushEnabled: true } });
});

export const unsubscribe = asyncHandler(async (req, res) => {
  const result = await notificationService.unregisterSubscription(
    req.group._id,
    req.user._id,
    req.body.endpoint
  );
  res.json({ success: true, data: { browserPushEnabled: false, ...result } });
});

export const markRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markRead(
    req.group._id,
    req.user._id,
    req.params.notificationId
  );
  if (!notification) {
    throw new AppError('Notification not found', 404, 'NOT_FOUND');
  }
  res.json({ success: true, data: { ok: true } });
});

export const markAllRead = asyncHandler(async (req, res) => {
  const modifiedCount = await notificationService.markAllRead(req.group._id, req.user._id);
  res.json({ success: true, data: { modifiedCount } });
});
