import { createAgent, registerUser, createGroup, csrfHeaders } from './helpers.js';
import { createMessage, streamGroupMessages } from '../src/services/chatService.js';
import { ChatMessage } from '../src/models/ChatMessage.js';

describe('Community chat', () => {
  test('broadcasts newly created messages to connected group members', async () => {
    const owner = createAgent();
    const registered = await registerUser(owner, { name: 'Owner' });
    const created = await createGroup(owner, { name: 'Chat group' });
    const groupId = created.body.data.group.id;
    let closeStream;
    const writes = [];
    const response = {
      destroyed: false,
      writableEnded: false,
      write: (event) => writes.push(event),
      on: (_name, callback) => {
        closeStream = callback;
      },
    };

    streamGroupMessages(groupId, registered.user.id, response);
    await createMessage({
      groupId,
      userId: registered.user.id,
      text: 'Live message',
    });

    expect(writes).toHaveLength(1);
    expect(writes[0]).toContain('event: chat-message');
    expect(writes[0]).toContain('"text":"Live message"');
    closeStream();
  });

  test('stores group-only messages and returns them in chronological order', async () => {
    const owner = createAgent();
    await registerUser(owner, { name: 'Owner' });
    const created = await createGroup(owner, { name: 'Chat group' });
    const groupId = created.body.data.group.id;

    let headers = await csrfHeaders(owner);
    const first = await owner
      .post(`/api/v1/chat/${groupId}/messages`)
      .set(headers)
      .send({ text: 'First message' });
    expect(first.status).toBe(201);
    expect(first.body.data.message).toMatchObject({
      text: 'First message',
      sender: { name: 'Owner' },
      attachment: null,
    });

    headers = await csrfHeaders(owner);
    const second = await owner
      .post(`/api/v1/chat/${groupId}/messages`)
      .set(headers)
      .send({ text: 'Second message' });
    expect(second.status).toBe(201);

    const history = await owner.get(`/api/v1/chat/${groupId}/messages`);
    expect(history.status).toBe(200);
    expect(history.headers['content-security-policy']).toContain("img-src 'self' data:");
    expect(history.body.data.messages.map(({ text }) => text)).toEqual([
      'First message',
      'Second message',
    ]);
    expect(typeof history.body.data.mediaConfigured).toBe('boolean');

    const outsider = createAgent();
    await registerUser(outsider, { name: 'Outsider' });
    expect((await outsider.get(`/api/v1/chat/${groupId}/messages`)).status).toBe(403);
    expect(
      (
        await outsider.get(
          `/api/v1/chat/${groupId}/messages/${first.body.data.message.id}/media`
        )
      ).status
    ).toBe(403);
  });

  test('rejects unsupported chat attachment types', async () => {
    const owner = createAgent();
    await registerUser(owner, { name: 'Owner' });
    const created = await createGroup(owner, { name: 'Chat group' });
    const headers = await csrfHeaders(owner);

    const response = await owner
      .post(`/api/v1/chat/${created.body.data.group.id}/messages`)
      .set(headers)
      .attach('file', Buffer.from('not an image'), {
        filename: 'invalid.txt',
        contentType: 'text/plain',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_CHAT_FILE');
  });

  test('rejects empty and oversized text messages', async () => {
    const owner = createAgent();
    await registerUser(owner, { name: 'Owner' });
    const created = await createGroup(owner, { name: 'Chat group' });
    const groupId = created.body.data.group.id;

    let headers = await csrfHeaders(owner);
    const empty = await owner
      .post(`/api/v1/chat/${groupId}/messages`)
      .set(headers)
      .send({ text: '   ' });
    expect(empty.status).toBe(400);

    headers = await csrfHeaders(owner);
    const oversized = await owner
      .post(`/api/v1/chat/${groupId}/messages`)
      .set(headers)
      .send({ text: 'x'.repeat(2001) });
    expect(oversized.status).toBe(400);
  });

  test('paginates older messages without losing their author or order', async () => {
    const owner = createAgent();
    const registered = await registerUser(owner, { name: 'Owner' });
    const created = await createGroup(owner, { name: 'Chat group' });
    const groupId = created.body.data.group.id;
    const start = new Date('2026-10-28T00:00:00.000Z');
    await ChatMessage.insertMany(
      Array.from({ length: 53 }, (_, index) => ({
        group: groupId,
        sender: registered.user.id,
        text: `Message ${index}`,
        createdAt: new Date(start.getTime() + index * 1000),
        updatedAt: new Date(start.getTime() + index * 1000),
      }))
    );

    const latest = await owner.get(`/api/v1/chat/${groupId}/messages`);
    expect(latest.status).toBe(200);
    expect(latest.body.data.messages).toHaveLength(50);
    expect(latest.body.data.hasMore).toBe(true);
    expect(latest.body.data.messages[0].text).toBe('Message 3');
    expect(latest.body.data.messages[0].sender.name).toBe('Owner');

    const earlier = await owner.get(
      `/api/v1/chat/${groupId}/messages?before=${latest.body.data.messages[0].id}`
    );
    expect(earlier.status).toBe(200);
    expect(earlier.body.data.messages.map(({ text }) => text)).toEqual([
      'Message 0',
      'Message 1',
      'Message 2',
    ]);
    expect(earlier.body.data.hasMore).toBe(false);
  });
});
