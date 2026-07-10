const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const SESSION_COOKIE_NAME = "__Host-jia_session";
const LEGACY_SESSION_COOKIE_NAME = "jia_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const PASSWORD_PBKDF2_ITERATIONS = 100000;
const MAX_PBKDF2_ITERATIONS = 100000;
const MAX_VERIFICATION_ATTEMPTS = 5;
const schemaPromises = new WeakMap();

const LAUNCH_NEWS = {
  id: "news_20260608_launch",
  titleZh: "贾氏勋章官方网站正式上线",
  titleJa: "賈氏勲章公式サイト開設のお知らせ",
  titleEn: "Launch of the Jia Honours Official Website",
  bodyZh: "贾氏勋章官方网站于2026年7月9日正式上线。愿本站成为记录礼仪、传达谢意、延续文化与联结友谊的长期窗口。感谢各界持续关注。网站仍在逐步完善，如有建议或发现疏漏，敬请通过官方邮箱联系大龙凤勋章评议会。",
  bodyJa: "賈氏勲章公式サイトを2026年7月9日に正式開設いたしました。本サイトが、儀礼を記録し、感謝を伝え、文化を受け継ぎ、友好を育むための継続的な窓口となることを願っております。今後ともご関心をお寄せいただければ幸いです。お気づきの点やご意見がございましたら、公式メールを通じて大龍鳳章評議会までお寄せください。",
  bodyEn: "The Jia Honours official website was formally launched on 9 July 2026. May it serve as a lasting place to record ceremony, convey gratitude, sustain cultural traditions and strengthen friendship. We welcome your continued interest. As the website develops, comments and corrections may be sent to the Council of the Order of the Great Dragon and Phoenix through the official email address.",
  publishedAt: "2026-07-09",
};

export class ApiError extends Error {
  constructor(status, code, message, headers = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.headers = headers;
  }
}

export function json(data, status = 200, headers = {}) {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Content-Type", "application/json; charset=utf-8");
  responseHeaders.set("Cache-Control", "no-store, max-age=0");
  responseHeaders.set("Pragma", "no-cache");
  responseHeaders.set("X-Content-Type-Options", "nosniff");
  responseHeaders.set("Vary", appendVary(responseHeaders.get("Vary"), "Cookie"));
  return new Response(JSON.stringify(data), { status, headers: responseHeaders });
}

function appendVary(existing, value) {
  const values = String(existing || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (!values.some((item) => item.toLowerCase() === value.toLowerCase())) values.push(value);
  return values.join(", ");
}

export function handleError(error, fallbackMessage = "服务暂时不可用，请稍后再试。", context = "api") {
  if (error instanceof ApiError) {
    const body = { error: error.message };
    if (error.code) body.code = error.code;
    return json(body, error.status, error.headers);
  }

  const detail = error && error.stack ? error.stack : String(error);
  console.error(`[${context}]`, detail);
  return json({ error: fallbackMessage, code: "INTERNAL_ERROR" }, 500);
}

export async function readJson(request, { maxBytes = 16 * 1024 } = {}) {
  const contentType = request.headers.get("Content-Type") || "";
  if (!/^application\/json(?:\s*;|$)/i.test(contentType)) {
    throw new ApiError(415, "JSON_REQUIRED", "请求必须使用 JSON 格式。");
  }

  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new ApiError(413, "PAYLOAD_TOO_LARGE", "请求内容过大。");
  }

  let text;
  try {
    text = await request.text();
  } catch (error) {
    throw new ApiError(400, "INVALID_JSON", "请求格式不正确。");
  }
  if (!text || encoder.encode(text).byteLength > maxBytes) {
    throw new ApiError(text ? 413 : 400, text ? "PAYLOAD_TOO_LARGE" : "INVALID_JSON", text ? "请求内容过大。" : "请求格式不正确。");
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    throw new ApiError(400, "INVALID_JSON", "请求格式不正确。");
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new ApiError(400, "INVALID_JSON", "请求格式不正确。");
  }
  return data;
}

