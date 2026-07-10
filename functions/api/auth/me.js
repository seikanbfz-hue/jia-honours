import { currentUser, handleError, json } from "../../_utils.js";

export async function onRequestGet({ request, env }) {
  try {
    const user = await currentUser(request, env);
    return json({ user });
  } catch (error) {
    return handleError(error, "账户状态读取失败，请稍后再试。", "auth/me");
  }
}
