import { createAgent, registerUser, createGroup, csrfHeaders } from './helpers.js';

describe('Groups & invitations', () => {
  test('creates a private group for the owner', async () => {
    const agent = createAgent();
    await registerUser(agent, { name: 'Owner' });
    const res = await createGroup(agent, { name: 'Study Squad' });
    expect(res.status).toBe(201);
    expect(res.body.data.group.name).toBe('Study Squad');
    expect(res.body.data.invitation.code).toHaveLength(6);

    const list = await agent.get('/api/v1/groups');
    expect(list.body.data.groups).toHaveLength(1);
  });

  test('join via invite code; invalid invite fails', async () => {
    const owner = createAgent();
    await registerUser(owner, { name: 'Owner' });
    const created = await createGroup(owner);
    const code = created.body.data.invitation.code;

    const member = createAgent();
    await registerUser(member, { name: 'Member' });
    const headers = await csrfHeaders(member);
    const join = await member.post('/api/v1/groups/join').set(headers).send({ code });
    expect(join.status).toBe(200);
    expect(join.body.data.group.id).toBe(created.body.data.group.id);

    const bad = await member.post('/api/v1/groups/join').set(headers).send({ code: 'ZZZZZZ' });
    expect(bad.status).toBeGreaterThanOrEqual(400);
  });

  test('prevents cross-group access', async () => {
    const a = createAgent();
    await registerUser(a, { name: 'A' });
    const g1 = await createGroup(a, { name: 'Group A' });

    const b = createAgent();
    await registerUser(b, { name: 'B' });
    await createGroup(b, { name: 'Group B' });

    const sneak = await b.get(`/api/v1/groups/${g1.body.data.group.id}`);
    expect(sneak.status).toBe(403);
  });

  test('expired invitation is rejected', async () => {
    const { Invitation } = await import('../src/models/Invitation.js');
    const owner = createAgent();
    await registerUser(owner, { name: 'Owner' });
    const created = await createGroup(owner);
    const code = created.body.data.invitation.code;
    await Invitation.updateOne({ code }, { $set: { expiresAt: new Date(Date.now() - 1000) } });

    const member = createAgent();
    await registerUser(member, { name: 'Late' });
    const headers = await csrfHeaders(member);
    const join = await member.post('/api/v1/groups/join').set(headers).send({ code });
    expect(join.status).toBe(400);
    expect(join.body.error.code).toMatch(/EXPIRED|INVITE/i);
  });

  test('join approval keeps applicant out until approved', async () => {
    const owner = createAgent();
    await registerUser(owner, { name: 'Owner' });
    const created = await createGroup(owner, { name: 'Private Club', requireJoinApproval: true });
    const groupId = created.body.data.group.id;
    const code = created.body.data.invitation.code;

    const applicant = createAgent();
    await registerUser(applicant, { name: 'Waiter' });
    let headers = await csrfHeaders(applicant);
    const join = await applicant.post('/api/v1/groups/join').set(headers).send({ code });
    expect(join.status).toBe(200);
    expect(join.body.data.pending).toBe(true);

    const sneak = await applicant.get(`/api/v1/groups/${groupId}`);
    expect(sneak.status).toBe(403);

    headers = await csrfHeaders(owner);
    const members = await owner.get(`/api/v1/groups/${groupId}/members`);
    expect(members.body.data.pending).toHaveLength(1);
    const pendingId = members.body.data.pending[0].id;

    const approved = await owner
      .post(`/api/v1/groups/${groupId}/members/${pendingId}/approve`)
      .set(headers);
    expect(approved.status).toBe(200);

    const inside = await applicant.get(`/api/v1/groups/${groupId}`);
    expect(inside.status).toBe(200);
  });

  test('member cannot manage tasks without permission', async () => {
    const owner = createAgent();
    await registerUser(owner, { name: 'Owner' });
    const created = await createGroup(owner);
    const groupId = created.body.data.group.id;
    const code = created.body.data.invitation.code;

    const member = createAgent();
    await registerUser(member, { name: 'Member' });
    let headers = await csrfHeaders(member);
    await member.post('/api/v1/groups/join').set(headers).send({ code });
    headers = await csrfHeaders(member);
    const task = await member
      .post(`/api/v1/groups/${groupId}/tasks`)
      .set(headers)
      .send({ name: 'Hack', points: 10 });
    expect(task.status).toBe(403);
  });
});
