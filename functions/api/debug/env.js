import { getDB, json } from "../../_utils.js";

export async function onRequestGet({ env }) {
  const keys = Object.keys(env || {}).sort();
  let dbProbe = null;
  let dbError = null;
  let hasDB = !!(env && Object.prototype.hasOwnProperty.call(env, "DB"));

  try {
    const db = getDB(env);
    const result = await db.prepare("SELECT 1 AS ok").first();
    dbProbe = result;
  } catch (error) {
    dbError = error && error.message ? error.message : String(error);
  }

  return json({
    ok: !!dbProbe,
    hasDB,
    dbBindingType: hasDB ? typeof env.DB : "missing",
    environmentKeys: keys,
    dbProbe,
    dbError,
  });
}
