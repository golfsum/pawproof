import type { Metadata } from "next";
import type { LandingProps } from "@/components/landing-page";
import { SITE_URL } from "@/lib/site";

export interface SeoPage extends LandingProps {
  slug: string;
  title: string;
  description: string;
  ogTitle?: string;
  ogDescription?: string;
}

export const SEO_PAGES: SeoPage[] = [
  {
    slug: "scan-vaccine-records",
    title: "Scan Vaccine Records on Your Phone",
    description:
      "Scan pet vaccine records, save the certificate, and keep boosters organized in one place with PawProof.",
    ogTitle: "Scan Pet Vaccine Records | PawProof",
    ogDescription:
      "Turn vaccine cards and certificates into clean digital records you can search and share.",
    heroImage: "/screenshots/records.png",
    heroAlt: "PawProof records screen showing scanned pet vaccine details",
    h1: "Scan vaccine records without typing every date",
    lede:
      "Take a photo of the certificate, confirm the details, and move on. PawProof helps you turn vaccine paperwork into organized digital records on your iPhone.",
    intro:
      "If you have three pets, every vaccine card starts to look the same when you are standing at boarding check-in. PawProof gives you one place to scan the record, save the original paperwork, and keep the next due date attached to the right pet.",
    bullets: [
      "Scan rabies, DHPP, FVRCP, FeLV, bordetella, and other vaccine paperwork",
      "Keep the original certificate attached to the pet it belongs to",
      "See what is due next without reading through old PDFs",
      "Pull up a clean record when boarding, daycare, or a new vet asks",
      "Share a PDF instead of sending a blurry camera-roll screenshot",
    ],
    sections: [
      {
        heading: "Good for the paperwork you already have",
        body: "Most pet owners do not need another blank form. They need a better home for the records they already collected over the last few years. PawProof is built for that stack of rabies certificates, invoices, and post-visit summaries.",
      },
      {
        heading: "Keep each pet separate",
        body: "Once there are two dogs and a cat in the house, it gets too easy to mix up who got what and when. PawProof keeps each record under the right pet and shows household reminders in one place.",
      },
      {
        heading: "Ready when someone asks for it",
        body: "Boarding desks, groomers, dog parks with vaccine requirements, and new vets all want proof. Open the app, find the record, and send it while the person is still standing there.",
      },
    ],
    faqs: [
      {
        q: "What vaccine records can I scan?",
        a: "Anything clear enough to photograph, including rabies certificates, combination vaccine records, invoices, and visit summaries.",
      },
      {
        q: "Can I keep the original document too?",
        a: "Yes. PawProof stores the document or photo with the saved record so you have both the summary and the source.",
      },
      {
        q: "Does this work for multiple pets?",
        a: "Yes. That is where it really helps, because each pet stays organized separately.",
      },
    ],
    relatedLinks: [
      { href: "/dog-vaccine-records", label: "Dog vaccine records" },
      { href: "/cat-vaccine-records", label: "Cat vaccine records" },
      { href: "/pet-document-organizer", label: "Pet document organizer" },
      { href: "/pet-health-timeline", label: "Pet health timeline" },
    ],
  },
  {
    slug: "printable-dog-vaccine-record",
    title: "Printable Dog Vaccine Record and Digital Tracker",
    description:
      "Get your dog's vaccine history organized for boarding, daycare, and vet visits with a printable-ready digital record.",
    ogTitle: "Printable Dog Vaccine Record | PawProof",
    ogDescription:
      "Keep your dog's vaccine details printable, shareable, and easy to update in one place.",
    heroImage: "/screenshots/records.png",
    heroAlt: "PawProof document view for a dog's vaccine history",
    h1: "A printable dog vaccine record that stays updated",
    lede:
      "If you need a clean vaccine record for boarding or daycare, PawProof keeps one ready and easy to export from your phone.",
    intro:
      "A printable record is useful, but the real headache is keeping it current. One booster changes, one rabies renewal gets added, and the old form is already wrong. PawProof helps you keep the live record updated so the printable version is never stale for long.",
    bullets: [
      "Track rabies, DHPP, bordetella, leptospirosis, Lyme, and canine influenza",
      "Store the certificate and the summary together",
      "Export a clean PDF when a facility asks for proof",
      "Set reminders before boosters lapse",
      "Keep records separate for each dog in the house",
    ],
    sections: [
      {
        heading: "Useful when boarding asks at the last minute",
        body: "A lot of dog paperwork becomes urgent two hours before drop-off. PawProof gives you the current vaccine record and the supporting documents in one place, so you can send what they need without opening five old emails.",
      },
      {
        heading: "Better than a one-time printable form",
        body: "Printable forms tend to live in drawers after that first use. A digital record lives with your dog's care, so every update stays attached to the next export.",
      },
    ],
    faqs: [
      {
        q: "Can I export a dog vaccine record as a PDF?",
        a: "Yes. PawProof can export a clean, vet-ready PDF when you need a printable record.",
      },
      {
        q: "Does PawProof store the actual vaccine certificate too?",
        a: "Yes. You can keep the original paperwork attached to the record for easy proof.",
      },
      {
        q: "Is this just for one dog?",
        a: "No. It works especially well when you have more than one dog with different renewal dates.",
      },
    ],
    relatedLinks: [
      { href: "/dog-boarding-vaccine-requirements", label: "Dog boarding vaccine requirements" },
      { href: "/scan-vaccine-records", label: "Scan vaccine records" },
      { href: "/lost-dog-vaccine-records", label: "I lost my dog's vaccine records" },
      { href: "/puppy-vaccine-schedule", label: "Puppy vaccine schedule" },
    ],
  },
  {
    slug: "printable-cat-vaccine-record",
    title: "Printable Cat Vaccine Record and Reminder App",
    description:
      "Keep your cat's vaccine history organized, printable, and easy to share with catteries and vets.",
    ogTitle: "Printable Cat Vaccine Record | PawProof",
    ogDescription:
      "Track rabies, FVRCP, and FeLV with a digital record you can export when needed.",
    heroImage: "/screenshots/records.png",
    heroAlt: "PawProof records screen for a cat's vaccine history",
    h1: "A printable cat vaccine record you will actually keep updated",
    lede:
      "Keep FVRCP, rabies, FeLV, and visit paperwork together so you can export a clean cat vaccine record any time.",
    intro:
      "Cats somehow make paperwork feel harder. One cat is indoor-only, one boards once a year, one has a specialist visit in the middle of all that. PawProof keeps each cat's vaccine history tidy and ready to print or share.",
    bullets: [
      "Track FVRCP, rabies, FeLV, and visit notes per cat",
      "Store cattery, adoption, and vet paperwork in one app",
      "Export a clean record instead of digging through PDFs",
      "Keep reminders attached to each cat's schedule",
      "See exactly what is current before a boarding stay",
    ],
    sections: [
      {
        heading: "Helpful for indoor and outdoor cats",
        body: "Different cats need different schedules. PawProof lets you keep those separate without losing the bigger picture of what your whole crew needs next.",
      },
      {
        heading: "Better than searching your email again",
        body: "When the cattery asks for proof, the fastest answer is the record you already keep current on your phone.",
      },
    ],
    faqs: [
      {
        q: "Can I track FVRCP and FeLV separately?",
        a: "Yes. PawProof keeps each vaccine as its own record with its own date and reminder.",
      },
      {
        q: "Can I export a cat vaccine record?",
        a: "Yes. You can export a clean PDF when you need a printable or shareable copy.",
      },
      {
        q: "Does this work for multiple cats?",
        a: "Yes. Each cat gets its own records and reminders.",
      },
    ],
    relatedLinks: [
      { href: "/cat-vaccine-records", label: "Cat vaccine records" },
      { href: "/kitten-vaccine-schedule", label: "Kitten vaccine schedule" },
      { href: "/scan-vaccine-records", label: "Scan vaccine records" },
      { href: "/pet-document-organizer", label: "Pet document organizer" },
    ],
  },
  {
    slug: "pet-medication-tracker",
    title: "Pet Medication Tracker for Daily Meds and Refills",
    description:
      "Track pet medications, doses, refill timing, and notes in one place with PawProof.",
    ogTitle: "Pet Medication Tracker | PawProof",
    ogDescription:
      "Keep medication schedules, refill notes, and care history straight for every pet in your home.",
    heroImage: "/screenshots/reminders.png",
    heroAlt: "PawProof reminders screen for pet medications and care tasks",
    h1: "Track pet medications without second-guessing yourself",
    lede:
      "Daily meds, every-other-day meds, supplements, and refill notes all in one place so the whole household can stay on the same page.",
    intro:
      "Medication tracking gets messy fast when one dog takes a pill with breakfast, another gets a supplement at night, and the cat has something that starts every third day. PawProof helps you see what was given, what is due next, and what needs a refill soon.",
    bullets: [
      "Track dose, frequency, and notes for each medication",
      "Set reminders that match the actual schedule",
      "Keep meds attached to the right pet profile",
      "Share care with a partner or sitter without a text thread",
      "Store prescription photos and instructions alongside the med",
    ],
    sections: [
      {
        heading: "Made for real pet households",
        body: "Medication routines are rarely neat. PawProof helps when care is split between two adults, a sitter, or whoever is home first that night.",
      },
      {
        heading: "Keep the instructions with the reminder",
        body: "A reminder is more useful when it is attached to the prescription details, refill info, and the pet it belongs to.",
      },
    ],
    faqs: [
      {
        q: "Can I track more than one medication per pet?",
        a: "Yes. Each pet can have multiple meds, each with its own schedule and notes.",
      },
      {
        q: "Can a caregiver help log medications?",
        a: "Yes. Shared care is one of the biggest reasons people use PawProof.",
      },
      {
        q: "Can I save prescription documents too?",
        a: "Yes. You can keep the prescription photo or related paperwork with the medication record.",
      },
    ],
    relatedLinks: [
      { href: "/pet-prescription-tracker", label: "Pet prescription tracker" },
      { href: "/pet-medical-records", label: "Pet medical records" },
      { href: "/pet-health-timeline", label: "Pet health timeline" },
      { href: "/multiple-pets", label: "Managing multiple pets" },
    ],
  },
  {
    slug: "vet-visit-records",
    title: "Vet Visit Records on Your Phone",
    description:
      "Keep vet visit notes, invoices, follow-up instructions, and health history in one searchable record.",
    ogTitle: "Vet Visit Records | PawProof",
    ogDescription:
      "Store visit summaries, invoices, and follow-up notes so the next appointment is easier.",
    heroImage: "/screenshots/records.png",
    heroAlt: "PawProof document screen for vet visit records",
    h1: "Keep every vet visit record where you can find it",
    lede:
      "Visit summaries, invoices, discharge notes, lab results, and follow-up instructions all stay with the pet they belong to.",
    intro:
      "Vet visits create a weird mix of paperwork: one invoice, one treatment summary, maybe a handout, maybe a note you took on your phone in the parking lot because you did not want to forget. PawProof gives all of that one home.",
    bullets: [
      "Save visit summaries, invoices, and discharge notes",
      "Keep specialist records separate from routine care if you need to",
      "Track follow-up reminders from the same visit",
      "Search past records before the next appointment",
      "Export a clean history when switching clinics",
    ],
    sections: [
      {
        heading: "Makes the next appointment easier",
        body: "It helps to walk into the next visit already knowing what happened last time, what medication changed, and what the vet wanted rechecked. PawProof keeps that chain intact.",
      },
      {
        heading: "Especially useful with older pets",
        body: "The more appointments a pet has, the more valuable a real record becomes. Older dogs and cats rarely have just one piece of paperwork to keep up with.",
      },
    ],
    faqs: [
      {
        q: "Can I save invoices and discharge notes?",
        a: "Yes. PawProof is built to hold the full visit paper trail, not just vaccine dates.",
      },
      {
        q: "Can I export records for a new vet?",
        a: "Yes. You can share a PDF or the original documents when another clinic needs them.",
      },
    ],
    relatedLinks: [
      { href: "/pet-document-organizer", label: "Pet document organizer" },
      { href: "/transfer-pet-records-new-vet", label: "Transfer pet records to a new vet" },
      { href: "/pet-health-timeline", label: "Pet health timeline" },
      { href: "/pet-medical-records", label: "Pet medical records" },
    ],
  },
  {
    slug: "dog-boarding-vaccine-requirements",
    title: "Dog Boarding Vaccine Requirements and Record Checklist",
    description:
      "Get your dog's boarding vaccine records organized before check-in with PawProof.",
    ogTitle: "Dog Boarding Vaccine Requirements | PawProof",
    ogDescription:
      "Keep rabies, DHPP, bordetella, and supporting records ready for boarding and daycare.",
    heroImage: "/screenshots/records.png",
    heroAlt: "PawProof records ready for a dog's boarding stay",
    h1: "Get your dog's boarding vaccine records ready before the scramble",
    lede:
      "Most boarding facilities ask for proof, not good intentions. PawProof helps you keep the required vaccine records together and easy to share.",
    intro:
      "Boarding paperwork always feels calm until it suddenly is not. One dog needs bordetella updated, another needs proof of rabies, and you are trying to remember whether the daycare uses the same rules as the boarding place. PawProof helps keep those records current and handy.",
    bullets: [
      "Keep rabies, DHPP, and bordetella proof in one place",
      "Attach the original certificate and the clean summary",
      "Set reminders before common boarding vaccines expire",
      "Export a PDF to send before check-in day",
      "Separate each dog's records if you are boarding more than one",
    ],
    sections: [
      {
        heading: "Requirements vary, the paperwork problem does not",
        body: "Every facility has its own exact list, but the pet owner problem is always the same: finding the current proof quickly. PawProof is built for that moment.",
      },
      {
        heading: "Helpful for daycare and grooming too",
        body: "A lot of the same vaccine proof gets requested for daycare and some grooming situations, so staying organized once pays off more than once.",
      },
    ],
    faqs: [
      {
        q: "What vaccines do boarding facilities usually ask for?",
        a: "Many ask for rabies, DHPP, and bordetella, but the exact list depends on the facility and your local vet guidance.",
      },
      {
        q: "Can I share records before the stay?",
        a: "Yes. PawProof keeps the documents easy to export so you can send them ahead of time.",
      },
    ],
    relatedLinks: [
      { href: "/printable-dog-vaccine-record", label: "Printable dog vaccine record" },
      { href: "/scan-vaccine-records", label: "Scan vaccine records" },
      { href: "/pet-sitter-records-checklist", label: "What records to give a pet sitter" },
      { href: "/dog-vaccine-records", label: "Dog vaccine records" },
    ],
  },
  {
    slug: "puppy-vaccine-schedule",
    title: "Puppy Vaccine Schedule Tracker and Reminder App",
    description:
      "Keep up with a puppy vaccine schedule, boosters, and vet paperwork in one place.",
    ogTitle: "Puppy Vaccine Schedule | PawProof",
    ogDescription:
      "Track puppy shots, booster timing, and paperwork so nothing gets missed during the busy first year.",
    heroImage: "/screenshots/reminders.png",
    heroAlt: "PawProof reminders screen for a puppy vaccine schedule",
    h1: "A puppy vaccine schedule that does not live in your head",
    lede:
      "The first year brings a lot of dates fast. PawProof helps you keep the vaccine schedule, certificates, and next booster in one place.",
    intro:
      "Puppy care has a way of stacking three things at once. There is the actual vet schedule, the paperwork you need to keep, and the fact that you are probably already tired. PawProof gives you one place to keep the dates straight while your puppy turns your living room into a chew project.",
    bullets: [
      "Track each puppy shot and the next booster date",
      "Store vet paperwork and certificates from every visit",
      "Set reminders before each follow-up appointment",
      "Keep notes on weight, meds, and early health issues too",
      "Export a clean record when daycare or training asks for proof",
    ],
    sections: [
      {
        heading: "Built for the busy first year",
        body: "The first year is when paperwork slips through the cracks because everything is happening at once. PawProof makes it easier to keep the details without building your own spreadsheet.",
      },
      {
        heading: "Useful after the puppy stage too",
        body: "The record you build early becomes the long-term medical history you will want later when switching vets or tracking boosters.",
      },
    ],
    faqs: [
      {
        q: "Can I track each booster separately?",
        a: "Yes. PawProof keeps each vaccine event and reminder attached to the same puppy profile.",
      },
      {
        q: "Can I save the visit paperwork too?",
        a: "Yes. That is one of the biggest reasons people use it during puppyhood.",
      },
    ],
    relatedLinks: [
      { href: "/dog-vaccine-records", label: "Dog vaccine records" },
      { href: "/printable-dog-vaccine-record", label: "Printable dog vaccine record" },
      { href: "/scan-vaccine-records", label: "Scan vaccine records" },
      { href: "/pet-health-timeline", label: "Pet health timeline" },
    ],
  },
  {
    slug: "kitten-vaccine-schedule",
    title: "Kitten Vaccine Schedule Tracker and Reminder App",
    description:
      "Track a kitten vaccine schedule, booster reminders, and vet paperwork in one place with PawProof.",
    ogTitle: "Kitten Vaccine Schedule | PawProof",
    ogDescription:
      "Keep FVRCP, rabies, FeLV, and visit records organized through your kitten's first year.",
    heroImage: "/screenshots/reminders.png",
    heroAlt: "PawProof reminders screen for a kitten vaccine schedule",
    h1: "Keep your kitten's vaccine schedule from getting lost in the chaos",
    lede:
      "Track the first-year shot schedule, save the paperwork, and keep every follow-up reminder attached to the right kitten.",
    intro:
      "Kittens are small, but the amount of paperwork they generate is not. Between first visits, boosters, adoption records, and whatever else gets handed to you in the carrier bag, it helps to have one app that keeps the whole story together.",
    bullets: [
      "Track FVRCP, rabies, FeLV, and follow-up dates",
      "Keep adoption, rescue, and clinic paperwork together",
      "Set reminders before each booster is due",
      "Store notes for meds, weight checks, and early issues",
      "Export a clean record for a new clinic or cattery",
    ],
    sections: [
      {
        heading: "Handy for multi-cat homes",
        body: "If there is already another cat at home, you do not want to guess whose paperwork belongs to which pet. PawProof keeps every kitten's records separate from day one.",
      },
      {
        heading: "Start tidy, stay tidy",
        body: "The easiest time to build a good medical record is right at the beginning. Then the future you with the adult cat gets the payoff.",
      },
    ],
    faqs: [
      {
        q: "Can I track kitten boosters and later adult boosters in the same record?",
        a: "Yes. PawProof keeps the history going as your kitten grows up.",
      },
      {
        q: "Can I store adoption paperwork too?",
        a: "Yes. You can keep rescue, shelter, or breeder documents alongside the medical record.",
      },
    ],
    relatedLinks: [
      { href: "/cat-vaccine-records", label: "Cat vaccine records" },
      { href: "/printable-cat-vaccine-record", label: "Printable cat vaccine record" },
      { href: "/scan-vaccine-records", label: "Scan vaccine records" },
      { href: "/pet-document-organizer", label: "Pet document organizer" },
    ],
  },
  {
    slug: "pet-document-organizer",
    title: "Pet Document Organizer for Records, PDFs, and Photos",
    description:
      "Organize pet records, vaccine certificates, invoices, and emergency documents in one searchable app.",
    ogTitle: "Pet Document Organizer | PawProof",
    ogDescription:
      "Keep every pet document in one place instead of scattered across email, downloads, and your camera roll.",
    heroImage: "/screenshots/records.png",
    heroAlt: "PawProof document organizer view for pet records",
    h1: "A pet document organizer that saves you from the camera roll hunt",
    lede:
      "Keep vaccine certificates, invoices, lab work, discharge papers, and emergency docs together so you can find them fast when someone asks.",
    intro:
      "Pet paperwork has a talent for spreading out. Some of it is in email, some in downloads, some in that one photo album full of receipts and cat pictures. PawProof gives you a home for the documents that matter, with enough structure that you can still find them later.",
    bullets: [
      "Store PDFs, photos, and scanned records per pet",
      "Keep emergency contacts and key documents handy",
      "Group records by the pet they belong to",
      "Find files quickly before vet visits, travel, or boarding",
      "Export a clean summary when needed",
    ],
    sections: [
      {
        heading: "Built for everyday records, not just emergencies",
        body: "The point is not just to prepare for the worst. It is to make the ordinary paperwork easier too, whether that is a vaccine card, a surgery estimate, or a lab result you need to pull up again six months later.",
      },
      {
        heading: "Especially useful when you have a whole crew",
        body: "Three pets means three sets of forms, and usually at least one you forgot to file somewhere sensible. PawProof keeps the records tied to the right pet from the start.",
      },
    ],
    faqs: [
      {
        q: "What types of documents can I keep here?",
        a: "Vaccine records, invoices, discharge notes, lab results, surgery paperwork, boarding forms, and more.",
      },
      {
        q: "Can I keep emergency records too?",
        a: "Yes. Emergency information and key medical documents are a good fit for PawProof.",
      },
    ],
    relatedLinks: [
      { href: "/vet-visit-records", label: "Vet visit records" },
      { href: "/pet-medical-records", label: "Pet medical records" },
      { href: "/emergency-pet-documents", label: "Emergency pet documents" },
      { href: "/scan-vaccine-records", label: "Scan vaccine records" },
    ],
  },
  {
    slug: "pet-health-timeline",
    title: "Pet Health Timeline for Vaccines, Visits, and Medications",
    description:
      "See your pet's health history in order, from vaccines to medications to vet visits.",
    ogTitle: "Pet Health Timeline | PawProof",
    ogDescription:
      "Keep a clear timeline of health events so it is easier to answer vet questions and spot patterns.",
    heroImage: "/screenshots/home.png",
    heroAlt: "PawProof home screen summarizing pet health and reminders",
    h1: "See your pet's health history as a timeline, not a pile",
    lede:
      "Vaccines, meds, weight notes, vet visits, and documents all make more sense when you can see what happened in order.",
    intro:
      "A timeline is one of those things you do not realize you need until a vet asks what changed first. The appetite issue or the medication? The weight dip or the lab work? PawProof helps keep the story of your pet's care easier to follow.",
    bullets: [
      "Keep vaccines, visits, meds, and notes in one running history",
      "Make it easier to answer vet questions with actual dates",
      "Spot patterns when a pet has recurring issues",
      "Keep separate histories for each pet in the house",
      "Export records when another clinic needs context",
    ],
    sections: [
      {
        heading: "Useful for older pets and ongoing conditions",
        body: "Once a pet has more than routine annual care, a timeline becomes much more useful than a pile of disconnected files.",
      },
      {
        heading: "Helpful when care is shared",
        body: "A timeline helps everyone see what already happened, especially if multiple family members handle appointments and meds.",
      },
    ],
    faqs: [
      {
        q: "Can I use this for chronic health issues?",
        a: "Yes. That is one of the clearest use cases for keeping a timeline.",
      },
      {
        q: "Does it help when switching vets?",
        a: "Yes. A timeline gives the next clinic a quicker read on recent care and changes.",
      },
    ],
    relatedLinks: [
      { href: "/vet-visit-records", label: "Vet visit records" },
      { href: "/pet-medication-tracker", label: "Pet medication tracker" },
      { href: "/pet-medical-records", label: "Pet medical records" },
      { href: "/multiple-pets", label: "Managing multiple pets" },
    ],
  },
  {
    slug: "lost-dog-vaccine-records",
    title: "I Lost My Dog's Vaccine Records",
    description:
      "What to do if you lost your dog's vaccine records and how to keep them organized next time.",
    ogTitle: "Lost Dog Vaccine Records | PawProof",
    ogDescription:
      "Find the likely sources, rebuild the record, and keep the next version organized on your phone.",
    heroImage: "/screenshots/records.png",
    heroAlt: "PawProof dog record screen with vaccine documents attached",
    h1: "Lost your dog's vaccine records? Start here",
    lede:
      "If the paperwork is gone, there is still a good chance the information is not. PawProof can help you rebuild the record and keep the next version organized.",
    intro:
      "This happens all the time. The boarding place asks for proof, you know the dog got the shots, and somehow the paper copy has vanished. The good news is the record is often still recoverable from the vet, old emails, or past boarding paperwork. Once you get it back together, PawProof helps you stop doing the same scavenger hunt next year.",
    bullets: [
      "Rebuild records from your vet, shelter, rescue, or prior boarding forms",
      "Store the recovered certificate in one safe place",
      "Attach the record to the right dog profile",
      "Set reminders so future renewals are easier to manage",
      "Export a clean record the next time someone asks",
    ],
    sections: [
      {
        heading: "Where to look first",
        body: "Start with your primary vet, any emergency or specialty clinics, your email inbox, and any boarding or daycare paperwork that might still have copies attached.",
      },
      {
        heading: "Keep the rebuilt record from disappearing again",
        body: "Once you have it, save both the original proof and the cleaned-up summary in one app. That is the part that saves future you.",
      },
    ],
    faqs: [
      {
        q: "Can my vet usually re-send the records?",
        a: "Often yes, especially for vaccines they administered or documented.",
      },
      {
        q: "What should I save once I get the records back?",
        a: "Save the original proof, the vaccine dates, and any expiration or next-due information.",
      },
    ],
    relatedLinks: [
      { href: "/printable-dog-vaccine-record", label: "Printable dog vaccine record" },
      { href: "/scan-vaccine-records", label: "Scan vaccine records" },
      { href: "/dog-boarding-vaccine-requirements", label: "Dog boarding vaccine requirements" },
      { href: "/pet-document-organizer", label: "Pet document organizer" },
    ],
  },
  {
    slug: "transfer-pet-records-new-vet",
    title: "How to Transfer Pet Records to a New Vet",
    description:
      "Keep pet records organized when moving to a new vet with PawProof.",
    ogTitle: "Transfer Pet Records to a New Vet | PawProof",
    ogDescription:
      "Organize the documents, vaccine records, and recent visit history a new vet usually needs.",
    heroImage: "/screenshots/records.png",
    heroAlt: "PawProof record export ready for a new vet",
    h1: "Make transferring pet records to a new vet much less annoying",
    lede:
      "A new clinic usually wants vaccines, recent visit summaries, medications, and key health history. PawProof helps you keep that packet ready.",
    intro:
      "Switching vets can be routine or stressful depending on why it is happening. Either way, the paperwork tends to be the same story: what vaccines are current, what meds are active, what happened at the last few visits, and who has the supporting documents. PawProof helps you keep that together before the first appointment.",
    bullets: [
      "Keep vaccines, meds, and recent visit notes in one place",
      "Store PDFs, photos, and discharge paperwork together",
      "Export a clean summary for the new clinic",
      "Attach specialist notes if your pet has ongoing issues",
      "Keep each pet's packet separate in a multi-pet home",
    ],
    sections: [
      {
        heading: "Makes the intake process easier",
        body: "A clean record means less back-and-forth, fewer forgotten details, and a better starting point for the new clinic.",
      },
      {
        heading: "Useful when moving or changing care levels",
        body: "Whether you are relocating, changing primary vets, or adding a specialist, having the records gathered in one app makes the handoff smoother.",
      },
    ],
    faqs: [
      {
        q: "What records should I usually bring to a new vet?",
        a: "Current vaccines, medication list, recent visit summaries, important lab results, and any major condition history are the usual starting point.",
      },
      {
        q: "Can I export records from PawProof?",
        a: "Yes. You can export a clean PDF and keep the source documents attached.",
      },
    ],
    relatedLinks: [
      { href: "/vet-visit-records", label: "Vet visit records" },
      { href: "/pet-document-organizer", label: "Pet document organizer" },
      { href: "/pet-health-timeline", label: "Pet health timeline" },
      { href: "/pet-medical-records", label: "Pet medical records" },
    ],
  },
  {
    slug: "pet-sitter-records-checklist",
    title: "What Records Should I Give a Pet Sitter?",
    description:
      "Keep the right pet records ready for a sitter with PawProof.",
    ogTitle: "Pet Sitter Records Checklist | PawProof",
    ogDescription:
      "Organize emergency contacts, medication notes, feeding details, and vaccine records for a pet sitter.",
    heroImage: "/screenshots/emergency.png",
    heroAlt: "PawProof emergency card and care records for a sitter",
    h1: "What records should you give a pet sitter? The practical list",
    lede:
      "A sitter does not need every scrap of paperwork, but they do need the right details fast. PawProof helps keep that ready.",
    intro:
      "When someone else is taking care of your pets, you want to hand over information that is useful, not overwhelming. That usually means emergency contacts, meds, feeding notes, behavior quirks, and the records they might actually need if something goes wrong. PawProof keeps that organized per pet.",
    bullets: [
      "Emergency contacts and clinic details",
      "Medication list and timing",
      "Feeding notes and routines",
      "Recent health issues or restrictions",
      "Vaccine or boarding records if relevant to the stay",
    ],
    sections: [
      {
        heading: "Especially helpful for multi-pet homes",
        body: "Sitters need clear per-pet instructions when one dog is easy, one cat hides, and the senior pet needs meds at a set time.",
      },
      {
        heading: "Good for vacations, not just emergencies",
        body: "The same records that help during a problem also make normal care handoffs less stressful for everyone.",
      },
    ],
    faqs: [
      {
        q: "Should I include vaccine records for a sitter?",
        a: "Only if they might need them for boarding, daycare, travel, or an emergency clinic visit. It is still useful to keep them easy to access.",
      },
      {
        q: "Can I keep emergency info in PawProof too?",
        a: "Yes. Emergency details are one of the core use cases.",
      },
    ],
    relatedLinks: [
      { href: "/pet-emergency-card", label: "Pet emergency card" },
      { href: "/multiple-pets", label: "Managing multiple pets" },
      { href: "/pet-document-organizer", label: "Pet document organizer" },
      { href: "/dog-boarding-vaccine-requirements", label: "Dog boarding vaccine requirements" },
    ],
  },
];

export const SEO_PAGE_SLUGS = SEO_PAGES.map((page) => page.slug);

export const SEO_PAGE_BY_SLUG = new Map(SEO_PAGES.map((page) => [page.slug, page]));

export function getSeoPage(slug: string) {
  return SEO_PAGE_BY_SLUG.get(slug);
}

export function getSeoPageMetadata(page: SeoPage): Metadata {
  const title = page.title;
  const description = page.description;
  const url = `${SITE_URL}/${page.slug}`;
  return {
    title,
    description,
    alternates: { canonical: `/${page.slug}` },
    openGraph: {
      title: page.ogTitle ?? `${title} | PawProof`,
      description: page.ogDescription ?? description,
      url,
    },
  };
}
