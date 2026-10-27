import { ActivityLog } from '../models/ActivityLog.js';

export async function logActivity({ groupId, actorId, type, message, meta = {} }) {
  return ActivityLog.create({
    group: groupId,
    actor: actorId || null,
    type,
    message,
    meta,
  });
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
