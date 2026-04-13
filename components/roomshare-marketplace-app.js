"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { checkRateLimit, formatRetryAfter, markRateLimitAction, reportAbuseClient } from "@/lib/abuse-client";
import { normalizeRoomDetail } from "@/lib/marketplace-validation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

const emptyListingForm = {
  title: "",
  description: "",
  location_text: "",
  rent: "",
  utilities: "0",
  deposit: "0",
  initial_cost: "0",
  available_from: "",
  capacity: "1",
  room_type: "private",
  gender_preference: "any",
  smoking_allowed: "false",
  pets_allowed: "false",
  nearest_station: "",
  house_rules: "",
  images: "",
  status: "draft"
};

const emptyProfileForm = {
  username: "",
  display_name: "",
  bio: "",
  age_label: "",
  location: "",
  avatar_url: ""
};

const searchDefaults = {
  q: "",
  area: "",
  minRent: "",
  maxRent: "",
  availableFrom: "",
  genderPreference: "",
  petsAllowed: "",
  smokingAllowed: "",
  sort: "newest",
  page: "1"
};

export function RoomshareMarketplaceApp({ view = "search", listingId = "", threadId = "", adminView = "overview", initialSearchParams = {} }) {
  const router = useRouter();
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const supabase = useMemo(() => (hasSupabaseConfig ? getSupabaseBrowserClient() : null), [hasSupabaseConfig]);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [identityVerification, setIdentityVerification] = useState(null);
  const [listings, setListings] = useState([]);
  const [favoriteListingIds, setFavoriteListingIds] = useState([]);
  const [selectedListing, setSelectedListing] = useState(null);
  const [favoriteItems, setFavoriteItems] = useState([]);
  const [applications, setApplications] = useState([]);
  const [threads, setThreads] = useState([]);
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [adminData, setAdminData] = useState({});
  const [searchForm, setSearchForm] = useState(() => ({ ...searchDefaults, ...initialSearchParams }));
  const [listingForm, setListingForm] = useState(emptyListingForm);
  const [profileForm, setProfileForm] = useState(emptyProfileForm);
  const [applicationMessage, setApplicationMessage] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [reportDraft, setReportDraft] = useState({ reason: "", details: "" });
  const [reviewDraft, setReviewDraft] = useState({ application_id: "", reviewee_id: "", rating: "5", comment: "" });
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const currentUserId = session?.user?.id || "";
  const isAdmin = profile?.role === "admin";
  const favoriteSet = useMemo(() => new Set(favoriteListingIds), [favoriteListingIds]);

  const fetchJson = useCallback(
    async (path, options = {}) => {
      const headers = { ...(options.headers || {}) };
      if (options.body && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
      }

      if (supabase) {
        const {
          data: { session: currentSession }
        } = await supabase.auth.getSession();
        if (currentSession?.access_token) headers.Authorization = `Bearer ${currentSession.access_token}`;
      }

      const response = await fetch(path, { ...options, headers });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "リクエストに失敗しました。");
      return result;
    },
    [supabase]
  );

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    async function bootstrap() {
      const {
        data: { session: currentSession }
      } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(currentSession);
    }

    bootstrap();
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setReloadToken((current) => current + 1);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!hasSupabaseConfig) return;
    loadCurrentView();
  }, [hasSupabaseConfig, view, listingId, threadId, adminView, currentUserId, reloadToken]);

  useEffect(() => {
    if (!selectedListing || view !== "edit") return;
    setListingForm(buildListingForm(selectedListing));
  }, [selectedListing, view]);

  async function loadCurrentView() {
    setLoading(true);
    setStatus("");

    try {
      if (currentUserId) {
        await Promise.all([loadProfile(), loadBlocks()]);
      } else {
        setProfile(null);
        setIdentityVerification(null);
        setBlockedUsers([]);
      }

      if (view === "search") await loadListings();
      if (view === "detail" || view === "edit") await loadListingDetail();
      if (view === "new") setListingForm(emptyListingForm);
      if (view === "favorites") await loadFavorites();
      if (view === "applications") await loadApplications();
      if (view === "messages") await loadThreads();
      if (view === "thread") await loadThread();
      if (view === "notifications") await loadNotifications();
      if (view === "admin") await loadAdminData();
      if (view === "me") await Promise.all([loadListings("mine"), loadApplications(), loadThreads()]);
    } catch (error) {
      setStatus(error.message || "読み込みに失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  async function loadProfile() {
    const result = await fetchJson("/api/marketplace/profile");
    setProfile(result.profile || null);
    setIdentityVerification(result.identityVerification || null);
    setProfileForm({
      username: result.profile?.username || "",
      display_name: result.profile?.display_name || "",
      bio: result.profile?.bio || "",
      age_label: result.profile?.age_label || "",
      location: result.profile?.location || "",
      avatar_url: result.profile?.avatar_url || ""
    });
  }

  async function loadBlocks() {
    try {
      const result = await fetchJson("/api/marketplace/blocks");
      setBlockedUsers(result.items || []);
    } catch {
      setBlockedUsers([]);
    }
  }

  async function loadListings(mode = "public") {
    const params = new URLSearchParams();
    Object.entries(searchForm).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    if (mode !== "public") params.set("mode", mode);
    const result = await fetchJson(`/api/marketplace/listings?${params.toString()}`);
    setListings(result.items || []);
    setFavoriteListingIds(result.favoriteListingIds || []);
    setStatus(`${result.total || 0} 件の掲載があります。`);
  }

  async function loadListingDetail() {
    if (!listingId) return;
    const result = await fetchJson(`/api/marketplace/listings?id=${encodeURIComponent(listingId)}`);
    setSelectedListing(result.item || null);
    setFavoriteListingIds(result.favoriteListingIds || []);
  }

  async function loadFavorites() {
    const result = await fetchJson("/api/marketplace/favorites");
    setFavoriteItems(result.items || []);
  }

  async function loadApplications() {
    const result = await fetchJson("/api/marketplace/applications");
    setApplications(result.items || []);
  }

  async function loadThreads() {
    const result = await fetchJson("/api/marketplace/messages");
    setThreads(result.items || []);
  }

  async function loadThread() {
    if (!threadId) return;
    const result = await fetchJson(`/api/marketplace/messages?thread_id=${encodeURIComponent(threadId)}`);
    setThread(result.thread || null);
    setMessages(result.messages || []);
  }

  async function loadNotifications() {
    const result = await fetchJson("/api/marketplace/notifications");
    setNotifications(result.items || []);
    setStatus(`未読 ${result.unreadCount || 0} 件`);
  }

  async function loadAdminData() {
    const result = await fetchJson(`/api/marketplace/admin?resource=${encodeURIComponent(adminView)}`);
    setAdminData(result || {});
  }

  function updateSearch(key, value) {
    setSearchForm((current) => ({ ...current, [key]: value, page: key === "page" ? value : "1" }));
  }

  function updateListing(key, value) {
    setListingForm((current) => ({ ...current, [key]: value }));
  }

  function updateProfile(key, value) {
    setProfileForm((current) => ({ ...current, [key]: value }));
  }

  async function submitSearch(event) {
    event.preventDefault();
    const params = new URLSearchParams();
    Object.entries(searchForm).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    router.push(`/apps/roomshare?${params.toString()}`);
    await loadListings();
  }

  async function submitProfile(event) {
    event.preventDefault();
    setSubmitting(true);
    setStatus("");

    try {
      const result = await fetchJson("/api/marketplace/profile", {
        method: "PATCH",
        body: JSON.stringify(profileForm)
      });
      setProfile(result.profile || null);
      setStatus("プロフィールを保存しました。");
    } catch (error) {
      setStatus(error.message || "プロフィールを保存できませんでした。");
    } finally {
      setSubmitting(false);
    }
  }

  async function requestIdentityVerification() {
    setSubmitting(true);
    setStatus("");
    try {
      const result = await fetchJson("/api/marketplace/profile", {
        method: "POST",
        body: JSON.stringify({ verification_type: "identity" })
      });
      setIdentityVerification(result.identityVerification || null);
      setStatus("本人確認リクエストを作成しました。MVPでは書類データは保存しません。");
    } catch (error) {
      setStatus(error.message || "本人確認を開始できませんでした。");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitListing(event) {
    event.preventDefault();
    if (!session) {
      setStatus("掲載するにはログインしてください。");
      return;
    }

    setSubmitting(true);
    setStatus("");

    try {
      const method = view === "edit" ? "PATCH" : "POST";
      const payload = view === "edit" ? { ...listingForm, id: listingId } : listingForm;
      const result = await fetchJson("/api/marketplace/listings", {
        method,
        body: JSON.stringify(payload)
      });
      setSelectedListing(result.item || null);
      setStatus(view === "edit" ? "掲載を更新しました。" : "掲載を作成しました。");
      if (result.item?.id && view !== "edit") router.push(`/apps/roomshare/listings/${result.item.id}`);
    } catch (error) {
      setStatus(error.message || "掲載を保存できませんでした。");
    } finally {
      setSubmitting(false);
    }
  }

  async function updateListingStatus(id, action) {
    setSubmitting(true);
    try {
      await fetchJson("/api/marketplace/listings", {
        method: "PATCH",
        body: JSON.stringify({ id, action })
      });
      setReloadToken((current) => current + 1);
      setStatus("掲載ステータスを更新しました。");
    } catch (error) {
      setStatus(error.message || "掲載ステータスを更新できませんでした。");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleFavorite(item, favorite) {
    if (!session) {
      setStatus("お気に入りにはログインが必要です。");
      return;
    }

    try {
      await fetchJson("/api/marketplace/favorites", {
        method: "POST",
        body: JSON.stringify({ listing_id: item.id, favorite })
      });
      setFavoriteListingIds((current) => (favorite ? [...new Set([...current, item.id])] : current.filter((id) => id !== item.id)));
      setStatus(favorite ? "お気に入りに追加しました。" : "お気に入りを外しました。");
      if (view === "favorites") await loadFavorites();
    } catch (error) {
      setStatus(error.message || "お気に入りを更新できませんでした。");
    }
  }

  async function submitApplication(event) {
    event.preventDefault();
    if (!selectedListing) return;

    if (!session) {
      setStatus("問い合わせにはログインが必要です。");
      return;
    }

    const limit = checkRateLimit("roomshare-application", { windowMs: 10 * 60 * 1000, max: 6 });
    if (!limit.allowed) {
      setStatus(`問い合わせが多すぎます。${formatRetryAfter(limit.retryAfterMs)}後に再試行してください。`);
      return;
    }

    setSubmitting(true);
    setStatus("");

    try {
      const result = await fetchJson("/api/marketplace/applications", {
        method: "POST",
        body: JSON.stringify({ listing_id: selectedListing.id, message: applicationMessage })
      });
      markRateLimitAction("roomshare-application");
      setApplicationMessage("");
      setStatus("問い合わせを送信し、チャットを開始しました。");
      if (result.thread?.id) router.push(`/apps/roomshare/messages/${result.thread.id}`);
    } catch (error) {
      setStatus(error.message || "問い合わせを送信できませんでした。");
    } finally {
      setSubmitting(false);
    }
  }

  async function updateApplication(id, statusValue) {
    setSubmitting(true);
    try {
      await fetchJson("/api/marketplace/applications", {
        method: "PATCH",
        body: JSON.stringify({ id, status: statusValue })
      });
      await loadApplications();
      setStatus("問い合わせステータスを更新しました。");
    } catch (error) {
      setStatus(error.message || "問い合わせを更新できませんでした。");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitMessage(event) {
    event.preventDefault();
    if (!thread) return;

    const limit = checkRateLimit("roomshare-message", { windowMs: 60 * 1000, max: 20 });
    if (!limit.allowed) {
      setStatus(`送信が多すぎます。${formatRetryAfter(limit.retryAfterMs)}後に再試行してください。`);
      return;
    }

    setSubmitting(true);
    setStatus("");

    try {
      const result = await fetchJson("/api/marketplace/messages", {
        method: "POST",
        body: JSON.stringify({ thread_id: thread.id, body: messageBody })
      });
      markRateLimitAction("roomshare-message");
      setMessages((current) => [...current, result.item]);
      setMessageBody("");
    } catch (error) {
      setStatus(error.message || "メッセージを送信できませんでした。");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitReport(targetType, targetId) {
    if (!session) {
      setStatus("通報にはログインが必要です。");
      return;
    }

    const limit = checkRateLimit("roomshare-report", { windowMs: 60 * 60 * 1000, max: 5 });
    if (!limit.allowed) {
      setStatus(`通報が多すぎます。${formatRetryAfter(limit.retryAfterMs)}後に再試行してください。`);
      return;
    }

    if (!reportDraft.reason.trim()) {
      setStatus("通報理由を入力してください。");
      return;
    }

    setSubmitting(true);
    try {
      await fetchJson("/api/marketplace/reports", {
        method: "POST",
        body: JSON.stringify({ target_type: targetType, target_id: targetId, ...reportDraft })
      });
      markRateLimitAction("roomshare-report");
      setReportDraft({ reason: "", details: "" });
      setStatus("通報を受け付けました。");
      void reportAbuseClient({
        profileId: currentUserId,
        kind: "roomshare_report_created",
        description: reportDraft.reason,
        alert: true,
        metadata: { targetType, targetId }
      });
    } catch (error) {
      setStatus(error.message || "通報を保存できませんでした。");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleBlock(userId, block) {
    setSubmitting(true);
    try {
      await fetchJson("/api/marketplace/blocks", {
        method: "POST",
        body: JSON.stringify({ blocked_id: userId, block })
      });
      await loadBlocks();
      setStatus(block ? "ユーザーをブロックしました。" : "ブロックを解除しました。");
    } catch (error) {
      setStatus(error.message || "ブロック状態を更新できませんでした。");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitReview(event) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await fetchJson("/api/marketplace/reviews", {
        method: "POST",
        body: JSON.stringify(reviewDraft)
      });
      setReviewDraft({ application_id: "", reviewee_id: "", rating: "5", comment: "" });
      setStatus("レビューを保存しました。");
    } catch (error) {
      setStatus(error.message || "レビューを保存できませんでした。");
    } finally {
      setSubmitting(false);
    }
  }

  async function markNotification(id = "") {
    try {
      await fetchJson("/api/marketplace/notifications", {
        method: "PATCH",
        body: JSON.stringify({ id })
      });
      await loadNotifications();
    } catch (error) {
      setStatus(error.message || "通知を更新できませんでした。");
    }
  }

  async function runAdminAction(resource, id, action, reason = "") {
    setSubmitting(true);
    try {
      await fetchJson("/api/marketplace/admin", {
        method: "PATCH",
        body: JSON.stringify({ resource, id, action, reason })
      });
      await loadAdminData();
      setStatus("管理操作を記録しました。");
    } catch (error) {
      setStatus(error.message || "管理操作に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  }

  if (!hasSupabaseConfig) {
    return (
      <section className="surface empty-state">
        <h1>Supabase の環境変数が未設定です</h1>
        <p>ルームシェアMVPを使うには Supabase URL と anon key を設定してください。</p>
      </section>
    );
  }

  return (
    <div className="marketplace-shell">
      <section className="marketplace-hero">
        <div>
          <p className="eyebrow">Trust Marketplace</p>
          <h1>ルームシェア</h1>
          <p>部屋を探す人と貸したい人が、プロフィール、問い合わせ、チャット、通報、管理導線まで同じ場所で動ける最初のMVPです。</p>
        </div>
        <div className="marketplace-hero-actions">
          <Link href="/apps/roomshare/listings/new" className="button button-primary">
            部屋を掲載
          </Link>
          <Link href="/apps/roomshare/profile" className="button button-secondary">
            プロフィール
          </Link>
          {session ? (
            <Link href="/apps/roomshare/me" className="button button-ghost">
              マイページ
            </Link>
          ) : (
            <Link href="/auth" className="button button-ghost">
              ログイン
            </Link>
          )}
        </div>
      </section>

      <nav className="marketplace-nav" aria-label="ルームシェアメニュー">
        <Link href="/apps/roomshare">検索</Link>
        <Link href="/apps/roomshare/favorites">お気に入り</Link>
        <Link href="/apps/roomshare/applications">問い合わせ</Link>
        <Link href="/apps/roomshare/messages">チャット</Link>
        <Link href="/apps/roomshare/notifications">通知</Link>
        {isAdmin ? <Link href="/apps/roomshare/admin">管理</Link> : null}
      </nav>

      {status ? <p className="marketplace-status">{status}</p> : null}
      {loading ? <section className="surface empty-state">読み込み中...</section> : renderCurrentView()}
    </div>
  );

  function renderCurrentView() {
    if (view === "search") return renderSearch();
    if (view === "detail") return selectedListing ? renderListingDetail(selectedListing) : renderEmpty("掲載が見つかりません");
    if (view === "new" || view === "edit") return renderListingForm();
    if (view === "profile") return renderProfile();
    if (view === "me") return renderMyPage();
    if (view === "favorites") return renderFavorites();
    if (view === "applications") return renderApplications();
    if (view === "messages") return renderThreads();
    if (view === "thread") return thread ? renderThread() : renderEmpty("スレッドが見つかりません");
    if (view === "notifications") return renderNotifications();
    if (view === "admin") return renderAdmin();
    return renderSearch();
  }

  function renderSearch() {
    return (
      <div className="marketplace-layout">
        <form className="surface marketplace-filter" onSubmit={submitSearch}>
          <h2>検索</h2>
          <label className="field">
            <span>キーワード</span>
            <input value={searchForm.q || ""} onChange={(event) => updateSearch("q", event.target.value)} placeholder="駅名、エリア、雰囲気" />
          </label>
          <label className="field">
            <span>エリア</span>
            <input value={searchForm.area || ""} onChange={(event) => updateSearch("area", event.target.value)} placeholder="湘南台、三田、日吉" />
          </label>
          <div className="marketplace-form-grid">
            <label className="field">
              <span>家賃下限</span>
              <input value={searchForm.minRent || ""} onChange={(event) => updateSearch("minRent", event.target.value)} inputMode="numeric" />
            </label>
            <label className="field">
              <span>家賃上限</span>
              <input value={searchForm.maxRent || ""} onChange={(event) => updateSearch("maxRent", event.target.value)} inputMode="numeric" />
            </label>
          </div>
          <label className="field">
            <span>入居可能日</span>
            <input type="date" value={searchForm.availableFrom || ""} onChange={(event) => updateSearch("availableFrom", event.target.value)} />
          </label>
          <div className="marketplace-form-grid">
            <label className="field">
              <span>性別条件</span>
              <select value={searchForm.genderPreference || ""} onChange={(event) => updateSearch("genderPreference", event.target.value)}>
                <option value="">指定なし</option>
                <option value="any">誰でも</option>
                <option value="female">女性</option>
                <option value="male">男性</option>
                <option value="non_binary">ノンバイナリー</option>
                <option value="same_gender">同性希望</option>
              </select>
            </label>
            <label className="field">
              <span>並び順</span>
              <select value={searchForm.sort || "newest"} onChange={(event) => updateSearch("sort", event.target.value)}>
                <option value="newest">新着順</option>
                <option value="rent_asc">家賃が安い順</option>
                <option value="rent_desc">家賃が高い順</option>
              </select>
            </label>
          </div>
          <div className="marketplace-form-grid">
            <label className="field">
              <span>ペット</span>
              <select value={searchForm.petsAllowed || ""} onChange={(event) => updateSearch("petsAllowed", event.target.value)}>
                <option value="">指定なし</option>
                <option value="true">可</option>
                <option value="false">不可</option>
              </select>
            </label>
            <label className="field">
              <span>喫煙</span>
              <select value={searchForm.smokingAllowed || ""} onChange={(event) => updateSearch("smokingAllowed", event.target.value)}>
                <option value="">指定なし</option>
                <option value="true">可</option>
                <option value="false">不可</option>
              </select>
            </label>
          </div>
          <button type="submit" className="button button-primary full-width">
            検索する
          </button>
        </form>
        <section className="marketplace-results">
          {listings.length ? listings.map((item) => renderListingCard(item)) : renderEmpty("公開中の掲載はまだありません")}
        </section>
      </div>
    );
  }

  function renderListingCard(item) {
    const detail = normalizeRoomDetail(item);
    const favorite = favoriteSet.has(item.id);
    return (
      <article key={item.id} className="surface marketplace-listing-card">
        {item.images?.[0] ? <img src={item.images[0]} alt="" className="marketplace-listing-image" /> : <div className="marketplace-listing-image is-empty">Room</div>}
        <div className="marketplace-card-body">
          <div className="marketplace-card-head">
            <span className={`marketplace-status-pill is-${item.status}`}>{listingStatusLabel(item.status)}</span>
            <strong>{formatYen(detail.rent)} / 月</strong>
          </div>
          <h2>{item.title}</h2>
          <p>{item.location_text}</p>
          <div className="marketplace-meta-row">
            <span>{detail.nearest_station || "駅情報未設定"}</span>
            <span>{detail.capacity}人</span>
            <span>{detail.pets_allowed ? "ペット可" : "ペット不可"}</span>
          </div>
          <div className="marketplace-card-actions">
            <Link href={`/apps/roomshare/listings/${item.id}`} className="button button-primary">
              詳細
            </Link>
            <button type="button" className="button button-secondary" onClick={() => toggleFavorite(item, !favorite)}>
              {favorite ? "保存済み" : "お気に入り"}
            </button>
          </div>
        </div>
      </article>
    );
  }

  function renderListingDetail(item) {
    const detail = normalizeRoomDetail(item);
    const ownListing = currentUserId && item.owner_id === currentUserId;
    const favorite = favoriteSet.has(item.id);
    return (
      <div className="marketplace-detail-grid">
        <section className="surface marketplace-detail-main">
          <div className="marketplace-photo-strip">
            {item.images?.length ? item.images.map((image) => <img key={image} src={image} alt="" />) : <div className="marketplace-photo-empty">写真URLを追加できます</div>}
          </div>
          <span className={`marketplace-status-pill is-${item.status}`}>{listingStatusLabel(item.status)}</span>
          <h2>{item.title}</h2>
          <p>{item.description}</p>
          <dl className="marketplace-spec-grid">
            <div><dt>家賃</dt><dd>{formatYen(detail.rent)}</dd></div>
            <div><dt>共益費</dt><dd>{formatYen(detail.utilities)}</dd></div>
            <div><dt>敷金</dt><dd>{formatYen(detail.deposit)}</dd></div>
            <div><dt>初期費用</dt><dd>{formatYen(detail.initial_cost)}</dd></div>
            <div><dt>入居可能日</dt><dd>{detail.available_from || "相談"}</dd></div>
            <div><dt>定員</dt><dd>{detail.capacity}人</dd></div>
            <div><dt>部屋タイプ</dt><dd>{roomTypeLabel(detail.room_type)}</dd></div>
            <div><dt>性別条件</dt><dd>{genderLabel(detail.gender_preference)}</dd></div>
            <div><dt>喫煙</dt><dd>{detail.smoking_allowed ? "可" : "不可"}</dd></div>
            <div><dt>ペット</dt><dd>{detail.pets_allowed ? "可" : "不可"}</dd></div>
            <div><dt>最寄り</dt><dd>{detail.nearest_station || "未設定"}</dd></div>
          </dl>
          {detail.house_rules ? <p className="marketplace-note">{detail.house_rules}</p> : null}
        </section>

        <aside className="marketplace-side-stack">
          <section className="surface marketplace-owner-card">
            <h3>掲載者</h3>
            <p>{item.owner?.display_name || item.owner?.username || "Unknown"}</p>
            <p className="muted">{item.owner?.keio_verified ? "Keio verified" : "本人確認ステータスを確認してください"}</p>
            {ownListing ? (
              <div className="marketplace-card-actions">
                <Link href={`/apps/roomshare/listings/${item.id}/edit`} className="button button-primary">編集</Link>
                <button type="button" className="button button-secondary" onClick={() => updateListingStatus(item.id, item.status === "published" ? "pause" : "publish")}>
                  {item.status === "published" ? "一時停止" : "公開"}
                </button>
              </div>
            ) : (
              <button type="button" className="button button-secondary full-width" onClick={() => toggleFavorite(item, !favorite)}>
                {favorite ? "お気に入り解除" : "お気に入り"}
              </button>
            )}
          </section>

          {!ownListing ? (
            <section className="surface marketplace-owner-card">
              <h3>問い合わせ</h3>
              <form className="form-stack" onSubmit={submitApplication}>
                <label className="field">
                  <span>メッセージ</span>
                  <textarea value={applicationMessage} onChange={(event) => setApplicationMessage(event.target.value)} rows={5} placeholder="内見希望、入居時期、自己紹介など" required />
                </label>
                <button type="submit" className="button button-primary full-width" disabled={submitting}>
                  問い合わせる
                </button>
              </form>
            </section>
          ) : null}

          <section className="surface marketplace-owner-card">
            <h3>通報</h3>
            {renderReportFields()}
            <button type="button" className="button button-ghost full-width" onClick={() => submitReport("listing", item.id)}>
              掲載を通報
            </button>
          </section>
        </aside>
      </div>
    );
  }

  function renderListingForm() {
    if (!session) return renderLoginPrompt("掲載を作成・編集するにはログインが必要です。");
    if (!profile?.display_name) {
      return (
        <section className="surface empty-state">
          <h2>先にプロフィールを整えてください</h2>
          <p>表示名、自己紹介、居住エリアがあると問い合わせの信頼性が上がります。</p>
          <Link href="/apps/roomshare/profile" className="button button-primary">プロフィールへ</Link>
        </section>
      );
    }

    return (
      <form className="surface marketplace-edit-form" onSubmit={submitListing}>
        <div>
          <p className="eyebrow">Room Listing</p>
          <h2>{view === "edit" ? "掲載を編集" : "部屋を掲載"}</h2>
        </div>
        <label className="field">
          <span>タイトル</span>
          <input value={listingForm.title} onChange={(event) => updateListing("title", event.target.value)} required />
        </label>
        <label className="field">
          <span>説明</span>
          <textarea value={listingForm.description} onChange={(event) => updateListing("description", event.target.value)} rows={6} required />
        </label>
        <label className="field">
          <span>エリア</span>
          <input value={listingForm.location_text} onChange={(event) => updateListing("location_text", event.target.value)} required />
        </label>
        <div className="marketplace-form-grid">
          <label className="field"><span>家賃</span><input value={listingForm.rent} onChange={(event) => updateListing("rent", event.target.value)} inputMode="numeric" required /></label>
          <label className="field"><span>共益費</span><input value={listingForm.utilities} onChange={(event) => updateListing("utilities", event.target.value)} inputMode="numeric" /></label>
          <label className="field"><span>敷金</span><input value={listingForm.deposit} onChange={(event) => updateListing("deposit", event.target.value)} inputMode="numeric" /></label>
          <label className="field"><span>初期費用</span><input value={listingForm.initial_cost} onChange={(event) => updateListing("initial_cost", event.target.value)} inputMode="numeric" /></label>
        </div>
        <div className="marketplace-form-grid">
          <label className="field"><span>入居可能日</span><input type="date" value={listingForm.available_from} onChange={(event) => updateListing("available_from", event.target.value)} /></label>
          <label className="field"><span>定員</span><input value={listingForm.capacity} onChange={(event) => updateListing("capacity", event.target.value)} inputMode="numeric" /></label>
          <label className="field">
            <span>部屋タイプ</span>
            <select value={listingForm.room_type} onChange={(event) => updateListing("room_type", event.target.value)}>
              <option value="private">個室</option>
              <option value="shared">相部屋</option>
              <option value="entire_home">一戸貸し</option>
              <option value="dorm">寮</option>
              <option value="other">その他</option>
            </select>
          </label>
          <label className="field">
            <span>性別条件</span>
            <select value={listingForm.gender_preference} onChange={(event) => updateListing("gender_preference", event.target.value)}>
              <option value="any">誰でも</option>
              <option value="female">女性</option>
              <option value="male">男性</option>
              <option value="non_binary">ノンバイナリー</option>
              <option value="same_gender">同性希望</option>
            </select>
          </label>
        </div>
        <div className="marketplace-form-grid">
          <label className="field">
            <span>喫煙</span>
            <select value={listingForm.smoking_allowed} onChange={(event) => updateListing("smoking_allowed", event.target.value)}>
              <option value="false">不可</option>
              <option value="true">可</option>
            </select>
          </label>
          <label className="field">
            <span>ペット</span>
            <select value={listingForm.pets_allowed} onChange={(event) => updateListing("pets_allowed", event.target.value)}>
              <option value="false">不可</option>
              <option value="true">可</option>
            </select>
          </label>
          <label className="field"><span>最寄り駅</span><input value={listingForm.nearest_station} onChange={(event) => updateListing("nearest_station", event.target.value)} /></label>
          <label className="field">
            <span>公開状態</span>
            <select value={listingForm.status} onChange={(event) => updateListing("status", event.target.value)}>
              <option value="draft">下書き</option>
              <option value="published">公開</option>
              <option value="paused">一時停止</option>
              <option value="archived">終了</option>
            </select>
          </label>
        </div>
        <label className="field">
          <span>写真URL</span>
          <textarea value={listingForm.images} onChange={(event) => updateListing("images", event.target.value)} rows={3} placeholder="1行に1URL、最大8件" />
        </label>
        <label className="field">
          <span>ハウスルール</span>
          <textarea value={listingForm.house_rules} onChange={(event) => updateListing("house_rules", event.target.value)} rows={4} />
        </label>
        <button type="submit" className="button button-primary" disabled={submitting}>
          {submitting ? "保存中..." : "保存する"}
        </button>
      </form>
    );
  }

  function renderProfile() {
    if (!session) return renderLoginPrompt("プロフィールを作成・編集するにはログインが必要です。");

    return (
      <div className="marketplace-detail-grid">
        <form className="surface marketplace-edit-form" onSubmit={submitProfile}>
          <h2>プロフィール</h2>
          <div className="marketplace-form-grid">
            <label className="field"><span>ユーザー名</span><input value={profileForm.username} onChange={(event) => updateProfile("username", event.target.value)} /></label>
            <label className="field"><span>表示名</span><input value={profileForm.display_name} onChange={(event) => updateProfile("display_name", event.target.value)} required /></label>
          </div>
          <label className="field"><span>自己紹介</span><textarea value={profileForm.bio} onChange={(event) => updateProfile("bio", event.target.value)} rows={5} /></label>
          <div className="marketplace-form-grid">
            <label className="field"><span>年代</span><input value={profileForm.age_label} onChange={(event) => updateProfile("age_label", event.target.value)} placeholder="20代前半" /></label>
            <label className="field"><span>居住エリア</span><input value={profileForm.location} onChange={(event) => updateProfile("location", event.target.value)} /></label>
          </div>
          <label className="field"><span>アイコン画像URL</span><input value={profileForm.avatar_url || ""} onChange={(event) => updateProfile("avatar_url", event.target.value)} /></label>
          <button type="submit" className="button button-primary" disabled={submitting}>保存する</button>
        </form>
        <section className="surface marketplace-owner-card">
          <h3>本人確認</h3>
          <p className={`marketplace-status-pill is-${identityVerification?.status || "unverified"}`}>{identityStatusLabel(identityVerification?.status)}</p>
          <p>MVPでは本人確認書類の実データは保存しません。外部連携前提のステータスだけを記録します。</p>
          <button type="button" className="button button-secondary" onClick={requestIdentityVerification} disabled={submitting}>本人確認を申請</button>
        </section>
      </div>
    );
  }

  function renderMyPage() {
    if (!session) return renderLoginPrompt("マイページを見るにはログインが必要です。");
    return (
      <div className="marketplace-results">
        <section className="surface marketplace-owner-card">
          <h2>マイページ</h2>
          <div className="marketplace-card-actions">
            <Link href="/apps/roomshare/listings/new" className="button button-primary">部屋を掲載</Link>
            <Link href="/apps/roomshare/profile" className="button button-secondary">プロフィール編集</Link>
            <Link href="/apps/roomshare/favorites" className="button button-ghost">お気に入り</Link>
          </div>
        </section>
        <section className="marketplace-results">
          <h3>自分の掲載</h3>
          {listings.length ? listings.map((item) => renderListingCard(item)) : renderEmpty("自分の掲載はまだありません")}
        </section>
      </div>
    );
  }

  function renderFavorites() {
    if (!session) return renderLoginPrompt("お気に入りを見るにはログインが必要です。");
    return (
      <section className="marketplace-results">
        {favoriteItems.length ? favoriteItems.map((item) => renderListingCard(item.listing)) : renderEmpty("お気に入りはまだありません")}
      </section>
    );
  }

  function renderApplications() {
    if (!session) return renderLoginPrompt("問い合わせを見るにはログインが必要です。");

    return (
      <div className="marketplace-results">
        {applications.length ? applications.map((item) => {
          const counterpart = item.applicant_id === currentUserId ? item.owner : item.applicant;
          const threadIdValue = item.message_threads?.[0]?.id;
          return (
            <article key={item.id} className="surface marketplace-application-card">
              <div>
                <span className={`marketplace-status-pill is-${item.status}`}>{applicationStatusLabel(item.status)}</span>
                <h2>{item.listing?.title || "掲載"}</h2>
                <p>{item.message}</p>
                <p className="muted">相手: {counterpart?.display_name || counterpart?.username || "Unknown"}</p>
              </div>
              <div className="marketplace-card-actions">
                {threadIdValue ? <Link href={`/apps/roomshare/messages/${threadIdValue}`} className="button button-primary">チャット</Link> : null}
                {item.owner_id === currentUserId && item.status === "pending" ? (
                  <>
                    <button type="button" className="button button-secondary" onClick={() => updateApplication(item.id, "accepted")}>承認</button>
                    <button type="button" className="button button-ghost" onClick={() => updateApplication(item.id, "rejected")}>拒否</button>
                  </>
                ) : null}
                {item.applicant_id === currentUserId && item.status === "pending" ? (
                  <button type="button" className="button button-ghost" onClick={() => updateApplication(item.id, "cancelled")}>キャンセル</button>
                ) : null}
                {["accepted", "completed"].includes(item.status) ? (
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => setReviewDraft({ application_id: item.id, reviewee_id: counterpart?.id || "", rating: "5", comment: "" })}
                  >
                    レビュー
                  </button>
                ) : null}
              </div>
            </article>
          );
        }) : renderEmpty("問い合わせはまだありません")}
        {reviewDraft.application_id ? renderReviewForm() : null}
      </div>
    );
  }

  function renderReviewForm() {
    return (
      <form className="surface marketplace-edit-form" onSubmit={submitReview}>
        <h3>レビューを書く</h3>
        <label className="field">
          <span>評価</span>
          <select value={reviewDraft.rating} onChange={(event) => setReviewDraft((current) => ({ ...current, rating: event.target.value }))}>
            <option value="5">5</option>
            <option value="4">4</option>
            <option value="3">3</option>
            <option value="2">2</option>
            <option value="1">1</option>
          </select>
        </label>
        <label className="field">
          <span>コメント</span>
          <textarea value={reviewDraft.comment} onChange={(event) => setReviewDraft((current) => ({ ...current, comment: event.target.value }))} rows={3} />
        </label>
        <button type="submit" className="button button-primary" disabled={submitting}>送信</button>
      </form>
    );
  }

  function renderThreads() {
    if (!session) return renderLoginPrompt("チャットを見るにはログインが必要です。");
    return (
      <section className="marketplace-results">
        {threads.length ? threads.map((item) => {
          const other = item.participant_a_id === currentUserId ? item.participant_b : item.participant_a;
          return (
            <Link key={item.id} href={`/apps/roomshare/messages/${item.id}`} className="surface marketplace-thread-row">
              <strong>{item.subject || item.listing?.title || "チャット"}</strong>
              <span>{other?.display_name || other?.username || "Unknown"}</span>
              <span className="muted">{formatDate(item.last_message_at || item.updated_at)}</span>
            </Link>
          );
        }) : renderEmpty("チャットはまだありません")}
      </section>
    );
  }

  function renderThread() {
    const other = thread.participant_a_id === currentUserId ? thread.participant_b : thread.participant_a;
    const otherId = thread.participant_a_id === currentUserId ? thread.participant_b_id : thread.participant_a_id;
    const isBlocked = blockedUsers.some((item) => item.blocked_id === otherId);
    return (
      <div className="marketplace-detail-grid">
        <section className="surface marketplace-chat-panel">
          <div className="marketplace-card-head">
            <h2>{thread.subject || "チャット"}</h2>
            <span>{other?.display_name || other?.username || "Unknown"}</span>
          </div>
          <div className="marketplace-message-list">
            {messages.map((item) => (
              <article key={item.id} className={`marketplace-message ${item.sender_id === currentUserId ? "is-own" : ""}`}>
                <p>{item.body}</p>
                <span>{item.sender?.display_name || item.sender?.username || "Unknown"}・{formatDate(item.created_at)}</span>
              </article>
            ))}
          </div>
          <form className="marketplace-message-form" onSubmit={submitMessage}>
            <label className="field">
              <span>メッセージ</span>
              <textarea value={messageBody} onChange={(event) => setMessageBody(event.target.value)} rows={3} required />
            </label>
            <button type="submit" className="button button-primary" disabled={submitting || isBlocked}>送信</button>
          </form>
        </section>
        <aside className="marketplace-side-stack">
          <section className="surface marketplace-owner-card">
            <h3>安全操作</h3>
            <button type="button" className="button button-secondary full-width" onClick={() => toggleBlock(otherId, !isBlocked)}>
              {isBlocked ? "ブロック解除" : "このユーザーをブロック"}
            </button>
          </section>
          <section className="surface marketplace-owner-card">
            <h3>通報</h3>
            {renderReportFields()}
            <button type="button" className="button button-ghost full-width" onClick={() => submitReport("user", otherId)}>
              ユーザーを通報
            </button>
          </section>
        </aside>
      </div>
    );
  }

  function renderNotifications() {
    if (!session) return renderLoginPrompt("通知を見るにはログインが必要です。");
    return (
      <section className="marketplace-results">
        <button type="button" className="button button-secondary" onClick={() => markNotification("")}>すべて既読にする</button>
        {notifications.length ? notifications.map((item) => (
          <article key={item.id} className={`surface marketplace-notification ${item.read_at ? "is-read" : "is-unread"}`}>
            <div>
              <strong>{item.title || notificationTitle(item.type)}</strong>
              <p>{item.body}</p>
              <p className="muted">{formatDate(item.created_at)}</p>
            </div>
            <div className="marketplace-card-actions">
              {item.action_url ? <Link href={item.action_url} className="button button-primary">開く</Link> : null}
              <button type="button" className="button button-secondary" onClick={() => markNotification(item.id)}>既読</button>
            </div>
          </article>
        )) : renderEmpty("通知はまだありません")}
      </section>
    );
  }

  function renderAdmin() {
    if (!session) return renderLoginPrompt("管理画面にはログインが必要です。");
    if (!isAdmin) return renderEmpty("管理者のみアクセスできます");

    return (
      <div className="marketplace-results">
        <nav className="marketplace-nav">
          <Link href="/apps/roomshare/admin">概要</Link>
          <Link href="/apps/roomshare/admin/users">ユーザー</Link>
          <Link href="/apps/roomshare/admin/listings">掲載</Link>
          <Link href="/apps/roomshare/admin/reports">通報</Link>
          <Link href="/apps/roomshare/admin/applications">問い合わせ</Link>
        </nav>
        {adminView === "overview" ? renderAdminOverview() : null}
        {adminView === "users" ? renderAdminUsers() : null}
        {adminView === "listings" ? renderAdminListings() : null}
        {adminView === "reports" ? renderAdminReports() : null}
        {adminView === "applications" ? renderAdminApplications() : null}
      </div>
    );
  }

  function renderAdminOverview() {
    const summary = adminData.summary || {};
    return (
      <section className="marketplace-admin-grid">
        <div className="surface marketplace-stat"><span>Users</span><strong>{summary.users || 0}</strong></div>
        <div className="surface marketplace-stat"><span>Listings</span><strong>{summary.listings || 0}</strong></div>
        <div className="surface marketplace-stat"><span>Open Reports</span><strong>{summary.openReports || 0}</strong></div>
        <div className="surface marketplace-stat"><span>Applications</span><strong>{summary.applications || 0}</strong></div>
      </section>
    );
  }

  function renderAdminUsers() {
    return (adminData.users || []).map((user) => (
      <article key={user.id} className="surface marketplace-admin-row">
        <div><strong>{user.display_name || user.username}</strong><p>{user.account_status} / {user.role}</p></div>
        <button type="button" className="button button-secondary" onClick={() => runAdminAction("user", user.id, user.account_status === "suspended" ? "resume" : "suspend")}>
          {user.account_status === "suspended" ? "再開" : "停止"}
        </button>
      </article>
    ));
  }

  function renderAdminListings() {
    return (adminData.listings || []).map((item) => (
      <article key={item.id} className="surface marketplace-admin-row">
        <div><strong>{item.title}</strong><p>{item.status} / {item.owner?.display_name || item.owner?.username}</p></div>
        <div className="marketplace-card-actions">
          <button type="button" className="button button-secondary" onClick={() => runAdminAction("listing", item.id, item.status === "published" ? "pause" : "publish")}>{item.status === "published" ? "非公開" : "公開"}</button>
          <button type="button" className="button button-ghost" onClick={() => runAdminAction("listing", item.id, "reject", "管理者により非公開")}>却下</button>
        </div>
      </article>
    ));
  }

  function renderAdminReports() {
    return (adminData.reports || []).map((item) => (
      <article key={item.id} className="surface marketplace-admin-row">
        <div><strong>{item.reason}</strong><p>{item.status} / {item.details}</p></div>
        <div className="marketplace-card-actions">
          <button type="button" className="button button-secondary" onClick={() => runAdminAction("report", item.id, "reviewing")}>確認中</button>
          <button type="button" className="button button-primary" onClick={() => runAdminAction("report", item.id, "resolved")}>解決</button>
          <button type="button" className="button button-ghost" onClick={() => runAdminAction("report", item.id, "dismissed")}>却下</button>
        </div>
      </article>
    ));
  }

  function renderAdminApplications() {
    return (adminData.applications || []).map((item) => (
      <article key={item.id} className="surface marketplace-admin-row">
        <div><strong>{item.listing?.title}</strong><p>{item.status} / {item.applicant?.display_name || item.applicant?.username}</p></div>
        <div className="marketplace-card-actions">
          <button type="button" className="button button-secondary" onClick={() => runAdminAction("application", item.id, "accepted")}>承認</button>
          <button type="button" className="button button-ghost" onClick={() => runAdminAction("application", item.id, "rejected")}>拒否</button>
        </div>
      </article>
    ));
  }

  function renderReportFields() {
    return (
      <div className="form-stack">
        <label className="field">
          <span>理由</span>
          <input value={reportDraft.reason} onChange={(event) => setReportDraft((current) => ({ ...current, reason: event.target.value }))} placeholder="spam, harassment, fraud" />
        </label>
        <label className="field">
          <span>詳細</span>
          <textarea value={reportDraft.details} onChange={(event) => setReportDraft((current) => ({ ...current, details: event.target.value }))} rows={3} />
        </label>
      </div>
    );
  }
}

function renderEmpty(message) {
  return (
    <section className="surface empty-state">
      <h2>{message}</h2>
    </section>
  );
}

function renderLoginPrompt(message) {
  return (
    <section className="surface empty-state">
      <h2>{message}</h2>
      <Link href="/auth" className="button button-primary">ログインへ</Link>
    </section>
  );
}

function buildListingForm(item) {
  const detail = normalizeRoomDetail(item);
  return {
    title: item.title || "",
    description: item.description || "",
    location_text: item.location_text || "",
    rent: `${detail.rent || ""}`,
    utilities: `${detail.utilities || 0}`,
    deposit: `${detail.deposit || 0}`,
    initial_cost: `${detail.initial_cost || 0}`,
    available_from: detail.available_from || "",
    capacity: `${detail.capacity || 1}`,
    room_type: detail.room_type || "private",
    gender_preference: detail.gender_preference || "any",
    smoking_allowed: `${Boolean(detail.smoking_allowed)}`,
    pets_allowed: `${Boolean(detail.pets_allowed)}`,
    nearest_station: detail.nearest_station || "",
    house_rules: detail.house_rules || "",
    images: (item.images || []).join("\n"),
    status: item.status || "draft"
  };
}

function formatYen(value) {
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function listingStatusLabel(status) {
  return {
    draft: "下書き",
    published: "公開中",
    paused: "一時停止",
    archived: "終了",
    rejected: "非公開"
  }[status] || status;
}

function applicationStatusLabel(status) {
  return {
    pending: "未対応",
    accepted: "承認",
    rejected: "拒否",
    cancelled: "キャンセル",
    completed: "完了"
  }[status] || status;
}

function identityStatusLabel(status) {
  return {
    unverified: "未確認",
    pending: "確認中",
    verified: "確認済み",
    rejected: "却下"
  }[status || "unverified"];
}

function roomTypeLabel(value) {
  return {
    private: "個室",
    shared: "相部屋",
    entire_home: "一戸貸し",
    dorm: "寮",
    other: "その他"
  }[value] || value;
}

function genderLabel(value) {
  return {
    any: "誰でも",
    female: "女性",
    male: "男性",
    non_binary: "ノンバイナリー",
    same_gender: "同性希望"
  }[value] || value;
}

function notificationTitle(type) {
  return {
    application_received: "問い合わせが届きました",
    application_accepted: "問い合わせが承認されました",
    application_rejected: "問い合わせが見送られました",
    message_received: "メッセージが届きました",
    listing_favorited: "掲載がお気に入りされました",
    listing_moderated: "掲載ステータスが更新されました"
  }[type] || "通知";
}
