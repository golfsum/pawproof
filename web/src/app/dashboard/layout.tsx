import { MobileShell } from "@/components/mobile-shell";

export const metadata = { title: "Dashboard" };

// /dashboard/* uses the iOS-style MobileShell so the web companion
// reads as an extension of the mobile app: sticky frosted-glass
// header, bottom tab bar, cream background, matching card styling.
// /admin/* keeps the old DashboardShell sidebar — that surface is
// admin tooling and benefits from a desktop layout.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <MobileShell kind="user">{children}</MobileShell>;
}
