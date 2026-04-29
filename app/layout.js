import "./globals.css";
import Link from "next/link";
import { Suspense } from "react";
import { FeedVisibilityHydrator } from "@/components/feed-visibility-hydrator";
import { HeaderNav } from "@/components/header-nav";
import { TelemetryClient } from "@/components/telemetry-client";
import { BRAND_DESCRIPTION, BRAND_NAME, buildAbsoluteUrl } from "@/lib/brand";

const BRAND_LOGO_PATH = "/brand/commune-logo.png";
const FAVICON_VERSION = "20260412b";
const FAVICON_PATH = `/icon.png?v=${FAVICON_VERSION}`;
const ICO_PATH = `/favicon.ico?v=${FAVICON_VERSION}`;
const APPLE_ICON_PATH = `/apple-icon.png?v=${FAVICON_VERSION}`;

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
    icon: [
      {
        url: ICO_PATH,
        type: "image/x-icon",
        sizes: "64x64"
      },
      {
        url: FAVICON_PATH,
        type: "image/png",
        sizes: "512x512"
      }
    ],
    shortcut: ICO_PATH,
    apple: [
      {
        url: APPLE_ICON_PATH,
        type: "image/png",
        sizes: "180x180"
      }
    ]
  }
};

export default function RootLayout({ children }) {
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "";

  return (
    <html lang="ja">
      <head>
        <link rel="stylesheet" href="/textures/new-commune/site-textures-20260430b.css" />
      </head>
      <body>
        <Suspense fallback={null}>
          <TelemetryClient />
          <FeedVisibilityHydrator />
        </Suspense>
        <header className="site-header">
          <div className="site-header-inner">
            <Link href="/" className="brand-lockup">
              <img className="brand-cube" src={BRAND_LOGO_PATH} alt="Commune" width={48} height={48} />
              <strong>{BRAND_NAME}</strong>
            </Link>
            <HeaderNav />
          </div>
        </header>

        {children}

        <footer className="site-footer">
          <div className="site-footer-inner">
            <div className="footer-note">
              <p className="eyebrow">{BRAND_NAME}</p>
              <p className="footer-copy">公開ページ / 記録 / Apps</p>
              {supportEmail ? <p className="muted">Support: {supportEmail}</p> : null}
            </div>
            <div className="footer-map">
              <div>
                <strong>見る</strong>
                <Link href="/">トップ</Link>
                <Link href="/explore">発見</Link>
                <Link href="/apps">アプリ</Link>
              </div>
              <div>
                <strong>アカウント</strong>
                <Link href="/auth">認証</Link>
                <Link href="/notifications">通知</Link>
                <Link href="/settings">設定</Link>
              </div>
              <div>
                <strong>運営</strong>
                <Link href="/admin">管理</Link>
                <Link href="/ops">運用</Link>
                <Link href="/changelog">更新履歴</Link>
              </div>
              <div>
                <strong>文書</strong>
                <Link href="/terms">利用規約</Link>
                <Link href="/privacy">プライバシー</Link>
                <Link href="/retention">保持方針</Link>
                <Link href="/contact">問い合わせ</Link>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
