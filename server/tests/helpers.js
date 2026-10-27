import request from 'supertest';
import { createApp } from '../src/app.js';

export function createAgent() {
  return request.agent(createApp());
}

export async function registerUser(agent, overrides = {}) {
  const payload = {
    name: overrides.name || 'Test User',
    email:
      overrides.email ||
      `user_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`,
    password: overrides.password || 'Password123!',
  };
  const res = await agent.post('/api/v1/auth/register').send(payload);
  return { res, payload, user: res.body.data?.user };
}

export async function csrfHeaders(agent) {
  const res = await agent.get('/api/v1/csrf');
  return { 'x-csrf-token': res.body.data.csrfToken };
}

export async function createGroup(agent, body = {}) {
  const headers = await csrfHeaders(agent);
  return agent
    .post('/api/v1/groups')
    .set(headers)
    .send({ name: 'Test Community', ...body });
}
