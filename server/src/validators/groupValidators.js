import Joi from 'joi';
import { ROLES } from '../utils/permissions.js';

export const createGroupSchema = Joi.object({
  name: Joi.string().trim().min(1).max(80).required(),
  description: Joi.string().trim().allow('').max(500).default(''),
  rules: Joi.string().trim().allow('').max(2000).default(''),
  color: Joi.string().trim().max(32).default('#6490ff'),
  icon: Joi.string().trim().max(8).default('↗'),
  timezone: Joi.string().trim().max(64).default('UTC'),
  requireJoinApproval: Joi.boolean().default(false),
});

export const updateGroupSchema = Joi.object({
  name: Joi.string().trim().min(1).max(80),
  description: Joi.string().trim().allow('').max(500),
  rules: Joi.string().trim().allow('').max(2000),
  color: Joi.string().trim().max(32),
  icon: Joi.string().trim().max(8),
  timezone: Joi.string().trim().max(64),
  requireJoinApproval: Joi.boolean(),
}).min(1);

export const createInviteSchema = Joi.object({
  expiresInHours: Joi.number().integer().min(1).max(24 * 90).default(168),
  maxUses: Joi.number().integer().min(1).max(10000).allow(null).default(null),
});

export const joinInviteSchema = Joi.object({
  token: Joi.string().trim().min(10).max(128),
  code: Joi.string().trim().uppercase().length(6),
}).xor('token', 'code');

export const changeRoleSchema = Joi.object({
  role: Joi.string()
    .valid(ROLES.OWNER, ROLES.ADMIN, ROLES.MEMBER)
    .required(),
});

export const transferOwnershipSchema = Joi.object({
  newOwnerUserId: Joi.string().hex().length(24).required(),
});
