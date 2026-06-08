import { currentUser, d1Error, getDB, json, readJson } from "../../_utils.js";

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

const PROFILE_COLUMN_DEFINITIONS = {
  display_name: "TEXT",
  name_en: "TEXT",
  nationality: "TEXT",
  residence_country: "TEXT",
  occupation: "TEXT",
  noble_title_status: "TEXT",
  honours_record_status: "TEXT",
  biography: "TEXT",
};

async function ensureProfileTable(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS member_profiles (
      user_id TEXT PRIMARY KEY,
      display_name TEXT,
      name_en TEXT,
      nationality TEXT,
      residence_country TEXT,
      occupation TEXT,
      noble_title_status TEXT,
      honours_record_status TEXT,
      biography TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `).run();

  // If the site already used the older profile table, add the new columns without deleting data.
  const info = await db.prepare("PRAGMA table_info(member_profiles)").all();
  const existing = new Set((info.results || []).map((row) => row.name));
  for (const column of PROFILE_COLUMNS) {
    if (!existing.has(column)) {
      await db.prepare(`ALTER TABLE member_profiles ADD COLUMN ${column} ${PROFILE_COLUMN_DEFINITIONS[column]}`).run();
    }
  }
}

function cleanText(value, maxLength = 1000) {
  const text = String(value || "").trim();
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

function cleanChoice(value) {
  const text = String(value || "").trim();
  return ["yes", "no", "undisclosed"].includes(text) ? text : "";
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

function cleanProfile(body) {
  return {
    display_name: cleanText(body.displayName, 160),
    name_en: cleanText(body.nameEn, 160),
    nationality: cleanText(body.nationality, 120),
    residence_country: cleanText(body.residenceCountry, 120),
    occupation: cleanText(body.occupation, 160),
    noble_title_status: cleanChoice(body.nobleTitleStatus),
    honours_record_status: cleanChoice(body.honoursRecordStatus),
    biography: cleanText(body.biography, 350),
  };
}

function isCompleteProfile(profile) {
  return PROFILE_COLUMNS.every((column) => Boolean(profile[column]));
}

export async function onRequestGet({ request, env }) {
  try {
    const user = await currentUser(request, env);
    if (!user) return json({ error: "请先登录。" }, 401);

    const db = getDB(env);
    await ensureProfileTable(db);

    const row = await db.prepare(
      `SELECT ${PROFILE_COLUMNS.join(", ")}, created_at, updated_at FROM member_profiles WHERE user_id = ?`
    ).bind(user.id).first();

    return json({ profile: profileFromRow(row) });
  } catch (error) {
    const e = d1Error(error);
    return json({ error: e.message || "读取失败。" }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const user = await currentUser(request, env);
    if (!user) return json({ error: "请先登录。" }, 401);

    const db = getDB(env);
    await ensureProfileTable(db);

    const body = await readJson(request);
    if (!body) return json({ error: "请求格式不正确。" }, 400);

    const profile = cleanProfile(body);
    if (!isCompleteProfile(profile)) return json({ error: "请完整填写正式会员资料。" }, 400);
    if ((body.biography || "").trim().length > 350) return json({ error: "个人简介不能超过 350 字。" }, 400);

    const now = new Date().toISOString();
    const values = PROFILE_COLUMNS.map((column) => profile[column]);
    const updateAssignments = PROFILE_COLUMNS.map((column) => `${column} = excluded.${column}`).join(", ");

    await db.prepare(
      `INSERT INTO member_profiles (
        user_id, ${PROFILE_COLUMNS.join(", ")}, created_at, updated_at
      ) VALUES (
        ?, ${PROFILE_COLUMNS.map(() => "?").join(", ")}, ?, ?
      )
      ON CONFLICT(user_id) DO UPDATE SET
        ${updateAssignments},
        updated_at = excluded.updated_at`
    ).bind(user.id, ...values, now, now).run();

    await db.prepare("UPDATE users SET member_status = ?, updated_at = ? WHERE id = ?")
      .bind("正式会员", now, user.id)
      .run();

    const row = await db.prepare(
      `SELECT ${PROFILE_COLUMNS.join(", ")}, created_at, updated_at FROM member_profiles WHERE user_id = ?`
    ).bind(user.id).first();

    return json({ ok: true, profile: profileFromRow(row), memberStatus: "正式会员" });
  } catch (error) {
    const e = d1Error(error);
    return json({ error: e.message || "保存失败。" }, 500);
  }
}
