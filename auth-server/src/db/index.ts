import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from 'dotenv';

config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined in environment variables');
}

export const client = postgres(process.env.DATABASE_URL, {
  prepare: false,
  ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
  connect_timeout: 10,
  idle_timeout: 20,
  max_lifetime: 60 * 30,
});

export const db = drizzle(client);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Closing database connection...');
  await client.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Closing database connection...');
  await client.end();
  process.exit(0);
});
