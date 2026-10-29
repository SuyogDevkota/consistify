import { Router } from 'express';
import Joi from 'joi';
import * as notificationController from '../controllers/notificationController.js';
import { authenticate } from '../middleware/auth.js';
import { requireGroupMember } from '../middleware/groupAuth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

const preferencesSchema = Joi.object({
  groupActivityEnabled: Joi.boolean(),
  browserPushEnabled: Joi.boolean(),
}).min(1);
const subscriptionSchema = Joi.object({
  endpoint: Joi.string().uri({ scheme: ['https'] }).max(2048).required(),
  expirationTime: Joi.number().integer().positive().allow(null).optional(),
  keys: Joi.object({
    p256dh: Joi.string().min(20).max(200).required(),
    auth: Joi.string().min(10).max(100).required(),
  }).required(),
});
const unsubscribeSchema = Joi.object({
  endpoint: Joi.string().uri({ scheme: ['https'] }).max(2048).required(),
});

router.use(authenticate);
router.get('/:groupId', requireGroupMember('groupId'), notificationController.inbox);
router.put(
  '/:groupId/preferences',
  requireGroupMember('groupId'),
  validate(preferencesSchema),
  notificationController.updatePreferences
);
router.post(
  '/:groupId/subscriptions',
  requireGroupMember('groupId'),
  validate(subscriptionSchema),
  notificationController.subscribe
);
router.delete(
  '/:groupId/subscriptions',
  requireGroupMember('groupId'),
  validate(unsubscribeSchema),
  notificationController.unsubscribe
);
router.post('/:groupId/read-all', requireGroupMember('groupId'), notificationController.markAllRead);
router.post(
  '/:groupId/:notificationId/read',
  requireGroupMember('groupId'),
  notificationController.markRead
);

export default router;
