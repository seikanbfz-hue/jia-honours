# Jia Honours / 贾氏勋章官方网站

这是 Cloudflare Pages 正式会员系统版本，不是 localStorage 演示版。

## 文件结构

- `index.html`：网站首页，含中文 / 日本語 / English 切换、正式注册 / 登录表单。
- `assets/`：网站图片资源。
- `functions/`：Cloudflare Pages Functions 后端接口。
- `schema.sql`：D1 数据库初始化 SQL。
- `robots.txt`：搜索引擎抓取设置。
- `sitemap.xml`：站点地图。

## 后端接口

- `POST /api/auth/send-code`：发送邮箱验证码。
- `POST /api/auth/register`：注册会员。
- `POST /api/auth/login`：登录。
- `GET /api/auth/me`：读取当前登录用户。
- `POST /api/auth/logout`：退出登录。
- `GET /api/debug/env`：检查 Cloudflare 环境与 D1 绑定。

## 必须配置

Cloudflare Pages 项目里必须配置：

```text
D1 binding name = DB
SESSION_SECRET = 随机长字符串，建议 40 位以上
ADMIN_EMAILS = 管理员邮箱，多个邮箱用英文逗号分隔
RESEND_API_KEY = Resend API Key
EMAIL_FROM = Jia Honours <verify@jia-honours.com>
SITE_NAME = Jia Honours
```

进入 D1 数据库 Console，先执行 `schema.sql`，再重新部署 Pages。

部署后先打开：

```text
https://www.jia-honours.com/api/debug/env
```

正常结果应包含：

```json
{"ok":true,"hasDB":true,"dbProbe":{"ok":1}}
```

如果 `hasDB:false`，说明 Production 环境没有名为 `DB` 的 D1 绑定。如果出现 `prepare` 或 RPC receiver 相关错误，说明名为 `DB` 的绑定不是 D1 database，删除后重新添加 D1 database 绑定。


## 最新修正

- PBKDF2 100000 iterations，适配 Cloudflare Workers。
- Resend 验证码邮件统一使用英文内容。