export function getDB(env) {
  const db = env && env.DB;
  if (!db || typeof db.prepare !== "function" || typeof db.batch !== "function") {
    throw new ApiError(503, "SERVICE_UNAVAILABLE", "服务暂时不可用，请稍后再试。");
  }
  return db;
}

export function requireSecurityEnv(env) {
  const secret = String((env && env.SESSION_SECRET) || "");
  if (!isStrongSecret(secret)) {
    throw new ApiError(503, "SERVICE_UNAVAILABLE", "服务暂时不可用，请稍后再试。");
  }
  return secret;
}

function isStrongSecret(secret) {
  return String(secret || "").length >= 32 && !/REPLACE_WITH|CHANGE_ME|example/i.test(String(secret));
}

async function applyCoreSchema(db) {
  await db.prepare(`
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
    )
  `).run();

  await ensureColumns(db, "users", {
    phone_country_iso: "TEXT",
    phone_country_code: "TEXT",
    phone_number: "TEXT",
    email_verified_at: "TEXT",
    password_changed_at: "TEXT",
    role: "TEXT NOT NULL DEFAULT 'member'",
    member_status: "TEXT NOT NULL DEFAULT '待完善资料'",
    updated_at: "TEXT",
    last_login_at: "TEXT",
  });

  await db.prepare(`
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
    )
  `).run();
  await ensureColumns(db, "email_verification_codes", {
    purpose: "TEXT NOT NULL DEFAULT 'register'",
    attempt_count: "INTEGER NOT NULL DEFAULT 0",
    request_ip_hash: "TEXT",
    created_at: "TEXT",
    expires_at: "TEXT",
    used_at: "TEXT",
  });

  await db.prepare(`
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
    )
  `).run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS rate_limits (
      action TEXT NOT NULL,
      key_hash TEXT NOT NULL,
      window_start INTEGER NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      expires_at INTEGER NOT NULL,
      PRIMARY KEY(action, key_hash, window_start)
    )
  `).run();

  await db.prepare(`
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
    )
  `).run();
  await ensureColumns(db, "member_profiles", {
    display_name: "TEXT",
    name_en: "TEXT",
    nationality: "TEXT",
    residence_country: "TEXT",
    occupation: "TEXT",
    noble_title_status: "TEXT",
    honours_record_status: "TEXT",
    biography: "TEXT",
    created_at: "TEXT",
    updated_at: "TEXT",
  });

  await db.prepare(`
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
    )
  `).run();
  await ensureColumns(db, "site_news", {
    visibility: "TEXT NOT NULL DEFAULT 'public'",
    title_zh: "TEXT",
    title_ja: "TEXT",
    title_en: "TEXT",
    body_zh: "TEXT",
    body_ja: "TEXT",
    body_en: "TEXT",
    is_published: "INTEGER NOT NULL DEFAULT 1",
    is_pinned: "INTEGER NOT NULL DEFAULT 0",
    published_at: "TEXT",
    created_at: "TEXT",
    updated_at: "TEXT",
  });

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS app_migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `).run();

  await db.batch([
    db.prepare("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_verification_email_purpose_created ON email_verification_codes(email, purpose, created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_verification_expiry ON email_verification_codes(expires_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id, expires_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_rate_limits_expiry ON rate_limits(expires_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_site_news_visibility ON site_news(visibility, is_published, published_at)"),
  ]);

  await applyLaunchNewsMigration(db);
}

async function ensureColumns(db, table, definitions) {
  if (!/^[a-z_]+$/.test(table)) throw new Error("Unsafe schema identifier.");
  const info = await db.prepare(`PRAGMA table_info(${table})`).all();
  const existing = new Set((info.results || []).map((row) => row.name));
  for (const [column, definition] of Object.entries(definitions)) {
    if (existing.has(column)) continue;
    if (!/^[a-z_]+$/.test(column)) throw new Error("Unsafe schema identifier.");
    try {
      await db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
    } catch (error) {
      if (!/duplicate column name/i.test(String(error && error.message))) throw error;
    }
  }
}

