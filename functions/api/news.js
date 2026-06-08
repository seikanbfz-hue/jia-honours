import { currentUser, d1Error, getDB, json } from "../_utils.js";

const LAUNCH_NEWS_ID = "news_20260608_launch";

async function ensureNewsTable(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS site_news (
      id TEXT PRIMARY KEY,
      visibility TEXT NOT NULL DEFAULT 'public',
      title_zh TEXT NOT NULL,
      title_ja TEXT,
      title_en TEXT,
      body_zh TEXT NOT NULL,
      body_ja TEXT,
      body_en TEXT,
      is_published INTEGER NOT NULL DEFAULT 1,
      is_pinned INTEGER NOT NULL DEFAULT 0,
      published_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_site_news_visibility ON site_news(visibility, is_published, published_at)`).run();

  const existing = await db.prepare("SELECT id FROM site_news WHERE id = ?").bind(LAUNCH_NEWS_ID).first();
  if (existing) {
    await db.prepare("UPDATE site_news SET title_ja = ?, body_ja = ?, updated_at = ? WHERE id = ?")
      .bind('賈氏勲賞公式サイト公開のお知らせ', '本日、賈氏勲賞公式サイトを公開いたしました。本サイトでは、賈氏勲章制度、家門儀礼、名誉称号、会員に関するお知らせを整理し、制度整備、文化継承、公益交流の歩みを順次記録してまいります。\n\nご関心をお寄せくださる皆様に、心より御礼申し上げます。開設初期につき、表記、内容、レイアウト、機能面で至らない点が残る場合がございます。お気づきの点がございましたら、公式連絡先 jia.honours@gmail.com までお知らせください。いただいたご意見を参考に、サイト内容と会員向けサービスを整えてまいります。', new Date().toISOString(), LAUNCH_NEWS_ID)
      .run();
  }

  if (!existing) {
    await db.prepare(`
      INSERT INTO site_news (
        id, visibility, title_zh, title_ja, title_en,
        body_zh, body_ja, body_en,
        is_published, is_pinned, published_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?, ?)
    `).bind(
      LAUNCH_NEWS_ID,
      "public",
      "贾氏勋赏官网正式上线",
      "賈氏勲賞公式サイト公開のお知らせ",
      "Jia Honours Official Website Launches",
      "自今日起，贾氏勋赏官网正式上线。本网站将作为贾氏勋章制度、家门礼仪、名誉头衔、会员事务与相关通知的公开整理平台，持续记录制度建设、文化承继与公益交流的进展。\n\n感谢各位的关注与支持。网站初建，仍有需要完善之处；若您在浏览过程中发现内容、文字、排版或功能上的不足，欢迎通过官方邮箱 jia.honours@gmail.com 与我们联系。我们将认真参考来信意见，逐步完善网站内容与会员服务。",
      "本日、賈氏勲賞公式サイトを公開いたしました。本サイトでは、賈氏勲章制度、家門儀礼、名誉称号、会員に関するお知らせを整理し、制度整備、文化継承、公益交流の歩みを順次記録してまいります。\n\nご関心をお寄せくださる皆様に、心より御礼申し上げます。開設初期につき、表記、内容、レイアウト、機能面で至らない点が残る場合がございます。お気づきの点がございましたら、公式連絡先 jia.honours@gmail.com までお知らせください。いただいたご意見を参考に、サイト内容と会員向けサービスを整えてまいります。",
      "The Jia Honours official website is now formally online. This website will serve as the official platform for presenting the Jia honours system, family ceremonial framework, honorary titles, membership matters, and related notices, while recording the continuing development of the institution, cultural continuity, and public-service exchange.\n\nWe sincerely thank all visitors for their attention and support. As the website has just been launched, there will still be areas to refine. If you notice any issue regarding content, wording, layout, or functionality, please contact us at jia.honours@gmail.com. We will review feedback carefully and continue improving the website and member services step by step.",
      "2026-06-08",
      new Date().toISOString(),
      new Date().toISOString()
    ).run();
  }
}

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
    await ensureNewsTable(db);

    let user = null;
    if (env.SESSION_SECRET) {
      try { user = await currentUser(request, env); } catch (e) { user = null; }
    }

    const memberVisible = user ? 1 : 0;
    const rows = await db.prepare(`
      SELECT id, visibility, title_zh, title_ja, title_en, body_zh, body_ja, body_en,
             is_pinned, published_at, created_at, updated_at
      FROM site_news
      WHERE is_published = 1
        AND (visibility = 'public' OR (? = 1 AND visibility = 'members'))
      ORDER BY is_pinned DESC, published_at DESC, created_at DESC
      LIMIT 50
    `).bind(memberVisible).all();

    return json({ authenticated: Boolean(user), news: (rows.results || []).map(publicNews) });
  } catch (error) {
    const e = d1Error(error);
    return json({ error: e.message || "新闻读取失败。" }, 500);
  }
}
