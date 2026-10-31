import type { APIContext } from 'astro';

// Secure Web Crypto PBKDF2 Password Hashing
export async function hashPassword(password: string, saltHex?: string): Promise<{ hash: string; salt: string }> {
  const enc = new TextEncoder();
  const salt = saltHex ? hexToBuf(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );

  return {
    hash: bufToHex(new Uint8Array(derivedBits)),
    salt: bufToHex(salt)
  };
}

export async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  const computed = await hashPassword(password, salt);
  return computed.hash === hash;
}

function bufToHex(buffer: Uint8Array): string {
  return Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBuf(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

export function generateToken(length = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return bufToHex(bytes);
}

export interface UserSession {
  user: {
    id: string;
    email: string;
    name: string;
    created_at: string;
  };
  settings: {
    country: string;
    city: string;
    latitude: number;
    longitude: number;
    calculation_method: string;
    madhab: string;
    pre_prayer_mins: number;
    post_prayer_mins: number;
    snooze_interval_mins: number;
    sound_enabled: number;
  };
  sessionId: string;
}

export async function getCurrentSession(context: APIContext, db: D1Database): Promise<UserSession | null> {
  const sessionCookie = context.cookies.get('notify_session')?.value;
  if (!sessionCookie) return null;

  const now = new Date().toISOString();
  
  // Find session and user
  const sessionResult = await db.prepare(`
    SELECT s.id as session_id, s.expires_at, 
           u.id as user_id, u.email, u.name, u.created_at,
           st.country, st.city, st.latitude, st.longitude, 
           st.calculation_method, st.madhab, st.pre_prayer_mins,
           st.post_prayer_mins, st.snooze_interval_mins, st.sound_enabled
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    LEFT JOIN user_settings st ON st.user_id = u.id
    WHERE s.id = ? AND s.expires_at > ?
  `).bind(sessionCookie, now).first();

  if (!sessionResult) {
    context.cookies.delete('notify_session', { path: '/' });
    return null;
  }

  return {
    sessionId: sessionResult.session_id as string,
    user: {
      id: sessionResult.user_id as string,
      email: sessionResult.email as string,
      name: sessionResult.name as string,
      created_at: sessionResult.created_at as string
    },
    settings: {
      country: (sessionResult.country as string) || 'مصر (Egypt)',
      city: (sessionResult.city as string) || 'القاهرة (Cairo)',
      latitude: Number(sessionResult.latitude ?? 30.0444),
      longitude: Number(sessionResult.longitude ?? 31.2357),
      calculation_method: (sessionResult.calculation_method as string) || 'Egyptian',
      madhab: (sessionResult.madhab as string) || 'Shafi',
      pre_prayer_mins: Number(sessionResult.pre_prayer_mins ?? 15),
      post_prayer_mins: Number(sessionResult.post_prayer_mins ?? 15),
      snooze_interval_mins: Number(sessionResult.snooze_interval_mins ?? 15),
      sound_enabled: Number(sessionResult.sound_enabled ?? 1)
    }
  };
}
