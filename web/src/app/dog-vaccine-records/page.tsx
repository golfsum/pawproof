import type { Metadata } from "next";
import { LandingPage } from "@/components/landing-page";

export const metadata: Metadata = {
  title: "Dog Vaccine Records App: Track Shots & Boosters",
  description:
    "Keep your dog's vaccine records in one place. Scan the rabies certificate, track boosters, and get reminders before anything expires. Free on iPhone.",
  alternates: { canonical: "/dog-vaccine-records" },
  openGraph: {
    title: "Dog Vaccine Records App | PawProof",
    description:
      "Scan your dog's vaccine card and let PawProof track every date, booster, and renewal.",
    url: "https://pawproof.app/dog-vaccine-records",
  },
};

export default function Page() {
  return (
    <LandingPage
      heroImage="/screenshots/records.png"
      heroAlt="PawProof records screen showing a dog's vaccines and documents"
      h1="Keep your dog's vaccine records in one place"
      lede="Scan the rabies certificate and vet paperwork once, and PawProof holds every date, booster, and renewal on your iPhone. No more digging through your camera roll before a boarding stay."
      intro="If you have ever stood at the vet or a boarding desk scrolling your phone for a vaccine photo you took months ago, this app is for you. PawProof turns that pile of certificates and screenshots into a clean, searchable record for your dog, and reminds you before the next shot is due."
      bullets={[
        "Scan a rabies or DHPP certificate and PawProof reads the vaccine, date, clinic, and expiration for you",
        "See every vaccine and its next due date at a glance",
        "Get a push reminder before a booster lapses, not after",
        "Store the actual certificate so you can share it in seconds",
        "Export a vet-ready PDF for boarding, grooming, or a new vet",
      ]}
      sections={[
        {
          heading: "Stop typing dates off a vaccine card",
          body: "Smart Scan does the boring part. Point your camera at the certificate and PawProof pulls the vaccine name, the date it was given, the clinic, and when it expires. You confirm, and it is saved. What used to take five minutes of squinting takes a few seconds.",
        },
        {
          heading: "Never miss a booster again",
          body: "Rabies, distemper, bordetella, leptospirosis, and the rest all renew on their own schedules. PawProof tracks each one and sends a notification before it expires so you can book the appointment in time instead of finding out you are overdue.",
        },
        {
          heading: "Everything ready when someone asks for it",
          body: "Boarding facilities, groomers, and new vets all want proof of vaccines. Instead of hunting for it, open PawProof and share the record or a clean PDF right from your phone.",
        },
      ]}
      faqs={[
        {
          q: "Can PawProof read my dog's vaccine certificate automatically?",
          a: "Yes. Smart Scan reads the vaccine name, date given, clinic, and expiration from a photo of the certificate, then fills it in for you to confirm.",
        },
        {
          q: "Will it remind me when a vaccine is due?",
          a: "Yes. PawProof tracks each vaccine's renewal date and sends a push notification before it expires so nothing lapses.",
        },
        {
          q: "Is it free?",
          a: "PawProof is free to start and covers up to two pets, three documents, and your first Smart Scan. PawProof Plus unlocks unlimited pets, unlimited scanning, and PDF exports.",
        },
        {
          q: "Does it work for more than one dog?",
          a: "Yes. Each dog gets its own profile with its own vaccines, records, and reminders, so a multi-dog household stays organized.",
        },
      ]}
    />
  );
}
