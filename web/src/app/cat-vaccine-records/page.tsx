import type { Metadata } from "next";
import { LandingPage } from "@/components/landing-page";

export const metadata: Metadata = {
  title: "Cat Vaccine Records App: Track Shots & Vet Visits",
  description:
    "Keep your cat's vaccine records and vet history in one place. Scan the certificate, track FVRCP and rabies, and get reminders before boosters expire. Free on iPhone.",
  alternates: { canonical: "/cat-vaccine-records" },
  openGraph: {
    title: "Cat Vaccine Records App | PawProof",
    description:
      "Scan your cat's vaccine card and let PawProof track every date, booster, and vet visit.",
    url: "https://pawproof.app/cat-vaccine-records",
  },
};

export default function Page() {
  return (
    <LandingPage
      heroImage="/screenshots/records.png"
      heroAlt="PawProof records screen showing a cat's vaccines and documents"
      h1="Keep your cat's vaccine records in one place"
      lede="Scan the certificate once and PawProof tracks FVRCP, rabies, FeLV, and every vet visit on your iPhone, with a reminder before each booster is due."
      intro="Cats hide a lot, including when their shots are due. PawProof keeps your cat's vaccine history, vet records, and reminders in one place so you are never guessing whether that annual booster already happened or is coming up."
      bullets={[
        "Scan an FVRCP or rabies certificate and PawProof reads the details for you",
        "Track indoor and outdoor cat schedules like FeLV without keeping it all in your head",
        "Get a reminder before a booster expires",
        "Keep the certificate on hand for boarding, a cattery, or a new vet",
        "Export a vet-ready PDF whenever someone asks for records",
      ]}
      sections={[
        {
          heading: "Built for how cats actually get care",
          body: "Some cats see the vet once a year, some need more. PawProof holds each vaccine and its own renewal date, so an indoor cat's FVRCP and an outdoor cat's FeLV both stay on track without you tracking spreadsheets.",
        },
        {
          heading: "Scan it, do not type it",
          body: "Point your camera at the vaccine certificate and Smart Scan reads the vaccine, date, clinic, and expiration. Confirm and it is saved. No squinting at tiny print or typing dates by hand.",
        },
        {
          heading: "Ready for boarding and vet visits",
          body: "A cattery or new vet will ask for proof of vaccines. Open PawProof and share the record or a clean PDF right away instead of searching your email and photos.",
        },
      ]}
      faqs={[
        {
          q: "Can PawProof read my cat's vaccine certificate?",
          a: "Yes. Smart Scan reads the vaccine, date, clinic, and expiration from a photo and fills it in for you to confirm.",
        },
        {
          q: "Does it track FVRCP, rabies, and FeLV?",
          a: "Yes. Each vaccine gets its own record and renewal reminder, so every shot your cat needs stays on schedule.",
        },
        {
          q: "Is it free?",
          a: "Yes to start. The free tier covers two pets, three documents, and your first Smart Scan. Plus unlocks unlimited pets, scanning, and PDF exports.",
        },
        {
          q: "Can I track more than one cat?",
          a: "Yes. Every cat gets its own profile, records, and reminders.",
        },
      ]}
    />
  );
}
