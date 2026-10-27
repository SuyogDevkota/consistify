import { Category, Task } from '../models/index.js';
import { AppError } from '../utils/AppError.js';
import { logActivity } from './activityService.js';

export async function listCategories(groupId, { includeArchived = false } = {}) {
  const filter = { group: groupId };
  if (!includeArchived) filter.archivedAt = null;
  const cats = await Category.find(filter).sort({ order: 1, name: 1 }).lean();
  return cats.map(serializeCategory);
}

export async function createCategory(group, user, data) {
  const cat = await Category.create({
    group: group._id,
    name: data.name,
    order: data.order ?? 0,
  });
  return serializeCategory(cat);
}

export async function updateCategory(groupId, categoryId, data) {
  const cat = await Category.findOne({ _id: categoryId, group: groupId });
  if (!cat) throw new AppError('Category not found', 404, 'NOT_FOUND');
  if (data.name !== undefined) cat.name = data.name;
  if (data.order !== undefined) cat.order = data.order;
  if (data.archived === true) cat.archivedAt = new Date();
  if (data.archived === false) cat.archivedAt = null;
  await cat.save();
  return serializeCategory(cat);
}

export async function deleteCategory(groupId, categoryId) {
  const cat = await Category.findOne({ _id: categoryId, group: groupId });
  if (!cat) throw new AppError('Category not found', 404, 'NOT_FOUND');
  const taskCount = await Task.countDocuments({
    category: categoryId,
    archivedAt: null,
  });
  if (taskCount > 0) {
    throw new AppError('Archive or reassign tasks before deleting this category', 400, 'CATEGORY_IN_USE');
  }
  cat.archivedAt = new Date();
  await cat.save();
}

export async function listTasks(groupId, { includeArchived = false, activeOnly = false } = {}) {
  const filter = { group: groupId };
  if (!includeArchived) filter.archivedAt = null;
  if (activeOnly) filter.active = true;
  const tasks = await Task.find(filter)
    .populate('category', 'name')
    .sort({ order: 1, createdAt: 1 })
    .lean();
  return tasks.map(serializeTask);
}

export async function createTask(group, user, data) {
  if (data.categoryId) {
    const cat = await Category.findOne({ _id: data.categoryId, group: group._id, archivedAt: null });
    if (!cat) throw new AppError('Category not found', 404, 'NOT_FOUND');
  }
  const task = await Task.create({
    group: group._id,
    category: data.categoryId || null,
    name: data.name,
    description: data.description || '',
    icon: data.icon || '✦',
    points: data.points,
    dailyLimit: data.dailyLimit ?? 1,
    scheduleDays: data.scheduleDays,
    startDate: data.startDate || null,
    endDate: data.endDate || null,
    notes: data.notes || '',
    order: data.order ?? 0,
    createdBy: user._id,
  });
  await logActivity({
    groupId: group._id,
    actorId: user._id,
    type: 'task_created',
    message: `${user.name} created task "${task.name}"`,
    meta: { taskId: task._id.toString(), points: task.points },
  });
  const populated = await Task.findById(task._id).populate('category', 'name');
  return serializeTask(populated);
}

export async function updateTask(group, user, taskId, data) {
  const task = await Task.findOne({ _id: taskId, group: group._id });
  if (!task) throw new AppError('Task not found', 404, 'NOT_FOUND');

  if (data.categoryId !== undefined) {
    if (data.categoryId) {
      const cat = await Category.findOne({ _id: data.categoryId, group: group._id, archivedAt: null });
      if (!cat) throw new AppError('Category not found', 404, 'NOT_FOUND');
    }
    task.category = data.categoryId;
  }

  const fields = [
    'name',
    'description',
    'icon',
    'points',
    'dailyLimit',
    'scheduleDays',
    'startDate',
    'endDate',
    'notes',
    'order',
    'active',
  ];
  for (const f of fields) {
    if (data[f] !== undefined) task[f] = data[f];
  }
  if (data.archived === true) task.archivedAt = new Date();
  if (data.archived === false) task.archivedAt = null;

  await task.save();
  await logActivity({
    groupId: group._id,
    actorId: user._id,
    type: data.archived ? 'task_archived' : 'task_updated',
    message: `${user.name} updated task "${task.name}"`,
    meta: {
      taskId: task._id.toString(),
      note: 'Point value changes affect future completions only; historical awards are preserved.',
    },
  });
  const populated = await Task.findById(task._id).populate('category', 'name');
  return serializeTask(populated);
}

export async function archiveTask(group, user, taskId) {
  return updateTask(group, user, taskId, { archived: true, active: false });
}

function serializeCategory(cat) {
  const c = cat.toObject ? cat.toObject() : cat;
  return {
    id: c._id.toString(),
    name: c.name,
    order: c.order,
    archivedAt: c.archivedAt,
  };
}

function serializeTask(task) {
  const t = task.toObject ? task.toObject() : task;
  return {
    id: t._id.toString(),
    name: t.name,
    description: t.description || '',
    icon: t.icon,
    points: t.points,
    active: t.active,
    dailyLimit: t.dailyLimit,
    scheduleDays: t.scheduleDays,
    startDate: t.startDate,
    endDate: t.endDate,
    notes: t.notes || '',
    order: t.order,
    archivedAt: t.archivedAt,
    category: t.category
      ? {
          id: (t.category._id || t.category).toString(),
          name: t.category.name || null,
        }
      : null,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}