async function applyLaunchNewsMigration(db) {
  const migrationName = "2026-07-09-v56-launch-news";
  const applied = await db.prepare("SELECT name FROM app_migrations WHERE name = ?").bind(migrationName).first();
  if (applied) return;
  const now = new Date().toISOString();
  await db.batch([
    db.prepare(`
      INSERT INTO site_news (
        id, visibility, title_zh, title_ja, title_en, body_zh, body_ja, body_en,
        is_published, is_pinned, published_at, created_at, updated_at
      ) VALUES (?, 'public', ?, ?, ?, ?, ?, ?, 1, 1, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        visibility = 'public', title_zh = excluded.title_zh, title_ja = excluded.title_ja,
        title_en = excluded.title_en, body_zh = excluded.body_zh, body_ja = excluded.body_ja,
        body_en = excluded.body_en, is_published = 1, is_pinned = 1,
        published_at = excluded.published_at, updated_at = excluded.updated_at
    `).bind(
      LAUNCH_NEWS.id,
      LAUNCH_NEWS.titleZh,
      LAUNCH_NEWS.titleJa,
      LAUNCH_NEWS.titleEn,
      LAUNCH_NEWS.bodyZh,
      LAUNCH_NEWS.bodyJa,
      LAUNCH_NEWS.bodyEn,
      LAUNCH_NEWS.publishedAt,
      now,
      now
    ),
    db.prepare("INSERT OR IGNORE INTO app_migrations (name, applied_at) VALUES (?, ?)").bind(migrationName, now),
  ]);
}

export async function ensureCoreSchema(db) {
  let promise = schemaPromises.get(db);
  if (!promise) {
    promise = applyCoreSchema(db);
    schemaPromises.set(db, promise);
  }
  try {
    await promise;
  } catch (error) {
    schemaPromises.delete(db);
    throw error;
  }
}

export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function validateEmail(value) {
  const email = normalizeEmail(value);
  if (email.length < 3 || email.length > 254) {
    throw new ApiError(400, "INVALID_EMAIL", "请输入有效邮箱地址。");
  }
  const match = /^([^\s@]+)@([^\s@]+)$/.exec(email);
  if (!match || match[1].length > 64 || !match[2].includes(".") || match[2].startsWith(".") || match[2].endsWith(".")) {
    throw new ApiError(400, "INVALID_EMAIL", "请输入有效邮箱地址。");
  }
  return email;
}

export function validateFullName(value, { optional = false } = {}) {
  const name = String(value || "").trim().replace(/\s+/g, " ");
  if (!name && optional) return "";
  if (!name || name.length > 160 || /[\u0000-\u001f\u007f]/.test(name)) {
    throw new ApiError(400, "INVALID_NAME", "请输入有效姓名。");
  }
  return name;
}

export function validatePassword(value) {
  const password = String(value || "");
  if (password.length < 8 || password.length > 128) {
    throw new ApiError(400, "INVALID_PASSWORD", "密码长度需要为 8 至 128 位。");
  }
  return password;
}

export function validateVerificationCode(value) {
  const code = String(value || "").trim();
  if (!/^\d{6}$/.test(code)) {
    throw new ApiError(400, "INVALID_VERIFICATION_CODE", "验证码应为 6 位数字。");
  }
  return code;
}

export function validatePhone({ iso, countryCode, number }) {
  const phoneCountryIso = String(iso || "").trim().toUpperCase();
  const phoneCountryCode = String(countryCode || "").trim();
  const rawNumber = String(number || "").trim();
  if (!/^[A-Z]{2}$/.test(phoneCountryIso) || !/^\+\d{1,4}$/.test(phoneCountryCode)) {
    throw new ApiError(400, "INVALID_PHONE", "请选择有效的国家或地区电话区号。");
  }
  if (!rawNumber || rawNumber.length > 32 || /[^\d\s().-]/.test(rawNumber)) {
    throw new ApiError(400, "INVALID_PHONE", "请输入有效电话号码。");
  }
  const phoneNumber = rawNumber.replace(/\D/g, "");
  if (phoneNumber.length < 6 || phoneNumber.length > 15) {
    throw new ApiError(400, "INVALID_PHONE", "请输入有效电话号码。");
  }
  return { phoneCountryIso, phoneCountryCode, phoneNumber };
}

