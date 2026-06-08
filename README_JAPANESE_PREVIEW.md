# Japanese copy preview revision

This preview package revises the Japanese wording across the public site, news section, and member profile page.

Main changes:
- Avoided the unnatural direct translation 「正式会員」 in the UI.
- Replaced it with 「本登録」「本登録済み」「会員情報の本登録」 depending on context.
- Revised news, founder profile, honour-system explanations, title-system explanations, and member form copy into more natural Japanese.
- Updated the launch news Japanese title/body in `functions/api/news.js`, `site_news_patch.sql`, and `combined_patch.sql`.

For deployment as an overlay, upload the files in this package to the GitHub repository root and overwrite existing files.
