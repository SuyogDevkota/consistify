import { isTrustedPushEndpoint } from '../src/services/pushService.js';

describe('Browser push endpoint validation', () => {
  test('accepts HTTPS endpoints from known browser push services', () => {
    expect(isTrustedPushEndpoint('https://fcm.googleapis.com/fcm/send/token')).toBe(true);
    expect(isTrustedPushEndpoint('https://updates.push.services.mozilla.com/wpush/v2/token')).toBe(true);
    expect(isTrustedPushEndpoint('https://web.push.apple.com/token')).toBe(true);
  });

  test('rejects untrusted and insecure endpoints', () => {
    expect(isTrustedPushEndpoint('http://fcm.googleapis.com/fcm/send/token')).toBe(false);
    expect(isTrustedPushEndpoint('https://evil.example/endpoint')).toBe(false);
    expect(isTrustedPushEndpoint('https://fcm.googleapis.com.evil.example/token')).toBe(false);
    expect(isTrustedPushEndpoint('https://user@fcm.googleapis.com/token')).toBe(false);
    expect(isTrustedPushEndpoint('not a url')).toBe(false);
  });
});
