"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

const EXCLUDED = ["/admin", "/dashboard", "/sign-in", "/api"];
const ATTRIBUTION_SENT_KEY = "pawproof-acquisition-sent";

export function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    if (EXCLUDED.some((p) => pathname === p || pathname.startsWith(p + "/"))) return;

    const query = searchParams?.toString();
    const dedupeKey = query ? `${pathname}?${query}` : pathname;
    if (lastTracked.current === dedupeKey) return;
    lastTracked.current = dedupeKey;

    const attribution = buildAttribution(searchParams);
    fetch("/api/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: pathname, attribution }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname, searchParams]);

  return null;
}

function buildAttribution(searchParams: ReturnType<typeof useSearchParams>) {
  if (typeof window === "undefined") return null;

  try {
    if (window.sessionStorage.getItem(ATTRIBUTION_SENT_KEY)) return null;
  } catch {
    return null;
  }

  const referrer = normalizeReferrer(document.referrer);
  const utmSource = normalizeParam(searchParams?.get("utm_source"));
  const utmMedium = normalizeParam(searchParams?.get("utm_medium"));
  const utmCampaign = normalizeParam(searchParams?.get("utm_campaign"));
  const utmTerm = normalizeParam(searchParams?.get("utm_term"));
  const utmContent = normalizeParam(searchParams?.get("utm_content"));

  const source = utmSource ?? inferSource(referrer);
  const medium = utmMedium ?? (referrer ? "referral" : "direct");

  try {
    window.sessionStorage.setItem(ATTRIBUTION_SENT_KEY, "1");
  } catch {
    return null;
  }

  return {
    source,
    medium,
    campaign: utmCampaign,
    term: utmTerm,
    content: utmContent,
    referrer,
  };
}

function normalizeParam(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed ? trimmed.slice(0, 100) : null;
}

function normalizeReferrer(value: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.origin === window.location.origin) return null;
    return url.hostname.replace(/^www\./, "").toLowerCase().slice(0, 100);
  } catch {
    return null;
  }
}

function inferSource(referrer: string | null) {
  if (!referrer) return "direct";
  if (/(google|bing|duckduckgo|yahoo)\./.test(referrer)) return "organic_search";
  if (/(facebook|instagram|t\.co|x\.com|pinterest|reddit|linkedin)\./.test(referrer)) {
    return "social";
  }
  return referrer;
}
