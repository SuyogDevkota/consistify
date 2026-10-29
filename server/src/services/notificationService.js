import { Membership } from '../models/Membership.js';
import { Notification } from '../models/Notification.js';
import { PushSubscription } from '../models/PushSubscription.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { sendPushToUser, savePushSubscription } from './pushService.js';

function notificationContent({ type, message, meta = {} }) {
  const titles = {
    task_completed: 'A teammate completed a task',
    task_undone: 'A task completion was undone',
    task_created: 'A new community task',
    task_updated: 'A community task was updated',
    task_archived: 'A community task was archived',
    member_joined: 'Someone joined your community',
    member_left: 'A member left your community',
    member_removed: 'A member was removed',
    role_changed: 'A member role changed',
    ownership_transferred: 'Community ownership changed',
    group_updated: 'Your community was updated',
    invite_created: 'A new invitation was created',
    invite_revoked: 'An invitation was revoked',
  };
  let body = message;
  if (type === 'task_completed' && Number.isFinite(meta.points)) {
    body = `${message} · +${meta.points} pts. Keep the momentum going!`;
  } else if (type === 'member_joined') {
    body = `${message}. Say hello and keep each other going!`;
  } else if (type === 'task_created') {
    body = `${message}. You can add it to your daily routine.`;
  }
  return { title: titles[type] || 'Community update', message: body };
}

export async function notifyActivity(activity) {
  const recipients = await Membership.find({
    group: activity.group,
    user: { $ne: activity.actor },
    status: 'active',
    notifyTaskCompletions: true,
  })
    .select('user browserPushEnabled')
    .lean();
  if (!recipients.length) return;

  const content = notificationContent(activity);
  const created = await Notification.insertMany(
    recipients.map(({ user }) => ({
      group: activity.group,
      user,
      type: activity.type,
      title: content.title,
      message: content.message,
      actorName: '',
      taskName: '',
      points: activity.meta?.points ?? null,
      url: '/app',
    }))
  );

  const pushRecipients = recipients.filter((recipient) => recipient.browserPushEnabled);
  if (!env.pushConfigured || !pushRecipients.length) return;

  const pushByUser = new Map(pushRecipients.map(({ user }) => [user.toString(), user]));
  for (const notification of created) {
    const userId = notification.user.toString();
    if (!pushByUser.has(userId)) continue;
    void sendPushToUser(userId, {
      id: notification._id.toString(),
      title: notification.title,
      message: notification.message,
      url: notification.url,
    }).catch((error) => {
      logger.error('Failed to send browser push notification', {
        userId,
        error: error.message,
      });
    });
  }
}

export async function getInbox(groupId, userId) {
  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ group: groupId, user: userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
    Notification.countDocuments({ group: groupId, user: userId, readAt: null }),
  ]);
  const membership = await Membership.findOne({ group: groupId, user: userId, status: 'active' })
    .select('notifyTaskCompletions browserPushEnabled')
    .lean();

  return {
    notifications: notifications.map((item) => ({
      id: item._id.toString(),
      type: item.type || 'task_completed',
      title: item.title || 'A teammate completed a task',
      message:
        item.message ||
        `${item.actorName || 'A member'} completed ${item.taskName || 'a task'} · +${item.points || 0} pts`,
      actorName: item.actorName,
      taskName: item.taskName,
      points: item.points,
      read: Boolean(item.readAt),
      createdAt: item.createdAt,
    })),
    unreadCount,
    groupActivityEnabled: membership?.notifyTaskCompletions || false,
    browserPushEnabled: membership?.browserPushEnabled || false,
    pushConfigured: env.pushConfigured,
    pushPublicKey: env.pushConfigured ? env.pushVapidPublicKey : null,
  };
}

export async function updatePreferences(groupId, userId, { groupActivityEnabled, browserPushEnabled }) {
  const membership = await Membership.findOne({ group: groupId, user: userId, status: 'active' });
  if (!membership) return null;

  if (groupActivityEnabled !== undefined) {
    membership.notifyTaskCompletions = groupActivityEnabled;
    if (!groupActivityEnabled) membership.browserPushEnabled = false;
  }
  if (browserPushEnabled !== undefined) {
    if (browserPushEnabled) {
      const subscription = await PushSubscription.exists({ user: userId });
      if (!env.pushConfigured || !subscription) {
        return { error: 'PUSH_NOT_READY' };
      }
    }
    membership.browserPushEnabled = browserPushEnabled;
  }
  await membership.save();
  return {
    groupActivityEnabled: membership.notifyTaskCompletions,
    browserPushEnabled: membership.browserPushEnabled,
  };
}

export async function registerSubscription(groupId, userId, subscription) {
  const membership = await Membership.findOne({ group: groupId, user: userId, status: 'active' });
  if (!membership) return false;
  const saved = await savePushSubscription(userId, subscription);
  if (!saved) return false;
  membership.browserPushEnabled = true;
  await membership.save();
  return true;
}

export async function unregisterSubscription(groupId, userId, endpoint) {
  await Membership.updateOne(
    { group: groupId, user: userId, status: 'active' },
    { $set: { browserPushEnabled: false } }
  );
  const otherEnabledMemberships = await Membership.exists({
    user: userId,
    status: 'active',
    browserPushEnabled: true,
    group: { $ne: groupId },
  });
  if (!otherEnabledMemberships) {
    await PushSubscription.deleteOne({ user: userId, endpoint });
  }
  return { shouldUnsubscribe: !otherEnabledMemberships };
}

export async function markRead(groupId, userId, notificationId) {
  return Notification.findOneAndUpdate(
    { _id: notificationId, group: groupId, user: userId, readAt: null },
    { $set: { readAt: new Date() } },
    { new: true }
  );
}

export async function markAllRead(groupId, userId) {
  const result = await Notification.updateMany(
    { group: groupId, user: userId, readAt: null },
    { $set: { readAt: new Date() } }
  );
  return result.modifiedCount;
}
