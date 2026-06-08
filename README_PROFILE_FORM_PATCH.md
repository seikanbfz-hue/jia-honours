# Formal Member Profile Patch

This overlay patch changes the member profile form after login.

Changed fields:

- Name
- English name
- Nationality
- Current country of residence
- Occupation
- Whether the member holds a noble title
- Whether the member has an honours record
- Biography, limited to 350 characters

The form now shows a notice before submission: the Order of the Great Dragon and Phoenix and the Dragon and Phoenix Medal currently do not accept individual applications. The form is only for becoming a formal member and for future member activities and development.

After the form is completed and saved, the user account status is updated to `正式会员`.

## Files to overwrite

Upload these files to the root of your GitHub repository and overwrite existing files:

- `index.html`
- `functions/api/member/profile.js`
- `profile_fields_patch.sql` optional reference only

The endpoint automatically creates or updates the D1 table on first use. Existing users and login data are not deleted.
