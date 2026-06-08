import {
  getDB,
  d1Error,
  hashVerificationCode,
  json,
  normalizeEmail,
  randomId,
  readJson,
  requireEnv,
  sendVerificationEmail,
} from "../../_utils.js";

export async function onRequestPost({ request, env }) {
  try {
    requireEnv(env);
    const db = getDB(env);
    const body = await readJson(request);
    if (!body) return json({ error: "请求格式不正确。" }, 400);

    const email = normalizeEmail(body.email);
    const fullName = String(body.fullName || "").trim();
    if (!email || !email.includes("@")) return json({ error: "请输入有效邮箱地址。" }, 400);

    const existing = await db.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
    if (existing) return json({ error: "这个邮箱已经注册，可以直接登录。" }, 409);

    const now = Date.now();
    const recent = await db.prepare(
      `SELECT created_at FROM email_verification_codes
       WHERE email = ? ORDER BY created_at DESC LIMIT 1`
    ).bind(email).first();

    if (recent && Date.parse(recent.created_at) > now - 60 * 1000) {
      return json({ error: "验证码发送过于频繁，请稍后再试。" }, 429);
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await hashVerificationCode(email, code, env);
    const createdAt = new Date(now).toISOString();
    const expiresAt = new Date(now + 10 * 60 * 1000).toISOString();

    await db.prepare(
      `INSERT INTO email_verification_codes (id, email, code_hash, created_at, expires_at, used_at)
       VALUES (?, ?, ?, ?, ?, NULL)`
    ).bind(randomId("evc"), email, codeHash, createdAt, expiresAt).run();

    await sendVerificationEmail(env, { to: email, code, fullName });

    return json({ ok: true });
  } catch (error) {
    const e = d1Error(error);
    return json({ error: e.message || "验证码发送失败。" }, 500);
  }
}
