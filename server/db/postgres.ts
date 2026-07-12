import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema.ts';
import { logger } from '../services/logging.ts';

const connectionString = process.env.DATABASE_URL;

export const hasPostgres = !!connectionString;

let dbClient: ReturnType<typeof drizzle> | null = null;

if (hasPostgres) {
  try {
    const client = postgres(connectionString as string, { max: 1 });
    dbClient = drizzle(client, { schema });
    logger.info('Database', 'Postgres connection initialized successfully');
  } catch (error) {
    logger.error('Database', 'Failed to initialize Postgres connection', error);
  }
}

export const db = dbClient;
