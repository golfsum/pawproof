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
    title: "Pet Vaccine Records: Scan and Organize Documents",
    description:
      "Scan pet vaccine records, review the extracted details, save each source certificate, and keep current records organized with PawProof.",
    ogTitle: "Scan and Organize Pet Vaccine Records | PawProof",
    ogDescription:
      "Keep source certificates, recorded dates, and shareable pet records together after a quick scan and review.",
    heroImage: "/screenshots/records.png",
    heroAlt: "PawProof records screen showing scanned pet vaccine details",
    h1: "Turn pet vaccine records into organized digital files",
    lede:
      "Take a clear photo, review the details PawProof reads, and save the original certificate with the right pet. A digital pet vaccine record stays useful because the summary and its source remain together.",
    intro:
      "When paperwork is spread across email, a camera roll, and a kitchen drawer, finding one pet vaccination record can take longer than it should. PawProof helps you scan the document you already have, confirm the extracted information, and keep the saved record attached to the correct pet.",
    bullets: [
      "Photograph an existing certificate or record",
      "Review extracted names, dates, clinic details, and expiration information",
      "Keep the original image or document with the saved entry",
      "Separate records by pet in a busy multi-pet household",
      "Share the source document or export a current PDF summary",
    ],
    sections: [
      {
        heading: "Keep pet vaccine records tied to their source",
        body: "A summary is easier to trust when the original proof is close by. PawProof stores the photo or document with the entry, so you can check what was recorded instead of relying on a copied date with no context.",
      },
      {
        heading: "Review every scanned detail before saving",
        body: "Smart Scan reduces typing, but you stay in control. Confirm the extracted information against the certificate before adding it to the pet's history, especially when a photo is faint, folded, or handwritten.",
      },
      {
        heading: "Keep rabies proof available with the rest of the history",
        body: "A rabies vaccination record can be requested long after the appointment. Save the certificate and the information supplied by your veterinarian in the same pet profile, then share the current source document or summary when it is needed.",
      },
    ],
    faqs: [
      {
        q: "What kind of vaccine paperwork can I scan?",
        a: "You can scan a clear certificate, vaccine card, invoice, or visit document. Review the extracted details against the source before saving them.",
      },
      {
        q: "Does PawProof keep the original certificate?",
        a: "Yes. The original image or document can stay attached to the saved entry, giving you both the source and an organized summary.",
      },
      {
        q: "Does PawProof recommend vaccines or due dates?",
        a: "No. PawProof organizes the documents and dates you enter or confirm. Your veterinarian determines which vaccines and timing are appropriate for each pet.",
      },
      {
        q: "Can I share a scanned record?",
        a: "You can share the supporting document or export a current PDF summary based on the information saved in PawProof.",
      },
    ],
    relatedLinks: [
      { href: "/dog-vaccine-records", label: "Organize dog vaccine records" },
      { href: "/cat-vaccine-records", label: "Organize cat vaccine records" },
      { href: "/pet-vaccine-reminders", label: "Manage pet vaccine reminders" },
      { href: "/pet-document-organizer", label: "Keep other pet documents organized" },
    ],
  },
  {
    slug: "printable-dog-vaccine-record",
    title: "Printable Dog Vaccine Record and Current PDF Export",
    description:
      "Create a printable dog vaccine record by exporting the current dates and documents saved in PawProof. Share a PDF without relying on an old form.",
    ogTitle: "Printable Dog Vaccine Record from Current Data | PawProof",
    ogDescription:
      "Export and share a current PDF record based on the information and certificates you keep in PawProof.",
    heroImage: "/screenshots/records.png",
    heroAlt: "PawProof document view for a dog's vaccine history",
    h1: "Export a printable dog vaccine record from current information",
    lede:
      "Keep the dates and supporting certificates updated in PawProof, then export a clean PDF when someone asks for a copy. You are sharing the record you maintain, not filling out another blank template.",
    intro:
      "A printable record is most helpful when it reflects the information you have now. PawProof builds the export from the dates, clinic details, notes, and source documents saved for your dog, so you can print or share a current summary without copying everything into a separate form.",
    bullets: [
      "Keep veterinarian-provided dates and clinic details in one history",
      "Attach the original certificate or supporting document",
      "Export a clean PDF summary from the current saved record",
      "Share the PDF or print it when a copy is requested",
      "Keep each dog's information separate in a multi-dog household",
    ],
    sections: [
      {
        heading: "Export the record you already keep current",
        body: "Update the saved information when your veterinarian provides a new date or document. The next PDF export reflects those changes, which helps you avoid sending an older copy by mistake.",
      },
      {
        heading: "Keep the summary and source documents together",
        body: "The PDF is a useful overview, while the attached certificate remains the source proof. PawProof keeps both available, so you can share the summary, the original document, or both when needed.",
      },
      {
        heading: "A current PDF, not a static blank form",
        body: "PawProof does not provide a downloadable blank vaccination form. It exports a current summary from the information you entered or confirmed, and it does not recommend vaccines or timing.",
      },
    ],
    faqs: [
      {
        q: "Can I export my dog's saved record as a PDF?",
        a: "Yes. PawProof creates a current PDF summary from the information saved for your dog, which you can share or print.",
      },
      {
        q: "Is this a blank vaccine record form?",
        a: "No. PawProof does not provide a static blank form. The PDF is generated from the dates, details, and documents you keep in the app.",
      },
      {
        q: "Can I share the original certificate too?",
        a: "Yes. You can keep the source document attached and share it alongside the PDF summary when proof is requested.",
      },
      {
        q: "Does PawProof decide which information should be current?",
        a: "No. PawProof organizes the information you enter or confirm. Ask your veterinarian about vaccine decisions or timing, then update the saved record when needed.",
      },
    ],
    relatedLinks: [
      { href: "/dog-vaccine-records", label: "Organize dog vaccine records" },
      { href: "/scan-vaccine-records", label: "Scan supporting vaccine paperwork" },
      { href: "/dog-boarding-vaccine-requirements", label: "Prepare records for boarding" },
      { href: "/puppy-vaccine-schedule", label: "Track a veterinarian-provided puppy schedule" },
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
    title: "Pet Medication Tracker and Reminder App",
    description:
      "Use a pet medication tracker to organize veterinarian-provided instructions, owner-entered schedules, reminders, refill notes, and dose history.",
    ogTitle: "Pet Medication Tracker | PawProof",
    ogDescription:
      "Keep saved medication instructions, reminders, refill notes, and logs separate for every pet.",
    heroImage: "/screenshots/reminders.png",
    heroAlt: "PawProof reminders screen for pet medications and care tasks",
    h1: "Keep every pet medication tracker clear and current",
    lede:
      "Save the medication details and timing supplied by your veterinarian, set reminders from the schedule you enter, and keep a clear record of what was logged for each pet.",
    intro:
      "A pet medication app is most useful when it reduces uncertainty instead of adding another place to check. PawProof keeps the prescription details, owner-entered schedule, refill notes, and pet medication log together, so a busy household can review the same saved information.",
    bullets: [
      "Save medication details and instructions provided by your veterinarian",
      "Enter the schedule you were given and set matching reminders",
      "Log completed care under the correct pet profile",
      "Keep refill notes and supporting prescription documents nearby",
      "Review separate medication histories in a multi-pet household",
    ],
    sections: [
      {
        heading: "Use one pet medication tracker per pet",
        body: "A dog medication tracker should not be confused with another pet's routine. PawProof keeps the saved medication name, instructions, reminders, and log attached to the pet they belong to.",
      },
      {
        heading: "Keep a practical medication log",
        body: "Record completed care and notes so the household can review what was logged. PawProof organizes the history, but it does not confirm that a dose was appropriate or provide treatment advice.",
      },
      {
        heading: "Use reminders from the schedule you enter",
        body: "Set reminders based on the veterinarian-provided instructions you saved. If a medication, dose, or timing changes, confirm it with the prescribing clinic and update the record.",
      },
    ],
    faqs: [
      {
        q: "Can I track more than one medication for a pet?",
        a: "Yes. Keep each saved medication, schedule, reminder, and related note under the same pet profile.",
      },
      {
        q: "Does PawProof recommend medication doses or timing?",
        a: "No. PawProof organizes the instructions and schedule you enter. Contact the prescribing veterinarian if a dose, medication, or timing is unclear.",
      },
      {
        q: "Can I save a prescription document with the tracker?",
        a: "Yes. Keep a prescription photo or related document near the saved medication record for reference.",
      },
      {
        q: "Is this a static pet medication chart?",
        a: "No. PawProof keeps an organized record based on the details, schedules, and completed care you save in the app.",
      },
    ],
    relatedLinks: [
      { href: "/pet-medical-records", label: "Organize pet medical records" },
      { href: "/pet-health-timeline", label: "Review the pet health timeline" },
      { href: "/multiple-pets", label: "Keep multi-pet care separate" },
      { href: "/pet-sitter-records-checklist", label: "Prepare medication notes for a sitter" },
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
    title: "Dog Boarding Vaccine Requirements and Paperwork",
    description:
      "Confirm dog boarding vaccine requirements with the facility, then organize current certificates, dates, and shareable paperwork in PawProof.",
    ogTitle: "Dog Boarding Vaccine Requirements and Records | PawProof",
    ogDescription:
      "Keep facility-requested certificates and veterinarian-provided dates ready to share before check-in.",
    heroImage: "/screenshots/records.png",
    heroAlt: "PawProof records ready for a dog's boarding stay",
    h1: "Organize dog boarding vaccine requirements before check-in",
    lede:
      "Ask the facility what it requires and which proof it accepts, then keep those certificates and veterinarian-provided dates together in PawProof. A few minutes of preparation can make check-in much easier.",
    intro:
      "Dog boarding paperwork can become urgent when a facility requests a document you cannot find. Requirements vary, so start with the facility's current checklist and your veterinarian's records. PawProof helps you organize the proof you receive without deciding which vaccines or timing your dog needs.",
    bullets: [
      "Request the facility's current requirements and accepted proof",
      "Save original certificates under the correct dog profile",
      "Record dates and notes supplied by your veterinarian",
      "Set reminders from the dates you enter or confirm",
      "Share source documents or export a current PDF summary",
    ],
    sections: [
      {
        heading: "Confirm requirements with the boarding facility",
        body: "Ask which records are required, how recent they must be, and whether the facility needs a certificate, clinic record, or another form of proof. Confirm medical questions and timing with your veterinarian.",
      },
      {
        heading: "Keep dog boarding paperwork together",
        body: "Attach each source certificate to the correct dog and keep the recorded dates nearby. A records-focused dog boarding checklist should help you find current proof, not become a generic packing list.",
      },
      {
        heading: "Share current proof before check-in",
        body: "Send the supporting document or a current PDF summary in the format the facility accepts. Keeping the source and summary together makes it easier to respond if staff ask for clarification.",
      },
    ],
    faqs: [
      {
        q: "Which vaccine records does my boarding facility require?",
        a: "Requirements differ by facility and location. Ask the facility for its current list, then confirm any vaccine or timing questions with your veterinarian.",
      },
      {
        q: "Does PawProof recommend vaccines or timing?",
        a: "No. PawProof organizes documents, dates, and reminders. It does not decide which vaccines your dog needs or when they should be given.",
      },
      {
        q: "Can I share boarding records before the stay?",
        a: "Yes. You can share the supporting document or export a current PDF summary, depending on what the facility accepts.",
      },
      {
        q: "Can I keep paperwork separate for multiple dogs?",
        a: "Yes. Store each certificate and record under the dog it belongs to so the files do not get mixed up at check-in.",
      },
    ],
    relatedLinks: [
      { href: "/dog-vaccine-records", label: "Organize dog vaccine records" },
      { href: "/scan-vaccine-records", label: "Scan supporting vaccine paperwork" },
      { href: "/pet-vaccine-reminders", label: "Manage veterinarian-provided dates" },
      { href: "/printable-dog-vaccine-record", label: "Export a printable-ready dog record" },
    ],
  },
  {
    slug: "puppy-vaccine-schedule",
    title: "Puppy Vaccine Schedule Tracker for Vet-Supplied Dates",
    description:
      "Track the puppy vaccine schedule your veterinarian provides, attach visit records, and set reminders from saved dates with PawProof.",
    ogTitle: "Track a Vet-Supplied Puppy Vaccine Schedule | PawProof",
    ogDescription:
      "Keep veterinarian-provided dates, visit documents, and reminders organized throughout your puppy's first year.",
    heroImage: "/screenshots/reminders.png",
    heroAlt: "PawProof reminders screen for a puppy vaccine schedule",
    h1: "Track the puppy vaccine schedule your veterinarian provides",
    lede:
      "Enter the dates supplied by your veterinarian, attach the paperwork from each visit, and set reminders from the schedule you were given. PawProof organizes the plan; it does not recommend vaccine timing.",
    intro:
      "A puppy vaccine schedule can generate a surprising amount of paperwork during an already busy first year. PawProof keeps each date, reminder, and puppy vaccination record under the same profile, so you can follow the plan from your veterinarian without rebuilding it from emails and camera-roll photos.",
    bullets: [
      "Enter vaccine and follow-up dates provided by your veterinarian",
      "Attach certificates and visit paperwork to the matching entry",
      "Set reminders from the dates saved in your puppy's plan",
      "Keep notes and documents under one puppy profile",
      "Share a current record when a caregiver or facility requests proof",
    ],
    sections: [
      {
        heading: "Keep the puppy vaccine schedule in one place",
        body: "Add the dates and follow-up plan your veterinarian gives you, then keep each event attached to the right puppy. PawProof gives the schedule a practical home without substituting its own timing or medical guidance.",
      },
      {
        heading: "Connect each visit to its paperwork",
        body: "Save the certificate, visit summary, and notes with the matching event instead of leaving them scattered across email and photos. The history stays useful when a vet, caregiver, or facility asks what was recorded.",
      },
      {
        heading: "Use reminders without guessing the timing",
        body: "PawProof creates reminders from the dates you enter. If the plan changes or you are unsure when something is due, confirm the timing with your veterinarian and update the saved schedule.",
      },
    ],
    faqs: [
      {
        q: "Does PawProof recommend a puppy vaccine schedule?",
        a: "No. PawProof tracks the schedule and dates supplied by your veterinarian. It does not recommend vaccines or decide when your puppy should receive them.",
      },
      {
        q: "Can I save an existing puppy shot record?",
        a: "Yes. You can add the recorded dates and attach the original certificate or visit document to your puppy's profile.",
      },
      {
        q: "Can PawProof remind me about the next veterinarian-provided date?",
        a: "Yes. Set a reminder from the date you entered so the follow-up stays visible. Ask your veterinarian if the timing is unclear or changes.",
      },
      {
        q: "Will the records stay useful after puppyhood?",
        a: "Yes. The events and supporting documents remain part of the same pet history as your puppy grows into an adult dog.",
      },
    ],
    relatedLinks: [
      { href: "/dog-vaccine-records", label: "Organize adult dog vaccine records" },
      { href: "/scan-vaccine-records", label: "Scan existing vaccine paperwork" },
      { href: "/pet-vaccine-reminders", label: "Manage pet vaccine reminders" },
      { href: "/printable-dog-vaccine-record", label: "Prepare a printable-ready dog record" },
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
    title: "Pet Document Organizer for PDFs, Photos, and Records",
    description:
      "Use a pet document organizer to keep certificates, clinic PDFs, photos, invoices, discharge papers, and emergency files under the right pet.",
    ogTitle: "Pet Document Organizer | PawProof",
    ogDescription:
      "Keep important pet files organized by pet instead of scattered across email, downloads, and photos.",
    heroImage: "/screenshots/records.png",
    heroAlt: "PawProof document organizer view for pet records",
    h1: "Keep every pet document organized under the right profile",
    lede:
      "Give certificates, clinic PDFs, photos, invoices, discharge papers, and emergency files one dependable home. Find the source document without searching every inbox and folder again.",
    intro:
      "Pet paperwork spreads quickly, especially when several animals visit different clinics. PawProof works as a pet records organizer by keeping each file attached to the pet it belongs to, with enough context to recognize it later.",
    bullets: [
      "Store PDFs, photos, and source records by pet",
      "Keep certificates, invoices, and discharge documents together",
      "Add enough context to recognize each file later",
      "Find supporting documents before visits, travel, or care handoffs",
      "Keep emergency files available with the rest of the record",
    ],
    sections: [
      {
        heading: "Use one pet document organizer for everyday files",
        body: "A vaccine certificate, invoice, visit summary, or discharge document can matter months after it arrives. Save the source file while you still know what it is and which pet it belongs to.",
      },
      {
        heading: "Keep documents separate in a multi-pet home",
        body: "Similar clinic paperwork can be easy to mix up. PawProof keeps files under separate pet profiles, so you do not have to identify the right record from a filename or photo alone.",
      },
      {
        heading: "Keep source files available with organized records",
        body: "PawProof can help structure saved information, while the attached document remains the source. It organizes files and does not interpret veterinary results or provide medical advice.",
      },
    ],
    faqs: [
      {
        q: "What files can I keep in the organizer?",
        a: "You can keep PDFs, photos, certificates, invoices, visit summaries, discharge documents, and other supporting pet records.",
      },
      {
        q: "Can I keep documents for several pets?",
        a: "Yes. Save each file under the pet it belongs to so similar records stay separate and easier to find.",
      },
      {
        q: "Does PawProof explain veterinary documents?",
        a: "No. PawProof stores and organizes documents. Ask your veterinarian to explain results, diagnoses, or care recommendations.",
      },
    ],
    relatedLinks: [
      { href: "/scan-vaccine-records", label: "Scan vaccine paperwork" },
      { href: "/pet-medical-records", label: "Organize pet medical records" },
      { href: "/pet-health-timeline", label: "Review a chronological pet history" },
      { href: "/pet-emergency-card", label: "Prepare a pet emergency card" },
    ],
  },
  {
    slug: "pet-health-timeline",
    title: "Pet Health Timeline for Visits, Records, and Medications",
    description:
      "Keep a pet health timeline of owner-entered and veterinarian-provided dates, visits, medications, vaccines, weight notes, and source documents.",
    ogTitle: "Pet Health Timeline | PawProof",
    ogDescription:
      "Review visits, medications, vaccines, weight notes, and documents in chronological order for each pet.",
    heroImage: "/screenshots/home.png",
    heroAlt: "PawProof home screen summarizing pet health and reminders",
    h1: "See your pet's health history as a clear timeline",
    lede:
      "Put visits, medications, vaccines, weight notes, and supporting documents in chronological order. A clear history makes it easier to find what was recorded and when.",
    intro:
      "A pet health tracker app should help you review saved events without implying conclusions about them. PawProof organizes owner-entered and veterinarian-provided dates into a pet health timeline, with the related notes and documents close by.",
    bullets: [
      "Keep visits, vaccines, medications, weight entries, and notes in order",
      "Record dates supplied by your veterinarian or entered by the owner",
      "Attach supporting documents to the relevant history",
      "Maintain separate timelines for every pet in the household",
      "Export current records when another caregiver needs context",
    ],
    sections: [
      {
        heading: "Keep one pet health timeline per pet",
        body: "Separate histories reduce confusion when several pets have visits, medications, or reminders close together. Open one profile to review that pet's saved events in order.",
      },
      {
        heading: "Connect dates to notes and source records",
        body: "A date is more useful when the visit note, medication record, or document is nearby. PawProof keeps the history organized without interpreting the information or providing medical guidance.",
      },
      {
        heading: "Share chronology without rebuilding the history",
        body: "When a veterinarian or caregiver asks for context, review the saved timeline and export the current records that are relevant to the handoff.",
      },
    ],
    faqs: [
      {
        q: "What can appear in a pet health timeline?",
        a: "Saved visits, vaccines, medications, weight entries, notes, reminders, and supporting documents can contribute to the organized history.",
      },
      {
        q: "Does PawProof identify medical patterns?",
        a: "No. PawProof organizes saved events and dates. Ask your veterinarian to interpret changes, symptoms, results, or treatment history.",
      },
      {
        q: "Can I use the timeline when switching veterinarians?",
        a: "Yes. Review the chronology and share the current records or source documents that the new clinic requests.",
      },
    ],
    relatedLinks: [
      { href: "/pet-medical-records", label: "Organize pet medical records" },
      { href: "/pet-medication-tracker", label: "Keep pet medication records current" },
      { href: "/vet-visit-records", label: "Organize vet visit records" },
      { href: "/multiple-pets", label: "Keep multi-pet histories separate" },
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
    title: "Pet Sitter Instructions Template and Records Checklist",
    description:
      "Organize pet sitter instructions, emergency contacts, medication notes, routines, and relevant records for a clearer care handoff.",
    ogTitle: "Pet Sitter Instructions and Records Checklist | PawProof",
    ogDescription:
      "Keep practical care notes and the records a sitter may need together for each pet.",
    heroImage: "/screenshots/emergency.png",
    heroAlt: "PawProof emergency card and care records for a sitter",
    h1: "Organize pet sitter instructions for an easier handoff",
    lede:
      "Give a sitter clear routines, contacts, veterinarian-provided medication details, and the records they may actually need. PawProof keeps each pet's information separate and easier to review before you leave.",
    intro:
      "A pet sitter instructions template is useful only when it reflects the pets and routines in your home. PawProof helps you organize feeding notes, access details, emergency contacts, prescribed medication instructions, and supporting documents into a practical handoff without turning it into an overwhelming file dump.",
    bullets: [
      "Owner, backup caregiver, and veterinary contact details",
      "Feeding routines and practical household notes",
      "Medication names and timing supplied by your veterinarian",
      "Behavior, access, and comfort notes for each pet",
      "Emergency and vaccine documents relevant to the stay",
    ],
    sections: [
      {
        heading: "Build pet sitter instructions for each pet",
        body: "Separate dog sitter instructions and cat sitter instructions by profile, especially when routines differ. A sitter should be able to tell which food, medication note, carrier, and contact belongs to which animal without guessing.",
      },
      {
        heading: "Include the records a sitter may actually need",
        body: "A concise pet sitter information sheet can point to emergency contacts, current medications, veterinarian details, and relevant documents. Keep full medical files available, but do not bury the everyday instructions under paperwork the sitter is unlikely to use.",
      },
      {
        heading: "Review the handoff before you leave",
        body: "Confirm that phone numbers, access notes, routines, and medication instructions are current. PawProof organizes the information you enter; it does not create dosing or medical guidance for a sitter.",
      },
    ],
    faqs: [
      {
        q: "What should pet sitter instructions include?",
        a: "Include contacts, feeding routines, access notes, behavior details, veterinarian-provided medication instructions, and records relevant to the stay.",
      },
      {
        q: "Can I use the same checklist for dogs and cats?",
        a: "Use the same categories, but keep the details separate for each pet. Their routines, hiding places, carriers, medications, and care notes may be different.",
      },
      {
        q: "Does PawProof provide medication or dosing instructions?",
        a: "No. PawProof stores the instructions you enter from your veterinarian. Confirm any unclear medication details with the prescribing clinic before the handoff.",
      },
      {
        q: "Is this a static blank sitter form?",
        a: "No. PawProof organizes the current information saved for each pet, so the handoff can reflect the household rather than a generic blank template.",
      },
    ],
    relatedLinks: [
      { href: "/pet-emergency-card", label: "Prepare a pet emergency card" },
      { href: "/pet-medication-tracker", label: "Organize pet medication records" },
      { href: "/multiple-pets", label: "Keep multi-pet care separate" },
      { href: "/pet-document-organizer", label: "Organize supporting pet documents" },
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
