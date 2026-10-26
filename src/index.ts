import { createApp } from './app';
import { config } from './config';
import { initSchema, pool } from './db/connection';

async function main() {
  await initSchema();

  const server = createApp().listen(config.port, () => {
    console.log(`Server listening on http://localhost:${config.port}`);
  });

  const shutdown = () => {
    server.close(() => {
      pool.end().finally(() => process.exit(0));
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
