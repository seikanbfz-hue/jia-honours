-- Optional manual database patch for the formal member profile form.
-- The /api/member/profile endpoint also creates or updates this table automatically on first use.
-- Running this SQL in Cloudflare D1 is safe for a new table and does not delete existing users.

CREATE TABLE IF NOT EXISTS member_profiles (
  user_id TEXT PRIMARY KEY,
  display_name TEXT,
  name_en TEXT,
  nationality TEXT,
  residence_country TEXT,
  occupation TEXT,
  noble_title_status TEXT,
  honours_record_status TEXT,
  biography TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

-- If you already deployed the previous detailed-profile patch, you do not need to run manual ALTER statements.
-- The new endpoint automatically adds noble_title_status and honours_record_status to the existing table.
