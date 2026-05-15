import { SiteFooter, SiteHeader } from "@/components/site-shell";

export const metadata = { title: "Terms of Service" };

const LAST_UPDATED = "May 15, 2026";

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-4 py-16 prose prose-neutral dark:prose-invert">
          <h1>Terms of Service</h1>
          <p className="text-sm text-muted">Last updated: {LAST_UPDATED}</p>

          <p>
            These Terms govern your use of the PawProof mobile app and
            pawproof.app (together, the &quot;Service&quot;). By creating an
            account or using the Service, you agree to these Terms.
          </p>

          <h2>1. Eligibility</h2>
          <p>
            You must be at least 13 years old. If you&apos;re in the EEA
            or UK, you must be at least the digital consent age in your
            country.
          </p>

          <h2>2. Your account</h2>
          <p>
            You&apos;re responsible for your account credentials and for
            everything that happens under your account. Keep your
            password safe; don&apos;t share your account.
          </p>

          <h2>3. Your content</h2>
          <p>
            You own everything you upload: pet records, photos,
            documents, journal entries. You grant PawProof a worldwide,
            royalty-free license to store, process, transmit, and
            display your content solely to operate the Service for you.
            This license ends when you delete your content or your
            account.
          </p>
          <p>
            You promise that you have the right to upload anything you
            upload, and that it doesn&apos;t infringe anyone else&apos;s
            rights.
          </p>

          <h2>4. Acceptable use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the Service to harm anyone or anything;</li>
            <li>Reverse engineer, scrape, or attack the Service;</li>
            <li>Resell or sublicense the Service;</li>
            <li>Upload content you don&apos;t have the rights to.</li>
          </ul>

          <h2>5. PawProof Plus (paid plans)</h2>
          <p>
            <strong>Billing.</strong> PawProof Plus is billed through
            your Apple ID or Google Play account. Subscriptions renew
            automatically until cancelled. Manage or cancel from your
            Apple ID / Google Play settings, not from us.
          </p>
          <p>
            <strong>Free trial.</strong> The 7-day free trial converts to
            paid unless cancelled at least 24 hours before it ends.
          </p>
          <p>
            <strong>Refunds.</strong> Refunds are handled by Apple /
            Google per their refund policies; we can&apos;t refund their
            charges. If you believe you were billed in error, contact
            their support and email us so we can help where we can.
          </p>
          <p>
            <strong>Price changes.</strong> We&apos;ll email you at least
            14 days before any subscription price change.
          </p>

          <h2>6. Medical disclaimer</h2>
          <p>
            <strong>
              PawProof is a journaling and reminder tool, not veterinary
              advice.
            </strong>{" "}
            Symptom logs, reminders, and AI-generated text are not a
            substitute for a licensed veterinarian. Always contact a vet
            for urgent concerns. We do not diagnose, treat, or prescribe.
          </p>

          <h2>7. Smart Scan accuracy</h2>
          <p>
            Smart Scan uses OCR + AI to extract information from your
            documents. It&apos;s a convenience feature, not a guarantee.
            Always review what we extract before relying on it for
            anything important (especially vaccine dates and dosages).
          </p>

          <h2>8. Service availability</h2>
          <p>
            We try to keep PawProof running 24/7 but we don&apos;t
            guarantee uninterrupted service. We may modify, suspend, or
            discontinue features with reasonable notice.
          </p>

          <h2>9. Termination</h2>
          <p>
            You may delete your account at any time from Settings →
            Delete account. We may suspend or terminate accounts that
            violate these Terms or abuse the Service. On termination,
            your data is deleted within 30 days (except where we have a
            legal obligation to retain it).
          </p>

          <h2>10. Disclaimers</h2>
          <p>
            The Service is provided &quot;as is&quot; without warranties of any
            kind. We disclaim warranties of merchantability, fitness for
            a particular purpose, and non-infringement to the maximum
            extent permitted by law.
          </p>

          <h2>11. Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, PawProof&apos;s
            aggregate liability is limited to the amount you paid us in
            the 12 months before the claim, or $100, whichever is
            greater. We are not liable for indirect, incidental,
            consequential, or special damages.
          </p>

          <h2>12. Governing law</h2>
          <p>
            These Terms are governed by the laws of the State of
            California, USA, without regard to conflict of laws rules.
            Disputes will be resolved in the state or federal courts
            located in San Francisco County, California.
          </p>

          <h2>13. Changes to these Terms</h2>
          <p>
            We may update these Terms from time to time. Material changes
            will be announced by email and/or in-app. Continued use after
            a change means you accept the new Terms.
          </p>

          <h2>14. Contact</h2>
          <p>
            Questions about these Terms? Email{" "}
            <a href="mailto:support@pawproof.app">support@pawproof.app</a>.
          </p>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
