/**
 * Central permission matrix for group roles.
 * Owner > Admin > Member
 */

export const ROLES = Object.freeze({
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
});

const ROLE_RANK = {
  [ROLES.OWNER]: 3,
  [ROLES.ADMIN]: 2,
  [ROLES.MEMBER]: 1,
};

export const PERMISSIONS = Object.freeze({
  VIEW_GROUP: 'view_group',
  UPDATE_GROUP: 'update_group',
  DELETE_GROUP: 'delete_group',
  MANAGE_INVITES: 'manage_invites',
  MANAGE_MEMBERS: 'manage_members',
  CHANGE_ROLES: 'change_roles',
  TRANSFER_OWNERSHIP: 'transfer_ownership',
  MANAGE_CATEGORIES: 'manage_categories',
  MANAGE_TASKS: 'manage_tasks',
  COMPLETE_OWN_TASKS: 'complete_own_tasks',
  VIEW_ANALYTICS: 'view_analytics',
  VIEW_ACTIVITY: 'view_activity',
});

const ROLE_PERMISSIONS = {
  [ROLES.OWNER]: Object.values(PERMISSIONS),
  [ROLES.ADMIN]: [
    PERMISSIONS.VIEW_GROUP,
    PERMISSIONS.UPDATE_GROUP,
    PERMISSIONS.MANAGE_INVITES,
    PERMISSIONS.MANAGE_MEMBERS,
    PERMISSIONS.MANAGE_CATEGORIES,
    PERMISSIONS.MANAGE_TASKS,
    PERMISSIONS.COMPLETE_OWN_TASKS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.VIEW_ACTIVITY,
  ],
  [ROLES.MEMBER]: [
    PERMISSIONS.VIEW_GROUP,
    PERMISSIONS.COMPLETE_OWN_TASKS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.VIEW_ACTIVITY,
  ],
};

export function hasPermission(role, permission) {
  return (ROLE_PERMISSIONS[role] || []).includes(permission);
}

export function canManageRole(actorRole, targetRole) {
  return (ROLE_RANK[actorRole] || 0) > (ROLE_RANK[targetRole] || 0);
}

export function roleRank(role) {
  return ROLE_RANK[role] || 0;
}
