# 贾氏勋章官方网站

这是可直接上线的静态网站包。

## 文件结构

- `index.html`：网站首页，包含中文 / 日本語 / English 多语言切换、会员注册登录演示。
- `assets/`：网站图片资源。
- `robots.txt`：搜索引擎抓取设置。
- `sitemap.xml`：站点地图，域名预设为 `jia-honours.com`。

## 本地预览

直接双击 `index.html` 即可在浏览器打开。

## 上线建议

推荐先使用 Cloudflare Pages、Vercel 或 Netlify 部署为静态网站。  
购买 `jia-honours.com` 后，在部署平台中绑定自定义域名，并根据平台提示设置 DNS。

## 注意

当前会员注册登录为前端演示功能，数据只保存在访问者本机浏览器的 localStorage 中。  
正式启用真实会员系统前，需要接入数据库、密码加密、邮箱验证、后台权限管理和 HTTPS 环境。

## 本版新增

- 新增「名誉头衔制度」页面区块。
- 说明大团长本人为公爵，对外授予范围限于名誉侯爵、名誉伯爵、名誉子爵、名誉男爵、名誉骑士。
- 说明骑士称号与五等大龙凤章的关系，以及勋章晋升与名誉爵位称号授予相互独立。


## 成熟会员系统版本

本包包含 Cloudflare Pages Functions 与 D1 数据库后端。请阅读 `README_PRODUCTION_AUTH.md` 并先运行 `schema.sql`。
Redeploy after correct D1 binding.
