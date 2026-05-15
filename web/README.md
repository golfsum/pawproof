# PawProof Web

Next.js companion site for the PawProof mobile app: landing page, legal
pages, contact form, user dashboard, and admin console. Hosted at
[pawproof.app](https://pawproof.app) on Vercel.

## Stack

- Next.js 16 (App Router) + React 19
- Tailwind CSS v4
- Firebase Web SDK (auth + Firestore), same project as the mobile app
- Firebase Admin SDK (server-only, for `/api/admin/**`)
- Resend (transactional email)

## Layout

```
src/
  app/
    page.tsx                    Landing
    privacy/                    Privacy Policy
    terms/                      Terms of Service
    contact/                    Contact form
    unsubscribe/                Email opt-out
    sign-in/                    Firebase Auth (email/password, Google, Apple)
    dashboard/                  Authenticated user shell
      page.tsx                  Overview (today/overdue/expiring counters)
      pets/                     List of pets
      reminders/                Cross-pet reminder queue
      records/                  Vaccines + documents grouped by pet
      support/                  User's own tickets + new-ticket form
      settings/                 Account info, sign out
    admin/                      Admin shell (gated by ADMIN_UIDS env)
      page.tsx                  Stats + recent tickets
      users/                    List + per-user detail (toggle Plus, etc.)
      tickets/                  Queue + per-ticket thread, status, internal notes
    api/
      contact/                  Public contact form sink → Resend
      unsubscribe/              POST + GET (RFC 8058 one-click)
      support/issues/           User-facing ticket CRUD (auth required)
      admin/check/              Probe for admin gate
      admin/dashboard/          Overview totals
      admin/users/              List + per-user detail + PATCH
      admin/tickets/            Admin CRUD with replies, notes, status
  components/
    site-shell.tsx              Marketing header + footer
    dashboard-shell.tsx         Sidebar shell for /dashboard/* and /admin/*
    ui/button.tsx
  lib/
    firebase.ts                 Client SDK (web)
    firebase-admin.ts           Server SDK (server-only)
    admin-auth.ts               requireUser() + requireAdmin() bearer guards
    auth-context.tsx            React provider over onAuthStateChanged
    support.ts                  Zod schemas + types shared with API + UI
    support-server.ts           Firestore reads/writes for support_issues
    use-user-data.ts            Live subscriptions to pets/reminders/etc.
    types.ts                    Mobile-mirrored Firestore shapes
    utils.ts                    cn(), fmtDate(), relativeTime()
    dates.ts                    daysUntil() / isOverdue()
```

## Setup

```bash
cd web
cp .env.example .env.local
# fill in NEXT_PUBLIC_FIREBASE_*, FIREBASE_ADMIN_SA_JSON, ADMIN_UIDS, RESEND_API_KEY
npm install
npm run dev
```

Open <http://localhost:3000>.

## Environment variables

See `.env.example`. The most important ones:

- `NEXT_PUBLIC_FIREBASE_*`: copied from Firebase console → Project
  settings → Web app. Same project as the mobile app so users see one
  account.
- `FIREBASE_ADMIN_SA_JSON`: paste the **full** service account JSON as
  a single-line string. Firebase console → Project settings → Service
  accounts → Generate new private key. Server-only.
- `ADMIN_UIDS`: comma-separated Firebase UIDs that should see
  `/admin/**`. Source of truth, verified server-side on every admin
  API call.
- `RESEND_API_KEY` + `RESEND_FROM_EMAIL`: for the contact form and
  ticket reply notifications. Sign up at resend.com and verify the
  `pawproof.app` domain.

## Firestore rules

The mobile app submits tickets to a top-level `support_issues`
collection that the web admin dashboard reads. Add these rules to
`firestore.rules` so users can submit + see their own tickets but
nothing else:

```
match /support_issues/{issueId} {
  // Users can create a ticket if it carries their own uid.
  allow create: if request.auth.uid != null
                && request.auth.uid == request.resource.data.uid;
  // Users can read their own tickets (admin reads happen via the
  // Admin SDK and bypass rules).
  allow read: if request.auth.uid != null
              && resource.data.uid == request.auth.uid;
  // No client updates. Admin replies go through /api/admin/tickets/[id]/reply.
  allow update, delete: if false;
}

match /email_unsubscribes/{email} {
  // Only the server writes here. Clients can't list opt-outs.
  allow read, write: if false;
}
```

## Deploying to Vercel

1. Push the `web/` directory to a Git remote (or use the parent repo
   and set the Vercel **Root Directory** to `web`).
2. In the Vercel project settings, paste every env var from
   `.env.example`. Make sure `FIREBASE_ADMIN_SA_JSON` is one line.
   Internal newlines in the private key should be escaped as `\n`.
3. Add `pawproof.app` and `www.pawproof.app` as custom domains.
   Vercel will issue the TLS cert automatically once DNS resolves to
   their nameservers.
4. In the Firebase console → Authentication → Settings → Authorized
   domains, add `pawproof.app` so Google + Apple sign-in popups can
   complete.
5. Verify the `pawproof.app` domain in Resend so emails ship from
   `support@pawproof.app`.

## Admin onboarding

1. Sign in once at `/sign-in` with the account you want to make admin.
2. Open the user record in Firestore (`users/{your-uid}`) and copy the
   UID.
3. Paste it into `ADMIN_UIDS` (comma-separated for multiple admins) and
   redeploy.
4. Visit `/admin`. You should see the overview. Non-admins are
   bounced to `/dashboard`.

## Local tip: testing as a normal user

The admin probe runs server-side. To test the `/admin` redirect from a
non-admin account, sign out and back in (the AuthProvider listener
catches it), or open an incognito window.
