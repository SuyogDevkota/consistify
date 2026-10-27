import { Group, Membership, Invitation, Category, Task, User } from '../models/index.js';
import { AppError } from '../utils/AppError.js';
import { ROLES, PERMISSIONS, canManageRole, hasPermission, roleRank } from '../utils/permissions.js';
import { logActivity } from './activityService.js';

const DEFAULT_CATEGORIES = ['Study', 'Reading', 'Coding', 'Fitness', 'Personal'];
const DEFAULT_TASKS = [
  { name: 'Physics', category: 'Study', points: 10 },
  { name: 'Chemistry', category: 'Study', points: 10 },
  { name: 'Biology', category: 'Study', points: 10 },
  { name: 'Maths', category: 'Study', points: 10 },
];

export async function createGroup(user, data) {
  const group = await Group.create({
    name: data.name,
    description: data.description || '',
    rules: data.rules || '',
    color: data.color || '#6490ff',
    icon: data.icon || '↗',
    timezone: data.timezone || 'UTC',
    requireJoinApproval: Boolean(data.requireJoinApproval),
    owner: user._id,
  });

  await Membership.create({
    group: group._id,
    user: user._id,
    role: ROLES.OWNER,
    displayName: user.name,
    status: 'active',
  });

  const cats = {};
  for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
    const cat = await Category.create({
      group: group._id,
      name: DEFAULT_CATEGORIES[i],
      order: i,
    });
    cats[DEFAULT_CATEGORIES[i]] = cat;
  }

  for (let i = 0; i < DEFAULT_TASKS.length; i++) {
    const t = DEFAULT_TASKS[i];
    await Task.create({
      group: group._id,
      category: cats[t.category]._id,
      name: t.name,
      points: t.points,
      createdBy: user._id,
      order: i,
    });
  }

  const invite = await createInvitationDoc(group._id, user._id, { expiresInHours: 168 });

  await logActivity({
    groupId: group._id,
    actorId: user._id,
    type: 'group_updated',
    message: `${user.name} created the group`,
    meta: { event: 'created' },
  });

  return {
    group: serializeGroup(group),
    invitation: {
      code: invite.code,
      token: invite.plainToken,
      expiresAt: invite.expiresAt,
    },
  };
}

async function createInvitationDoc(groupId, userId, opts) {
  const token = Invitation.generateToken();
  const tokenHash = Invitation.hashToken(token);
  const code = Invitation.generateCode();
  const expiresAt = new Date(Date.now() + (opts.expiresInHours || 168) * 3600 * 1000);
  const invite = await Invitation.create({
    group: groupId,
    createdBy: userId,
    tokenHash,
    code,
    expiresAt,
    maxUses: opts.maxUses ?? null,
  });
  invite.plainToken = token;
  return invite;
}

export async function listMyGroups(userId) {
  const memberships = await Membership.find({ user: userId, status: 'active' })
    .populate('group')
    .lean();
  return memberships
    .filter((m) => m.group && !m.group.archivedAt)
    .map((m) => ({
      ...serializeGroup(m.group),
      role: m.role,
      membershipId: m._id.toString(),
    }));
}

function serializeMember(m, { includeEmail = false } = {}) {
  return {
    id: m.user._id.toString(),
    membershipId: m._id.toString(),
    name: m.displayName || m.user.name,
    ...(includeEmail ? { email: m.user.email } : {}),
    avatarColor: m.user.avatarColor,
    role: m.role,
    status: m.status,
    joinedAt: m.joinedAt,
  };
}

export async function listMembers(group, membership) {
  const canManage = hasPermission(membership.role, PERMISSIONS.MANAGE_MEMBERS);
  const statuses = canManage ? ['active', 'pending'] : ['active'];
  const rows = await Membership.find({ group: group._id, status: { $in: statuses } })
    .populate('user', 'name email avatarColor')
    .lean();

  return {
    members: rows
      .filter((m) => m.status === 'active' && m.user)
      .map((m) => serializeMember(m, { includeEmail: canManage })),
    pending: canManage
      ? rows.filter((m) => m.status === 'pending' && m.user).map((m) => serializeMember(m, { includeEmail: true }))
      : [],
  };
}

export async function getGroupDetails(group, membership) {
  const { members, pending } = await listMembers(group, membership);
  return {
    ...serializeGroup(group),
    role: membership.role,
    members,
    pending,
  };
}

export async function updateGroup(group, user, data) {
  Object.assign(group, data);
  await group.save();
  await logActivity({
    groupId: group._id,
    actorId: user._id,
    type: 'group_updated',
    message: `${user.name} updated group settings`,
  });
  return serializeGroup(group);
}

