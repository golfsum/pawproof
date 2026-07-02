import type { Metadata } from "next";
import { LandingPage } from "@/components/landing-page";

export const metadata: Metadata = {
  title: "Pet Medical Records App: Store Vet Records on Your Phone",
  description:
    "Keep your pet's medical records, vaccines, meds, weight, and vet documents in one app. Scan paperwork, search everything, and export vet-ready PDFs. Free on iPhone.",
  alternates: { canonical: "/pet-medical-records" },
  openGraph: {
    title: "Pet Medical Records App | PawProof",
    description:
      "Store vaccines, meds, weight, and vet documents in one place, and export a vet-ready PDF.",
    url: "https://pawproof.app/pet-medical-records",
  },
};

export default function Page() {
  return (
    <LandingPage
      heroImage="/screenshots/records.png"
      heroAlt="PawProof records screen with vaccines and documents"
      h1="Your pet's whole medical history, on your phone"
      lede="Vaccines, medications, weight, allergies, microchip, and every vet document in one place. Scan the paperwork, search across it all, and export a PDF your vet will actually recognize."
      intro="Pet records tend to live in three places at once: a folder in a drawer, your email, and your camera roll. When you switch vets or head to a new city, none of it is where you need it. PawProof pulls it all into one app so your pet's history travels with you."
      bullets={[
        "Scan vaccine cards and vet invoices and PawProof reads the details",
        "Track weight over time, allergies, medications, and microchip number",
        "Store documents and photos so the paperwork is never lost",
        "Search across every record instead of scrolling",
        "Export a clean, vet-ready PDF for a new vet, boarding, or a sitter",
      ]}
      sections={[
        {
          heading: "One place instead of five",
          body: "Every vaccine, vet visit, medication, and document lives under the pet it belongs to. When your dog changes vets or your cat needs a specialist, the full history is one tap away instead of scattered across paper and screenshots.",
        },
        {
          heading: "Records that leave the app when you need them to",
          body: "PawProof exports a polished PDF that matches what vets and boarding facilities expect. Share it by text or email in seconds, so you are never the person promising to send records later and forgetting.",
        },
        {
          heading: "Your data stays yours",
          body: "You can export a full backup anytime, and delete your account and everything in it from inside the app. No lock-in, no hostage data.",
        },
      ]}
      faqs={[
        {
          q: "Can I store vet documents and PDFs?",
          a: "Yes. You can upload documents and photos, and scan vaccine cards and invoices so the key dates are captured automatically.",
        },
        {
          q: "Can I export my pet's records?",
          a: "Yes. PawProof creates a vet-ready PDF per pet, and you can also export a full backup of your data at any time.",
        },
        {
          q: "Does it track weight and medications?",
          a: "Yes. You can log weight over time, list medications and doses, and record allergies and microchip details.",
        },
        {
          q: "Is it free?",
          a: "Yes to start, covering two pets and three documents. PawProof Plus unlocks unlimited pets, documents, scanning, and PDF exports.",
        },
      ]}
    />
  );
}
