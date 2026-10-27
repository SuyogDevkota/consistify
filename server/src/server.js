import { setServers } from 'node:dns';

setServers(['8.8.8.8', '8.8.4.4']);

import { createApp } from './app.js';
import { connectDb } from './config/db.js';
import { env } from './config/env.js';

const app = createApp();
let server;

async function start() {
  await connectDb();
  server = app.listen(env.port, () => {
    console.log(`Consistify API listening on port ${env.port} (${env.nodeEnv})`);
  });
}

async function shutdown(signal) {
  console.log(`${signal} received, shutting down...`);
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  const { disconnectDb } = await import('./config/db.js');
  await disconnectDb();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
