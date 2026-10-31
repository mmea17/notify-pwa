import type { APIRoute } from 'astro';
import { getDB } from '@/lib/db';
import { hashPassword, generateToken } from '@/lib/auth';
import { COUNTRIES_DATA } from '@/lib/countries';

export const POST: APIRoute = async (context) => {
  try {
    const db = getDB(context);
    const body = await context.request.json();
    const { email, password, name, countryName, cityName } = body;

    if (!email || !password || !name) {
      return new Response(JSON.stringify({ error: 'يرجى إدخال جميع البيانات المطلوبة' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ error: 'كلمة المرور يجب أن لا تقل عن 6 أحرف' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check existing
    const existing = await db.prepare('SELECT id FROM users WHERE email = ?').bind(cleanEmail).first();
    if (existing) {
      return new Response(JSON.stringify({ error: 'البريد الإلكتروني مسجل مسبقاً' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = 'usr-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
    const { hash, salt } = await hashPassword(password);

    // Default coordinates based on chosen country/city
    let lat = 30.0444;
    let lon = 31.2357;
    let method = 'Egyptian';
    let countryDisplay = countryName || 'مصر';
    let cityDisplay = cityName || 'القاهرة';

    const foundCountry = COUNTRIES_DATA.find(c => c.nameAr === countryDisplay || c.nameEn === countryDisplay);
    if (foundCountry) {
      method = foundCountry.defaultMethod;
      const foundCity = foundCountry.cities.find(ci => ci.nameAr === cityDisplay || ci.nameEn === cityDisplay) || foundCountry.cities[0];
      if (foundCity) {
        lat = foundCity.latitude;
        lon = foundCity.longitude;
        cityDisplay = foundCity.nameAr;
      }
    }

    // Insert user and user_settings
    await db.batch([
      db.prepare(`
        INSERT INTO users (id, email, password_hash, salt, name)
        VALUES (?, ?, ?, ?, ?)
      `).bind(userId, cleanEmail, hash, salt, name.trim()),

      db.prepare(`
        INSERT INTO user_settings (user_id, country, city, latitude, longitude, calculation_method)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(userId, countryDisplay, cityDisplay, lat, lon, method)
    ]);

    // Insert Default Time Windows and Messages
    const winMorningId = 'win-morn-' + Date.now();
    const winEveningId = 'win-eve-' + Date.now();

    await db.batch([
      db.prepare(`
        INSERT INTO time_windows (id, user_id, name, icon, start_time, end_time, mode)
        VALUES (?, ?, 'فترة العمل الصباحية', 'Briefcase', '09:00', '14:00', 'random')
      `).bind(winMorningId, userId),

      db.prepare(`
        INSERT INTO time_windows (id, user_id, name, icon, start_time, end_time, mode)
        VALUES (?, ?, 'فترة المساء والراحة', 'Moon', '18:00', '22:00', 'random')
      `).bind(winEveningId, userId),

      // Morning Messages
      db.prepare(`
        INSERT INTO message_pools (id, user_id, window_id, message_text, category)
        VALUES (?, ?, ?, '🎯 هل ما زلت تعمل على هدفك الأساسي لهذا اليوم؟ لا تدع المشتتات تسرق وقتك!', 'focus')
      `).bind('msg-1-' + Date.now(), userId, winMorningId),

      db.prepare(`
        INSERT INTO message_pools (id, user_id, window_id, message_text, category)
        VALUES (?, ?, ?, '💧 وقفة سريعة: اشرب كوب ماء وافرد ظهرك وخذ نفساً عميقاً.', 'health')
      `).bind('msg-2-' + Date.now(), userId, winMorningId),

      db.prepare(`
        INSERT INTO message_pools (id, user_id, window_id, message_text, category)
        VALUES (?, ?, ?, '✨ لا حول ولا قوة إلا بالله، كنز من كنوز الجنة. جدد نيتك وتوكلك على الله.', 'dhikr')
      `).bind('msg-3-' + Date.now(), userId, winMorningId),

      // Evening Messages
      db.prepare(`
        INSERT INTO message_pools (id, user_id, window_id, message_text, category)
        VALUES (?, ?, ?, '🌙 راجع إنجازات يومك واشكر الله عليها، واستعد ليوم غد بنشاط.', 'goal')
      `).bind('msg-4-' + Date.now(), userId, winEveningId),

      db.prepare(`
        INSERT INTO message_pools (id, user_id, window_id, message_text, category)
        VALUES (?, ?, ?, '📿 سبحان الله وبحمده، سبحان الله العظيم.', 'dhikr')
      `).bind('msg-5-' + Date.now(), userId, winEveningId)
    ]);

    // Create session
    const sessionId = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
    await db.prepare(`
      INSERT INTO sessions (id, user_id, expires_at)
      VALUES (?, ?, ?)
    `).bind(sessionId, userId, expiresAt).run();

    context.cookies.set('notify_session', sessionId, {
      path: '/',
      httpOnly: true,
      secure: context.url.protocol === 'https:',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60
    });

    return new Response(JSON.stringify({
      success: true,
      user: { id: userId, email: cleanEmail, name: name.trim() }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || 'حدث خطأ أثناء إنشاء الحساب' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
