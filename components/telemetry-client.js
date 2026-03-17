"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function TelemetryClient() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const search = searchParams?.toString();

    void fetch("/api/telemetry/page-view", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        path: search ? `${pathname}?${search}` : pathname,
        referrer: document.referrer || ""
      })
    }).catch(() => undefined);
  }, [pathname, searchParams]);

  useEffect(() => {
    function report(payload) {
      void fetch("/api/telemetry/error", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }).catch(() => undefined);
    }

    function onError(event) {
      report({
        level: "error",
        message: event.message || "Unhandled error",
        pathname: window.location.pathname,
        stack: event.error?.stack || "",
        source: "window.error"
      });
    }

    function onRejection(event) {
      report({
        level: "error",
        message: `${event.reason || "Unhandled promise rejection"}`,
        pathname: window.location.pathname,
        stack: event.reason?.stack || "",
        source: "window.unhandledrejection"
      });
    }

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
