import { createAgent, registerUser, createGroup, csrfHeaders } from './helpers.js';
import { computeStreaks } from '../src/services/analyticsService.js';
import { todayInTz, addDaysToDateKey } from '../src/utils/dateUtils.js';

describe('Completions, points, analytics', () => {
  async function setupTwoMembers() {
    const owner = createAgent();
    await registerUser(owner, { name: 'Alice' });
    const created = await createGroup(owner, { name: 'Points Club', timezone: 'UTC' });
    const groupId = created.body.data.group.id;
    const code = created.body.data.invitation.code;

    const member = createAgent();
    await registerUser(member, { name: 'Bob' });
    const headers = await csrfHeaders(member);
    await member.post('/api/v1/groups/join').set(headers).send({ code });

    const tasks = await owner.get(`/api/v1/groups/${groupId}/tasks`);
    return { owner, member, groupId, tasks: tasks.body.data.tasks };
  }

  test('independent completions and duplicate prevention', async () => {
    const { owner, member, groupId, tasks } = await setupTwoMembers();
    const taskId = tasks[0].id;

    let headers = await csrfHeaders(owner);
    const c1 = await owner
      .post(`/api/v1/groups/${groupId}/tasks/${taskId}/complete`)
      .set(headers)
      .send({});
    expect(c1.status).toBe(201);
    expect(c1.body.data.completion.pointsAwarded).toBe(tasks[0].points);

    headers = await csrfHeaders(owner);
    const dup = await owner
      .post(`/api/v1/groups/${groupId}/tasks/${taskId}/complete`)
      .set(headers)
      .send({});
    expect(dup.status).toBe(409);

    headers = await csrfHeaders(member);
    const c2 = await member
      .post(`/api/v1/groups/${groupId}/tasks/${taskId}/complete`)
      .set(headers)
      .send({});
    expect(c2.status).toBe(201);

    const checkA = await owner.get(`/api/v1/groups/${groupId}/checklist`);
    const checkB = await member.get(`/api/v1/groups/${groupId}/checklist`);
    expect(checkA.body.data.tasks.find((t) => t.id === taskId).completed).toBe(true);
    expect(checkB.body.data.tasks.find((t) => t.id === taskId).completed).toBe(true);
  });

  test('undo reverses points', async () => {
    const { owner, groupId, tasks } = await setupTwoMembers();
    const taskId = tasks[0].id;
    let headers = await csrfHeaders(owner);
    await owner.post(`/api/v1/groups/${groupId}/tasks/${taskId}/complete`).set(headers).send({});
    headers = await csrfHeaders(owner);
    const undo = await owner
      .post(`/api/v1/groups/${groupId}/tasks/${taskId}/undo`)
      .set(headers)
      .send({});
    expect(undo.status).toBe(200);

    const summary = await owner.get(`/api/v1/groups/${groupId}/analytics/summary`);
    expect(summary.body.data.yourPointsToday).toBe(0);
  });

  test('daily and cumulative series and leaderboard', async () => {
    const { owner, member, groupId, tasks } = await setupTwoMembers();
    let headers = await csrfHeaders(owner);
    const o1 = await owner
      .post(`/api/v1/groups/${groupId}/tasks/${tasks[0].id}/complete`)
      .set(headers)
      .send({});
    expect(o1.status).toBe(201);

    headers = await csrfHeaders(member);
    const m1 = await member
      .post(`/api/v1/groups/${groupId}/tasks/${tasks[0].id}/complete`)
      .set(headers)
      .send({});
    expect(m1.status).toBe(201);

    headers = await csrfHeaders(member);
    const m2 = await member
      .post(`/api/v1/groups/${groupId}/tasks/${tasks[1].id}/complete`)
      .set(headers)
      .send({});
    expect(m2.status).toBe(201);

    const daily = await owner.get(`/api/v1/groups/${groupId}/analytics/daily?range=7`);
    expect(daily.status).toBe(200);
    expect(daily.body.data.series.length).toBeGreaterThanOrEqual(2);
    expect(daily.body.data.dates).toHaveLength(7);

    const cum = await owner.get(`/api/v1/groups/${groupId}/analytics/cumulative?range=7`);
    expect(cum.status).toBe(200);
    const bob = cum.body.data.series.find((s) => s.name === 'Bob');
    expect(bob).toBeTruthy();
    expect(bob.values.at(-1)).toBe(tasks[0].points + tasks[1].points);

    const board = await owner.get(`/api/v1/groups/${groupId}/analytics/leaderboard?period=all`);
    expect(board.status).toBe(200);
    expect(board.body.data.leaderboard[0].name).toBe('Bob');
  });

  test('streak calculation', () => {
    const today = todayInTz('UTC');
    const y = addDaysToDateKey(today, -1);
    const y2 = addDaysToDateKey(today, -2);
    const streaks = computeStreaks([y2, y, today], 'UTC');
    expect(streaks.current).toBe(3);
    expect(streaks.longest).toBe(3);

    const gap = computeStreaks([y2, today], 'UTC');
    expect(gap.current).toBe(1);
  });

  test('changing task points does not rewrite historical awards', async () => {
    const { owner, groupId, tasks } = await setupTwoMembers();
    const taskId = tasks[0].id;
    let headers = await csrfHeaders(owner);
    const done = await owner
      .post(`/api/v1/groups/${groupId}/tasks/${taskId}/complete`)
      .set(headers)
      .send({});
    expect(done.body.data.completion.pointsAwarded).toBe(tasks[0].points);

    headers = await csrfHeaders(owner);
    await owner.patch(`/api/v1/groups/${groupId}/tasks/${taskId}`).set(headers).send({ points: 99 });

    const summary = await owner.get(`/api/v1/groups/${groupId}/analytics/summary`);
    expect(summary.body.data.yourPointsToday).toBe(tasks[0].points);
  });

  test('rejects completions far in the past', async () => {
    const { owner, groupId, tasks } = await setupTwoMembers();
    const headers = await csrfHeaders(owner);
    const res = await owner
      .post(`/api/v1/groups/${groupId}/tasks/${tasks[0].id}/complete`)
      .set(headers)
      .send({ dateKey: '2020-01-01' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('DATE_NOT_ELIGIBLE');
  });

  test('owner can create task; points come from server', async () => {
    const { owner, groupId } = await setupTwoMembers();
    const headers = await csrfHeaders(owner);
    const task = await owner
      .post(`/api/v1/groups/${groupId}/tasks`)
      .set(headers)
      .send({ name: 'Reading', points: 5, description: '30 pages' });
    expect(task.status).toBe(201);
    expect(task.body.data.task.points).toBe(5);

    const h2 = await csrfHeaders(owner);
    const done = await owner
      .post(`/api/v1/groups/${groupId}/tasks/${task.body.data.task.id}/complete`)
      .set(h2)
      .send({});
    expect(done.body.data.completion.pointsAwarded).toBe(5);
  });

  test('respects daily completion limits and keeps each award auditable', async () => {
    const { owner, groupId } = await setupTwoMembers();
    let headers = await csrfHeaders(owner);
    const taskRes = await owner
      .post(`/api/v1/groups/${groupId}/tasks`)
      .set(headers)
      .send({ name: 'Reading sessions', points: 3, dailyLimit: 2 });
    const taskId = taskRes.body.data.task.id;
    expect(taskRes.status).toBe(201);

    headers = await csrfHeaders(owner);
    const concurrent = await Promise.all(
      Array.from({ length: 3 }, () =>
        owner
          .post(`/api/v1/groups/${groupId}/tasks/${taskId}/complete`)
          .set(headers)
          .send({})
      )
    );
    const successes = concurrent.filter((response) => response.status === 201);
    const limited = concurrent.filter((response) => response.status === 409);
    expect(successes).toHaveLength(2);
    expect(limited).toHaveLength(1);
    expect(successes.map((response) => response.body.data.completion.occurrence).sort()).toEqual([
      1, 2,
    ]);
    headers = await csrfHeaders(owner);
    const overLimit = await owner
      .post(`/api/v1/groups/${groupId}/tasks/${taskId}/complete`)
      .set(headers)
      .send({});
    expect(overLimit.status).toBe(409);
    expect(overLimit.body.error.code).toBe('DAILY_LIMIT_REACHED');

    const checklist = await owner.get(`/api/v1/groups/${groupId}/checklist`);
    const task = checklist.body.data.tasks.find((item) => item.id === taskId);
    expect(task).toMatchObject({ completed: true, completionCount: 2, dailyLimit: 2 });
    expect(task.pointsAwarded).toBe(6);

    headers = await csrfHeaders(owner);
    const undone = await owner
      .post(`/api/v1/groups/${groupId}/tasks/${taskId}/undo`)
      .set(headers)
      .send({ occurrence: 2 });
    expect(undone.status).toBe(200);

    headers = await csrfHeaders(owner);
    const repeated = await owner
      .post(`/api/v1/groups/${groupId}/tasks/${taskId}/complete`)
      .set(headers)
      .send({});
    expect(repeated.status).toBe(201);
    expect(repeated.body.data.completion.occurrence).toBe(3);

    const summary = await owner.get(`/api/v1/groups/${groupId}/analytics/summary`);
    expect(summary.body.data.yourCompletedToday).toBe(2);
    expect(summary.body.data.yourCompletedTasks).toBe(1);
    expect(summary.body.data.completionPctToday).toBe(33);
  });
});
