import { Task, TaskCompletion } from '../models/index.js';
import { AppError } from '../utils/AppError.js';
import {
  todayInTz,
  isValidDateKey,
  weekdayOfDateKey,
  addDaysToDateKey,
} from '../utils/dateUtils.js';
import { logActivity } from './activityService.js';

/** Completions allowed for today and yesterday (grace for timezone edge cases). No arbitrary backdating. */
function assertEligibleDate(dateKey, timezone) {
  if (!isValidDateKey(dateKey)) {
    throw new AppError('Invalid date', 400, 'INVALID_DATE');
  }
  const today = todayInTz(timezone);
  const yesterday = addDaysToDateKey(today, -1);
  if (dateKey !== today && dateKey !== yesterday) {
    throw new AppError(
      'Completions are only allowed for today or yesterday (grace period)',
      400,
      'DATE_NOT_ELIGIBLE'
    );
  }
}

function taskScheduledOn(task, dateKey) {
  if (task.startDate && dateKey < task.startDate) return false;
  if (task.endDate && dateKey > task.endDate) return false;
  const wd = weekdayOfDateKey(dateKey);
  return (task.scheduleDays || [0, 1, 2, 3, 4, 5, 6]).includes(wd);
}

export async function completeTask(group, membership, user, taskId, { dateKey } = {}) {
  const tz = group.timezone || 'UTC';
  const day = dateKey || todayInTz(tz);
  assertEligibleDate(day, tz);

  const task = await Task.findOne({
    _id: taskId,
    group: group._id,
    archivedAt: null,
    active: true,
  });
  if (!task) throw new AppError('Task not found or inactive', 404, 'NOT_FOUND');
  if (!taskScheduledOn(task, day)) {
    throw new AppError('Task is not scheduled for this day', 400, 'NOT_SCHEDULED');
  }

  let completion;
  for (let attempt = 0; attempt <= task.dailyLimit; attempt += 1) {
    const activeCount = await TaskCompletion.countDocuments({
      group: group._id,
      user: user._id,
      task: task._id,
      dateKey: day,
      undoneAt: null,
    });
    if (activeCount >= task.dailyLimit) {
      throw new AppError('Daily completion limit reached', 409, 'DAILY_LIMIT_REACHED');
    }

    const latest = await TaskCompletion.findOne({
      group: group._id,
      user: user._id,
      task: task._id,
      dateKey: day,
    })
      .sort({ occurrence: -1 })
      .select('occurrence')
      .lean();
    try {
      completion = await TaskCompletion.create({
        group: group._id,
        task: task._id,
        user: user._id,
        membership: membership._id,
        dateKey: day,
        occurrence: (latest?.occurrence || 0) + 1,
        pointsAwarded: task.points,
        taskNameSnapshot: task.name,
      });
      break;
    } catch (err) {
      if (err.code !== 11000) throw err;
      if (attempt === task.dailyLimit) {
        throw new AppError('Could not record completion; please retry', 409, 'COMPLETION_CONFLICT');
      }
    }
  }

  await logActivity({
    groupId: group._id,
    actorId: user._id,
    type: 'task_completed',
    message: `${user.name} completed ${task.name}`,
    meta: {
      taskId: task._id.toString(),
      points: task.points,
      dateKey: day,
    },
  });

  return serializeCompletion(completion);
}

export async function undoCompletion(
  group,
  membership,
  user,
  taskId,
  { dateKey, occurrence } = {}
) {
  const tz = group.timezone || 'UTC';
  const day = dateKey || todayInTz(tz);
  assertEligibleDate(day, tz);

  const filter = {
    group: group._id,
    user: user._id,
    task: taskId,
    dateKey: day,
    undoneAt: null,
  };
  if (occurrence !== undefined) filter.occurrence = occurrence;
  const completion = await TaskCompletion.findOne(filter).sort({ occurrence: -1 });
  if (!completion) throw new AppError('Completion not found', 404, 'NOT_FOUND');

  completion.undoneAt = new Date();
  completion.undoneBy = user._id;
  await completion.save();

  await logActivity({
    groupId: group._id,
    actorId: user._id,
    type: 'task_undone',
    message: `${user.name} undid completion of ${completion.taskNameSnapshot}`,
    meta: {
      taskId: String(taskId),
      points: completion.pointsAwarded,
      dateKey: day,
    },
  });

  return serializeCompletion(completion);
}

