# index.html 修正说明

本版本 `index.html` 已确认包含正式注册字段：

- 再次确认邮箱
- 电话国家区号
- 电话号码
- 邮箱验证码
- 发送验证码
- `phoneCountryCode`

同时已移除旧 localStorage 演示登录逻辑，前端会调用 Cloudflare Pages Functions：

- `/api/auth/send-code`
- `/api/auth/register`
- `/api/auth/login`
- `/api/auth/me`
- `/api/auth/logout`
