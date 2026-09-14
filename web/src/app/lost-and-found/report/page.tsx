"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { useAuth, getIdToken } from "@/lib/auth-context";

export default function ReportLostFoundPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading } = useAuth();
  const initialType = params.get("type") === "found" ? "found" : "lost";
  const [reportType, setReportType] = useState<"lost" | "found">(initialType);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [publicPhotoConsent, setPublicPhotoConsent] = useState(true);
  const [publicLocationConsent, setPublicLocationConsent] = useState(false);
  const nowLocal = useMemo(() => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16), []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!user) {
      const next = `/lost-and-found/report?type=${reportType}`;
      router.push(`/sign-in?mode=signup&next=${encodeURIComponent(next)}`);
      return;
    }
    const token = await getIdToken();
    if (!token) return setError("Your sign-in session could not be verified. Please sign in again.");
    const f = new FormData(e.currentTarget);
    const eventValue = String(f.get("eventAt") || "");
    const body = {
      reportType,
      petName: String(f.get("petName") || "") || null,
      species: String(f.get("species") || ""),
      breed: String(f.get("breed") || "") || null,
      colors: String(f.get("colors") || "") || null,
      distinguishingFeatures: String(f.get("distinguishingFeatures") || "") || null,
      size: String(f.get("size") || "") || null,
      collarDescription: String(f.get("collarDescription") || "") || null,
      approachInstructions: String(f.get("approachInstructions") || "") || null,
      approximateLocation: String(f.get("approximateLocation") || ""),
      city: String(f.get("city") || "") || null,
      region: String(f.get("region") || "") || null,
      postalCode: String(f.get("postalCode") || "") || null,
      eventAt: new Date(eventValue).toISOString(),
      foundDisposition: reportType === "found" ? String(f.get("foundDisposition") || "seen_not_secured") : null,
      publicPhotoConsent,
      publicLocationConsent,
    };
    if (!publicLocationConsent) return setError("Confirm that the approximate public location can be shown before publishing.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/lost-and-found/reports", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not publish report.");
      router.push(`/lost-and-found/pets/${json.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish report.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-10 md:py-16">
        <Link href="/lost-and-found" className="text-sm font-semibold text-primary hover:underline">← Lost & Found</Link>
        <div className="mt-5">
          <div className="text-xs font-bold uppercase tracking-wider text-primary">Free report</div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Tell the community what happened.</h1>
          <p className="mt-3 max-w-2xl text-muted">Only the information shown in this report is intended for public display. PawProof account information and private pet records stay private.</p>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-8">
          <section className="rounded-2xl border border-border bg-surface p-6">
            <div className="text-sm font-bold">1. What happened?</div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => setReportType("lost")} className={`rounded-xl border p-4 text-left ${reportType === "lost" ? "border-primary bg-primary-soft" : "border-border"}`}>
                <div className="font-bold">My pet is missing</div><div className="mt-1 text-sm text-muted">Create a missing-pet report.</div>
              </button>
              <button type="button" onClick={() => setReportType("found")} className={`rounded-xl border p-4 text-left ${reportType === "found" ? "border-primary bg-primary-soft" : "border-border"}`}>
                <div className="font-bold">I found or saw a pet</div><div className="mt-1 text-sm text-muted">No owned-pet profile is required.</div>
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-6">
            <div className="text-sm font-bold">2. Pet information</div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label={reportType === "lost" ? "Pet name" : "Pet name, if known"} name="petName" />
              <Field label="Species" name="species" required placeholder="Dog, cat, bird…" />
              <Field label="Breed or unknown" name="breed" />
              <Field label="Colors" name="colors" placeholder="Black with white chest" />
              <Field label="Approximate size" name="size" placeholder="Small, medium, 45 lb…" />
              <Field label="Collar or tag description" name="collarDescription" />
            </div>
            <label className="mt-4 block text-sm font-medium">Distinguishing features<textarea name="distinguishingFeatures" rows={3} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2" /></label>
            <label className="mt-4 block text-sm font-medium">Approach instructions<textarea name="approachInstructions" rows={3} placeholder="Shy around strangers, responds to treats…" className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2" /></label>
            <div className="mt-4 rounded-xl border border-dashed border-border p-4 text-sm text-muted">
              Photo upload processing will use PawProof's private-to-public image pipeline. Until that pipeline is enabled, reports can be published without a photo rather than exposing an original upload directly.
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-6">
            <div className="text-sm font-bold">3. Where and when?</div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label={reportType === "lost" ? "Last seen date/time" : "Found/seen date/time"} name="eventAt" type="datetime-local" defaultValue={nowLocal} required />
              <Field label="Approximate public area" name="approximateLocation" required placeholder="Near Speedway Blvd & Country Club Rd" />
              <Field label="City" name="city" placeholder="Tucson" />
              <Field label="State / region" name="region" placeholder="AZ" />
              <Field label="ZIP / postal code" name="postalCode" placeholder="85716" />
            </div>
            {reportType === "found" ? (
              <label className="mt-4 block text-sm font-medium">Current situation<select name="foundDisposition" defaultValue="seen_not_secured" className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3"><option value="in_care">In my care</option><option value="seen_not_secured">Seen but not secured</option></select></label>
            ) : null}
          </section>

          <section className="rounded-2xl border border-border bg-surface p-6">
            <div className="text-sm font-bold">4. Review public sharing</div>
            <p className="mt-2 text-sm text-muted">Public pages can be shared without exposing your PawProof account email, account ID, private documents, or microchip numbers.</p>
            <label className="mt-4 flex gap-3 text-sm"><input type="checkbox" checked={publicLocationConsent} onChange={(e) => setPublicLocationConsent(e.target.checked)} className="mt-1" /><span>I understand the approximate location and report details will be public.</span></label>
            <label className="mt-3 flex gap-3 text-sm"><input type="checkbox" checked={publicPhotoConsent} onChange={(e) => setPublicPhotoConsent(e.target.checked)} className="mt-1" /><span>I allow selected report photos to be public after image processing is enabled.</span></label>
          </section>

          {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button type="submit" size="lg" disabled={submitting || loading}>{submitting ? "Publishing…" : user ? "Publish free report" : "Sign in and continue"}</Button>
            <span className="text-sm font-semibold text-muted">Lost and found is free. No payment to contact an owner or finder.</span>
          </div>
        </form>
      </main>
      <SiteFooter />
    </>
  );
}

function Field({ label, name, required, placeholder, type = "text", defaultValue }: { label: string; name: string; required?: boolean; placeholder?: string; type?: string; defaultValue?: string }) {
  return <label className="text-sm font-medium">{label}<input name={name} type={type} required={required} placeholder={placeholder} defaultValue={defaultValue} className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3" /></label>;
}
