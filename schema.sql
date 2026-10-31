-- Notify PWA Cloudflare D1 Database Schema

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  country TEXT DEFAULT 'مصر (Egypt)',
  city TEXT DEFAULT 'القاهرة (Cairo)',
  latitude REAL DEFAULT 30.0444,
  longitude REAL DEFAULT 31.2357,
  calculation_method TEXT DEFAULT 'Egyptian',
  madhab TEXT DEFAULT 'Shafi',
  pre_prayer_mins INTEGER DEFAULT 15,
  post_prayer_mins INTEGER DEFAULT 15,
  snooze_interval_mins INTEGER DEFAULT 15,
  sound_enabled INTEGER DEFAULT 1,
  max_streak INTEGER DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  device_name TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS prayers_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  prayer TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  scheduled_time TEXT NOT NULL,
  reminded_pre INTEGER DEFAULT 0,
  reminded_post INTEGER DEFAULT 0,
  snooze_count INTEGER DEFAULT 0,
  next_reminder_at TEXT,
  responded_at TEXT,
  UNIQUE(user_id, date, prayer)
);

CREATE TABLE IF NOT EXISTS time_windows (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'Clock',
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  mode TEXT DEFAULT 'random',
  fixed_time TEXT,
  interval_mins INTEGER DEFAULT 60,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS message_pools (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  window_id TEXT NOT NULL REFERENCES time_windows(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  category TEXT DEFAULT 'focus',
  last_sent_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  action_taken TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
