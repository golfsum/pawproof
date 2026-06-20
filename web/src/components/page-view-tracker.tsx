"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

// Fires a lightweight beacon to /api/track on each public page view. Admin,
// dashboard, auth, and api routes are skipped here (and again server-side).
const EXCLUDED = ["/admin", "/dashboard", "/sign-in", "/api"];

export function PageViewTracker() {
  const pathname = usePathname();
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    if (EXCLUDED.some((p) => pathname === p || pathname.startsWith(p + "/"))) return;
    if (lastTracked.current === pathname) return; // dedupe (incl. StrictMode)
    lastTracked.current = pathname;
    fetch("/api/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: pathname }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
