import * as groupService from '../services/groupService.js';
import { getRecentActivity } from '../services/activityService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const create = asyncHandler(async (req, res) => {
  const result = await groupService.createGroup(req.user, req.body);
  res.status(201).json({ success: true, data: result });
});

export const listMine = asyncHandler(async (req, res) => {
  const groups = await groupService.listMyGroups(req.user._id);
  res.json({ success: true, data: { groups } });
});

export const getOne = asyncHandler(async (req, res) => {
  const details = await groupService.getGroupDetails(req.group, req.membership);
  res.json({ success: true, data: { group: details } });
});

export const update = asyncHandler(async (req, res) => {
  const group = await groupService.updateGroup(req.group, req.user, req.body);
  res.json({ success: true, data: { group } });
});

export const remove = asyncHandler(async (req, res) => {
  await groupService.deleteGroup(req.group, req.user);
  res.json({ success: true, data: { ok: true } });
});

export const leave = asyncHandler(async (req, res) => {
  await groupService.leaveGroup(req.group, req.membership, req.user);
  res.json({ success: true, data: { ok: true } });
});

export const listMembers = asyncHandler(async (req, res) => {
  const { members, pending } = await groupService.listMembers(req.group, req.membership);
  res.json({ success: true, data: { members, pending } });
});

export const approveMember = asyncHandler(async (req, res) => {
  await groupService.approveMember(req.group, req.user, req.params.userId);
  res.json({ success: true, data: { ok: true } });
});

export const rejectMember = asyncHandler(async (req, res) => {
  await groupService.rejectMember(req.group, req.user, req.params.userId);
  res.json({ success: true, data: { ok: true } });
});

export const changeRole = asyncHandler(async (req, res) => {
  await groupService.changeMemberRole(
    req.group,
    req.membership,
    req.user,
    req.params.userId,
    req.body.role
  );
  res.json({ success: true, data: { ok: true } });
});

export const transfer = asyncHandler(async (req, res) => {
  await groupService.transferOwnership(req.group, req.user, req.body.newOwnerUserId);
  res.json({ success: true, data: { ok: true } });
});

export const removeMember = asyncHandler(async (req, res) => {
  await groupService.removeMember(req.group, req.membership, req.user, req.params.userId);
  res.json({ success: true, data: { ok: true } });
});

export const createInvite = asyncHandler(async (req, res) => {
  const invitation = await groupService.createInvitation(req.group, req.user, req.body);
  res.status(201).json({ success: true, data: { invitation } });
});

export const listInvites = asyncHandler(async (req, res) => {
  const invitations = await groupService.listInvitations(req.group._id);
  res.json({ success: true, data: { invitations } });
});

export const revokeInvite = asyncHandler(async (req, res) => {
  await groupService.revokeInvitation(req.group._id, req.params.inviteId, req.user);
  res.json({ success: true, data: { ok: true } });
});

export const validateInvite = asyncHandler(async (req, res) => {
  const info = await groupService.validateInvitation(req.body);
  res.json({ success: true, data: info });
});

export const join = asyncHandler(async (req, res) => {
  const result = await groupService.joinWithInvitation(req.user, req.body);
  res.json({ success: true, data: result });
});

export const activity = asyncHandler(async (req, res) => {
  const items = await getRecentActivity(req.group._id, {
    limit: Number(req.query.limit) || 20,
  });
  res.json({ success: true, data: { activity: items } });
});
