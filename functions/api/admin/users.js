import { ApiError, currentUser, ensureCoreSchema, getDB, handleError, json } from "../../_utils.js";

export async function onRequestGet({ request, env }) {
  try {
    const user = await currentUser(request, env);
    if (!user || user.role !== "admin") {
      throw new ApiError(403, "ADMIN_REQUIRED", "没有管理员权限。");
    }
    const db = getDB(env);
    await ensureCoreSchema(db);
    const rows = await db.prepare(`
      SELECT id, full_name, email, phone_country_iso, phone_country_code, phone_number,
             email_verified_at, role, member_status, created_at, last_login_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 200
    `).all();
    return json({ users: rows.results || [] });
  } catch (error) {
    return handleError(error, "会员资料读取失败，请稍后再试。", "admin/users");
  }
}
