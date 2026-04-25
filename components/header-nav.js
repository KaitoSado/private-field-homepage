"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { fetchOwnProfileMeta } from "@/lib/profile-path";

const defaultMeta = {
  path: "/me",
  role: "user"
};

export function HeaderNav() {
  const pathname = usePathname();
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const supabase = useMemo(() => (hasSupabaseConfig ? getSupabaseBrowserClient() : null), [hasSupabaseConfig]);
  const [session, setSession] = useState(null);
  const [profileMeta, setProfileMeta] = useState(defaultMeta);
  const [unreadCount, setUnreadCount] = useState(0);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!supabase) return;

    let mounted = true;

    async function sync(nextSession) {
      if (!mounted) return;
      setSession(nextSession);

      if (!nextSession?.user) {
        setProfileMeta(defaultMeta);
        setUnreadCount(0);
        return;
      }

      const [nextMeta, notificationCount] = await Promise.all([
        fetchOwnProfileMeta(supabase, nextSession.user),
        fetchUnreadNotificationCount(supabase, nextSession.user.id)
      ]);
      if (!mounted) return;
      setProfileMeta(typeof nextMeta === "string" ? defaultMeta : nextMeta);
      setUnreadCount(notificationCount);
    }

    async function bootstrap() {
      const {
        data: { session: currentSession }
      } = await supabase.auth.getSession();

      sync(currentSession);
    }

    bootstrap();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      sync(nextSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSignOut() {
    if (!supabase) return;
    setSigningOut(true);
    await supabase.auth.signOut();
    window.location.assign("/");
  }

  const mainLinks = session
    ? [
        { href: "/explore", label: "発見" },
        { href: "/apps", label: "アプリ" },
        { href: "/notifications", label: unreadCount ? `通知 ${unreadCount}` : "通知" },
        { href: profileMeta.path, label: "マイページ" }
      ]
    : [
        { href: "/explore", label: "発見" },
        { href: "/apps", label: "アプリ" },
        { href: "/auth", label: "はじめる" }
      ];

  const menuLinks = session
    ? [
        { href: "/me", label: "拠点" },
        { href: "/settings", label: "設定" },
        ...(profileMeta.role === "admin"
          ? [
              { href: "/admin", label: "管理" },
              { href: "/ops", label: "運用" }
            ]
          : [])
      ]
    : [];

  return (
    <>
      <div className="site-nav-desktop">
        <Link href="/explore" className="site-command-entry">
          <span>探す</span>
          <kbd>/</kbd>
        </Link>
        <nav className="site-nav">
          {mainLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`site-nav-link ${pathname === link.href ? "is-active" : ""}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {session ? (
          <details className="site-nav-more">
            <summary>メニュー</summary>
            <div className="site-nav-menu-panel">
              {menuLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              ))}
              <button type="button" onClick={handleSignOut} disabled={signingOut}>
                {signingOut ? "ログアウト中..." : "ログアウト"}
              </button>
            </div>
          </details>
        ) : null}
      </div>

      <details className="mobile-nav">
        <summary>メニュー</summary>
        <nav className="mobile-nav-panel">
          {mainLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
          {session
            ? menuLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              ))
            : null}
          {session ? (
            <button type="button" className="mobile-nav-button" onClick={handleSignOut} disabled={signingOut}>
              {signingOut ? "ログアウト中..." : "ログアウト"}
            </button>
          ) : null}
        </nav>
      </details>
    </>
  );
}

async function fetchUnreadNotificationCount(supabase, userId) {
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .is("read_at", null);

  return count || 0;
}
