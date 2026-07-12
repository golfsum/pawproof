import type { Metadata } from "next";
import { LandingPage } from "@/components/landing-page";

export const metadata: Metadata = {
  title: "Cat Vaccine Records: Organize and Share | PawProof",
  description:
    "Organize cat vaccine records, save certificates and veterinarian-provided dates, set reminders, and share a current PDF from PawProof.",
  alternates: { canonical: "/cat-vaccine-records" },
  openGraph: {
    title: "Cat Vaccine Records Organized in One Place | PawProof",
    description:
      "Keep certificates, veterinarian-provided dates, reminders, and shareable records together for every cat.",
    url: "https://pawproof.app/cat-vaccine-records",
  },
};

export default function Page() {
  return (
    <LandingPage
      heroImage="/screenshots/records.png"
      heroAlt="PawProof records screen showing a cat's vaccines and documents"
      h1="Keep cat vaccine records organized and ready to share"
      lede="Save the original certificates, keep the dates supplied by your veterinarian with the right cat, and set reminders from the information you record. PawProof keeps the paperwork useful when someone asks for proof."
      intro="A cat vaccination record is easier to use when its dates, source documents, and reminders stay together. PawProof gives each cat one clear history, so the current certificate is not buried in an email thread or mixed up with another pet's paperwork."
      bullets={[
        "Save each certificate with the cat it belongs to",
        "Record dates and clinic details provided by your veterinarian",
        "Set reminders from the dates saved in PawProof",
        "Keep notes and supporting documents in the same history",
        "Share the source document or export a current PDF summary",
      ]}
      sections={[
        {
          heading: "Keep cat vaccine records clear and complete",
          body: "Each saved entry can hold the recorded dates, clinic details, notes, and original proof. That keeps the history understandable without asking you to remember which photo, email, or folder contains the latest certificate.",
        },
        {
          heading: "Connect veterinarian-provided dates to the paperwork",
          body: "Keep the date supplied by your veterinarian beside the document it came from. If a date changes or you are unsure what belongs in the record, confirm it with your veterinarian before updating PawProof.",
        },
        {
          heading: "Share the current history without rebuilding it",
          body: "When a veterinarian, caregiver, or facility requests records, you can find the supporting document and export a current PDF summary. PawProof organizes the information you save; it does not choose vaccines or recommend timing for your cat.",
        },
      ]}
      faqs={[
        {
          q: "What can I keep with my cat's vaccine history?",
          a: "You can save recorded dates, clinic details, notes, and the original certificate or supporting document under the same cat profile.",
        },
        {
          q: "Can PawProof remind me about a veterinarian-provided date?",
          a: "Yes. Set a reminder from the date you recorded. Ask your veterinarian if the timing is unclear or changes.",
        },
        {
          q: "Can I print or share the current record?",
          a: "You can export a current PDF summary and share the original supporting document. The summary reflects the information you saved in PawProof.",
        },
        {
          q: "Does PawProof recommend vaccines or timing for my cat?",
          a: "No. PawProof organizes records, documents, dates, and reminders. Your veterinarian determines which vaccines and timing are appropriate for your cat.",
        },
      ]}
      relatedLinks={[
        {
          href: "/printable-cat-vaccine-record",
          label: "Prepare a printable-ready cat record",
        },
        {
          href: "/kitten-vaccine-schedule",
          label: "Organize a veterinarian-provided kitten schedule",
        },
        {
          href: "/scan-vaccine-records",
          label: "Scan existing vaccine paperwork",
        },
        {
          href: "/pet-vaccine-reminders",
          label: "Manage pet vaccine reminders",
        },
      ]}
    />
  );
}
