import {
  ApiError,
  assertSameOrigin,
  createSession,
  enforceRateLimits,
  ensureCoreSchema,
  getDB,
  handleError,
  json,
  publicUser,
  readJson,
  requireSecurityEnv,
  sessionCookie,
  validateEmail,
  validatePassword,
  verifyPassword,
  verifyTurnstile,
} from "../../_utils.js";

export async function onRequestPost({ request, env }) {
  try {
    assertSameOrigin(request, env);
    requireSecurityEnv(env);
    const db = getDB(env);
    await ensureCoreSchema(db);
    const body = await readJson(request);
    const email = validateEmail(body.email);
    const password = validatePassword(body.password);

    await verifyTurnstile(request, env, body.turnstileToken, "login");
    await enforceRateLimits(db, env, request, "login", [
      { scope: "ip-15m", limit: 20, windowSeconds: 15 * 60 },
      { scope: "email-15m", value: email, limit: 10, windowSeconds: 15 * 60 },
    ]);

    const row = await db.prepare(`
      SELECT id, full_name, email, phone_country_iso, phone_country_code, phone_number,
             email_verified_at, password_hash, role, member_status, created_at
      FROM users WHERE email = ? LIMIT 1
    `).bind(email).first();
    if (!row) throw new ApiError(401, "INVALID_CREDENTIALS", "邮箱或密码不正确。");

    const result = await verifyPassword(password, row.password_hash);
    if (result.needsReset) {
      throw new ApiError(409, "PASSWORD_RESET_REQUIRED", "为保护账户安全，请使用密码重置功能设置新密码。");
    }
    if (!result.ok) throw new ApiError(401, "INVALID_CREDENTIALS", "邮箱或密码不正确。");

    const token = await createSession(row.id, request, env, db);
    await db.prepare("UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?")
      .bind(new Date().toISOString(), new Date().toISOString(), row.id)
      .run();
    return json({ user: publicUser(row) }, 200, { "Set-Cookie": sessionCookie(token) });
  } catch (error) {
    return handleError(error, "登录失败，请稍后再试。", "auth/login");
  }
}
