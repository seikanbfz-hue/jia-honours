# 成熟会员系统设置说明

本版本已经把注册 / 登录从浏览器 localStorage 演示改成了 Cloudflare Pages Functions + D1 数据库版本。

## 重要变化

- 用户注册数据会保存到 Cloudflare D1 数据库。
- 密码采用 PBKDF2-SHA256 加盐哈希保存。
- 登录状态通过 HttpOnly + Secure + SameSite=Lax Cookie 保存。
- 管理员邮箱可通过 `ADMIN_EMAILS` 环境变量设置。
- 注册接口：`/api/auth/register`
- 登录接口：`/api/auth/login`
- 当前用户接口：`/api/auth/me`
- 退出接口：`/api/auth/logout`

## Cloudflare 后台设置步骤

### 1. 创建 D1 数据库

Cloudflare Dashboard → Workers & Pages → D1 / Storage & Databases → Create database

建议数据库名：

```text
jia_honours_db
```

### 2. 初始化数据库表

进入 D1 数据库的 Console / Query 页面，把 `schema.sql` 里的内容复制进去运行。

### 3. 给 Pages 项目绑定 D1

进入你的 Pages 项目：

```text
delicate-shadow-22ce
```

然后：

```text
设置 → Bindings → 添加绑定 → D1 database
```

绑定名称必须写：

```text
DB
```

选择刚创建的：

```text
jia_honours_db
```

### 4. 添加环境变量

进入 Pages 项目：

```text
设置 → Variables
```

添加：

```text
SESSION_SECRET = 随机长字符串
ADMIN_EMAILS = 你的管理员邮箱
```

SESSION_SECRET 可以用任意很长的随机字符串，例如 40 位以上。不要公开。

### 5. 重新部署

上传本文件夹全部内容，包含：

```text
index.html
assets/
functions/
schema.sql
wrangler.toml
README_PRODUCTION_AUTH.md
```

`functions/` 文件夹必须一起上传，否则注册登录接口不会生效。

## 注意

这个版本已经适合真实保存会员注册资料，但仍建议下一阶段继续加入：

- 邮箱验证
- 找回密码
- 管理员后台 UI
- 注册限流 / 防机器人
- 隐私政策与使用条款
- 会员资料编辑页
- 授与申请表
- 证书编号管理

## 本版语言支持

本版已将桌面端与手机版同步为中文 / 日本語 / English 三语言切换，首页不再单独显示语言提示。静态文案、按钮、表单、会员中心、图片说明、图片替代文字和常见系统提示均会随语言切换。


## 本版新增：邮箱验证码与电话资料

注册时要求：

- 姓名
- 邮箱
- 再次确认邮箱
- 邮箱验证码
- 电话国家区号
- 电话号码
- 密码

### 邮箱验证码设置

本版本使用 Resend 发送邮箱验证码。你需要在 Cloudflare Pages 项目中设置环境变量：

```text
RESEND_API_KEY = 你的 Resend API Key
EMAIL_FROM = Jia Honours <verify@jia-honours.com>
SITE_NAME = Jia Honours
```

发送邮箱验证码的接口：

```text
POST /api/auth/send-code
```

注册接口会验证：

- 两次邮箱是否一致
- 验证码是否正确
- 验证码是否过期
- 邮箱是否已经注册
- 电话号码格式是否合理

### 数据库新增字段

`users` 表新增：

- phone_country_iso
- phone_country_code
- phone_number
- email_verified_at

新增表：

- email_verification_codes