export function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phoneCountryIso: row.phone_country_iso || "",
    phoneCountryCode: row.phone_country_code || "",
    phoneNumber: row.phone_number || "",
    emailVerifiedAt: row.email_verified_at || "",
    role: row.role || "member",
    memberStatus: row.member_status || "待完善资料",
    createdAt: row.created_at || "",
  };
}

export function randomId(prefix = "id") {
  return `${prefix}_${randomToken(16)}`;
}

export function randomToken(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

export function randomVerificationCode() {
  const range = 1000000;
  const ceiling = Math.floor(0x100000000 / range) * range;
  const buffer = new Uint32Array(1);
  do {
    crypto.getRandomValues(buffer);
  } while (buffer[0] >= ceiling);
  return String(buffer[0] % range).padStart(6, "0");
}

export function base64url(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function fromBase64url(value) {
  const normalized = String(value || "");
  if (!/^[A-Za-z0-9_-]+$/.test(normalized)) throw new Error("Invalid base64url value.");
  const padded = normalized.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((normalized.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(String(value)));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hmacBytes(secret, payload) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
}

async function privacyHash(env, value) {
  const secret = String(env.RATE_LIMIT_SECRET || env.SESSION_SECRET || "");
  if (!isStrongSecret(secret)) {
    throw new ApiError(503, "SERVICE_UNAVAILABLE", "服务暂时不可用，请稍后再试。");
  }
  return base64url(await hmacBytes(secret, String(value)));
}

function constantTimeEqual(left, right) {
  const a = encoder.encode(String(left || ""));
  const b = encoder.encode(String(right || ""));
  let difference = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) difference |= (a[i] || 0) ^ (b[i] || 0);
  return difference === 0;
}

export async function hashPassword(password) {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PASSWORD_PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return `${PASSWORD_PBKDF2_ITERATIONS}.${base64url(salt)}.${base64url(new Uint8Array(bits))}`;
}

export async function verifyPassword(password, stored) {
  const parts = String(stored || "").split(".");
  if (parts.length !== 3) return { ok: false, needsReset: false };
  const iterations = Number(parts[0]);
  if (!Number.isInteger(iterations) || iterations < 10000) return { ok: false, needsReset: false };
  if (iterations > MAX_PBKDF2_ITERATIONS) return { ok: false, needsReset: true };

  let salt;
  let expected;
  try {
    salt = fromBase64url(parts[1]);
    expected = fromBase64url(parts[2]);
  } catch (error) {
    return { ok: false, needsReset: false };
  }
  if (salt.length < 8 || salt.length > 64 || expected.length !== 32) return { ok: false, needsReset: false };

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return { ok: constantTimeEqual(base64url(new Uint8Array(bits)), base64url(expected)), needsReset: false };
}

export function getCookie(request, name) {
  const cookie = request.headers.get("Cookie") || "";
  for (const part of cookie.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return null;
}

export function sessionCookie(token) {
  return `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`;
}

export function clearSessionCookies() {
  return [
    `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
    `${LEGACY_SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
  ];
}

export async function createSession(userId, request, env, db) {
  requireSecurityEnv(env);
  await ensureCoreSchema(db);
  const token = randomToken(32);
  const tokenHash = await sha256Hex(token);
  const now = new Date();
  const createdAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000).toISOString();
  const ipHash = await getClientIpHash(request, env);
  const userAgent = String(request.headers.get("User-Agent") || "").slice(0, 512);
  const userAgentHash = userAgent ? await privacyHash(env, `ua:${userAgent}`) : null;
  await db.prepare("DELETE FROM sessions WHERE expires_at <= ?")
    .bind(createdAt)
    .run();
  await db.prepare(`
    INSERT INTO sessions (id, user_id, token_hash, ip_hash, user_agent_hash, created_at, expires_at, last_seen_at, revoked_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)
  `).bind(randomId("ses"), userId, tokenHash, ipHash, userAgentHash, createdAt, expiresAt, createdAt).run();
  await db.prepare(`
    UPDATE sessions
    SET revoked_at = ?
    WHERE user_id = ? AND revoked_at IS NULL AND id NOT IN (
      SELECT id FROM sessions WHERE user_id = ? AND revoked_at IS NULL
      ORDER BY created_at DESC LIMIT 10
    )
  `).bind(createdAt, userId, userId).run();
  return token;
}

export async function currentUser(request, env) {
  const db = getDB(env);
  await ensureCoreSchema(db);
  const token = getCookie(request, SESSION_COOKIE_NAME);
  if (!token || !/^[A-Za-z0-9_-]{40,128}$/.test(token)) return null;
  const tokenHash = await sha256Hex(token);
  const now = new Date().toISOString();
  const row = await db.prepare(`
    SELECT u.id, u.full_name, u.email, u.phone_country_iso, u.phone_country_code,
           u.phone_number, u.email_verified_at, u.role, u.member_status, u.created_at
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ?
    LIMIT 1
  `).bind(tokenHash, now).first();
  return publicUser(row);
}

export async function revokeCurrentSession(request, env, db) {
  await ensureCoreSchema(db);
  const token = getCookie(request, SESSION_COOKIE_NAME);
  if (!token || !/^[A-Za-z0-9_-]{40,128}$/.test(token)) return;
  const tokenHash = await sha256Hex(token);
  await db.prepare("UPDATE sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL")
    .bind(new Date().toISOString(), tokenHash)
    .run();
}

export function adminEmails(env) {
  return String((env && env.ADMIN_EMAILS) || "")
    .split(",")
    .map(normalizeEmail)
    .filter((email) => email && email.length <= 254);
}

export function assertSameOrigin(request, env) {
  const method = request.method.toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) return;
  const origin = request.headers.get("Origin");
  if (!origin || origin === "null") {
    throw new ApiError(403, "ORIGIN_REQUIRED", "请求来源验证失败，请刷新页面后重试。");
  }
  if (origin !== new URL(request.url).origin) {
    throw new ApiError(403, "ORIGIN_MISMATCH", "请求来源验证失败，请刷新页面后重试。");
  }
}

export async function verifyTurnstile(request, env, token, expectedAction = "") {
  const secret = String((env && env.TURNSTILE_SECRET_KEY) || "").trim();
  const siteKey = String((env && env.TURNSTILE_SITE_KEY) || "").trim();
  if (!secret && !siteKey) return { enabled: false };
  if (!secret || !siteKey) {
    throw new ApiError(503, "SERVICE_UNAVAILABLE", "服务暂时不可用，请稍后再试。");
  }
  const responseToken = String(token || "").trim();
  if (!responseToken || responseToken.length > 2048) {
    throw new ApiError(400, "TURNSTILE_REQUIRED", "请完成人机验证后重试。");
  }

  const form = new FormData();
  form.set("secret", secret);
  form.set("response", responseToken);
  const ip = getClientIp(request);
  if (ip && ip !== "unknown") form.set("remoteip", ip);
  form.set("idempotency_key", crypto.randomUUID());

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  let verificationResponse;
  try {
    verificationResponse = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form,
      signal: controller.signal,
    });
  } catch (error) {
    throw new ApiError(503, "TURNSTILE_UNAVAILABLE", "人机验证服务暂时不可用，请稍后再试。");
  } finally {
    clearTimeout(timeout);
  }
  if (!verificationResponse.ok) {
    throw new ApiError(503, "TURNSTILE_UNAVAILABLE", "人机验证服务暂时不可用，请稍后再试。");
  }

  let result;
  try {
    result = await verificationResponse.json();
  } catch (error) {
    throw new ApiError(503, "TURNSTILE_UNAVAILABLE", "人机验证服务暂时不可用，请稍后再试。");
  }
  if (!result || result.success !== true) {
    throw new ApiError(400, "TURNSTILE_FAILED", "人机验证未通过，请重试。");
  }

  const requestHost = new URL(request.url).hostname.toLowerCase();
  const allowedHosts = String(env.TURNSTILE_HOSTNAMES || requestHost)
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  if (!result.hostname || !allowedHosts.includes(String(result.hostname).toLowerCase())) {
    throw new ApiError(400, "TURNSTILE_FAILED", "人机验证未通过，请重试。");
  }
  if (expectedAction && result.action && result.action !== expectedAction) {
    throw new ApiError(400, "TURNSTILE_FAILED", "人机验证未通过，请重试。");
  }
  return result;
}

