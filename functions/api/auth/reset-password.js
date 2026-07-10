import {
  ApiError,
  assertSameOrigin,
  enforceRateLimits,
  ensureCoreSchema,
  getDB,
  handleError,
  hashPassword,
  json,
  readJson,
  requireSecurityEnv,
  validateEmail,
  validatePassword,
  validateVerificationCode,
  verifyEmailCode,
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
    const code = validateVerificationCode(body.verificationCode);
    const password = validatePassword(body.password);

    await verifyTurnstile(request, env, body.turnstileToken, "reset-password");
    await enforceRateLimits(db, env, request, "reset-password", [
      { scope: "ip-1h", limit: 10, windowSeconds: 60 * 60 },
      { scope: "email-1h", value: email, limit: 10, windowSeconds: 60 * 60 },
    ]);

    const user = await db.prepare("SELECT id FROM users WHERE email = ? LIMIT 1").bind(email).first();
    if (!user) {
      throw new ApiError(400, "VERIFICATION_CODE_INVALID", "验证码不正确、已过期或已失效。");
    }
    const codeRow = await verifyEmailCode(db, env, { email, code, purpose: "reset" });
    const passwordHash = await hashPassword(password);
    const now = new Date().toISOString();
    const results = await db.batch([
      db.prepare(`
        UPDATE users
        SET password_hash = ?, password_changed_at = ?, updated_at = ?
        WHERE id = ?
          AND EXISTS (
            SELECT 1 FROM email_verification_codes
            WHERE id = ? AND used_at IS NULL
          )
      `).bind(passwordHash, now, now, user.id, codeRow.id),
      db.prepare("UPDATE email_verification_codes SET used_at = ? WHERE id = ? AND used_at IS NULL")
        .bind(now, codeRow.id),
      db.prepare("UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL")
        .bind(now, user.id),
    ]);
    const passwordChanges = Number(results[0] && results[0].meta && results[0].meta.changes);
    if (Number.isFinite(passwordChanges) && passwordChanges !== 1) {
      throw new ApiError(409, "VERIFICATION_CODE_USED", "验证码已失效，请重新获取。");
    }

    return json({ ok: true });
  } catch (error) {
    return handleError(error, "密码重置失败，请稍后再试。", "auth/reset-password");
  }
}
