贾氏勋章官网｜一键覆盖修复包
版本日期：2026-07-10

覆盖方法
1. 先保留当前 GitHub 仓库或 Cloudflare Pages 项目的备份。
2. 解压本压缩包。
3. 将解压后文件夹内的“全部内容”上传到网站仓库根目录，选择覆盖同名文件。
4. 提交后等待 Cloudflare Pages 自动部署完成。

本包已经包含
- 首页、会员中心、联系方式、隐私说明、会员使用说明
- 全部图片资源
- Cloudflare Pages Functions
- D1 完整 schema 与兼容旧数据库的自动迁移
- 登录、注册、邮箱验证码、退出、会员资料、新闻、密码重置
- PC／平板／手机响应式修复
- 中／日／英三语修复
- 安全响应头、服务端限流和可撤销登录会话

现有 Cloudflare 设置
本包不会覆盖 Cloudflare 控制台中的现有 D1 数据或 Secret。请保留以下现有绑定／变量：
- D1 binding：DB
- SESSION_SECRET
- ADMIN_EMAILS
- RESEND_API_KEY
- EMAIL_FROM
- SITE_NAME

建议启用 Cloudflare Turnstile
在 Cloudflare Turnstile 创建站点后，同时新增以下两个变量即可自动启用：
- TURNSTILE_SITE_KEY
- TURNSTILE_SECRET_KEY

必须同时配置 Site Key 与 Secret Key。未配置时，网站仍可运行，并继续使用 D1 服务端限流；配置后登录、注册、验证码和密码重置会自动要求 Turnstile 验证。

可选状态检查
/api/debug/env 只允许已登录且 ADMIN_EMAILS 中列出的管理员访问；其他访问一律返回 404。接口只返回“是否已配置”等布尔状态，不会返回变量名、密钥或其他敏感值。

说明
- 新增数据库表会在首次访问相关接口时安全创建，不会删除现有会员、资料或新闻。
- 如线上曾使用 Cloudflare Workers 不支持的 150000 次 PBKDF2 旧密码，相关会员首次登录时会看到安全提示；使用新增的“忘记密码”流程即可设置兼容的新密码，账号与会员资料不会丢失。
- 本包故意不包含 wrangler.toml，避免占位 database_id 覆盖线上 Cloudflare Pages 设置。
- 部署后建议依次测试：三语切换、注册验证码、登录、密码重置、会员资料保存、手机菜单。
