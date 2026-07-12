import type { Metadata } from "next";
import { LandingPage } from "@/components/landing-page";

export const metadata: Metadata = {
  title: "Pet Medical Records App for Organized Care History",
  description:
    "Organize pet medical records, veterinarian-provided details, visit history, medications, and source documents in one shareable care history.",
  alternates: { canonical: "/pet-medical-records" },
  openGraph: {
    title: "Pet Medical Records Organized in One App | PawProof",
    description:
      "Keep visits, vaccines, medications, notes, and supporting documents together for each pet.",
    url: "https://pawproof.app/pet-medical-records",
  },
};

export default function Page() {
  return (
    <LandingPage
      heroImage="/screenshots/records.png"
      heroAlt="PawProof records screen with vaccines and documents"
      h1="Keep pet medical records organized and ready to share"
      lede="Bring veterinarian-provided details, visit notes, vaccines, medications, weight entries, and supporting documents into one history for each pet. Find the current information without rebuilding it from scattered files."
      intro="Pet health records often end up split between clinic emails, paper folders, and camera-roll photos. PawProof gives that information a practical home, so you can review what was recorded, keep the source documents nearby, and export a current summary when a caregiver or clinic requests it."
      bullets={[
        "Keep visits, vaccines, medications, weight entries, and notes by pet",
        "Save veterinarian-provided dates and care details",
        "Attach source PDFs, photos, and clinic documents",
        "Review an organized history instead of searching several folders",
        "Export a current PDF summary when records are requested",
      ]}
      sections={[
        {
          heading: "Put pet medical records under the right profile",
          body: "Keep each visit, vaccine, medication, note, and attached document with the pet it belongs to. Clear ownership matters in a multi-pet home where similar paperwork can be easy to mix up.",
        },
        {
          heading: "Keep the summary connected to source documents",
          body: "An organized entry is useful for review, while the original clinic document provides the source context. Keep both available so you can check the saved information and share the appropriate file when needed.",
        },
        {
          heading: "Share a current care history",
          body: "Export a current PDF summary for a veterinarian, sitter, boarding facility, or other caregiver. PawProof organizes the information you save; it does not interpret the history or provide medical advice.",
        },
      ]}
      faqs={[
        {
          q: "What can I keep in a pet medical records app?",
          a: "PawProof can organize saved visits, vaccines, medications, weight entries, notes, and supporting documents for each pet.",
        },
        {
          q: "Can I store clinic documents and PDFs?",
          a: "Yes. Keep source documents and photos with the related record so the saved history has supporting context.",
        },
        {
          q: "Can I export the current record?",
          a: "Yes. PawProof creates a current PDF summary from the information saved for the pet and keeps the supporting documents available separately.",
        },
        {
          q: "Does PawProof interpret medical records?",
          a: "No. PawProof organizes owner-entered and veterinarian-provided information. Ask your veterinarian to explain results, recommendations, or care decisions.",
        },
      ]}
      relatedLinks={[
        { href: "/pet-document-organizer", label: "Organize supporting pet documents" },
        { href: "/pet-health-timeline", label: "Review a chronological pet history" },
        { href: "/vet-visit-records", label: "Keep vet visit records together" },
        { href: "/pet-medication-tracker", label: "Organize pet medication records" },
      ]}
    />
  );
}
