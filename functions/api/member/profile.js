import {
  ApiError,
  assertSameOrigin,
  currentUser,
  enforceRateLimits,
  ensureCoreSchema,
  getDB,
  handleError,
  json,
  readJson,
  requireSecurityEnv,
} from "../../_utils.js";

const PROFILE_COLUMNS = [
  "display_name",
  "name_en",
  "nationality",
  "residence_country",
  "occupation",
  "noble_title_status",
  "honours_record_status",
  "biography",
];

function cleanText(value, maxLength, code) {
  const text = String(value || "").trim().replace(/\r\n/g, "\n");
  if (!text || text.length > maxLength || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)) {
    throw new ApiError(400, code, "请完整填写正式会员资料，并检查字段长度。");
  }
  return text;
}

function cleanChoice(value, code) {
  const text = String(value || "").trim();
  if (!["yes", "no", "undisclosed"].includes(text)) {
    throw new ApiError(400, code, "请完整填写正式会员资料。");
  }
  return text;
}

function cleanProfile(body) {
  return {
    display_name: cleanText(body.displayName, 160, "INVALID_DISPLAY_NAME"),
    name_en: cleanText(body.nameEn, 160, "INVALID_ENGLISH_NAME"),
    nationality: cleanText(body.nationality, 120, "INVALID_NATIONALITY"),
    residence_country: cleanText(body.residenceCountry, 120, "INVALID_RESIDENCE"),
    occupation: cleanText(body.occupation, 160, "INVALID_OCCUPATION"),
    noble_title_status: cleanChoice(body.nobleTitleStatus, "INVALID_NOBLE_STATUS"),
    honours_record_status: cleanChoice(body.honoursRecordStatus, "INVALID_HONOURS_STATUS"),
    biography: cleanText(body.biography, 350, "INVALID_BIOGRAPHY"),
  };
}

function profileFromRow(row) {
  if (!row) return {};
  return {
    displayName: row.display_name || "",
    nameEn: row.name_en || "",
    nationality: row.nationality || "",
    residenceCountry: row.residence_country || "",
    occupation: row.occupation || "",
    nobleTitleStatus: row.noble_title_status || "",
    honoursRecordStatus: row.honours_record_status || "",
    biography: row.biography || "",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
  };
}

export async function onRequestGet({ request, env }) {
  try {
    const user = await currentUser(request, env);
    if (!user) throw new ApiError(401, "AUTH_REQUIRED", "请先登录。");
    const db = getDB(env);
    await ensureCoreSchema(db);
    const row = await db.prepare(`
      SELECT ${PROFILE_COLUMNS.join(", ")}, created_at, updated_at
      FROM member_profiles WHERE user_id = ?
    `).bind(user.id).first();
    return json({ profile: profileFromRow(row) });
  } catch (error) {
    return handleError(error, "会员资料读取失败，请稍后再试。", "member/profile:get");
  }
}

export async function onRequestPost({ request, env }) {
  try {
    assertSameOrigin(request, env);
    requireSecurityEnv(env);
    const user = await currentUser(request, env);
    if (!user) throw new ApiError(401, "AUTH_REQUIRED", "请先登录。");
    const db = getDB(env);
    await ensureCoreSchema(db);
    await enforceRateLimits(db, env, request, "save-profile", [
      { scope: "user-1h", value: user.id, limit: 30, windowSeconds: 60 * 60 },
    ]);
    const body = await readJson(request, { maxBytes: 24 * 1024 });
    const profile = cleanProfile(body);
    const now = new Date().toISOString();
    const values = PROFILE_COLUMNS.map((column) => profile[column]);
    const updates = PROFILE_COLUMNS.map((column) => `${column} = excluded.${column}`).join(", ");
    await db.batch([
      db.prepare(`
        INSERT INTO member_profiles (
          user_id, ${PROFILE_COLUMNS.join(", ")}, created_at, updated_at
        ) VALUES (?, ${PROFILE_COLUMNS.map(() => "?").join(", ")}, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET ${updates}, updated_at = excluded.updated_at
      `).bind(user.id, ...values, now, now),
      db.prepare("UPDATE users SET member_status = ?, updated_at = ? WHERE id = ?")
        .bind("正式会员", now, user.id),
    ]);
    const row = await db.prepare(`
      SELECT ${PROFILE_COLUMNS.join(", ")}, created_at, updated_at
      FROM member_profiles WHERE user_id = ?
    `).bind(user.id).first();
    return json({ ok: true, profile: profileFromRow(row), memberStatus: "正式会员" });
  } catch (error) {
    return handleError(error, "会员资料保存失败，请稍后再试。", "member/profile:post");
  }
}
