import "./globals.css";
import Link from "next/link";
import { Suspense } from "react";
import { FeedVisibilityHydrator } from "@/components/feed-visibility-hydrator";
import { HeaderNav } from "@/components/header-nav";
import { TelemetryClient } from "@/components/telemetry-client";
import { BRAND_DESCRIPTION, BRAND_NAME, BRAND_TAGLINE, buildAbsoluteUrl } from "@/lib/brand";

export const metadata = {
  metadataBase: new URL(buildAbsoluteUrl("/")),
  title: {
    default: BRAND_NAME,
    template: `%s | ${BRAND_NAME}`
  },
  description: BRAND_DESCRIPTION,
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: BRAND_NAME,
    description: BRAND_DESCRIPTION,
    url: "/",
    siteName: BRAND_NAME,
    images: ["/opengraph-image"],
    locale: "ja_JP",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND_NAME,
    description: BRAND_DESCRIPTION,
    images: ["/opengraph-image"]
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg"
  }
};

export default function RootLayout({ children }) {
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "";

  return (
    <html lang="ja">
      <body>
        <Suspense fallback={null}>
          <TelemetryClient />
          <FeedVisibilityHydrator />
        </Suspense>
        <header className="site-header">
          <div className="site-header-inner">
            <Link href="/" className="brand-lockup">
              <span className="brand-cube">FC</span>
              <span>
                <strong>{BRAND_NAME}</strong>
                <small>{BRAND_TAGLINE}</small>
              </span>
            </Link>
            <HeaderNav />
          </div>
        </header>

        {children}

        <footer className="site-footer">
          <div className="site-footer-inner">
            <div>
              <p className="eyebrow">{BRAND_NAME}</p>
              <p className="footer-copy">{BRAND_DESCRIPTION}</p>
              {supportEmail ? <p className="muted">Support: {supportEmail}</p> : null}
            </div>
            <div className="footer-links">
              <Link href="/">Home</Link>
              <Link href="/explore">Explore</Link>
              <Link href="/apps">Apps</Link>
              <Link href="/auth">Auth</Link>
              <Link href="/notifications">Notifications</Link>
              <Link href="/settings">Settings</Link>
              <Link href="/admin">Admin</Link>
              <Link href="/ops">Ops</Link>
              <Link href="/terms">Terms</Link>
              <Link href="/privacy">Privacy</Link>
              <Link href="/retention">Retention</Link>
              <Link href="/contact">Contact</Link>
              <Link href="/changelog">Changelog</Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
