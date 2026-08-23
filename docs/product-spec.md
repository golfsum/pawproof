# PawProof product contract

## Admin user operations

### User and problem

The PawProof operator needs one place to understand account setup, Plus access, reminder adoption, support load, and recent account activity without opening every user record.

### Primary journey

1. Open Admin > Users.
2. Scan account totals and the monthly, yearly, or unknown Plus mix.
3. Search or sort by identity, reminders, subscription, or activity.
4. Open a user to review subscription context and account records.

### In scope

- Monthly and yearly plan labels when the stored RevenueCat product ID is recognized.
- An honest Plus fallback when cadence is missing or unknown.
- Reminder document counts per account and across the user list.
- Renewal, expiration, trial, store, verified email, profile, and onboarding signals.
- Loading, error, empty, populated, filtered, and no-match states.
- Desktop and phone layouts with a contained horizontal table scroller.

### Explicit exclusions

- Revenue reporting or claims that the current billing snapshot is authoritative.
- RevenueCat webhook setup or historical subscription backfill.
- Logical reminder schedule counts. Multi-pet reminders can create more than one stored reminder document.
- Changes to production, deployment, billing configuration, or Firestore data.

### Acceptance checks

- A known monthly product renders Monthly and a known yearly product renders Yearly.
- Missing or unrecognized product IDs render Plus with cadence unavailable.
- Each row shows its stored reminder count and the summary shows the total.
- Search finds monthly and yearly plans, and reminder sorting works in both directions.
- The user detail view shows the same cadence and subscription status.
- Private admin API responses opt out of caching.
- The page does not create viewport-level horizontal overflow on a 390 px phone.

### Known data constraint

The checked-in mobile client attempts to mirror RevenueCat state into the user profile, while the checked-in Firestore rules reject client changes to `isPremium`. No server webhook is present in this repository. Billing labels are therefore best-effort operational context, not a source for financial reporting. A verified server-side RevenueCat sync is the required follow-up for authoritative data.