function getClientIp(request) {
  const direct = request.headers.get("CF-Connecting-IP");
  if (direct) return direct.trim().slice(0, 64);
  const forwarded = request.headers.get("X-Forwarded-For");
  if (forwarded) return forwarded.split(",")[0].trim().slice(0, 64);
  return "unknown";
}

export async function getClientIpHash(request, env) {
  return privacyHash(env, `ip:${getClientIp(request)}`);
}

export async function enforceRateLimits(db, env, request, action, rules) {
  requireSecurityEnv(env);
  await ensureCoreSchema(db);
  const nowSeconds = Math.floor(Date.now() / 1000);
  for (const rule of rules) {
    const scope = String(rule.scope || "custom");
    const rawValue = rule.value === undefined ? getClientIp(request) : String(rule.value);
    const keyHash = await privacyHash(env, `${scope}:${rawValue}`);
    const windowSeconds = Math.max(1, Number(rule.windowSeconds) || 60);
    const limit = Math.max(1, Number(rule.limit) || 1);
    const windowStart = Math.floor(nowSeconds / windowSeconds) * windowSeconds;
    const expiresAt = windowStart + windowSeconds * 2;
    const row = await db.prepare(`
      INSERT INTO rate_limits (action, key_hash, window_start, count, expires_at)
      VALUES (?, ?, ?, 1, ?)
      ON CONFLICT(action, key_hash, window_start)
      DO UPDATE SET count = count + 1, expires_at = excluded.expires_at
      RETURNING count
    `).bind(`${action}:${scope}`, keyHash, windowStart, expiresAt).first();
    const count = Number(row && row.count) || 1;
    if (count > limit) {
      const retryAfter = Math.max(1, windowStart + windowSeconds - nowSeconds);
      throw new ApiError(429, "RATE_LIMITED", "操作过于频繁，请稍后再试。", { "Retry-After": String(retryAfter) });
    }
  }

  const randomByte = new Uint8Array(1);
  crypto.getRandomValues(randomByte);
  if (randomByte[0] === 0) {
    await db.prepare("DELETE FROM rate_limits WHERE expires_at < ?").bind(nowSeconds).run();
  }
}

