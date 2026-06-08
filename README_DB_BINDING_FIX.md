# DB Binding Robust Fix

这个版本修正了 D1 绑定排查问题：

- `functions/_utils.js` 增加 `getDB(env)`。
- 如果 Cloudflare 中 D1 binding 不是精确命名为 `DB`，代码会自动扫描可用 D1 binding。
- 如果仍然找不到 D1，会返回当前 Function 能看到的环境变量名称，方便判断绑定是否真的进入 Production。
- 新增安全调试接口：

```text
/api/debug/env
```

成功时应返回：

```json
{"ok":true,"hasDB":true}
```

如果 DB 没接上，会返回 `environmentKeys` 和 `dbError`，不会泄露 Secret 值。
