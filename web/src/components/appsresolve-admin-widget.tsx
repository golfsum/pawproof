"use client";
import Script from "next/script";
import { useEffect, useState } from "react";
import { getIdToken } from "@/lib/auth-context";

declare global {
  interface Window {
    AppsResolveAgent?: {
      init(options: { workspaceId: string; getContextToken: () => Promise<{ token: string; expiresAt?: string }> }): Promise<unknown>;
      clearCustomerContext(): void;
      destroy(): void;
    };
  }
}

const workspaceId = process.env.NEXT_PUBLIC_APPSRESOLVE_AGENT_WORKSPACE_ID;

export function AppsResolveAdminWidget() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!loaded || !workspaceId || !window.AppsResolveAgent) return;
    const agent = window.AppsResolveAgent;
    void agent.init({
      workspaceId,
      async getContextToken() {
        const idToken = await getIdToken();
        if (!idToken) throw new Error("Admin session unavailable");
        const response = await fetch("/api/admin/appsresolve/context-token", {
          method: "POST",
          headers: { authorization: "Bearer " + idToken },
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Agent Assist unavailable");
        return response.json();
      },
    });
    agent.clearCustomerContext();
    return () => agent.destroy();
  }, [loaded]);

  if (!workspaceId) return null;
  return <Script src="https://appsresolve.com/agent-assist.js" strategy="afterInteractive" onReady={() => setLoaded(true)} />;
}
