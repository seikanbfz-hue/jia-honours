-- Jia Honours Cloudflare D1 schema (fresh database).
-- Existing databases are upgraded automatically and non-destructively by functions/_utils.js.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  phone_country_iso TEXT,
  phone_country_code TEXT,
  phone_number TEXT,
  email_verified_at TEXT,
  password_changed_at TEXT,
  role TEXT NOT NULL DEFAULT 'member',
  member_status TEXT NOT NULL DEFAULT '待完善资料',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS email_verification_codes (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE,
  purpose TEXT NOT NULL DEFAULT 'register',
  code_hash TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  request_ip_hash TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL,
  used_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_verification_email_purpose_created
  ON email_verification_codes(email, purpose, created_at);
CREATE INDEX IF NOT EXISTS idx_verification_expiry
  ON email_verification_codes(expires_at);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  ip_hash TEXT,
  user_agent_hash TEXT,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  last_seen_at TEXT,
  revoked_at TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS rate_limits (
  action TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL,
  PRIMARY KEY(action, key_hash, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_expiry ON rate_limits(expires_at);

CREATE TABLE IF NOT EXISTS member_profiles (
  user_id TEXT PRIMARY KEY,
  display_name TEXT,
  name_en TEXT,
  nationality TEXT,
  residence_country TEXT,
  occupation TEXT,
  noble_title_status TEXT,
  honours_record_status TEXT,
  biography TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS member_notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  note TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS honour_records (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  display_name TEXT NOT NULL,
  honour_name TEXT NOT NULL,
  honour_class TEXT,
  honorary_title TEXT,
  award_date TEXT,
  public_status TEXT NOT NULL DEFAULT 'private',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS formal_member_applications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  passport_name TEXT NOT NULL,
  romanized_name TEXT NOT NULL,
  highest_education TEXT NOT NULL,
  honours_history TEXT NOT NULL,
  academic_achievement TEXT NOT NULL,
  honours_academic_detail TEXT,
  charity_activity TEXT NOT NULL,
  organization_affiliation TEXT NOT NULL,
  charity_organization_detail TEXT,
  faith_status TEXT NOT NULL,
  discovery_source TEXT NOT NULL,
  additional_notes TEXT,
  truth_ack INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT '正式会员申请审核中',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_formal_member_applications_user
  ON formal_member_applications(user_id);

CREATE TABLE IF NOT EXISTS site_news (
  id TEXT PRIMARY KEY,
  visibility TEXT NOT NULL DEFAULT 'public',
  title_zh TEXT NOT NULL,
  title_ja TEXT,
  title_en TEXT,
  body_zh TEXT NOT NULL,
  body_ja TEXT,
  body_en TEXT,
  is_published INTEGER NOT NULL DEFAULT 1,
  is_pinned INTEGER NOT NULL DEFAULT 0,
  published_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_site_news_visibility
  ON site_news(visibility, is_published, published_at);

CREATE TABLE IF NOT EXISTS app_migrations (
  name TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);

INSERT INTO site_news (
  id, visibility, title_zh, title_ja, title_en,
  body_zh, body_ja, body_en,
  is_published, is_pinned, published_at, created_at, updated_at
) VALUES (
  'news_20260608_launch',
  'public',
  '贾氏勋章官方网站正式上线',
  '賈氏勲章公式サイト開設のお知らせ',
  'Launch of the Jia Honours Official Website',
  '贾氏勋章官方网站于2026年7月9日正式上线。愿本站成为记录礼仪、传达谢意、延续文化与联结友谊的长期窗口。感谢各界持续关注。网站仍在逐步完善，如有建议或发现疏漏，敬请通过官方邮箱联系大龙凤勋章评议会。',
  '賈氏勲章公式サイトを2026年7月9日に正式開設いたしました。本サイトが、儀礼を記録し、感謝を伝え、文化を受け継ぎ、友好を育むための継続的な窓口となることを願っております。今後ともご関心をお寄せいただければ幸いです。お気づきの点やご意見がございましたら、公式メールを通じて大龍鳳章評議会までお寄せください。',
  'The Jia Honours official website was formally launched on 9 July 2026. May it serve as a lasting place to record ceremony, convey gratitude, sustain cultural traditions and strengthen friendship. We welcome your continued interest. As the website develops, comments and corrections may be sent to the Council of the Order of the Great Dragon and Phoenix through the official email address.',
  1,
  1,
  '2026-07-09',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT(id) DO UPDATE SET
  visibility = 'public',
  title_zh = excluded.title_zh,
  title_ja = excluded.title_ja,
  title_en = excluded.title_en,
  body_zh = excluded.body_zh,
  body_ja = excluded.body_ja,
  body_en = excluded.body_en,
  is_published = 1,
  is_pinned = 1,
  published_at = excluded.published_at,
  updated_at = CURRENT_TIMESTAMP;

INSERT OR IGNORE INTO app_migrations (name, applied_at)
VALUES ('2026-07-09-v56-launch-news', CURRENT_TIMESTAMP);
