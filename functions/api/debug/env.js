import { getDB, json } from "../../_utils.js";

export async function onRequestGet({ env }) {
  const keys = Object.keys(env || {}).sort();
  let dbOk = false;
  let dbError = null;

  try {
    const db = getDB(env);
    await db.prepare("SELECT 1 AS ok").first();
    dbOk = true;
  } catch (error) {
    dbError = error.message || String(error);
  }

  return json({
    ok: dbOk,
    hasDB: !!(env && env.DB),
    environmentKeys: keys,
    dbError,
  });
}
