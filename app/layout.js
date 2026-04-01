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
              <Link href="/">トップ</Link>
              <Link href="/explore">発見</Link>
              <Link href="/apps">アプリ</Link>
              <Link href="/auth">認証</Link>
              <Link href="/notifications">通知</Link>
              <Link href="/settings">設定</Link>
              <Link href="/admin">管理</Link>
              <Link href="/ops">運用</Link>
              <Link href="/terms">利用規約</Link>
              <Link href="/privacy">プライバシー</Link>
              <Link href="/retention">保持方針</Link>
              <Link href="/contact">問い合わせ</Link>
              <Link href="/changelog">更新履歴</Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
