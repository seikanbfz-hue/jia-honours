import { d1Error, getDB, json } from "../../_utils.js";

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
    const e = d1Error(error);
    dbError = e && e.message ? e.message : String(e);
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
