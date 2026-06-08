import { currentUser, d1Error, getDB, json } from "../../_utils.js";

export async function onRequestGet({ request, env }) {
  try {
    const user = await currentUser(request, env);
    if (!user || user.role !== "admin") return json({ error: "没有管理员权限。" }, 403);

    const db = getDB(env);
    const rows = await db.prepare(
      `SELECT id, full_name, email, phone_country_iso, phone_country_code, phone_number, email_verified_at, role, member_status, created_at, last_login_at
       FROM users ORDER BY created_at DESC LIMIT 200`
    ).all();

    return json({ users: rows.results || [] });
  } catch (error) {
    const e = d1Error(error);
    return json({ error: e.message || "读取失败。" }, 500);
  }
}
