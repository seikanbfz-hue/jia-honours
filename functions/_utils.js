const encoder = new TextEncoder();

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...headers,
    },
  });
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch (error) {
    return null;
  }
}

export function getDB(env) {
  if (env && env.DB && typeof env.DB.prepare === "function") return env.DB;

  // Fallback: find any D1 binding even if Cloudflare dashboard name was not exactly "DB".
  for (const [key, value] of Object.entries(env || {})) {
    if (value && typeof value.prepare === "function" && typeof value.batch === "function") {
      try { env.DB = value; } catch (e) {}
      return value;
    }
  }

  const available = Object.keys(env || {}).sort().join(", ") || "none";
  throw new Error(`D1 binding DB is not configured. Available environment keys: ${available}`);
}

export function requireEnv(env) {
  getDB(env);
  if (!env.SESSION_SECRET) throw new Error("SESSION_SECRET is not configured.");
}

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phoneCountryIso: row.phone_country_iso,
    phoneCountryCode: row.phone_country_code,
    phoneNumber: row.phone_number,
    emailVerifiedAt: row.email_verified_at,
    role: row.role,
    memberStatus: row.member_status,
    createdAt: row.created_at,
  };
}

export function randomId(prefix = "usr") {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return `${prefix}_${base64url(bytes)}`;
}

export function base64url(input) {
  let bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function fromBase64url(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function hashPassword(password) {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const iterations = 150000;
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
  return `${iterations}.${base64url(salt)}.${base64url(new Uint8Array(bits))}`;
}

export async function verifyPassword(password, stored) {
  const [iterationsRaw, saltRaw, hashRaw] = String(stored || "").split(".");
  const iterations = Number(iterationsRaw);
  if (!iterations || !saltRaw || !hashRaw) return false;

  const salt = fromBase64url(saltRaw);
  const expected = fromBase64url(hashRaw);
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
  const actual = new Uint8Array(bits);
  if (actual.length !== expected.length) return false;

  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}

async function hmac(secret, payload) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return base64url(new Uint8Array(signature));
}

export async function createSession(userId, env) {
  const payload = base64url(encoder.encode(JSON.stringify({
    uid: userId,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
  })));
  const sig = await hmac(env.SESSION_SECRET, payload);
  return `${payload}.${sig}`;
}

export async function verifySessionToken(token, env) {
  if (!token || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  const expected = await hmac(env.SESSION_SECRET, payload);
  if (sig !== expected) return null;

  let data;
  try {
    data = JSON.parse(new TextDecoder().decode(fromBase64url(payload)));
  } catch (e) {
    return null;
  }
  if (!data.uid || !data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
  return data.uid;
}

export function getCookie(request, name) {
  const cookie = request.headers.get("Cookie") || "";
  const parts = cookie.split(";").map((part) => part.trim());
  for (const part of parts) {
    const [key, ...rest] = part.split("=");
    if (key === name) return rest.join("=");
  }
  return null;
}

export function sessionCookie(token) {
  return `jia_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`;
}

export function clearSessionCookie() {
  return "jia_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
}

export function adminEmails(env) {
  return String(env.ADMIN_EMAILS || "")
    .split(",")
    .map((x) => normalizeEmail(x))
    .filter(Boolean);
}

export async function currentUser(request, env) {
  requireEnv(env);
  const token = getCookie(request, "jia_session");
  const uid = await verifySessionToken(token, env);
  if (!uid) return null;
  const row = await env.DB.prepare(
    "SELECT id, full_name, email, phone_country_iso, phone_country_code, phone_number, email_verified_at, role, member_status, created_at FROM users WHERE id = ?"
  ).bind(uid).first();
  return publicUser(row);
}


export async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(String(value)));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashVerificationCode(email, code, env) {
  return sha256Hex(`${normalizeEmail(email)}:${String(code).trim()}:${env.SESSION_SECRET}`);
}

export function cleanPhoneNumber(value) {
  return String(value || "").replace(/[^\d]/g, "");
}

export function validatePhoneNumber(value) {
  const cleaned = cleanPhoneNumber(value);
  return cleaned.length >= 6 && cleaned.length <= 15;
}

export async function sendVerificationEmail(env, { to, code, fullName }) {
  const siteName = env.SITE_NAME || "Jia Honours";
  const subject = `${siteName} verification code`;
  const text = `Your verification code is ${code}. It expires in 10 minutes.`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1c1917">
      <h2>${siteName}</h2>
      <p>${fullName ? `Dear ${fullName},` : "Hello,"}</p>
      <p>Your verification code is:</p>
      <p style="font-size:28px;font-weight:bold;letter-spacing:4px">${code}</p>
      <p>This code expires in 10 minutes.</p>
    </div>
  `;

  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    throw new Error("Email provider is not configured. Set RESEND_API_KEY and EMAIL_FROM.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to,
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Failed to send email: ${detail}`);
  }

  return true;
}

