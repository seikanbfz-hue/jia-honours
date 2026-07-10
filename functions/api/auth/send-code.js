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
  validateFullName,
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
    const fullName = validateFullName(body.fullName, { optional: true });

    await verifyTurnstile(request, env, body.turnstileToken, "send-code");
    await enforceRateLimits(db, env, request, "send-register-code", [
      { scope: "ip-10m", limit: 5, windowSeconds: 10 * 60 },
      { scope: "email-1m", value: email, limit: 1, windowSeconds: 60 },
      { scope: "email-1h", value: email, limit: 5, windowSeconds: 60 * 60 },
    ]);

    const existing = await db.prepare("SELECT id FROM users WHERE email = ? LIMIT 1").bind(email).first();
    if (existing) {
      throw new ApiError(409, "EMAIL_EXISTS", "这个邮箱已经注册，可以直接登录。");
    }

    const code = randomVerificationCode();
    const record = await insertVerificationCode(db, env, {
      email,
      code,
      purpose: "register",
      request,
    });
    try {
      await sendVerificationEmail(env, { to: email, code, fullName, purpose: "register" });
      await activateVerificationCode(db, { id: record.id, email, purpose: "register" });
    } catch (error) {
      await deleteVerificationCode(db, record.id);
      throw error;
    }

    return json({ ok: true });
  } catch (error) {
    return handleError(error, "验证码发送失败，请稍后再试。", "auth/send-code");
  }
}
