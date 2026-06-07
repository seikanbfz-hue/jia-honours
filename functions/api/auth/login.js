import {
  createSession,
  json,
  normalizeEmail,
  publicUser,
  readJson,
  requireEnv,
  sessionCookie,
  verifyPassword,
} from "../../_utils.js";

export async function onRequestPost({ request, env }) {
  try {
    requireEnv(env);
    const body = await readJson(request);
    if (!body) return json({ error: "请求格式不正确。" }, 400);

    const email = normalizeEmail(body.email);
    const password = String(body.password || "");
    if (!email || !password) return json({ error: "请输入邮箱和密码。" }, 400);

    const row = await env.DB.prepare(
      "SELECT id, full_name, email, phone_country_iso, phone_country_code, phone_number, email_verified_at, password_hash, role, member_status, created_at FROM users WHERE email = ?"
    ).bind(email).first();

    if (!row) return json({ error: "邮箱或密码不正确。" }, 401);
    const ok = await verifyPassword(password, row.password_hash);
    if (!ok) return json({ error: "邮箱或密码不正确。" }, 401);

    await env.DB.prepare("UPDATE users SET last_login_at = ? WHERE id = ?")
      .bind(new Date().toISOString(), row.id)
      .run();

    const token = await createSession(row.id, env);
    return json({ user: publicUser(row) }, 200, { "Set-Cookie": sessionCookie(token) });
  } catch (error) {
    return json({ error: error.message || "登录失败。" }, 500);
  }
}
