# 综合检查结果

已检查：

- JavaScript 语法：通过 `node --check`。
- `index.html` 内联脚本语法：通过 `node --check`。
- `schema.sql`：可被 SQLite/D1 兼容语法执行，表字段与后端查询字段一致。
- Cloudflare Pages Functions 路径：`functions/api/...` 结构正确。
- 图片路径：`index.html` 使用 `assets/...`，本包已包含全部图片。
- SEO 文件：`robots.txt` 与 `sitemap.xml` 已放入根目录。

关键部署要求：

- D1 binding 名称必须为 `DB`。
- `functions/` 文件夹必须位于仓库根目录。
- 先在 D1 Console 执行 `schema.sql`。
- Resend 发信需要 `RESEND_API_KEY` 与 `EMAIL_FROM`。
- 部署后先访问 `/api/debug/env`。

## PBKDF2 / Email Hotfix

- Password hashing PBKDF2 iterations changed from `150000` to `100000`, matching the Cloudflare Workers/WebCrypto runtime limit.
- Login verification now rejects stored hashes above `100000` iterations instead of throwing a runtime error.
- Verification email subject, text body and HTML body are fixed in English.
