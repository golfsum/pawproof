import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://pawproof.app"),
  title: {
    default: "PawProof — The pet care journal",
    template: "%s · PawProof",
  },
  description:
    "Track vaccines, reminders, records, and emergency info for every pet in your household. Free for 2 pets.",
  openGraph: {
    title: "PawProof",
    description:
      "Track vaccines, reminders, records, and emergency info for every pet in your household.",
    url: "https://pawproof.app",
    siteName: "PawProof",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "PawProof" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
