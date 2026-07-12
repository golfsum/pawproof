import type { Metadata } from "next";
import { LandingPage } from "@/components/landing-page";

export const metadata: Metadata = {
  title: "Dog Vaccine Records: Organize Shot Records | PawProof",
  description:
    "Organize dog vaccine records, save the original certificates, track renewal dates, and share a current PDF from PawProof when proof is requested.",
  alternates: { canonical: "/dog-vaccine-records" },
  openGraph: {
    title: "Dog Vaccine Records and Shot Records | PawProof",
    description:
      "Keep your dog's vaccine history, certificates, renewal dates, and shareable records organized in one place.",
    url: "https://pawproof.app/dog-vaccine-records",
  },
};

export default function Page() {
  return (
    <LandingPage
      heroImage="/screenshots/records.png"
      heroAlt="PawProof records screen showing a dog's vaccines and documents"
      h1="Keep dog vaccine records organized and ready to share"
      lede="Save the original certificate, keep each date with the right dog, and pull up a current record when someone asks for proof. PawProof keeps the paperwork useful after it leaves the vet's office."
      intro="A dog vaccination record is only helpful if you can find the current version. PawProof turns scattered certificates, photos, and dog shot records into one clear history, with the source paperwork attached and renewal reminders connected to the right dog."
      bullets={[
        "Scan an existing certificate and confirm the details PawProof reads",
        "Keep dates, clinic details, notes, and original proof together",
        "See the history and the next saved renewal date for each vaccine",
        "Set reminders based on the dates recorded for your dog",
        "Share the source document or export a current PDF summary",
      ]}
      sections={[
        {
          heading: "Keep dog vaccine records clear and complete",
          body: "Each saved entry can hold the vaccine name, recorded dates, clinic details, notes, and the original certificate. That gives you a useful history without asking you to remember which photo or email contains the latest proof.",
        },
        {
          heading: "Scan the paperwork you already have",
          body: "Smart Scan reads details from a clear photo of an existing certificate for you to review before saving. PawProof keeps the original image or document with the record, so the summary never replaces the proof it came from.",
        },
        {
          heading: "Share the current record, not an old screenshot",
          body: "When a vet, caregiver, or facility requests records, you can find the supporting document and export an up-to-date PDF summary from PawProof. The PDF reflects the information you saved; PawProof does not provide a blank vaccination form or decide what care your dog needs.",
        },
      ]}
      faqs={[
        {
          q: "What can I keep in my dog's vaccine record?",
          a: "You can save the vaccine name, recorded dates, clinic details, notes, and the original certificate or document. Your veterinarian remains the source for care decisions and recommended timing.",
        },
        {
          q: "Can PawProof scan my existing dog shot records?",
          a: "Yes. Smart Scan can read details from a clear certificate photo or document. You review the extracted information before it is saved to your dog's record.",
        },
        {
          q: "Can I print or share the record?",
          a: "You can export a current PDF summary and share the original supporting document. PawProof builds the PDF from the information you saved; it does not provide a static blank vaccination form.",
        },
        {
          q: "Does PawProof tell me which vaccines my dog needs?",
          a: "No. PawProof organizes the records and dates you enter or scan. Ask your veterinarian which vaccines and timing are appropriate for your dog.",
        },
      ]}
      relatedLinks={[
        {
          href: "/printable-dog-vaccine-record",
          label: "Prepare a printable-ready dog vaccine record",
        },
        {
          href: "/puppy-vaccine-schedule",
          label: "Organize puppy vaccine dates and records",
        },
        {
          href: "/dog-boarding-vaccine-requirements",
          label: "Prepare vaccine records for boarding",
        },
        {
          href: "/scan-vaccine-records",
          label: "Scan pet vaccine records",
        },
      ]}
    />
  );
}
