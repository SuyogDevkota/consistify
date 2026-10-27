import { Membership } from '../models/Membership.js';
import { Group } from '../models/Group.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { hasPermission } from '../utils/permissions.js';

export function requireGroupMember(paramName = 'groupId') {
  return asyncHandler(async (req, res, next) => {
    const groupId = req.params[paramName] || req.body.groupId || req.query.groupId;
    if (!groupId) throw new AppError('Group id required', 400, 'VALIDATION_ERROR');

    const group = await Group.findById(groupId);
    if (!group || group.archivedAt) {
      throw new AppError('Group not found', 404, 'NOT_FOUND');
    }

    const membership = await Membership.findOne({
      group: groupId,
      user: req.user._id,
      status: 'active',
    });
    if (!membership) {
      throw new AppError('You are not a member of this group', 403, 'FORBIDDEN');
    }

    req.group = group;
    req.membership = membership;
    next();
  });
}

export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.membership) {
      return next(new AppError('Membership required', 403, 'FORBIDDEN'));
    }
    if (!hasPermission(req.membership.role, permission)) {
      return next(new AppError('Insufficient permissions', 403, 'FORBIDDEN'));
    }
    return next();
  };
}
