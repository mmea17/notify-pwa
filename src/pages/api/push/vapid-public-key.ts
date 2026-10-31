import type { APIRoute } from 'astro';
import { getDB, getEnv } from '@/lib/db';
import { getOrCreateVapidKeys } from '@/lib/push';

export const GET: APIRoute = async (context) => {
  try {
    const db = getDB(context);
    const env = getEnv(context);
    const vapid = await getOrCreateVapidKeys(db, env);

    return new Response(JSON.stringify({ publicKey: vapid.publicKey }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
