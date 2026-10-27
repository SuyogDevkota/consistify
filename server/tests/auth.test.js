import request from 'supertest';
import { createApp } from '../src/app.js';
import { createAgent, registerUser, csrfHeaders } from './helpers.js';

describe('Auth', () => {
  test('registers a new user', async () => {
    const agent = createAgent();
    const { res, payload } = await registerUser(agent);
    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe(payload.email.toLowerCase());
    expect(res.headers['set-cookie']).toBeDefined();
  });

  test('rejects duplicate email', async () => {
    const agent = createAgent();
    await registerUser(agent, { email: 'dup@example.com' });
    const again = await agent.post('/api/v1/auth/register').send({
      name: 'Other',
      email: 'dup@example.com',
      password: 'Password123!',
    });
    expect(again.status).toBe(409);
  });

  test('rejects wrong password', async () => {
    const agent = createAgent();
    const { payload } = await registerUser(agent);
    await agent.post('/api/v1/auth/logout');
    const login = await agent.post('/api/v1/auth/login').send({
      email: payload.email,
      password: 'WrongPassword!',
    });
    expect(login.status).toBe(401);
  });

  test('protects authenticated routes', async () => {
    const res = await request(createApp()).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  test('refreshes a stale CSRF cookie and disables caching', async () => {
    const csrf = await request(createApp()).get('/api/v1/csrf');
    const csrfCookie = csrf.headers['set-cookie']
      .find((cookie) => cookie.startsWith('csrfToken='))
      .split(';')[0];

    const refreshed = await request(createApp())
      .get('/api/v1/csrf')
      .set('Cookie', `${csrfCookie}; accessToken=stale-token`);

    expect(refreshed.status).toBe(200);
    expect(refreshed.headers['cache-control']).toBe('no-store');
    expect(refreshed.body.data.csrfToken).toBeTruthy();
  });

  test('restores session via me', async () => {
    const agent = createAgent();
    const { payload } = await registerUser(agent);
    const me = await agent.get('/api/v1/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe(payload.email.toLowerCase());
  });

  test('changes password and rejects the old one', async () => {
    const agent = createAgent();
    const { payload } = await registerUser(agent);
    const headers = await csrfHeaders(agent);
    const changed = await agent.patch('/api/v1/auth/password').set(headers).send({
      currentPassword: payload.password,
      newPassword: 'NewPassword123!',
    });
    expect(changed.status).toBe(200);
    await agent.post('/api/v1/auth/logout');
    const oldLogin = await agent.post('/api/v1/auth/login').send({
      email: payload.email,
      password: payload.password,
    });
    expect(oldLogin.status).toBe(401);
    const newLogin = await agent.post('/api/v1/auth/login').send({
      email: payload.email,
      password: 'NewPassword123!',
    });
    expect(newLogin.status).toBe(200);
  });

  test('logs in successfully', async () => {
    const agent = createAgent();
    const { payload } = await registerUser(agent);
    await agent.post('/api/v1/auth/logout');
    const login = await agent.post('/api/v1/auth/login').send({
      email: payload.email,
      password: payload.password,
    });
    expect(login.status).toBe(200);
    const me = await agent.get('/api/v1/auth/me');
    expect(me.status).toBe(200);
  });
});
