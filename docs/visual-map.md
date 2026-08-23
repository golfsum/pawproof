# Visual map

## Admin Users overview

Route: `/admin/users`

States covered:

- Initial loading panel.
- API error message.
- Empty account list.
- Populated list with Free, Monthly, Yearly, and cadence-unavailable Plus accounts.
- Trial, renewing, ending, and missing billing metadata.
- Disabled, missing-profile, incomplete-setup, and unverified-email flags.
- Zero and nonzero reminder records.
- Search results and no-match results.
- Every sortable column, including Reminders and Subscription.
- Desktop at 1280 CSS px.
- Phone at 390 by 844 CSS px, at the true page top and bottom.
- Phone table at the left and right horizontal limits.

## Admin user detail

Route: `/admin/users/[uid]`

States covered by implementation and build checks:

- Free account.
- Known Monthly or Yearly Plus account.
- Plus account with cadence unavailable.
- Trial, renewing, ending, and missing billing metadata.
- Verified and unverified email.
- Complete, incomplete, and missing profile setup.

Authenticated live visual coverage remains blocked until a local admin session and valid Firebase Admin credentials are available.
