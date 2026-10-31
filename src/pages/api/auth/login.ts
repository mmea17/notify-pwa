import type { APIRoute } from 'astro';
import { getDB } from '@/lib/db';
import { verifyPassword, generateToken } from '@/lib/auth';

export const POST: APIRoute = async (context) => {
  try {
    const db = getDB(context);
    const body = await context.request.json();
    const { email, password } = body;

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'يرجى إدخال البريد الإلكتروني وكلمة المرور' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await db.prepare(`
      SELECT id, email, password_hash, salt, name FROM users WHERE email = ?
    `).bind(cleanEmail).first();

    if (!user) {
      return new Response(JSON.stringify({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const isValid = await verifyPassword(password, user.password_hash as string, user.salt as string);
    if (!isValid) {
      return new Response(JSON.stringify({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create session
    const sessionId = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await db.prepare(`
      INSERT INTO sessions (id, user_id, expires_at)
      VALUES (?, ?, ?)
    `).bind(sessionId, user.id as string, expiresAt).run();

    context.cookies.set('notify_session', sessionId, {
      path: '/',
      httpOnly: true,
      secure: context.url.protocol === 'https:',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60
    });

    return new Response(JSON.stringify({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || 'فشل تسجيل الدخول' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
