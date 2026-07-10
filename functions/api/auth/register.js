import {
  adminEmails,
  ApiError,
  assertSameOrigin,
  createSession,
  enforceRateLimits,
  ensureCoreSchema,
  getDB,
  handleError,
  hashPassword,
  json,
  publicUser,
  randomId,
  readJson,
  requireSecurityEnv,
  sessionCookie,
  validateEmail,
  validateFullName,
  validatePassword,
  validatePhone,
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

    const fullName = validateFullName(body.fullName);
    const email = validateEmail(body.email);
    const emailConfirm = validateEmail(body.emailConfirm);
    if (email !== emailConfirm) {
      throw new ApiError(400, "EMAIL_MISMATCH", "两次输入的邮箱不一致。");
    }
    const password = validatePassword(body.password);
    const verificationCode = validateVerificationCode(body.verificationCode);
    const phone = validatePhone({
      iso: body.phoneCountryIso,
      countryCode: body.phoneCountryCode,
      number: body.phoneNumber,
    });

    await verifyTurnstile(request, env, body.turnstileToken, "auth");
    await enforceRateLimits(db, env, request, "register", [
      { scope: "ip-1h", limit: 10, windowSeconds: 60 * 60 },
      { scope: "email-1h", value: email, limit: 5, windowSeconds: 60 * 60 },
    ]);

    const existing = await db.prepare("SELECT id FROM users WHERE email = ? LIMIT 1").bind(email).first();
    if (existing) throw new ApiError(409, "EMAIL_EXISTS", "这个邮箱已经注册，可以直接登录。");

    const codeRow = await verifyEmailCode(db, env, {
      email,
      code: verificationCode,
      purpose: "register",
    });
    const id = randomId("usr");
    const now = new Date().toISOString();
    const passwordHash = await hashPassword(password);
    const role = adminEmails(env).includes(email) ? "admin" : "member";

    try {
      const results = await db.batch([
        db.prepare(`
          INSERT INTO users (
            id, full_name, email, password_hash, phone_country_iso, phone_country_code,
            phone_number, email_verified_at, password_changed_at, role, member_status,
            created_at, updated_at
          )
          SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '待完善资料', ?, ?
          WHERE EXISTS (
            SELECT 1 FROM email_verification_codes
            WHERE id = ? AND used_at IS NULL
          )
        `).bind(
          id,
          fullName,
          email,
          passwordHash,
          phone.phoneCountryIso,
          phone.phoneCountryCode,
          phone.phoneNumber,
          now,
          now,
          role,
          now,
          now,
          codeRow.id
        ),
        db.prepare("UPDATE email_verification_codes SET used_at = ? WHERE id = ? AND used_at IS NULL")
          .bind(now, codeRow.id),
      ]);
      const userChanges = Number(results[0] && results[0].meta && results[0].meta.changes);
      const codeChanges = Number(results[1] && results[1].meta && results[1].meta.changes);
      if ((Number.isFinite(userChanges) && userChanges !== 1) || (Number.isFinite(codeChanges) && codeChanges !== 1)) {
        throw new ApiError(409, "VERIFICATION_CODE_USED", "验证码已失效，请重新获取。");
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (/unique constraint failed:\s*users\.email/i.test(String(error && error.message))) {
        throw new ApiError(409, "EMAIL_EXISTS", "这个邮箱已经注册，可以直接登录。");
      }
      throw error;
    }

    const row = await db.prepare(`
      SELECT id, full_name, email, phone_country_iso, phone_country_code, phone_number,
             email_verified_at, role, member_status, created_at
      FROM users WHERE id = ?
    `).bind(id).first();
    const token = await createSession(id, request, env, db);
    return json({ user: publicUser(row) }, 201, { "Set-Cookie": sessionCookie(token) });
  } catch (error) {
    return handleError(error, "注册失败，请稍后再试。", "auth/register");
  }
}
