# D1 Strict Hotfix

这个版本修复了 DB binding 诊断逻辑：

- 后端不再自动扫描其他 binding，避免误把 RPC / Service binding 当成 D1。
- 所有数据库调用统一使用 `getDB(env)`。
- 如果 Cloudflare 中的 `DB` 不是 D1 数据库，会返回更明确的错误。
- 调试接口：`/api/debug/env`

部署后先打开：

https://www.jia-honours.com/api/debug/env

正常结果应包含：

```json
{"ok":true,"hasDB":true,"dbProbe":{"ok":1}}
```

如果看到 RPC receiver / prepare 错误，说明 Cloudflare 项目里的 `DB` 绑定不是 D1 数据库绑定，或者该绑定没有进入 Production 环境。
