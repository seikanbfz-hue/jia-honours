import { currentUser, json } from "../../_utils.js";

export async function onRequestGet({ request, env }) {
  try {
    const user = await currentUser(request, env);
    return json({ user });
  } catch (error) {
    return json({ user: null });
  }
}
