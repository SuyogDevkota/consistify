import { afterEach, describe, expect, test } from 'vitest';
import { api, clearCsrf } from './api.js';

const originalAdapter = api.defaults.adapter;

afterEach(() => {
  api.defaults.adapter = originalAdapter;
  clearCsrf();
});

describe('API session refresh', () => {
  test('leaves initial auth restoration refresh to AuthContext', async () => {
    let refreshCount = 0;
    api.defaults.adapter = async (config) => {
      if (config.url === '/auth/refresh') {
        refreshCount += 1;
      }
      return Promise.reject({
        config,
        response: { status: 401, data: {}, config },
      });
    };

    await expect(api.get('/auth/me')).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(refreshCount).toBe(0);
  });

  test('shares one refresh across concurrent unauthorized requests', async () => {
    const requestCounts = new Map();
    let refreshCount = 0;

    api.defaults.adapter = async (config) => {
      const count = (requestCounts.get(config.url) || 0) + 1;
      requestCounts.set(config.url, count);

      if (config.url === '/auth/refresh') {
        refreshCount += 1;
      }

      if (config.url.startsWith('/private/') && count === 1) {
        return Promise.reject({
          config,
          response: { status: 401, data: {}, config },
        });
      }

      const data = config.url === '/csrf'
        ? { success: true, data: { csrfToken: 'test-csrf-token' } }
        : { success: true };
      return { data, status: 200, statusText: 'OK', headers: {}, config };
    };

    const [first, second] = await Promise.all([
      api.get('/private/first'),
      api.get('/private/second'),
    ]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(refreshCount).toBe(1);
  });
});
