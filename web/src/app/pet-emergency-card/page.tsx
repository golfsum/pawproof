import type { Metadata } from "next";
import { LandingPage } from "@/components/landing-page";

export const metadata: Metadata = {
  title: "Pet Emergency Card & Sitter Info Sheet App",
  description:
    "Make a pet emergency card with vet contacts, allergies, meds, and microchip on one screen. Share it with a sitter, boarding, or the ER in seconds. Free on iPhone.",
  alternates: { canonical: "/pet-emergency-card" },
  openGraph: {
    title: "Pet Emergency Card App | PawProof",
    description:
      "Vet contacts, allergies, meds, and microchip on one screen, ready to share with a sitter or ER.",
    url: "https://pawproof.app/pet-emergency-card",
  },
};

export default function Page() {
  return (
    <LandingPage
      heroImage="/screenshots/emergency.png"
      heroAlt="PawProof emergency card for a dog"
      h1="A pet emergency card ready before you need it"
      lede="Vet contacts, allergies, medications, microchip, and vaccine status on one screen. Hand it to a sitter, a boarding facility, or the ER in seconds instead of scrambling in a stressful moment."
      intro="Emergencies and last-minute sitters have one thing in common: you never have the right info handy when it counts. PawProof builds a clean emergency card for each pet so the important details are one tap away, and easy to share the second someone needs them."
      bullets={[
        "Owner and vet contacts, allergies, meds, and microchip on a single screen",
        "Current vaccine status right there for boarding or the ER",
        "Share it by text, email, or PDF in seconds",
        "A card for each pet, always up to date with the rest of their records",
        "Perfect for pet sitters, boarding, travel, and new vets",
      ]}
      sections={[
        {
          heading: "Everything a sitter or vet asks for, in one place",
          body: "No more typing out feeding notes and vet numbers at the last minute. The emergency card pulls the key details from your pet's profile so it is always current, and it is ready to hand off whenever you leave your pet with someone.",
        },
        {
          heading: "Calm in a moment that usually is not",
          body: "If something goes wrong, the ER wants allergies, medications, and your vet's number fast. PawProof puts that on one screen so you are not fumbling through your phone while you are stressed.",
        },
        {
          heading: "Share it in seconds",
          body: "Text it, email it, or export a PDF. Your sitter gets exactly what they need, and you get peace of mind while you are away.",
        },
      ]}
      faqs={[
        {
          q: "What goes on the emergency card?",
          a: "Owner and vet contacts, allergies, current medications, microchip number, and vaccine status, all pulled from your pet's profile so it stays current.",
        },
        {
          q: "Can I share it with a pet sitter?",
          a: "Yes. You can share the card by text or email, or export a PDF, so a sitter or boarding facility has everything they need.",
        },
        {
          q: "Does each pet get its own card?",
          a: "Yes. Every pet has its own emergency card that updates automatically as you keep their records current.",
        },
        {
          q: "Is it free?",
          a: "Yes to start. The free tier covers two pets, and PawProof Plus unlocks unlimited pets and more.",
        },
      ]}
    />
  );
}