export async function deleteGroup(group, user) {
  group.archivedAt = new Date();
  await group.save();
  await Membership.updateMany(
    { group: group._id, status: 'active' },
    { $set: { status: 'left', leftAt: new Date() } }
  );
  await Invitation.updateMany(
    { group: group._id, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
  await logActivity({
    groupId: group._id,
    actorId: user._id,
    type: 'group_updated',
    message: `${user.name} archived the group`,
    meta: { event: 'archived' },
  });
}

export async function createInvitation(group, user, opts) {
  const invite = await createInvitationDoc(group._id, user._id, opts);
  await logActivity({
    groupId: group._id,
    actorId: user._id,
    type: 'invite_created',
    message: `${user.name} created an invitation`,
  });
  return {
    id: invite._id.toString(),
    code: invite.code,
    token: invite.plainToken,
    expiresAt: invite.expiresAt,
    maxUses: invite.maxUses,
    useCount: invite.useCount,
  };
}

export async function listInvitations(groupId) {
  const invites = await Invitation.find({
    group: groupId,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .lean();
  return invites.map((i) => ({
    id: i._id.toString(),
    code: i.code,
    expiresAt: i.expiresAt,
    maxUses: i.maxUses,
    useCount: i.useCount,
    createdAt: i.createdAt,
  }));
}

export async function revokeInvitation(groupId, inviteId, user) {
  const invite = await Invitation.findOne({ _id: inviteId, group: groupId });
  if (!invite) throw new AppError('Invitation not found', 404, 'NOT_FOUND');
  invite.revokedAt = new Date();
  await invite.save();
  await logActivity({
    groupId,
    actorId: user._id,
    type: 'invite_revoked',
    message: `${user.name} revoked an invitation`,
  });
}

export async function validateInvitation({ token, code }) {
  let invite;
  if (token) {
    const tokenHash = Invitation.hashToken(token);
    invite = await Invitation.findOne({ tokenHash }).populate('group');
  } else {
    invite = await Invitation.findOne({ code: code.toUpperCase() })
      .sort({ createdAt: -1 })
      .populate('group');
  }
  if (!invite) throw new AppError('Invitation not found', 404, 'INVALID_INVITE');
  const usable = invite.isUsable();
  if (!usable.ok) {
    throw new AppError(`Invitation is ${usable.reason}`, 400, `INVITE_${usable.reason.toUpperCase()}`);
  }
  if (!invite.group || invite.group.archivedAt) {
    throw new AppError('Group not found', 404, 'NOT_FOUND');
  }
  return {
    groupName: invite.group.name,
    groupId: invite.group._id.toString(),
    expiresAt: invite.expiresAt,
    requireJoinApproval: invite.group.requireJoinApproval,
  };
}

export async function joinWithInvitation(user, { token, code }) {
  let invite;
  if (token) {
    invite = await Invitation.findOne({ tokenHash: Invitation.hashToken(token) }).populate('group');
  } else {
    invite = await Invitation.findOne({ code: code.toUpperCase() })
      .sort({ createdAt: -1 })
      .populate('group');
  }
  if (!invite) throw new AppError('Invitation not found', 404, 'INVALID_INVITE');
  const usable = invite.isUsable();
  if (!usable.ok) {
    throw new AppError(`Invitation is ${usable.reason}`, 400, `INVITE_${usable.reason.toUpperCase()}`);
  }
  const group = invite.group;
  if (!group || group.archivedAt) throw new AppError('Group not found', 404, 'NOT_FOUND');

  let membership = await Membership.findOne({ group: group._id, user: user._id });
  if (membership?.status === 'active') {
    return { group: serializeGroup(group), membership, alreadyMember: true, pending: false };
  }
  if (membership?.status === 'pending') {
    return { group: serializeGroup(group), membership, alreadyMember: false, pending: true };
  }

  const status = group.requireJoinApproval ? 'pending' : 'active';
  if (membership) {
    membership.status = status;
    membership.role = ROLES.MEMBER;
    membership.leftAt = null;
    membership.joinedAt = new Date();
    membership.displayName = user.name;
    await membership.save();
  } else {
    membership = await Membership.create({
      group: group._id,
      user: user._id,
      role: ROLES.MEMBER,
      displayName: user.name,
      status,
    });
  }

  invite.useCount += 1;
  await invite.save();

  if (status === 'active') {
    await logActivity({
      groupId: group._id,
      actorId: user._id,
      type: 'member_joined',
      message: `${user.name} joined the group`,
    });
  }

  return {
    group: serializeGroup(group),
    membership,
    alreadyMember: false,
    pending: status === 'pending',
  };
}

export async function leaveGroup(group, membership, user) {
  if (membership.role === ROLES.OWNER) {
    const owners = await Membership.countDocuments({
      group: group._id,
      role: ROLES.OWNER,
      status: 'active',
    });
    if (owners <= 1) {
      throw new AppError(
        'Transfer ownership before leaving as the last owner',
        400,
        'LAST_OWNER'
      );
    }
  }
  membership.status = 'left';
  membership.leftAt = new Date();
  await membership.save();
  await logActivity({
    groupId: group._id,
    actorId: user._id,
    type: 'member_left',
    message: `${user.name} left the group`,
  });
}

export async function changeMemberRole(group, actorMembership, actor, targetUserId, newRole) {
  if (newRole === ROLES.OWNER) {
    throw new AppError('Use transfer ownership to assign owner', 400, 'USE_TRANSFER');
  }
  const target = await Membership.findOne({
    group: group._id,
    user: targetUserId,
    status: 'active',
  });
  if (!target) throw new AppError('Member not found', 404, 'NOT_FOUND');

  if (actorMembership.role !== ROLES.OWNER) {
    if (
      !canManageRole(actorMembership.role, target.role) ||
      !canManageRole(actorMembership.role, newRole)
    ) {
      throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
    }
  }

  if (target.role === ROLES.OWNER && newRole !== ROLES.OWNER) {
    const owners = await Membership.countDocuments({
      group: group._id,
      role: ROLES.OWNER,
      status: 'active',
    });
    if (owners <= 1) {
      throw new AppError('Cannot demote the last owner', 400, 'LAST_OWNER');
    }
  }

  const prev = target.role;
  target.role = newRole;
  await target.save();
  await logActivity({
    groupId: group._id,
    actorId: actor._id,
    type: 'role_changed',
    message: `${actor.name} changed a member role from ${prev} to ${newRole}`,
    meta: { targetUserId, prev, newRole },
  });
  return target;
}

export async function transferOwnership(group, actor, newOwnerUserId) {
  const target = await Membership.findOne({
    group: group._id,
    user: newOwnerUserId,
    status: 'active',
  });
  if (!target) throw new AppError('Member not found', 404, 'NOT_FOUND');

  const currentOwner = await Membership.findOne({
    group: group._id,
    user: actor._id,
    status: 'active',
    role: ROLES.OWNER,
  });
  if (!currentOwner) throw new AppError('Only the owner can transfer ownership', 403, 'FORBIDDEN');

  currentOwner.role = ROLES.ADMIN;
  target.role = ROLES.OWNER;
  group.owner = target.user;
  await Promise.all([currentOwner.save(), target.save(), group.save()]);

  await logActivity({
    groupId: group._id,
    actorId: actor._id,
    type: 'ownership_transferred',
    message: `${actor.name} transferred ownership`,
    meta: { newOwnerUserId },
  });
}

export async function approveMember(group, actor, targetUserId) {
  const target = await Membership.findOne({ group: group._id, user: targetUserId });
  if (!target || target.status !== 'pending') {
    throw new AppError('No pending join request for that user', 404, 'NOT_PENDING');
  }
  target.status = 'active';
  target.joinedAt = new Date();
  await target.save();
  const targetUser = await User.findById(targetUserId);
  await logActivity({
    groupId: group._id,
    actorId: actor._id,
    type: 'member_joined',
    message: `${targetUser?.name || 'A member'} was approved and joined the group`,
  });
  return target;
}

export async function rejectMember(group, actor, targetUserId) {
  const target = await Membership.findOne({ group: group._id, user: targetUserId });
  if (!target || target.status !== 'pending') {
    throw new AppError('No pending join request for that user', 404, 'NOT_PENDING');
  }
  target.status = 'removed';
  target.leftAt = new Date();
  await target.save();
  await logActivity({
    groupId: group._id,
    actorId: actor._id,
    type: 'member_removed',
    message: `${actor.name} declined a join request`,
    meta: { targetUserId },
  });
}

export async function removeMember(group, actorMembership, actor, targetUserId) {
  const target = await Membership.findOne({
    group: group._id,
    user: targetUserId,
    status: 'active',
  });
  if (!target) throw new AppError('Member not found', 404, 'NOT_FOUND');
  if (target.role === ROLES.OWNER) {
    throw new AppError('Cannot remove the owner', 400, 'CANNOT_REMOVE_OWNER');
  }
  if (actorMembership.role !== ROLES.OWNER && !canManageRole(actorMembership.role, target.role)) {
    throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
  }
  target.status = 'removed';
  target.leftAt = new Date();
  await target.save();
  const targetUser = await User.findById(targetUserId);
  await logActivity({
    groupId: group._id,
    actorId: actor._id,
    type: 'member_removed',
    message: `${actor.name} removed ${targetUser?.name || 'a member'}`,
  });
}

function serializeGroup(group) {
  const g = group.toObject ? group.toObject() : group;
  return {
    id: g._id.toString(),
    name: g.name,
    description: g.description || '',
    rules: g.rules || '',
    color: g.color,
    icon: g.icon,
    timezone: g.timezone,
    requireJoinApproval: g.requireJoinApproval,
    ownerId: String(g.owner),
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
  };
}

export { serializeGroup, roleRank };