export async function hashVerificationCode(email, code, purpose, env) {
  const secret = String(env.VERIFICATION_SECRET || requireSecurityEnv(env));
  if (!isStrongSecret(secret)) throw new ApiError(503, "SERVICE_UNAVAILABLE", "服务暂时不可用，请稍后再试。");
  const signature = await hmacBytes(secret, `${purpose}:${normalizeEmail(email)}:${String(code)}`);
  return `v2.${base64url(signature)}`;
}

export async function insertVerificationCode(db, env, { email, code, purpose, request }) {
  const now = new Date();
  const id = randomId("evc");
  const codeHash = await hashVerificationCode(email, code, purpose, env);
  const createdAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
  const ipHash = await getClientIpHash(request, env);
  await db.prepare("DELETE FROM email_verification_codes WHERE expires_at < ?")
    .bind(new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
    .run();
  await db.prepare(`
    INSERT INTO email_verification_codes
      (id, email, purpose, code_hash, attempt_count, request_ip_hash, created_at, expires_at, used_at)
    VALUES (?, ?, ?, ?, 0, ?, ?, ?, NULL)
  `).bind(id, email, purpose, codeHash, ipHash, createdAt, expiresAt).run();
  return { id, code, createdAt, expiresAt };
}

export async function activateVerificationCode(db, { id, email, purpose }) {
  const now = new Date().toISOString();
  await db.prepare(`
    UPDATE email_verification_codes
    SET used_at = ?
    WHERE email = ? AND purpose = ? AND id <> ? AND used_at IS NULL
  `).bind(now, email, purpose, id).run();
}

export async function deleteVerificationCode(db, id) {
  await db.prepare("DELETE FROM email_verification_codes WHERE id = ?").bind(id).run();
}

export async function verifyEmailCode(db, env, { email, code, purpose }) {
  const row = await db.prepare(`
    SELECT id, code_hash, attempt_count, expires_at, used_at
    FROM email_verification_codes
    WHERE email = ? AND purpose = ?
    ORDER BY created_at DESC
    LIMIT 1
  `).bind(email, purpose).first();
  const now = Date.now();
  const expiry = row ? Date.parse(row.expires_at) : Number.NaN;
  if (!row || row.used_at || !Number.isFinite(expiry) || expiry <= now || Number(row.attempt_count) >= MAX_VERIFICATION_ATTEMPTS) {
    throw new ApiError(400, "VERIFICATION_CODE_INVALID", "验证码不正确、已过期或已失效。");
  }
  const expected = await hashVerificationCode(email, code, purpose, env);
  if (!constantTimeEqual(expected, row.code_hash)) {
    const attempts = Number(row.attempt_count || 0) + 1;
    await db.prepare(`
      UPDATE email_verification_codes
      SET attempt_count = ?, used_at = CASE WHEN ? >= ? THEN ? ELSE used_at END
      WHERE id = ?
    `).bind(attempts, attempts, MAX_VERIFICATION_ATTEMPTS, new Date().toISOString(), row.id).run();
    throw new ApiError(400, "VERIFICATION_CODE_INVALID", "验证码不正确、已过期或已失效。");
  }
  return row;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendVerificationEmail(env, { to, code, fullName = "", purpose = "register" }) {
  const apiKey = String(env.RESEND_API_KEY || "").trim();
  const from = String(env.EMAIL_FROM || "").trim();
  if (!apiKey || !from) {
    throw new ApiError(503, "EMAIL_UNAVAILABLE", "邮件服务暂时不可用，请稍后再试。");
  }
  const siteName = String(env.SITE_NAME || "Jia Honours").slice(0, 100);
  const safeSiteName = escapeHtml(siteName);
  const safeFullName = escapeHtml(String(fullName || "").slice(0, 160));
  const isReset = purpose === "reset";
  const subject = isReset ? `${siteName} Password Reset Code` : `${siteName} Verification Code`;
  const actionText = isReset ? "reset your password" : "complete your registration";
  const text = `Your Jia Honours verification code is ${code}. Use it to ${actionText}. This code expires in 10 minutes.`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1c1917">
      <h2>${safeSiteName}</h2>
      <p>${safeFullName ? `Dear ${safeFullName},` : "Hello,"}</p>
      <p>Use the following verification code to ${actionText}:</p>
      <p style="font-size:28px;font-weight:bold;letter-spacing:4px">${code}</p>
      <p>This code expires in 10 minutes. If you did not make this request, you can safely ignore this email.</p>
    </div>
  `;

  let response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, text, html }),
    });
  } catch (error) {
    throw new ApiError(503, "EMAIL_UNAVAILABLE", "邮件服务暂时不可用，请稍后再试。");
  }
  if (!response.ok) {
    console.error(`[email] provider returned status ${response.status}`);
    throw new ApiError(503, "EMAIL_UNAVAILABLE", "邮件服务暂时不可用，请稍后再试。");
  }
}
