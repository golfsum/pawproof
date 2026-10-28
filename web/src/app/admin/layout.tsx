import Script from "next/script";
import { DashboardShell } from "@/components/dashboard-shell";

export const metadata = { title: "Admin" };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell kind="admin">
    {children}
    <Script src="https://appsresolve.com/agent-assist.js" data-workspace="8d185b10-4973-496f-9ce3-5934b5c11275" strategy="afterInteractive" />
  </DashboardShell>;
}
