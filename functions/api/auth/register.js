import {
  getDB,
  d1Error,
  adminEmails,
  cleanPhoneNumber,
  createSession,
  hashPassword,
  hashVerificationCode,
  json,
  normalizeEmail,
  publicUser,
  randomId,
  readJson,
  requireEnv,
  sessionCookie,
  validatePhoneNumber,
} from "../../_utils.js";

export async function onRequestPost({ request, env }) {
  try {
    requireEnv(env);
    const db = getDB(env);
    const body = await readJson(request);
    if (!body) return json({ error: "请求格式不正确。" }, 400);

    const fullName = String(body.fullName || "").trim();
    const email = normalizeEmail(body.email);
    const emailConfirm = normalizeEmail(body.emailConfirm);
    const password = String(body.password || "");
    const verificationCode = String(body.verificationCode || "").trim();
    const phoneCountryIso = String(body.phoneCountryIso || "").trim().toUpperCase();
    const phoneCountryCode = String(body.phoneCountryCode || "").trim();
    const phoneNumber = cleanPhoneNumber(body.phoneNumber);

    if (!fullName || !email || !emailConfirm || !password || !verificationCode || !phoneCountryCode || !phoneNumber) {
      return json({ error: "请填写姓名、邮箱、确认邮箱、电话、验证码和密码。" }, 400);
    }
    if (email !== emailConfirm) return json({ error: "两次输入的邮箱不一致。" }, 400);
    if (!email.includes("@")) return json({ error: "请输入有效邮箱地址。" }, 400);
    if (password.length < 8) return json({ error: "密码至少需要 8 位。" }, 400);
    if (!validatePhoneNumber(phoneNumber)) return json({ error: "请输入有效电话号码。" }, 400);

    const existing = await db.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
    if (existing) return json({ error: "这个邮箱已经注册，可以直接登录。" }, 409);

    const codeHash = await hashVerificationCode(email, verificationCode, env);
    const codeRow = await db.prepare(
      `SELECT id, expires_at, used_at FROM email_verification_codes
       WHERE email = ? AND code_hash = ? ORDER BY created_at DESC LIMIT 1`
    ).bind(email, codeHash).first();

    if (!codeRow || codeRow.used_at) return json({ error: "邮箱验证码不正确。" }, 400);
    if (Date.parse(codeRow.expires_at) < Date.now()) return json({ error: "邮箱验证码已过期，请重新发送。" }, 400);

    const id = randomId("usr");
    const passwordHash = await hashPassword(password);
    const role = adminEmails(env).includes(email) ? "admin" : "member";
    const now = new Date().toISOString();

    await db.prepare(
      `INSERT INTO users (
        id, full_name, email, password_hash, phone_country_iso, phone_country_code, phone_number,
        email_verified_at, role, member_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id, fullName, email, passwordHash, phoneCountryIso, phoneCountryCode, phoneNumber,
      now, role, "待完善资料", now, now
    ).run();

    await db.prepare("UPDATE email_verification_codes SET used_at = ? WHERE id = ?")
      .bind(now, codeRow.id)
      .run();

    const row = await db.prepare(
      "SELECT id, full_name, email, phone_country_iso, phone_country_code, phone_number, email_verified_at, role, member_status, created_at FROM users WHERE id = ?"
    ).bind(id).first();

    const token = await createSession(id, env);
    return json({ user: publicUser(row) }, 201, { "Set-Cookie": sessionCookie(token) });
  } catch (error) {
    const e = d1Error(error);
    return json({ error: e.message || "注册失败。" }, 500);
  }
}
