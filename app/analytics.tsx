"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const GA_MEASUREMENT_ID = "G-E27G0MHB5X";
const COOKIE_NAME = "sigil_cookie_consent";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function getAnalyticsConsent(): boolean {
  const cookie = document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${COOKIE_NAME}=`));

  if (!cookie) return false;
  const value = cookie.slice(COOKIE_NAME.length + 1);
  if (value === "all") return true;
  if (value === "essential") return false;
  const match = /^custom-[01]-([01])$/.exec(value);
  return match?.[1] === "1";
}

function removeGoogleAnalyticsCookies() {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  const cookies = document.cookie.split(";").map((entry) => entry.trim());
  const domains = [window.location.hostname];
  if (window.location.hostname.endsWith(".sigilia.com.mx")) {
    domains.push(".sigilia.com.mx");
  }

  for (const entry of cookies) {
    const name = entry.split("=")[0];
    if (!name.startsWith("_ga") && name !== "_gid" && name !== "_gat") continue;

    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
    for (const domain of domains) {
      document.cookie = `${name}=; Path=/; Domain=${domain}; Max-Age=0; SameSite=Lax${secure}`;
    }
  }
}

export default function Analytics() {
  const pathname = usePathname();
  const [analyticsGranted, setAnalyticsGranted] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const configuredRef = useRef(false);
  const lastPageRef = useRef("");

  useEffect(() => {
    window.dataLayer = window.dataLayer ?? [];
    window.gtag = window.gtag ?? ((...args: unknown[]) => {
      window.dataLayer?.push(args);
    });

    window.gtag("consent", "default", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      wait_for_update: 500,
    });

    const syncConsent = () => {
      const granted = getAnalyticsConsent();
      setAnalyticsGranted(granted);
      window.gtag?.("consent", "update", {
        analytics_storage: granted ? "granted" : "denied",
      });
      if (!granted) removeGoogleAnalyticsCookies();
    };

    syncConsent();
    window.addEventListener("sigil:cookie-consent", syncConsent);
    return () => window.removeEventListener("sigil:cookie-consent", syncConsent);
  }, []);

  useEffect(() => {
    if (!analyticsGranted || !scriptLoaded || !window.gtag) return;

    if (!configuredRef.current) {
      window.gtag("js", new Date());
      window.gtag("config", GA_MEASUREMENT_ID, {
        send_page_view: false,
        anonymize_ip: true,
      });
      configuredRef.current = true;
    }

    const pageKey = `${pathname}${window.location.search}`;
    if (lastPageRef.current === pageKey) return;
    lastPageRef.current = pageKey;
    window.gtag("event", "page_view", {
      page_title: document.title,
      page_location: window.location.href,
      page_path: pageKey,
      measurement_id: GA_MEASUREMENT_ID,
    });
  }, [analyticsGranted, scriptLoaded, pathname]);

  return analyticsGranted ? (
    <Script
      src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      strategy="afterInteractive"
      onLoad={() => setScriptLoaded(true)}
    />
  ) : null;
}
