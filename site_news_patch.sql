-- Jia Honours current news patch (safe to re-run in Cloudflare D1).

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
);

CREATE INDEX IF NOT EXISTS idx_site_news_visibility
  ON site_news(visibility, is_published, published_at);

CREATE TABLE IF NOT EXISTS app_migrations (
  name TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);

INSERT INTO site_news (
  id, visibility, title_zh, title_ja, title_en,
  body_zh, body_ja, body_en,
  is_published, is_pinned, published_at, created_at, updated_at
) VALUES (
  'news_20260608_launch',
  'public',
  '贾氏勋章官方网站正式上线',
  '賈氏勲章公式サイト開設のお知らせ',
  'Launch of the Jia Honours Official Website',
  '贾氏勋章官方网站于2026年7月9日正式上线。愿本站成为记录礼仪、传达谢意、延续文化与联结友谊的长期窗口。感谢各界持续关注。网站仍在逐步完善，如有建议或发现疏漏，敬请通过官方邮箱联系大龙凤勋章评议会。',
  '賈氏勲章公式サイトを2026年7月9日に正式開設いたしました。本サイトが、儀礼を記録し、感謝を伝え、文化を受け継ぎ、友好を育むための継続的な窓口となることを願っております。今後ともご関心をお寄せいただければ幸いです。お気づきの点やご意見がございましたら、公式メールを通じて大龍鳳章評議会までお寄せください。',
  'The Jia Honours official website was formally launched on 9 July 2026. May it serve as a lasting place to record ceremony, convey gratitude, sustain cultural traditions and strengthen friendship. We welcome your continued interest. As the website develops, comments and corrections may be sent to the Council of the Order of the Great Dragon and Phoenix through the official email address.',
  1,
  1,
  '2026-07-09',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT(id) DO UPDATE SET
  visibility = 'public',
  title_zh = excluded.title_zh,
  title_ja = excluded.title_ja,
  title_en = excluded.title_en,
  body_zh = excluded.body_zh,
  body_ja = excluded.body_ja,
  body_en = excluded.body_en,
  is_published = 1,
  is_pinned = 1,
  published_at = excluded.published_at,
  updated_at = CURRENT_TIMESTAMP;

INSERT OR IGNORE INTO app_migrations (name, applied_at)
VALUES ('2026-07-09-v56-launch-news', CURRENT_TIMESTAMP);
