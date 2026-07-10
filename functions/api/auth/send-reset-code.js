import {
  activateVerificationCode,
  ApiError,
  assertSameOrigin,
  deleteVerificationCode,
  enforceRateLimits,
  ensureCoreSchema,
  getDB,
  handleError,
  insertVerificationCode,
  json,
  randomVerificationCode,
  readJson,
  requireSecurityEnv,
  sendVerificationEmail,
  validateEmail,
  verifyTurnstile,
} from "../../_utils.js";

export async function onRequestPost({ request, env }) {
  try {
    assertSameOrigin(request, env);
    requireSecurityEnv(env);
    if (!String(env.RESEND_API_KEY || "").trim() || !String(env.EMAIL_FROM || "").trim()) {
      throw new ApiError(503, "EMAIL_UNAVAILABLE", "邮件服务暂时不可用，请稍后再试。");
    }
    const db = getDB(env);
    await ensureCoreSchema(db);
    const body = await readJson(request);
    const email = validateEmail(body.email);

    await verifyTurnstile(request, env, body.turnstileToken, "send-reset-code");
    await enforceRateLimits(db, env, request, "send-reset-code", [
      { scope: "ip-10m", limit: 5, windowSeconds: 10 * 60 },
      { scope: "email-1m", value: email, limit: 1, windowSeconds: 60 },
      { scope: "email-1h", value: email, limit: 5, windowSeconds: 60 * 60 },
    ]);

    const user = await db.prepare("SELECT id, full_name FROM users WHERE email = ? LIMIT 1").bind(email).first();
    if (user) {
      const code = randomVerificationCode();
      const record = await insertVerificationCode(db, env, {
        email,
        code,
        purpose: "reset",
        request,
      });
      try {
        await sendVerificationEmail(env, {
          to: email,
          code,
          fullName: user.full_name || "",
          purpose: "reset",
        });
        await activateVerificationCode(db, { id: record.id, email, purpose: "reset" });
      } catch (error) {
        await deleteVerificationCode(db, record.id);
        throw error;
      }
    }

    // Deliberately do not reveal whether the account exists.
    return json({ ok: true });
  } catch (error) {
    return handleError(error, "密码重置验证码发送失败，请稍后再试。", "auth/send-reset-code");
  }
}
