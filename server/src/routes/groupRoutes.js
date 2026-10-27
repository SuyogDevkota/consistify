import { Router } from 'express';
import * as groupController from '../controllers/groupController.js';
import * as taskController from '../controllers/taskController.js';
import * as analyticsController from '../controllers/analyticsController.js';
import { authenticate } from '../middleware/auth.js';
import { requireGroupMember, requirePermission } from '../middleware/groupAuth.js';
import { validate } from '../middleware/validate.js';
import {
  createGroupSchema,
  updateGroupSchema,
  createInviteSchema,
  joinInviteSchema,
  changeRoleSchema,
  transferOwnershipSchema,
} from '../validators/groupValidators.js';
import {
  createCategorySchema,
  updateCategorySchema,
  createTaskSchema,
  updateTaskSchema,
  completeTaskSchema,
} from '../validators/taskValidators.js';
import { PERMISSIONS } from '../utils/permissions.js';

const router = Router();

router.use(authenticate);

router.post('/', validate(createGroupSchema), groupController.create);
router.get('/', groupController.listMine);
router.post('/join', validate(joinInviteSchema), groupController.join);
router.post('/invitations/validate', validate(joinInviteSchema), groupController.validateInvite);

router.use('/:groupId', requireGroupMember('groupId'));

router.get('/:groupId', requirePermission(PERMISSIONS.VIEW_GROUP), groupController.getOne);
router.patch(
  '/:groupId',
  requirePermission(PERMISSIONS.UPDATE_GROUP),
  validate(updateGroupSchema),
  groupController.update
);
router.delete('/:groupId', requirePermission(PERMISSIONS.DELETE_GROUP), groupController.remove);
router.post('/:groupId/leave', groupController.leave);

router.get('/:groupId/members', requirePermission(PERMISSIONS.VIEW_GROUP), groupController.listMembers);
router.post(
  '/:groupId/members/:userId/approve',
  requirePermission(PERMISSIONS.MANAGE_MEMBERS),
  groupController.approveMember
);
router.post(
  '/:groupId/members/:userId/reject',
  requirePermission(PERMISSIONS.MANAGE_MEMBERS),
  groupController.rejectMember
);
router.patch(
  '/:groupId/members/:userId/role',
  requirePermission(PERMISSIONS.CHANGE_ROLES),
  validate(changeRoleSchema),
  groupController.changeRole
);
router.post(
  '/:groupId/transfer-ownership',
  requirePermission(PERMISSIONS.TRANSFER_OWNERSHIP),
  validate(transferOwnershipSchema),
  groupController.transfer
);
router.delete(
  '/:groupId/members/:userId',
  requirePermission(PERMISSIONS.MANAGE_MEMBERS),
  groupController.removeMember
);

router.post(
  '/:groupId/invitations',
  requirePermission(PERMISSIONS.MANAGE_INVITES),
  validate(createInviteSchema),
  groupController.createInvite
);
router.get(
  '/:groupId/invitations',
  requirePermission(PERMISSIONS.MANAGE_INVITES),
  groupController.listInvites
);
router.delete(
  '/:groupId/invitations/:inviteId',
  requirePermission(PERMISSIONS.MANAGE_INVITES),
  groupController.revokeInvite
);

router.get('/:groupId/activity', requirePermission(PERMISSIONS.VIEW_ACTIVITY), groupController.activity);

// Categories
router.get('/:groupId/categories', requirePermission(PERMISSIONS.VIEW_GROUP), taskController.listCategories);
router.post(
  '/:groupId/categories',
  requirePermission(PERMISSIONS.MANAGE_CATEGORIES),
  validate(createCategorySchema),
  taskController.createCategory
);
router.patch(
  '/:groupId/categories/:categoryId',
  requirePermission(PERMISSIONS.MANAGE_CATEGORIES),
  validate(updateCategorySchema),
  taskController.updateCategory
);
router.delete(
  '/:groupId/categories/:categoryId',
  requirePermission(PERMISSIONS.MANAGE_CATEGORIES),
  taskController.deleteCategory
);

// Tasks
router.get('/:groupId/tasks', requirePermission(PERMISSIONS.VIEW_GROUP), taskController.listTasks);
router.post(
  '/:groupId/tasks',
  requirePermission(PERMISSIONS.MANAGE_TASKS),
  validate(createTaskSchema),
  taskController.createTask
);
router.patch(
  '/:groupId/tasks/:taskId',
  requirePermission(PERMISSIONS.MANAGE_TASKS),
  validate(updateTaskSchema),
  taskController.updateTask
);
router.delete(
  '/:groupId/tasks/:taskId',
  requirePermission(PERMISSIONS.MANAGE_TASKS),
  taskController.archiveTask
);

// Completions
router.get('/:groupId/checklist', requirePermission(PERMISSIONS.COMPLETE_OWN_TASKS), taskController.checklist);
router.get('/:groupId/history', requirePermission(PERMISSIONS.VIEW_GROUP), taskController.history);
router.post(
  '/:groupId/tasks/:taskId/complete',
  requirePermission(PERMISSIONS.COMPLETE_OWN_TASKS),
  validate(completeTaskSchema),
  taskController.complete
);
router.post(
  '/:groupId/tasks/:taskId/undo',
  requirePermission(PERMISSIONS.COMPLETE_OWN_TASKS),
  validate(completeTaskSchema),
  taskController.undo
);

// Analytics
router.get(
  '/:groupId/analytics/summary',
  requirePermission(PERMISSIONS.VIEW_ANALYTICS),
  analyticsController.summary
);
router.get(
  '/:groupId/analytics/daily',
  requirePermission(PERMISSIONS.VIEW_ANALYTICS),
  analyticsController.dailySeries
);
router.get(
  '/:groupId/analytics/cumulative',
  requirePermission(PERMISSIONS.VIEW_ANALYTICS),
  analyticsController.cumulativeSeries
);
router.get(
  '/:groupId/analytics/leaderboard',
  requirePermission(PERMISSIONS.VIEW_ANALYTICS),
  analyticsController.leaderboard
);
router.get(
  '/:groupId/analytics/streaks',
  requirePermission(PERMISSIONS.VIEW_ANALYTICS),
  analyticsController.streaks
);
router.get(
  '/:groupId/analytics/categories',
  requirePermission(PERMISSIONS.VIEW_ANALYTICS),
  analyticsController.categories
);
router.get(
  '/:groupId/analytics/period-summary',
  requirePermission(PERMISSIONS.VIEW_ANALYTICS),
  analyticsController.periodSummary
);
router.get(
  '/:groupId/analytics/calendar',
  requirePermission(PERMISSIONS.VIEW_ANALYTICS),
  analyticsController.calendar
);

export default router;
