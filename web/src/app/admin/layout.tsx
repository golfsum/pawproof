import { DashboardShell } from "@/components/dashboard-shell";

export const metadata = { title: "Admin" };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell kind="admin">{children}</DashboardShell>;
}
