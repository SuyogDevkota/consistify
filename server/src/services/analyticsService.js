import { Membership, TaskCompletion, Task } from '../models/index.js';
import {
  todayInTz,
  daysAgoKey,
  dateKeysBetween,
  addDaysToDateKey,
  isValidDateKey,
  weekdayOfDateKey,
} from '../utils/dateUtils.js';
import { AppError } from '../utils/AppError.js';

const MEMBER_COLORS = ['#6f98ff', '#bd79f4', '#48d7ad', '#ffb765', '#f27ba8', '#69c9e8', '#a78bfa', '#34d399'];

/**
 * Streak policy (group timezone):
 * - A day counts if the member has ≥1 non-undone completion that day.
 * - Current streak counts consecutive days ending at today (or yesterday if today has no activity yet).
 * - Longest streak scans history.
 * - No grace beyond the "today empty → start from yesterday" rule for current streak.
 */
export function computeStreaks(dateKeysWithActivity, timezone) {
  const set = new Set(dateKeysWithActivity);
  const today = todayInTz(timezone);
  let current = 0;
  let cursor = today;
  if (!set.has(today)) {
    cursor = addDaysToDateKey(today, -1);
  }
  while (set.has(cursor)) {
    current += 1;
    cursor = addDaysToDateKey(cursor, -1);
  }

  const sorted = [...set].sort();
  let longest = 0;
  let run = 0;
  let prev = null;
  for (const key of sorted) {
    if (prev && addDaysToDateKey(prev, 1) === key) {
      run += 1;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
    prev = key;
  }
  return { current, longest };
}

async function activeMembers(groupId) {
  const memberships = await Membership.find({ group: groupId, status: 'active' })
    .populate('user', 'name avatarColor')
    .lean();
  return memberships
    .filter((m) => m.user)
    .map((m, i) => ({
      userId: m.user._id.toString(),
      name: m.displayName || m.user.name,
      avatarColor: m.user.avatarColor || MEMBER_COLORS[i % MEMBER_COLORS.length],
      color: MEMBER_COLORS[i % MEMBER_COLORS.length],
      role: m.role,
      membershipId: m._id.toString(),
    }));
}

async function completionsInRange(groupId, from, to, userId = null) {
  const filter = {
    group: groupId,
    undoneAt: null,
    dateKey: { $gte: from, $lte: to },
  };
  if (userId) filter.user = userId;
  return TaskCompletion.find(filter).lean();
}

export async function getPointsSeries(group, { range = 7, mode = 'daily' } = {}) {
  const days = [7, 30, 90].includes(Number(range)) ? Number(range) : 7;
  const tz = group.timezone || 'UTC';
  const end = todayInTz(tz);
  const start = daysAgoKey(days - 1, tz);
  const dates = dateKeysBetween(start, end);
  const members = await activeMembers(group._id);
  const completions = await completionsInRange(group._id, start, end);

  const byUserDay = new Map();
  for (const c of completions) {
    const uid = c.user.toString();
    const key = `${uid}|${c.dateKey}`;
    byUserDay.set(key, (byUserDay.get(key) || 0) + c.pointsAwarded);
  }

  const series = members.map((m) => {
    const daily = dates.map((d) => byUserDay.get(`${m.userId}|${d}`) || 0);
    let values = daily;
    if (mode === 'cumulative') {
      let sum = 0;
      // Include points before the window so cumulative is historically correct
      values = daily.map((v) => {
        sum += v;
        return sum;
      });
    }
    return {
      userId: m.userId,
      name: m.name,
      color: m.color,
      values,
      daily,
    };
  });

  // For cumulative mode, add points earned before the window start
  if (mode === 'cumulative') {
    const prior = await TaskCompletion.aggregate([
      {
        $match: {
          group: group._id,
          undoneAt: null,
          dateKey: { $lt: start },
        },
      },
      { $group: { _id: '$user', points: { $sum: '$pointsAwarded' } } },
    ]);
    const priorMap = new Map(prior.map((p) => [p._id.toString(), p.points]));
    for (const s of series) {
      const base = priorMap.get(s.userId) || 0;
      s.values = s.daily.map((_, i) => base + s.daily.slice(0, i + 1).reduce((a, b) => a + b, 0));
    }
  }

  return { dates, mode, range: days, series };
}

export async function getLeaderboard(group, { period = 'all' } = {}) {
  const tz = group.timezone || 'UTC';
  const today = todayInTz(tz);
  let from = null;
  if (period === 'daily') from = today;
  else if (period === 'weekly') from = daysAgoKey(6, tz);
  else if (period === 'monthly') from = daysAgoKey(29, tz);

  const members = await activeMembers(group._id);
  const filter = { group: group._id, undoneAt: null };
  if (from) filter.dateKey = { $gte: from, $lte: today };

  const periodAgg = await TaskCompletion.aggregate([
    { $match: filter },
    { $group: { _id: '$user', points: { $sum: '$pointsAwarded' }, tasks: { $sum: 1 } } },
  ]);
  const periodMap = new Map(periodAgg.map((r) => [r._id.toString(), r]));

  const allTimeAgg = await TaskCompletion.aggregate([
    { $match: { group: group._id, undoneAt: null } },
    { $group: { _id: '$user', points: { $sum: '$pointsAwarded' } } },
  ]);
  const allTimeMap = new Map(allTimeAgg.map((r) => [r._id.toString(), r.points]));

  const activityDates = await TaskCompletion.aggregate([
    { $match: { group: group._id, undoneAt: null } },
    { $group: { _id: { user: '$user', dateKey: '$dateKey' } } },
  ]);
  const datesByUser = new Map();
  for (const row of activityDates) {
    const uid = row._id.user.toString();
    if (!datesByUser.has(uid)) datesByUser.set(uid, []);
    datesByUser.get(uid).push(row._id.dateKey);
  }

  const ranked = members
    .map((m) => {
      const p = periodMap.get(m.userId);
      const streaks = computeStreaks(datesByUser.get(m.userId) || [], tz);
      return {
        userId: m.userId,
        name: m.name,
        avatarColor: m.avatarColor,
        color: m.color,
        role: m.role,
        periodPoints: p?.points || 0,
        periodTasks: p?.tasks || 0,
        cumulativePoints: allTimeMap.get(m.userId) || 0,
        currentStreak: streaks.current,
        longestStreak: streaks.longest,
      };
    })
    .sort((a, b) => {
      if (b.periodPoints !== a.periodPoints) return b.periodPoints - a.periodPoints;
      if (b.cumulativePoints !== a.cumulativePoints) return b.cumulativePoints - a.cumulativePoints;
      return a.name.localeCompare(b.name);
    })
    .map((row, i) => ({ ...row, rank: i + 1 }));

  return { period, leaderboard: ranked };
}

export async function getStreakInfo(group, userId) {
  const tz = group.timezone || 'UTC';
  const rows = await TaskCompletion.aggregate([
    { $match: { group: group._id, user: userId, undoneAt: null } },
    { $group: { _id: '$dateKey' } },
  ]);
  return computeStreaks(
    rows.map((r) => r._id),
    tz
  );
}

export async function getCategoryStats(group, { range = 30 } = {}) {
  const days = Number(range) || 30;
  const tz = group.timezone || 'UTC';
  const end = todayInTz(tz);
  const start = daysAgoKey(days - 1, tz);

  const tasks = await Task.find({ group: group._id }).populate('category', 'name').lean();
  const taskMap = new Map(tasks.map((t) => [t._id.toString(), t]));

  const completions = await completionsInRange(group._id, start, end);
  const byCat = new Map();
  for (const c of completions) {
    const task = taskMap.get(c.task.toString());
    const name = task?.category?.name || 'Uncategorized';
    const cur = byCat.get(name) || { category: name, points: 0, completions: 0 };
    cur.points += c.pointsAwarded;
    cur.completions += 1;
    byCat.set(name, cur);
  }
  return { range: days, categories: [...byCat.values()].sort((a, b) => b.points - a.points) };
}

export async function getDashboardSummary(group, user) {
  const tz = group.timezone || 'UTC';
  const today = todayInTz(tz);
  const weekStart = daysAgoKey(6, tz);
  const monthStart = daysAgoKey(29, tz);

  const members = await activeMembers(group._id);
  const myCompletionsToday = await TaskCompletion.find({
    group: group._id,
    user: user._id,
    dateKey: today,
    undoneAt: null,
  }).lean();
  const groupCompletionsToday = await TaskCompletion.find({
    group: group._id,
    dateKey: today,
    undoneAt: null,
  }).lean();

  const myPointsToday = myCompletionsToday.reduce((s, c) => s + c.pointsAwarded, 0);
  const groupPointsToday = groupCompletionsToday.reduce((s, c) => s + c.pointsAwarded, 0);

  const myAll = await TaskCompletion.aggregate([
    { $match: { group: group._id, user: user._id, undoneAt: null } },
    {
      $group: {
        _id: null,
        total: { $sum: '$pointsAwarded' },
        week: {
          $sum: { $cond: [{ $gte: ['$dateKey', weekStart] }, '$pointsAwarded', 0] },
        },
        month: {
          $sum: { $cond: [{ $gte: ['$dateKey', monthStart] }, '$pointsAwarded', 0] },
        },
      },
    },
  ]);

  const streaks = await getStreakInfo(group, user._id);
  const taskRows = await Task.find({
    group: group._id,
    archivedAt: null,
    active: true,
  })
    .select('dailyLimit scheduleDays startDate endDate')
    .lean();
  const weekday = weekdayOfDateKey(today);
  const scheduledTasks = taskRows.filter(
    (task) =>
      (!task.startDate || task.startDate <= today) &&
      (!task.endDate || task.endDate >= today) &&
      (task.scheduleDays || [0, 1, 2, 3, 4, 5, 6]).includes(weekday)
  );
  const completionCounts = new Map();
  for (const completion of myCompletionsToday) {
    const taskId = completion.task.toString();
    completionCounts.set(taskId, (completionCounts.get(taskId) || 0) + 1);
  }
  const completedTasks = scheduledTasks.filter(
    (task) => (completionCounts.get(task._id.toString()) || 0) >= (task.dailyLimit || 1)
  ).length;
  const totalCompletionSlots = scheduledTasks.reduce(
    (sum, task) => sum + (task.dailyLimit || 1),
    0
  );
  const completedSlots = scheduledTasks.reduce(
    (sum, task) =>
      sum + Math.min(completionCounts.get(task._id.toString()) || 0, task.dailyLimit || 1),
    0
  );

  const allCompletionsCount = await TaskCompletion.countDocuments({
    group: group._id,
    undoneAt: null,
  });
  const allPointsAgg = await TaskCompletion.aggregate([
    { $match: { group: group._id, undoneAt: null } },
    { $group: { _id: null, total: { $sum: '$pointsAwarded' } } },
  ]);

  return {
    dateKey: today,
    yourPointsToday: myPointsToday,
    yourCompletedToday: myCompletionsToday.length,
    yourCompletedTasks: completedTasks,
    groupPointsToday,
    groupCompletedToday: groupCompletionsToday.length,
    activeTasks: scheduledTasks.length,
    memberCount: members.length,
    yourTotalPoints: myAll[0]?.total || 0,
    yourWeekPoints: myAll[0]?.week || 0,
    yourMonthPoints: myAll[0]?.month || 0,
    currentStreak: streaks.current,
    longestStreak: streaks.longest,
    allTimeGroupPoints: allPointsAgg[0]?.total || 0,
    allTimeCompletions: allCompletionsCount,
    completionPctToday:
      totalCompletionSlots > 0 ? Math.round((completedSlots / totalCompletionSlots) * 100) : 0,
  };
}

export async function getWeeklyMonthlySummary(group, userId) {
  const tz = group.timezone || 'UTC';
  const today = todayInTz(tz);
  const weekStart = daysAgoKey(6, tz);
  const monthStart = daysAgoKey(29, tz);

  const rows = await TaskCompletion.find({
    group: group._id,
    user: userId,
    undoneAt: null,
    dateKey: { $gte: monthStart, $lte: today },
  }).lean();

  const byDay = new Map();
  for (const r of rows) {
    byDay.set(r.dateKey, (byDay.get(r.dateKey) || 0) + r.pointsAwarded);
  }

  let bestDay = null;
  let bestPts = -1;
  for (const [d, pts] of byDay) {
    if (pts > bestPts) {
      bestPts = pts;
      bestDay = d;
    }
  }

  const weekPoints = [...byDay.entries()]
    .filter(([d]) => d >= weekStart)
    .reduce((s, [, p]) => s + p, 0);
  const monthPoints = [...byDay.values()].reduce((s, p) => s + p, 0);

  return {
    weekPoints,
    monthPoints,
    activeDaysThisMonth: byDay.size,
    bestDay: bestDay ? { dateKey: bestDay, points: bestPts } : null,
  };
}

export async function getCalendarMonth(group, userId, year, month) {
  if (!year || !month || month < 1 || month > 12) {
    throw new AppError('Invalid year/month', 400, 'VALIDATION_ERROR');
  }
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endExclusive = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;
  const end = addDaysToDateKey(endExclusive, -1);

  const mine = await TaskCompletion.find({
    group: group._id,
    user: userId,
    undoneAt: null,
    dateKey: { $gte: start, $lte: end },
  }).lean();

  const groupAgg = await TaskCompletion.aggregate([
    {
      $match: {
        group: group._id,
        undoneAt: null,
        dateKey: { $gte: start, $lte: end },
      },
    },
    { $group: { _id: '$dateKey', points: { $sum: '$pointsAwarded' }, count: { $sum: 1 } } },
  ]);

  const myByDay = new Map();
  for (const c of mine) {
    const cur = myByDay.get(c.dateKey) || { points: 0, count: 0 };
    cur.points += c.pointsAwarded;
    cur.count += 1;
    myByDay.set(c.dateKey, cur);
  }

  const days = {};
  for (const g of groupAgg) {
    days[g._id] = {
      groupPoints: g.points,
      groupCompletions: g.count,
      yourPoints: myByDay.get(g._id)?.points || 0,
      yourCompletions: myByDay.get(g._id)?.count || 0,
      hasActivity: true,
    };
  }
  for (const [d, v] of myByDay) {
    if (!days[d]) {
      days[d] = {
        groupPoints: 0,
        groupCompletions: 0,
        yourPoints: v.points,
        yourCompletions: v.count,
        hasActivity: true,
      };
    }
  }

  return { year, month, days };
}

export { MEMBER_COLORS, isValidDateKey };
