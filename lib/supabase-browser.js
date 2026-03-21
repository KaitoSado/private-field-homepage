"use client";

import { createClient } from "@supabase/supabase-js";

let browserClient;

export function getSupabaseBrowserClient() {
  if (typeof window === "undefined") {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      }
    );
  }

  if (!browserClient) {
    const storage = buildWindowStorage();
    const storageKey = buildWindowScopedStorageKey(process.env.NEXT_PUBLIC_SUPABASE_URL);
    migrateLegacySession(storageKey);

    browserClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          storage,
          storageKey,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    );
  }

  return browserClient;
}

function buildWindowStorage() {
  return {
    getItem(key) {
      return window.sessionStorage.getItem(key);
    },
    setItem(key, value) {
      window.sessionStorage.setItem(key, value);
    },
    removeItem(key) {
      window.sessionStorage.removeItem(key);
    }
  };
}

function buildWindowScopedStorageKey(url) {
  const projectRef = new URL(url).hostname.split(".")[0];
  const scopeKey = "fieldcard-auth-window-scope";
  let scope = window.sessionStorage.getItem(scopeKey);

  if (!scope) {
    scope = `window-${Math.random().toString(36).slice(2, 10)}`;
    window.sessionStorage.setItem(scopeKey, scope);
  }

  return `sb-${projectRef}-auth-token-${scope}`;
}

function migrateLegacySession(windowScopedStorageKey) {
  const projectRef = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
  const legacyStorageKey = `sb-${projectRef}-auth-token`;

  if (!window.sessionStorage.getItem(windowScopedStorageKey)) {
    const legacySession = window.localStorage.getItem(legacyStorageKey);
    if (legacySession) {
      window.sessionStorage.setItem(windowScopedStorageKey, legacySession);
    }
  }

  const scopedUserKey = `${windowScopedStorageKey}-user`;
  const legacyUserKey = `${legacyStorageKey}-user`;
  if (!window.sessionStorage.getItem(scopedUserKey)) {
    const legacyUser = window.localStorage.getItem(legacyUserKey);
    if (legacyUser) {
      window.sessionStorage.setItem(scopedUserKey, legacyUser);
    }
  }
}
