# Cloudflare security deployment

This package does not contain a `wrangler.toml` with placeholder IDs or secrets. Keep the existing Cloudflare Pages project and configure production bindings and secrets in the Cloudflare dashboard.

## Required production configuration

- D1 binding: `DB`
- `SESSION_SECRET`: a new random value of at least 32 characters (40+ recommended)
- `RESEND_API_KEY`: Resend API key
- `EMAIL_FROM`: a sender on a domain verified by Resend, for example `Jia Honours <verify@jia-honours.com>`
- `SITE_NAME`: `Jia Honours`
- `ADMIN_EMAILS`: comma-separated administrator email addresses

Optional separate secrets:

- `VERIFICATION_SECRET`: HMAC secret for verification codes; 32+ characters. When omitted, `SESSION_SECRET` is used.
- `RATE_LIMIT_SECRET`: HMAC secret used to pseudonymize rate-limit identifiers; 32+ characters. When omitted, `SESSION_SECRET` is used.

## Turnstile

Turnstile is optional until configured. To enable it, set both:

- `TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`

After both keys are present, the server rejects protected requests without a valid `turnstileToken`. A one-key-only configuration fails closed instead of silently bypassing verification. The browser reads `GET /api/config`, renders the widget with the required `auth` action, and sends the token in the JSON body. The server rejects a missing or mismatched action. Tokens are single-use; obtain a fresh token for each request.

`TURNSTILE_HOSTNAMES` may be set to a comma-separated host allowlist when the Pages project is served from more than one hostname. Otherwise the request hostname is enforced.

## Database migration

For a new D1 database, run `schema.sql`. For an existing database, `combined_patch.sql` may be run safely. The Functions also perform idempotent, non-destructive migration at the first API request, including adding legacy `users` and `email_verification_codes` columns after checking `PRAGMA table_info`.

The deployment changes login sessions from stateless cookies to random, hashed D1 sessions. Existing users and profiles are preserved, but all users will need to sign in once after deployment. Logout and password reset revoke server-side sessions.

Passwords previously stored with an unsupported PBKDF2 iteration count above 100,000 are not discarded. Login returns `PASSWORD_RESET_REQUIRED`; the user can recover the account through:

- `POST /api/auth/send-reset-code`
- `POST /api/auth/reset-password`

## Post-deployment checks

1. Open `GET /api/config` and confirm only the public Turnstile site key is returned.
2. Register a test account, log out, and confirm `GET /api/auth/me` returns `user: null`.
3. Request a password reset, set a new password, and confirm every earlier session is invalidated.
4. Sign in as an administrator before opening `/api/debug/env`; the endpoint deliberately returns 404 to non-admin users and never lists environment keys or secret values.
5. Confirm `_headers` is present at the deployed root. API responses also set `no-store` and security headers in Functions middleware.

Never commit real API keys, D1 IDs, or secrets to the uploaded files.
