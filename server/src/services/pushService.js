import webPush from 'web-push';
import { env } from '../config/env.js';
import { PushSubscription } from '../models/PushSubscription.js';
import { logger } from '../utils/logger.js';

if (env.pushConfigured) {
  webPush.setVapidDetails(
    env.pushVapidSubject,
    env.pushVapidPublicKey,
    env.pushVapidPrivateKey
  );
}

const trustedPushHosts = [
  'fcm.googleapis.com',
  'updates.push.services.mozilla.com',
  'web.push.apple.com',
];

export function isTrustedPushEndpoint(endpoint) {
  let url;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return false;
  return trustedPushHosts.some(
    (host) => url.hostname === host || url.hostname.endsWith(`.${host}`)
  );
}

export async function savePushSubscription(userId, subscription) {
  if (!env.pushConfigured) return false;
  if (!isTrustedPushEndpoint(subscription.endpoint)) {
    return false;
  }
  await PushSubscription.findOneAndUpdate(
    { endpoint: subscription.endpoint },
    {
      $set: {
        user: userId,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        expirationTime: subscription.expirationTime
          ? new Date(subscription.expirationTime)
          : null,
      },
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );
  return true;
}

export async function sendPushToUser(userId, notification) {
  if (!env.pushConfigured) return;
  const subscriptions = await PushSubscription.find({ user: userId }).lean();
  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: subscription.keys,
          },
          JSON.stringify({
            title: notification.title,
            body: notification.message,
            url: notification.url,
            tag: notification.id,
          }),
          { TTL: 60 * 60 }
        );
      } catch (error) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          await PushSubscription.deleteOne({ _id: subscription._id });
          return;
        }
        logger.warn('Browser push delivery failed', {
          userId: userId.toString(),
          statusCode: error.statusCode || null,
        });
      }
    })
  );
}
