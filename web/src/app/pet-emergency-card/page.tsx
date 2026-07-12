import type { Metadata } from "next";
import { LandingPage } from "@/components/landing-page";

export const metadata: Metadata = {
  title: "Pet Emergency Card and Information Sheet | PawProof",
  description:
    "Organize a pet emergency card with contacts, allergies, veterinarian-provided medication details, microchip information, and shareable records.",
  alternates: { canonical: "/pet-emergency-card" },
  openGraph: {
    title: "Pet Emergency Card Ready to Share | PawProof",
    description:
      "Keep essential contacts and saved pet information together for a caregiver, boarding facility, or veterinary clinic.",
    url: "https://pawproof.app/pet-emergency-card",
  },
};

export default function Page() {
  return (
    <LandingPage
      heroImage="/screenshots/emergency.png"
      heroAlt="PawProof emergency card for a dog"
      h1="Keep a pet emergency card ready to share"
      lede="Keep owner and veterinarian contacts, allergies, veterinarian-provided medication details, microchip information, and saved vaccine status together for each pet. Share the current information when a caregiver or clinic needs it."
      intro="It is difficult to gather details while you are worried or rushing out the door. PawProof turns the information saved for each pet into a clear pet emergency information sheet, so a trusted person can find the essentials without searching through messages and paperwork."
      bullets={[
        "Owner, backup caregiver, and veterinarian contacts",
        "Allergies and medication details saved from veterinary instructions",
        "Microchip information and identifying notes",
        "Saved vaccine status and relevant care details",
        "A separate shareable card for every pet",
      ]}
      sections={[
        {
          heading: "Put essential details on one pet emergency card",
          body: "A concise card helps a caregiver find contacts, identification, allergies, medications, and other saved details quickly. Keep supporting documents available separately when someone needs the source information.",
        },
        {
          heading: "Keep the emergency contact card current",
          body: "Review phone numbers, microchip information, medications, allergies, and care notes when something changes. PawProof organizes what you save, but it does not verify medical details or replace veterinary guidance.",
        },
        {
          heading: "Share it in the format your caregiver needs",
          body: "Send the saved information by text or email, or export a current PDF. A dog emergency card or cat profile can stay separate, which helps prevent details from being mixed up in a multi-pet home.",
        },
      ]}
      faqs={[
        {
          q: "What belongs on a pet emergency card?",
          a: "Useful basics include owner and veterinarian contacts, a backup caregiver, allergies, veterinarian-provided medication details, microchip information, and other essential notes saved for the pet.",
        },
        {
          q: "Is this a static pet emergency card template?",
          a: "No. PawProof organizes the current information saved for a pet and can export it as a shareable PDF. It does not provide a static blank form.",
        },
        {
          q: "Is an emergency card the same as a pet emergency plan?",
          a: "No. A card is a concise information handoff. A broader plan also covers evacuation options, a backup caregiver, supplies, transport, and practice.",
        },
        {
          q: "Does PawProof provide veterinary emergency advice?",
          a: "No. PawProof organizes saved records and contacts. Contact a veterinarian or emergency clinic for medical guidance about your pet.",
        },
      ]}
      relatedLinks={[
        { href: "/blog/pet-emergency-plan", label: "Build a practical pet emergency plan" },
        { href: "/pet-sitter-records-checklist", label: "Prepare pet sitter instructions" },
        { href: "/pet-medication-tracker", label: "Organize pet medication records" },
        { href: "/pet-document-organizer", label: "Keep supporting documents ready" },
      ]}
    />
  );
}
