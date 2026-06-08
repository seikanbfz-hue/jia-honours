# Jia Honours Integrated Overlay

这个覆盖包整合了最近几次修改：

- 新闻板块：全员公开 / 注册用户限定两类新闻。
- 第一条公开新闻：贾氏勋赏官网正式上线。
- 发起人履历：暂不公开姓名、电话，显示官方邮箱 jia.honours@gmail.com。
- 正式会员资料表：姓名、英文姓名、国籍、现居住国家、职业、贵族头衔情况、授勋记录、350字以内简介。
- 保存会员资料后，账号状态改为“正式会员”。
- 登录后右上角隐藏“登录 / 注册”，显示“进入会员中心 / 退出”。
- PBKDF2 迭代次数修正为 Cloudflare Workers 支持的 100000。
- 验证码邮件统一英文。

## 上传方式

把本包里的全部文件拖到 GitHub 仓库根目录，覆盖同名文件，然后提交部署。

## D1 数据库

一般情况下，`functions/api/member/profile.js` 和 `functions/api/news.js` 会自动创建需要的表。

如果想手动初始化，可以在 Cloudflare D1 Console 执行：

```sql
combined_patch.sql
```

也可以分别执行：

```sql
profile_fields_patch.sql
site_news_patch.sql
```

已有用户、登录、验证码、会员资料数据不会被删除。
