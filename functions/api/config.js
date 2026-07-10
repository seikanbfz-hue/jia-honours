import { json } from "../_utils.js";

export async function onRequestGet({ env }) {
  const secretConfigured = Boolean(String(env.TURNSTILE_SECRET_KEY || "").trim());
  const siteKey = String(env.TURNSTILE_SITE_KEY || "").trim().slice(0, 256);
  const turnstileEnabled = secretConfigured && Boolean(siteKey);
  const turnstileSiteKey = turnstileEnabled ? siteKey : "";
  return json({ turnstileEnabled, turnstileSiteKey });
}
