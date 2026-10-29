import { createAgent, registerUser, createGroup, csrfHeaders } from './helpers.js';

describe('Notifications', () => {
  test('notifies opted-in members about group activity but not their own actions', async () => {
    const owner = createAgent();
    await registerUser(owner, { name: 'Owner' });
    const created = await createGroup(owner, { name: 'Study group' });
    const groupId = created.body.data.group.id;

    const member = createAgent();
    await registerUser(member, { name: 'Member' });
    let headers = await csrfHeaders(member);
    const joined = await member
      .post('/api/v1/groups/join')
      .set(headers)
      .send({ code: created.body.data.invitation.code });
    expect(joined.status).toBe(200);

    const initialInbox = await member.get(`/api/v1/notifications/${groupId}`);
    expect(initialInbox.status).toBe(200);
    expect(initialInbox.body.data.groupActivityEnabled).toBe(false);
    expect(initialInbox.body.data.notifications).toHaveLength(0);
    expect(initialInbox.body.data.pushConfigured).toBe(false);

    headers = await csrfHeaders(member);
    const preferences = await member
      .put(`/api/v1/notifications/${groupId}/preferences`)
      .set(headers)
      .send({ groupActivityEnabled: true });
    expect(preferences.status).toBe(200);

    const taskHeaders = await csrfHeaders(owner);
    const taskResponse = await owner
      .post(`/api/v1/groups/${groupId}/tasks`)
      .set(taskHeaders)
      .send({ name: 'Read a chapter', points: 15 });
    expect(taskResponse.status).toBe(201);
    const taskId = taskResponse.body.data.task.id;

    headers = await csrfHeaders(owner);
    const completed = await owner
      .post(`/api/v1/groups/${groupId}/tasks/${taskId}/complete`)
      .set(headers)
      .send({});
    expect(completed.status).toBe(201);

    const inbox = await member.get(`/api/v1/notifications/${groupId}`);
    expect(inbox.status).toBe(200);
    expect(inbox.body.data.unreadCount).toBe(2);
    expect(inbox.body.data.notifications.map(({ type }) => type).sort()).toEqual([
      'task_completed',
      'task_created',
    ].sort());
    expect(inbox.body.data.notifications[0]).toMatchObject({
      title: 'A teammate completed a task',
      read: false,
    });
    expect(inbox.body.data.notifications[0].message).toContain('+15 pts');

    headers = await csrfHeaders(member);
    const markedRead = await member
      .post(`/api/v1/notifications/${groupId}/read-all`)
      .set(headers);
    expect(markedRead.status).toBe(200);
    expect((await member.get(`/api/v1/notifications/${groupId}`)).body.data.unreadCount).toBe(0);

    expect((await owner.get(`/api/v1/notifications/${groupId}`)).body.data.notifications).toHaveLength(0);
  });

  test('does not accept browser subscriptions before push is configured', async () => {
    const owner = createAgent();
    await registerUser(owner, { name: 'Owner' });
    const created = await createGroup(owner, { name: 'Study group' });
    const headers = await csrfHeaders(owner);

    const response = await owner
      .post(`/api/v1/notifications/${created.body.data.group.id}/subscriptions`)
      .set(headers)
      .send({
        endpoint: 'https://fcm.googleapis.com/fcm/send/test',
        keys: { p256dh: 'a'.repeat(65), auth: 'b'.repeat(20) },
      });

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe('PUSH_UNAVAILABLE');
  });
});
