import type { Metadata } from "next";
import { LandingPage } from "@/components/landing-page";

export const metadata: Metadata = {
  title: "Pet Vaccine Reminder App: Never Miss a Booster",
  description:
    "Get reminders before your pet's vaccines expire, plus meds, flea and tick, and heartworm. PawProof sends real push notifications so nothing lapses. Free on iPhone.",
  alternates: { canonical: "/pet-vaccine-reminders" },
  openGraph: {
    title: "Pet Vaccine Reminder App | PawProof",
    description:
      "Push reminders for vaccines, meds, flea and tick, and heartworm, so you never miss a date.",
    url: "https://pawproof.app/pet-vaccine-reminders",
  },
};

export default function Page() {
  return (
    <LandingPage
      heroImage="/screenshots/reminders.png"
      heroAlt="PawProof reminders screen grouped by pet"
      h1="Reminders for every shot, dose, and vet visit"
      lede="PawProof sends a real push notification before your pet's vaccines expire, and for meds, flea and tick, heartworm, and grooming too. Set it once and stop keeping dates in your head."
      intro="The hardest part of pet care is not the tasks, it is remembering them. Between vaccines that renew yearly, monthly flea meds, and the med your dog takes twice a day, something always slips. PawProof puts all of it on one schedule and warns you before anything is due."
      bullets={[
        "Push reminders before a vaccine expires, not after you are already overdue",
        "Daily, weekly, monthly, yearly, or every-few-days schedules",
        "Reminders for feeding, walks, meds, flea and tick, heartworm, and grooming",
        "Grouped by pet, so a multi-pet house always knows whose turn is what",
        "Overdue items show up in red so nothing hides",
      ]}
      sections={[
        {
          heading: "Real notifications, not a to-do list you forget to open",
          body: "PawProof is a native iOS app, so reminders arrive as push notifications on your phone. You do not have to remember to check anything. When a booster is coming up or the morning dose is due, your phone tells you.",
        },
        {
          heading: "Set the whole routine in a couple of taps",
          body: "Scan a vaccine record and PawProof can add the renewal reminder automatically. Add feeding, walks, and meds with quick presets. Change the schedule anytime. It bends to your routine instead of forcing a new one.",
        },
        {
          heading: "Made for more than one pet",
          body: "With several animals, reminders pile up fast. PawProof groups everything by pet and surfaces what is due today, so you always know which dog needs the heartworm pill and which cat is due for a booster.",
        },
      ]}
      faqs={[
        {
          q: "Does PawProof send real reminders?",
          a: "Yes. It is a native iOS app and sends push notifications for vaccines, meds, and any reminder you set, so you get warned before something is due.",
        },
        {
          q: "Can it remind me about flea, tick, and heartworm?",
          a: "Yes. You can set monthly reminders for flea and tick and heartworm, along with any other recurring schedule.",
        },
        {
          q: "Will it remind me before a vaccine expires?",
          a: "Yes. PawProof tracks each vaccine's renewal date and notifies you ahead of time so you can book the appointment.",
        },
        {
          q: "Is it free?",
          a: "Yes to start. The free tier covers two pets. PawProof Plus adds unlimited pets and more.",
        },
      ]}
    />
  );
}
