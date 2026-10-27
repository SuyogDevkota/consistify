/**
 * Minimal structured logger. Never log passwords, tokens, or cookies.
 */
export const logger = {
  info(message, meta = {}) {
    console.log(JSON.stringify({ level: 'info', message, ...sanitize(meta), ts: new Date().toISOString() }));
  },
  warn(message, meta = {}) {
    console.warn(JSON.stringify({ level: 'warn', message, ...sanitize(meta), ts: new Date().toISOString() }));
  },
  error(message, meta = {}) {
    console.error(JSON.stringify({ level: 'error', message, ...sanitize(meta), ts: new Date().toISOString() }));
  },
};

function sanitize(meta) {
  const clone = { ...meta };
  for (const key of Object.keys(clone)) {
    if (/password|token|secret|authorization|cookie/i.test(key)) {
      clone[key] = '[redacted]';
    }
  }
  return clone;
}
