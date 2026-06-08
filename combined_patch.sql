-- Combined D1 patch for Jia Honours latest overlay.
-- Safe to run manually in Cloudflare D1 Console. Existing users are preserved.

-- Formal member profile table / fields
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
);

-- Site news table
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

CREATE INDEX IF NOT EXISTS idx_site_news_visibility ON site_news(visibility, is_published, published_at);

INSERT INTO site_news (
  id, visibility, title_zh, title_ja, title_en,
  body_zh, body_ja, body_en,
  is_published, is_pinned, published_at, created_at, updated_at
) VALUES (
  'news_20260608_launch',
  'public',
  '贾氏勋赏官网正式上线',
  '賈氏勲賞公式サイト公開のお知らせ',
  'Jia Honours Official Website Launches',
  '自今日起，贾氏勋赏官网正式上线。本网站将作为贾氏勋章制度、家门礼仪、名誉头衔、会员事务与相关通知的公开整理平台，持续记录制度建设、文化承继与公益交流的进展。

感谢各位的关注与支持。网站初建，仍有需要完善之处；若您在浏览过程中发现内容、文字、排版或功能上的不足，欢迎通过官方邮箱 jia.honours@gmail.com 与我们联系。我们将认真参考来信意见，逐步完善网站内容与会员服务。',
  '本日、賈氏勲賞公式サイトを公開いたしました。本サイトでは、賈氏勲章制度、家門儀礼、名誉称号、会員に関するお知らせを整理し、制度整備、文化継承、公益交流の歩みを順次記録してまいります。

ご関心をお寄せくださる皆様に、心より御礼申し上げます。開設初期につき、表記、内容、レイアウト、機能面で至らない点が残る場合がございます。お気づきの点がございましたら、公式連絡先 jia.honours@gmail.com までお知らせください。いただいたご意見を参考に、サイト内容と会員向けサービスを整えてまいります。',
  'The Jia Honours official website is now formally online. This website will serve as the official platform for presenting the Jia honours system, family ceremonial framework, honorary titles, membership matters, and related notices, while recording the continuing development of the institution, cultural continuity, and public-service exchange.

We sincerely thank all visitors for their attention and support. As the website has just been launched, there will still be areas to refine. If you notice any issue regarding content, wording, layout, or functionality, please contact us at jia.honours@gmail.com. We will review feedback carefully and continue improving the website and member services step by step.',
  1,
  1,
  '2026-06-08',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT(id) DO UPDATE SET
  title_ja = excluded.title_ja,
  body_ja = excluded.body_ja,
  updated_at = CURRENT_TIMESTAMP;
