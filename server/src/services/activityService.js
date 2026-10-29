import { ActivityLog } from '../models/ActivityLog.js';
import { notifyActivity } from './notificationService.js';
import { logger } from '../utils/logger.js';

export async function logActivity({ groupId, actorId, type, message, meta = {} }) {
  const activity = await ActivityLog.create({
    group: groupId,
    actor: actorId || null,
    type,
    message,
    meta,
  });
  try {
    await notifyActivity(activity);
  } catch (error) {
    logger.error('Failed to create activity notifications', {
      groupId: groupId.toString(),
      type,
      error: error.message,
    });
  }
  return activity;
}

export async function getRecentActivity(groupId, { limit = 20 } = {}) {
  const items = await ActivityLog.find({ group: groupId })
    .sort({ createdAt: -1 })
    .limit(Math.min(limit, 100))
    .populate('actor', 'name avatarColor')
    .lean();

  return items.map((a) => ({
    id: a._id.toString(),
    type: a.type,
    message: a.message,
    meta: a.meta,
    createdAt: a.createdAt,
    actor: a.actor
      ? {
          id: a.actor._id.toString(),
          name: a.actor.name,
          avatarColor: a.actor.avatarColor,
        }
      : null,
  }));
}
