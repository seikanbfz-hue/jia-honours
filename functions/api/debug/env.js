import { ApiError, currentUser, ensureCoreSchema, getDB, handleError, json } from "../../_utils.js";

export async function onRequestGet({ request, env }) {
  try {
    const user = await currentUser(request, env);
    if (!user || user.role !== "admin") {
      throw new ApiError(404, "NOT_FOUND", "未找到该页面。");
    }
    const db = getDB(env);
    await ensureCoreSchema(db);
    const probe = await db.prepare("SELECT 1 AS ok").first();
    return json({
      ok: probe && probe.ok === 1,
      databaseReady: true,
      revocableSessions: true,
      emailConfigured: Boolean(String(env.RESEND_API_KEY || "").trim() && String(env.EMAIL_FROM || "").trim()),
      turnstileConfigured: Boolean(String(env.TURNSTILE_SECRET_KEY || "").trim() && String(env.TURNSTILE_SITE_KEY || "").trim()),
    });
  } catch (error) {
    return handleError(error, "状态检查失败，请稍后再试。", "debug/env");
  }
}
