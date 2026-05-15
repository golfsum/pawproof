import { SiteFooter, SiteHeader } from "@/components/site-shell";

export const metadata = { title: "Privacy Policy" };

const LAST_UPDATED = "May 15, 2026";

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-4 py-16 prose prose-neutral dark:prose-invert">
          <h1>Privacy Policy</h1>
          <p className="text-sm text-muted">Last updated: {LAST_UPDATED}</p>

          <p>
            PawProof (&quot;PawProof,&quot; &quot;we,&quot; &quot;us&quot;) operates the PawProof mobile app
            and the website at pawproof.app. This Privacy Policy explains
            what we collect, why we collect it, and how you control your
            data.
          </p>

          <h2>1. What we collect</h2>
          <p>
            <strong>Account information.</strong> When you sign up, we
            collect the email address you provide, or that your sign-in
            provider (Apple, Google) supplies. If you choose a display
            name or upload a profile photo, we store those too.
          </p>
          <p>
            <strong>Pet records.</strong> Anything you enter or upload
            about your pets: names, species, breeds, birthdays, weights,
            microchip numbers, vet contacts, vaccine records, documents,
            reminders, journal entries, photos, and emergency contact
            info. This data belongs to you and is only visible to your
            account.
          </p>
          <p>
            <strong>Document scans.</strong> Photos and PDFs you upload to
            Smart Scan are sent to Google&apos;s Gemini API for OCR. We
            store the resulting text and the original file in your account
            so you can view it later. Documents are not used to train
            anyone&apos;s models.
          </p>
          <p>
            <strong>Usage data.</strong> Standard server logs (IP, device
            type, app version, error reports). We use this to debug
            crashes and improve the app, not to build profiles on you.
          </p>
          <p>
            <strong>Support tickets.</strong> If you report an issue from
            the app or the web dashboard, we store the message, attached
            context you choose to send, and any replies between us.
          </p>

          <h2>2. How we use it</h2>
          <ul>
            <li>To run the app: show you your pets&apos; records, fire reminders, answer support tickets.</li>
            <li>To process Smart Scan documents via Google Gemini.</li>
            <li>To send transactional emails (account, password reset, ticket replies, billing).</li>
            <li>To detect abuse and keep the service running.</li>
          </ul>
          <p>
            <strong>We do not sell your data.</strong> We do not run
            advertising. We do not share your pet records with third
            parties except the strictly-scoped subprocessors listed below.
          </p>

          <h2>3. Subprocessors</h2>
          <ul>
            <li>
              <strong>Google Firebase.</strong> Authentication, Firestore
              database, Cloud Storage, Cloud Functions, Crashlytics.
            </li>
            <li>
              <strong>Google Gemini API.</strong> OCR on Smart Scan
              documents. Documents are sent over TLS; per Google&apos;s
              terms, content from billed API requests is not used to
              train Google&apos;s models.
            </li>
            <li>
              <strong>Apple App Store / Google Play.</strong> App
              distribution and in-app purchases for PawProof Plus.
            </li>
            <li>
              <strong>Vercel.</strong> Hosting for pawproof.app.
            </li>
            <li>
              <strong>Resend.</strong> Transactional email delivery.
            </li>
          </ul>

          <h2>4. Children</h2>
          <p>
            PawProof is not directed at children under 13. We don&apos;t
            knowingly collect data from anyone under 13. If you believe a
            child has signed up, email{" "}
            <a href="mailto:support@pawproof.app">support@pawproof.app</a>{" "}
            and we will delete the account.
          </p>

          <h2>5. Your choices</h2>
          <ul>
            <li>
              <strong>Access &amp; export.</strong> Sign in to your
              dashboard at pawproof.app to view everything we have on you.
              Email us if you want a machine-readable export.
            </li>
            <li>
              <strong>Delete.</strong> Use Settings → Delete account in
              the app or email support@pawproof.app. Account deletion
              removes pets, records, documents, reminders, and journal
              entries within 30 days.
            </li>
            <li>
              <strong>Email.</strong> Unsubscribe from non-essential
              emails at{" "}
              <a href="/unsubscribe">pawproof.app/unsubscribe</a>.
              We&apos;ll still send service-critical messages (security
              alerts, billing receipts).
            </li>
          </ul>

          <h2>6. Security</h2>
          <p>
            We use HTTPS everywhere, store data in Google&apos;s SOC 2
            compliant infrastructure, and scope Firestore security rules
            so each user can only read their own data. No system is
            perfectly secure. If you suspect a breach, email{" "}
            <a href="mailto:support@pawproof.app">support@pawproof.app</a>.
          </p>

          <h2>7. Data location and transfers</h2>
          <p>
            Data is stored in Google&apos;s US regions. If you use
            PawProof outside the US your data will be transferred to and
            processed in the US. We rely on Google&apos;s Standard
            Contractual Clauses for international transfers.
          </p>

          <h2>8. California, EEA, and UK rights</h2>
          <p>
            If you live in California (CCPA/CPRA), the EEA (GDPR), or the
            UK (UK GDPR), you have rights to access, correct, delete,
            port, and restrict processing of your personal data. Email{" "}
            <a href="mailto:support@pawproof.app">support@pawproof.app</a>{" "}
            and we will respond within 30 days.
          </p>

          <h2>9. Changes</h2>
          <p>
            We will update this page when our practices change. We will
            email you if a change is material (e.g., a new category of
            sharing).
          </p>

          <h2>10. Contact</h2>
          <p>
            Questions? Email{" "}
            <a href="mailto:support@pawproof.app">support@pawproof.app</a>.
          </p>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
