# Cloudflare Pages 正式会员系统部署说明

本版本使用 Cloudflare Pages Functions + D1 数据库 + Resend 邮箱验证码。

## 1. 上传文件

把本文件夹内全部内容上传到 GitHub 仓库根目录，至少必须包含：

```text
index.html
assets/
functions/
schema.sql
robots.txt
sitemap.xml
README.md
```

本包已移除 `wrangler.toml`，避免 Cloudflare 读取占位 D1 database_id。Cloudflare Pages 通过 GitHub 部署时会自动识别 `functions/`。

## 2. 创建并初始化 D1

Cloudflare Dashboard → Workers & Pages → D1 / Storage & Databases → Create database。

建议数据库名：

```text
jia_honours_db
```

进入该 D1 数据库的 Console / Query 页面，复制 `schema.sql` 全部内容并运行。

## 3. 绑定 D1 到 Pages Production

进入 Pages 项目 → Settings / 设置 → Bindings → Add binding → D1 database。

绑定名称必须精确写：

```text
DB
```

选择刚创建的 D1 数据库 `jia_honours_db`。绑定要进入 Production 环境。

## 4. 设置环境变量

进入 Pages 项目 → Settings / 设置 → Variables，添加：

```text
SESSION_SECRET = 随机长字符串，建议 40 位以上
ADMIN_EMAILS = 你的管理员邮箱，多个邮箱用英文逗号分隔
RESEND_API_KEY = 你的 Resend API Key
EMAIL_FROM = Jia Honours <verify@jia-honours.com>
SITE_NAME = Jia Honours
```

## 5. 重新部署

提交 GitHub commit 或在 Cloudflare Pages 中触发 Redeploy。

## 6. 检查

打开：

```text
https://www.jia-honours.com/api/debug/env
```

正常结果应包含：

```json
{"ok":true,"hasDB":true,"dbProbe":{"ok":1}}
```

随后测试：

```text
/api/auth/send-code
/api/auth/register
/api/auth/login
/api/auth/me
/api/auth/logout
```

## 说明

- 用户资料保存到 Cloudflare D1。
- 密码使用 PBKDF2-SHA256 加盐哈希保存。
- 登录状态通过 HttpOnly + Secure + SameSite=Lax Cookie 保存。
- 注册时要求邮箱验证码、确认邮箱、电话国家区号与电话号码。


## 本版修正：PBKDF2 与英文邮件

- PBKDF2 迭代次数固定为 `100000`，避免 Cloudflare Workers 报错：`iteration counts above 100000 are not supported`。
- 验证码邮件固定为英文标题、英文纯文本与英文 HTML 内容。
