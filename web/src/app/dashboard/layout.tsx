import { DashboardShell } from "@/components/dashboard-shell";

export const metadata = { title: "Dashboard" };

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell kind="user">{children}</DashboardShell>;
}
