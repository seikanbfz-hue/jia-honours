# GitHub 上传用正式版

此包为正式会员系统版本，并已移除 wrangler.toml，避免 Cloudflare 读取占位 D1 database_id。

包含：
- index.html
- assets/
- functions/
- schema.sql
- README.md
- README_PRODUCTION_AUTH.md

GitHub 上传时，进入本文件夹，把里面全部内容上传到仓库根目录。
Cloudflare Pages 通过 GitHub 部署时，会自动识别 functions/。
D1、SESSION_SECRET、RESEND_API_KEY、EMAIL_FROM 等仍然在 Cloudflare Pages 项目设置中配置。
