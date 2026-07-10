import {
  assertSameOrigin,
  clearSessionCookies,
  getDB,
  handleError,
  json,
  revokeCurrentSession,
} from "../../_utils.js";

export async function onRequestPost({ request, env }) {
  try {
    assertSameOrigin(request, env);
    const db = getDB(env);
    await revokeCurrentSession(request, env, db);
    const headers = new Headers();
    for (const cookie of clearSessionCookies()) headers.append("Set-Cookie", cookie);
    return json({ ok: true }, 200, headers);
  } catch (error) {
    return handleError(error, "退出失败，请稍后再试。", "auth/logout");
  }
}
