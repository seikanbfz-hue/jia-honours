# GitHub 上传用正式版

此包为正式会员系统版本，并已移除 `wrangler.toml`，避免 Cloudflare 读取占位 D1 database_id。

上传到 GitHub 仓库根目录时，必须包含：

- `index.html`
- `assets/`
- `functions/`
- `schema.sql`
- `robots.txt`
- `sitemap.xml`
- `README.md`
- `README_PRODUCTION_AUTH.md`

Cloudflare Pages 通过 GitHub 部署时会自动识别 `functions/`。
D1、SESSION_SECRET、ADMIN_EMAILS、RESEND_API_KEY、EMAIL_FROM、SITE_NAME 仍然在 Cloudflare Pages 项目设置中配置。
