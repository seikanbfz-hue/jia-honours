# DB Binding Strict Fix

本版本采用严格 D1 绑定逻辑：

- 所有数据库调用统一使用 `getDB(env)`。
- Cloudflare Pages 的 D1 binding 名称必须精确为 `DB`。
- 后端不再自动扫描其他 binding，避免误把 RPC / Service binding 当成 D1。
- 调试接口为 `/api/debug/env`。

成功时应返回：

```json
{"ok":true,"hasDB":true,"dbProbe":{"ok":1}}
```

如果 `hasDB:false`，说明 Production 环境没有名为 `DB` 的 D1 绑定。
如果看到 `RPC receiver` 或 `prepare` 错误，说明名为 `DB` 的绑定不是 D1 database，或者该绑定没有进入 Production 环境。
