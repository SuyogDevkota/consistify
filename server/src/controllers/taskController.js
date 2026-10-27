import * as taskService from '../services/taskService.js';
import * as completionService from '../services/completionService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listCategories = asyncHandler(async (req, res) => {
  const categories = await taskService.listCategories(req.group._id, {
    includeArchived: req.query.includeArchived === 'true',
  });
  res.json({ success: true, data: { categories } });
});

export const createCategory = asyncHandler(async (req, res) => {
  const category = await taskService.createCategory(req.group, req.user, req.body);
  res.status(201).json({ success: true, data: { category } });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const category = await taskService.updateCategory(req.group._id, req.params.categoryId, req.body);
  res.json({ success: true, data: { category } });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  await taskService.deleteCategory(req.group._id, req.params.categoryId);
  res.json({ success: true, data: { ok: true } });
});

export const listTasks = asyncHandler(async (req, res) => {
  const tasks = await taskService.listTasks(req.group._id, {
    includeArchived: req.query.includeArchived === 'true',
    activeOnly: req.query.activeOnly === 'true',
  });
  res.json({ success: true, data: { tasks } });
});

export const createTask = asyncHandler(async (req, res) => {
  const task = await taskService.createTask(req.group, req.user, req.body);
  res.status(201).json({ success: true, data: { task } });
});

export const updateTask = asyncHandler(async (req, res) => {
  const task = await taskService.updateTask(req.group, req.user, req.params.taskId, req.body);
  res.json({ success: true, data: { task } });
});

export const archiveTask = asyncHandler(async (req, res) => {
  const task = await taskService.archiveTask(req.group, req.user, req.params.taskId);
  res.json({ success: true, data: { task } });
});

export const complete = asyncHandler(async (req, res) => {
  const completion = await completionService.completeTask(
    req.group,
    req.membership,
    req.user,
    req.params.taskId,
    req.body
  );
  res.status(201).json({ success: true, data: { completion } });
});

export const undo = asyncHandler(async (req, res) => {
  const completion = await completionService.undoCompletion(
    req.group,
    req.membership,
    req.user,
    req.params.taskId,
    req.body
  );
  res.json({ success: true, data: { completion } });
});

export const checklist = asyncHandler(async (req, res) => {
  const checklist = await completionService.getDailyChecklist(
    req.group,
    req.user,
    req.query.dateKey
  );
  res.json({ success: true, data: checklist });
});

export const history = asyncHandler(async (req, res) => {
  if (req.query.dateKey) {
    const day = await completionService.getDayHistory(req.group, req.user, req.query.dateKey);
    res.json({ success: true, data: day });
    return;
  }
  const history = await completionService.getPersonalHistory(req.group, req.user, {
    from: req.query.from,
    to: req.query.to,
    limit: Number(req.query.limit) || 100,
  });
  res.json({ success: true, data: { history } });
});
