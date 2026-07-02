import type { Metadata } from "next";
import { LandingPage } from "@/components/landing-page";

export const metadata: Metadata = {
  title: "App to Manage Multiple Pets: One Home for the Whole Crew",
  description:
    "Managing several dogs and cats? PawProof keeps each pet's vaccines, meds, and reminders separate but in one app, so you always know whose turn is what. Free on iPhone.",
  alternates: { canonical: "/multiple-pets" },
  openGraph: {
    title: "Manage Multiple Pets in One App | PawProof",
    description:
      "Vaccines, meds, and reminders grouped per pet, so a multi-pet household never loses track.",
    url: "https://pawproof.app/multiple-pets",
  },
};

export default function Page() {
  return (
    <LandingPage
      heroImage="/screenshots/pets.png"
      heroAlt="PawProof My Pets list showing several pets"
      h1="One app for the whole crew"
      lede="Three pets or six, PawProof keeps each one's vaccines, meds, records, and reminders separate but together, so you always know whose booster is due and who already got fed."
      intro="With one pet you can just about keep it in your head. Add a second and a third and it falls apart fast. Different vaccine schedules, different meds, different vets. PawProof gives every pet its own profile and then rolls up what is due so nothing gets missed in the shuffle."
      bullets={[
        "A full profile per pet: vaccines, meds, weight, documents, and history",
        "Reminders grouped by pet so you know exactly whose turn is what",
        "One screen that shows everything due today across all your pets",
        "Log a meal, walk, or med for one pet or several at once",
        "Emergency cards for each pet to hand a sitter or the ER",
      ]}
      sections={[
        {
          heading: "Every pet, kept straight",
          body: "Each animal gets its own space, so your senior dog's meds never get confused with the puppy's vaccine schedule. Open a pet and you see their records, reminders, and next due date. Simple.",
        },
        {
          heading: "See the whole household at a glance",
          body: "The home screen pulls together what is due today across every pet. No more mental math about which dog needs the heartworm pill this week and which cat is overdue for a booster. It is right there.",
        },
        {
          heading: "Share the load",
          body: "Invite a partner, family member, or pet sitter so they can help log care and view the records that matter. Everyone stays on the same page without a group text.",
        },
      ]}
      faqs={[
        {
          q: "How many pets can I add?",
          a: "The free tier covers two pets. PawProof Plus unlocks unlimited pets, so the whole household fits.",
        },
        {
          q: "Can I log care for several pets at once?",
          a: "Yes. Quick Log lets you record a meal, walk, or med for one pet or several in a couple of taps.",
        },
        {
          q: "Can family or a sitter help?",
          a: "Yes. You can invite caregivers to help log care and view selected records, with roles you control.",
        },
        {
          q: "Does each pet get its own reminders?",
          a: "Yes. Reminders are grouped by pet, and the home screen shows everything due today across all of them.",
        },
      ]}
    />
  );
}