export async function getDailyChecklist(group, user, dateKey) {
  const tz = group.timezone || 'UTC';
  const day = dateKey || todayInTz(tz);
  if (!isValidDateKey(day)) throw new AppError('Invalid date', 400, 'INVALID_DATE');

  const tasks = await Task.find({
    group: group._id,
    archivedAt: null,
    active: true,
  })
    .populate('category', 'name')
    .sort({ order: 1 })
    .lean();

  const completions = await TaskCompletion.find({
    group: group._id,
    user: user._id,
    dateKey: day,
    undoneAt: null,
  }).lean();
  const doneMap = new Map();
  for (const completion of completions) {
    const taskId = completion.task.toString();
    const records = doneMap.get(taskId) || [];
    records.push(completion);
    doneMap.set(taskId, records);
  }

  const scheduled = tasks.filter((t) => taskScheduledOn(t, day));
  let pointsToday = 0;
  const items = scheduled.map((t) => {
    const done = doneMap.get(t._id.toString()) || [];
    const pointsAwarded = done.reduce((sum, completion) => sum + completion.pointsAwarded, 0);
    if (done.length) pointsToday += pointsAwarded;
    return {
      id: t._id.toString(),
      name: t.name,
      description: t.description || '',
      icon: t.icon,
      points: t.points,
      category: t.category
        ? { id: t.category._id.toString(), name: t.category.name }
        : null,
      completed: done.length >= t.dailyLimit,
      completionCount: done.length,
      dailyLimit: t.dailyLimit,
      pointsAwarded,
      latestOccurrence: done.length
        ? Math.max(...done.map((completion) => completion.occurrence))
        : null,
    };
  });

  return {
    dateKey: day,
    pointsToday,
    completedCount: items.filter((i) => i.completed).length,
    totalCount: items.length,
    tasks: items,
  };
}

export async function getDayHistory(group, user, dateKey) {
  const tz = group.timezone || 'UTC';
  const day = dateKey || todayInTz(tz);
  if (!isValidDateKey(day)) throw new AppError('Invalid date', 400, 'INVALID_DATE');

  const yours = await TaskCompletion.find({
    group: group._id,
    user: user._id,
    dateKey: day,
    undoneAt: null,
  })
    .sort({ createdAt: 1 })
    .lean();

  const groupAgg = await TaskCompletion.aggregate([
    { $match: { group: group._id, dateKey: day, undoneAt: null } },
    {
      $group: {
        _id: null,
        points: { $sum: '$pointsAwarded' },
        completions: { $sum: 1 },
        members: { $addToSet: '$user' },
      },
    },
  ]);

  return {
    dateKey: day,
    yours: yours.map(serializeCompletion),
    groupPoints: groupAgg[0]?.points || 0,
    groupCompletions: groupAgg[0]?.completions || 0,
    activeMembers: groupAgg[0]?.members?.length || 0,
  };
}

export async function getPersonalHistory(group, user, { from, to, limit = 100 } = {}) {
  const filter = {
    group: group._id,
    user: user._id,
    undoneAt: null,
  };
  if (from || to) {
    filter.dateKey = {};
    if (from) filter.dateKey.$gte = from;
    if (to) filter.dateKey.$lte = to;
  }
  const rows = await TaskCompletion.find(filter)
    .sort({ dateKey: -1, createdAt: -1 })
    .limit(Math.min(limit, 500))
    .lean();
  return rows.map(serializeCompletion);
}

function serializeCompletion(c) {
  const row = c.toObject ? c.toObject() : c;
  return {
    id: row._id.toString(),
    taskId: row.task.toString(),
    userId: row.user.toString(),
    dateKey: row.dateKey,
    occurrence: row.occurrence,
    pointsAwarded: row.pointsAwarded,
    taskName: row.taskNameSnapshot,
    undoneAt: row.undoneAt,
    createdAt: row.createdAt,
  };
}
