import { currentUser, ensureCoreSchema, getDB, handleError, json } from "../_utils.js";

function publicNews(row) {
  return {
    id: row.id,
    visibility: row.visibility,
    titleZh: row.title_zh || "",
    titleJa: row.title_ja || "",
    titleEn: row.title_en || "",
    bodyZh: row.body_zh || "",
    bodyJa: row.body_ja || "",
    bodyEn: row.body_en || "",
    isPinned: Boolean(row.is_pinned),
    publishedAt: row.published_at || "",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
  };
}

export async function onRequestGet({ request, env }) {
  try {
    const db = getDB(env);
    await ensureCoreSchema(db);
    const user = await currentUser(request, env);
    const rows = await db.prepare(`
      SELECT id, visibility, title_zh, title_ja, title_en, body_zh, body_ja, body_en,
             is_pinned, published_at, created_at, updated_at
      FROM site_news
      WHERE is_published = 1
        AND visibility IN ('public', 'members')
        AND (visibility = 'public' OR (? = 1 AND visibility = 'members'))
      ORDER BY is_pinned DESC, published_at DESC, created_at DESC
      LIMIT 50
    `).bind(user ? 1 : 0).all();
    return json({ authenticated: Boolean(user), news: (rows.results || []).map(publicNews) });
  } catch (error) {
    return handleError(error, "新闻读取失败，请稍后再试。", "news");
  }
}
