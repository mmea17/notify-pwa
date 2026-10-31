import type { APIContext } from 'astro';

export interface Env {
  DB: D1Database;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
  CRON_SECRET?: string;
}

export function getDB(context: APIContext): D1Database {
  // @ts-ignore
  const runtime = context.locals?.runtime;
  if (runtime?.env?.DB) {
    return runtime.env.DB;
  }
  // @ts-ignore
  if (context.platform?.env?.DB) {
    return context.platform.env.DB;
  }
  throw new Error('D1 Database binding (DB) is not available. Ensure platformProxy is enabled in astro.config.mjs or running via wrangler.');
}

export function getEnv(context: APIContext): Env {
  // @ts-ignore
  const runtime = context.locals?.runtime;
  // @ts-ignore
  return (runtime?.env || context.platform?.env || {}) as Env;
}
