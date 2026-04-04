"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { KeioBadge } from "@/components/keio-badge";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

const CHANNEL_NAME = "night-walk-live";
const LOCATION_INTERVAL_MS = 7000;
const LOCATION_MIN_DISTANCE_METERS = 8;
const SESSIONS_POLL_MS = 20000;
const MAP_WIDTH = 960;
const MAP_HEIGHT = 560;

const emptyForm = {
  tags: ""
};

export function NightWalkBoard({ initialSessions }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const canvasRef = useRef(null);
  const channelRef = useRef(null);
  const animationRef = useRef(0);
  const watchIdRef = useRef(null);
  const lastPersistRef = useRef({ at: 0, point: null });

  const [sessions, setSessions] = useState(initialSessions);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [activeSessionId, setActiveSessionId] = useState("");
  const [focusedSessionId, setFocusedSessionId] = useState("");
  const [status, setStatus] = useState("接続中…");
  const [geoStatus, setGeoStatus] = useState("待機中");
  const [realtimeStatus, setRealtimeStatus] = useState("未接続");
  const [latestPoint, setLatestPoint] = useState(null);
  const mapBounds = useMemo(() => computeBounds(sessions, latestPoint, focusedSessionId), [sessions, latestPoint, focusedSessionId]);
  const mapMarker = useMemo(
    () => getPreferredMapPoint(sessions, latestPoint, focusedSessionId, activeSessionId),
    [sessions, latestPoint, focusedSessionId, activeSessionId]
  );
  const mapUrl = useMemo(() => buildMapEmbedUrl(mapBounds, mapMarker), [mapBounds, mapMarker]);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      const {
        data: { session: currentSession }
      } = await supabase.auth.getSession();

      if (!mounted) return;
      setSession(currentSession);

      if (currentSession?.user) {
        await hydrateProfile(currentSession.user.id);
      }

      const selfSession = findUserActiveSession(initialSessions, currentSession?.user?.id);
      if (selfSession) {
        setActiveSessionId(selfSession.id);
        setFocusedSessionId(selfSession.id);
        setStatus("進行中の徘徊を復元しました。");
        requestCurrentLocation({ silent: true });
        beginWatching(selfSession.id);
      } else {
        requestCurrentLocation({ silent: false });
      }
    }

    bootstrap();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user) {
        await hydrateProfile(nextSession.user.id);
        const freshSessions = await fetchActiveSessions(supabase);
        setSessions(freshSessions);
        const selfSession = findUserActiveSession(freshSessions, nextSession.user.id);
        if (selfSession) {
          setActiveSessionId(selfSession.id);
          if (!focusedSessionId) setFocusedSessionId(selfSession.id);
        }
      } else {
        setProfile(null);
        setActiveSessionId("");
        stopWatching();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    const channel = supabase.channel(CHANNEL_NAME);

    channel
      .on("broadcast", { event: "location" }, ({ payload }) => {
        receiveLocationBroadcast(payload);
      })
      .on("broadcast", { event: "session-status" }, ({ payload }) => {
        receiveSessionStatusBroadcast(payload);
      })
      .subscribe((state) => {
        setRealtimeStatus(state === "SUBSCRIBED" ? "接続中" : "接続待ち");
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [supabase]);

  useEffect(() => {
    const timer = window.setInterval(async () => {
      const next = await fetchActiveSessions(supabase);
      setSessions(next);

      if (session?.user?.id) {
        const selfSession = findUserActiveSession(next, session.user.id);
        setActiveSessionId(selfSession?.id || "");
        if (!selfSession) {
          stopWatching();
        }
      }
    }, SESSIONS_POLL_MS);

    return () => window.clearInterval(timer);
  }, [supabase, session]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return undefined;

    function frame(timestamp) {
      drawNightBoard(context, {
        sessions,
        focusedSessionId,
        activeSessionId,
        latestPoint,
        timestamp
      });
      animationRef.current = window.requestAnimationFrame(frame);
    }

    animationRef.current = window.requestAnimationFrame(frame);

    return () => {
      window.cancelAnimationFrame(animationRef.current);
    };
  }, [sessions, focusedSessionId, activeSessionId, latestPoint]);

  useEffect(() => {
    return () => {
      stopWatching();
    };
  }, []);

  async function hydrateProfile(userId) {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, keio_verified")
      .eq("id", userId)
      .maybeSingle();

    if (data) setProfile(data);
  }

  function stopWatching() {
    if (watchIdRef.current !== null && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = null;
    setGeoStatus(latestPoint ? "現在地取得済み" : "待機中");
  }

  function requestCurrentLocation({ silent = false } = {}) {
    if (!("geolocation" in navigator)) {
      setGeoStatus("位置情報API非対応");
      if (!silent) setStatus("このブラウザでは位置情報を取得できません。");
      return;
    }

    setGeoStatus(watchIdRef.current !== null ? "追跡中" : "現在地取得中");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: new Date(position.timestamp).toISOString()
        };

        setLatestPoint(point);
        setGeoStatus(watchIdRef.current !== null ? "追跡中" : "現在地取得済み");

        if (!activeSessionId && !silent) {
          setStatus("現在地を取得しました。徘徊開始でルートを残せます。");
        }
      },
      (error) => {
        setGeoStatus("位置情報エラー");
        if (!silent) {
          setStatus(error.message || "位置情報が許可されていません。");
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 15000
      }
    );
  }

  function beginWatching(sessionId) {
    if (!("geolocation" in navigator)) {
      setGeoStatus("位置情報API非対応");
      return;
    }

    if (watchIdRef.current !== null) return;

    setGeoStatus("追跡中");
    requestCurrentLocation({ silent: true });

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const point = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: new Date(position.timestamp).toISOString()
        };

        setLatestPoint(point);
        persistPoint(sessionId, point).catch((error) => {
          setStatus(error.message || "位置情報の保存に失敗しました。");
        });
      },
      (error) => {
        setGeoStatus("位置情報エラー");
        setStatus(error.message || "位置情報を取得できませんでした。");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 20000
      }
    );
  }

  async function persistPoint(sessionId, point) {
    const now = Date.now();
    const last = lastPersistRef.current;

    if (last.point) {
      const distance = distanceMeters(last.point, point);
      if (now - last.at < LOCATION_INTERVAL_MS && distance < LOCATION_MIN_DISTANCE_METERS) {
        mergePointIntoSessions(sessionId, point, false);
        return;
      }
    }

    const { error: pointError } = await supabase.from("location_points").insert({
      session_id: sessionId,
      lat: point.lat,
      lng: point.lng,
      created_at: point.timestamp
    });

    if (pointError) throw new Error(pointError.message || "位置の保存に失敗しました。");

    const { error: sessionError } = await supabase
      .from("walk_sessions")
      .update({
        current_lat: point.lat,
        current_lng: point.lng,
        current_point_at: point.timestamp
      })
      .eq("id", sessionId)
      .eq("user_id", session.user.id);

    if (sessionError) throw new Error(sessionError.message || "セッション更新に失敗しました。");

    lastPersistRef.current = { at: now, point };
    mergePointIntoSessions(sessionId, point, true);

    await channelRef.current?.send({
      type: "broadcast",
      event: "location",
      payload: {
        sessionId,
        userId: session.user.id,
        lat: point.lat,
        lng: point.lng,
        timestamp: point.timestamp,
        username: profile?.username || session.user.id.slice(0, 8),
        displayName: profile?.display_name || "",
        avatarUrl: profile?.avatar_url || "",
        keioVerified: Boolean(profile?.keio_verified),
        tags: parseTags(form.tags)
      }
    });
  }

  function mergePointIntoSessions(sessionId, point, persisted) {
    setSessions((current) =>
      current.map((item) => {
        if (item.id !== sessionId) return item;
        const nextPoints = [...item.points, { lat: point.lat, lng: point.lng, created_at: point.timestamp }].slice(-80);
        return {
          ...item,
          current_lat: point.lat,
          current_lng: point.lng,
          current_point_at: point.timestamp,
          points: nextPoints,
          status: item.status || "active",
          _optimistic: !persisted
        };
      })
    );
  }

  function receiveLocationBroadcast(payload) {
    if (!payload?.sessionId || payload.lat == null || payload.lng == null) return;

    setSessions((current) => {
      const existing = current.find((item) => item.id === payload.sessionId);
      const point = {
        lat: payload.lat,
        lng: payload.lng,
        created_at: payload.timestamp || new Date().toISOString()
      };

      if (existing) {
        return current.map((item) =>
          item.id === payload.sessionId
            ? {
                ...item,
                current_lat: point.lat,
                current_lng: point.lng,
                current_point_at: point.created_at,
                points: [...item.points, point].slice(-80)
              }
            : item
        );
      }

      return [
        {
          id: payload.sessionId,
          user_id: payload.userId || "",
          started_at: point.created_at,
          ended_at: null,
          status: "active",
          tags: Array.isArray(payload.tags) ? payload.tags : [],
          current_lat: point.lat,
          current_lng: point.lng,
          current_point_at: point.created_at,
          profiles: {
            username: payload.username || "nightwalker",
            display_name: payload.displayName || "",
            avatar_url: payload.avatarUrl || "",
            keio_verified: Boolean(payload.keioVerified)
          },
          points: [point]
        },
        ...current
      ];
    });
  }

  function receiveSessionStatusBroadcast(payload) {
    if (!payload?.sessionId) return;

    setSessions((current) =>
      current
        .map((item) =>
          item.id === payload.sessionId
            ? {
                ...item,
                status: payload.status || item.status,
                ended_at: payload.endedAt || item.ended_at
              }
            : item
        )
        .filter((item) => item.status === "active")
    );
  }

  async function startSession() {
    if (!session?.user) {
      setStatus("徘徊を始めるにはログインが必要です。");
      return;
    }

    if (activeSessionId) {
      setStatus("すでに徘徊中です。");
      beginWatching(activeSessionId);
      return;
    }

    const tags = parseTags(form.tags);
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("walk_sessions")
      .insert({
        user_id: session.user.id,
        status: "active",
        tags,
        started_at: now
      })
      .select(
        "id, user_id, started_at, ended_at, status, tags, current_lat, current_lng, current_point_at, profiles!walk_sessions_user_id_fkey(id, username, display_name, avatar_url, keio_verified)"
      )
      .single();

    if (error) {
      setStatus(error.message || "徘徊開始に失敗しました。");
      return;
    }

    const item = {
      ...data,
      points: []
    };

    setSessions((current) => [item, ...current]);
    setActiveSessionId(data.id);
    setFocusedSessionId(data.id);
    setStatus("徘徊を開始しました。");
    beginWatching(data.id);

    if (latestPoint) {
      await persistPoint(data.id, latestPoint).catch((persistError) => {
        setStatus(persistError.message || "開始直後の位置保存に失敗しました。");
      });
    }

    await channelRef.current?.send({
      type: "broadcast",
      event: "session-status",
      payload: {
        sessionId: data.id,
        status: "active",
        startedAt: now
      }
    });
  }

  async function stopSession() {
    if (!session?.user || !activeSessionId) return;

    stopWatching();
    const endedAt = new Date().toISOString();
    const { error } = await supabase
      .from("walk_sessions")
      .update({
        status: "ended",
        ended_at: endedAt
      })
      .eq("id", activeSessionId)
      .eq("user_id", session.user.id);

    if (error) {
      setStatus(error.message || "徘徊終了に失敗しました。");
      return;
    }

    await channelRef.current?.send({
      type: "broadcast",
      event: "session-status",
      payload: {
        sessionId: activeSessionId,
        status: "ended",
        endedAt
      }
    });

    setSessions((current) => current.filter((item) => item.id !== activeSessionId));
    setStatus("徘徊を終了しました。");
    setActiveSessionId("");
    lastPersistRef.current = { at: 0, point: null };
    requestCurrentLocation({ silent: true });
  }

  const activeCount = sessions.filter((item) => item.status === "active").length;
  const totalPoints = sessions.reduce((sum, item) => sum + item.points.length, 0);
  const campuses = uniq(
    sessions
      .map((item) => item.profiles?.keio_verified)
      .filter(Boolean)
      .map(() => "慶應認証")
  );

  return (
    <div className="dashboard-layout">
      <section className="section-grid section-head night-walk-hero">
        <div className="section-copy">
          <h1 className="page-title">深夜徘徊界隈</h1>
        </div>

        <div className="class-board-hero-stats night-walk-hero-stats" aria-label="深夜徘徊の集計">
          <div className="stat-tile">
            <strong>{activeCount}</strong>
            <span>アクティブ徘徊</span>
          </div>
          <div className="stat-tile">
            <strong>{totalPoints}</strong>
            <span>記録点</span>
          </div>
          <div className="stat-tile">
            <strong>{campuses[0] || "—"}</strong>
            <span>信頼軸</span>
          </div>
        </div>
      </section>

      <section className="section-grid night-walk-main">
        <div className="night-walk-column">
          <div className="surface night-walk-stage">
            <div className="night-walk-topbar">
              <div className="status-list">
                <span className="status-pill">{session?.user ? "ログイン中" : "未ログイン"}</span>
                <span className="status-pill">{realtimeStatus}</span>
                <span className="status-pill">{geoStatus}</span>
              </div>
              <div className="hero-actions">
                <button type="button" className="button button-ghost" onClick={() => requestCurrentLocation()}>
                  現在地を取得
                </button>
                <button type="button" className="button button-secondary" onClick={startSession}>
                  徘徊開始
                </button>
                <button type="button" className="button button-ghost" onClick={stopSession} disabled={!activeSessionId}>
                  徘徊終了
                </button>
              </div>
            </div>

            <div className="night-walk-visuals">
              <div className="night-walk-map-frame">
                {mapUrl ? (
                  <iframe
                    title="深夜徘徊マップ"
                    src={mapUrl}
                    className="night-walk-map"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                ) : (
                  <div className="night-walk-map-empty">
                    <strong>地図を表示するには現在地を取得してください。</strong>
                    <span>位置情報を許可すると、この場に現在地と徘徊の中心が出ます。</span>
                  </div>
                )}
              </div>

              <canvas
                ref={canvasRef}
                width={MAP_WIDTH}
                height={MAP_HEIGHT}
                className="night-walk-canvas"
              />
            </div>

            <div className="night-walk-status-row">
              <p className="night-walk-status-text">{status}</p>
              <p className="night-walk-coordinate">{formatCoordinate(mapMarker)}</p>
              <label className="field night-walk-tag-field">
                <span>今回のタグ</span>
                <input
                  value={form.tags}
                  onChange={(event) => setForm({ tags: event.target.value })}
                  placeholder="眠れない, 研究帰り, 散歩"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="night-walk-column">
          <div className="surface night-walk-session-list">
            {sessions.length ? (
              sessions.map((item) => {
                const isSelf = item.user_id === session?.user?.id;
                const isFocused = focusedSessionId === item.id;
                return (
                  <article key={item.id} className={`night-walk-session-card ${isFocused ? "is-focused" : ""}`}>
                    <button type="button" className="night-walk-session-focus" onClick={() => setFocusedSessionId(item.id)}>
                      <div className="night-walk-session-meta">
                        <strong>{item.profiles?.display_name || item.profiles?.username || "nightwalker"}</strong>
                        <span>@{item.profiles?.username || "nightwalker"}</span>
                        {item.profiles?.keio_verified ? <KeioBadge profile={item.profiles} compact /> : null}
                        {isSelf ? <span className="pill published">YOU</span> : null}
                      </div>
                      <div className="night-walk-session-tags">
                        {item.tags?.length ? item.tags.map((tag) => <span key={tag} className="signature-filter-chip">{tag}</span>) : <span className="empty-inline">タグなし</span>}
                      </div>
                      <div className="night-walk-session-foot">
                        <span>{formatRelative(item.current_point_at || item.started_at)}</span>
                        <span>{item.points.length} points</span>
                      </div>
                    </button>
                  </article>
                );
              })
            ) : (
              <div className="empty-state">
                <p>まだ誰も歩いていません。</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

async function fetchActiveSessions(supabase) {
  const { data: sessionRows } = await supabase
    .from("walk_sessions")
    .select(
      "id, user_id, started_at, ended_at, status, tags, current_lat, current_lng, current_point_at, profiles!walk_sessions_user_id_fkey(id, username, display_name, avatar_url, keio_verified)"
    )
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(24);

  const sessionIds = (sessionRows || []).map((item) => item.id);
  let pointRows = [];

  if (sessionIds.length) {
    const { data } = await supabase
      .from("location_points")
      .select("session_id, lat, lng, created_at")
      .in("session_id", sessionIds)
      .order("created_at", { ascending: true })
      .limit(2400);
    pointRows = data || [];
  }

  const pointsMap = new Map();
  for (const row of pointRows) {
    const current = pointsMap.get(row.session_id) || [];
    current.push(row);
    pointsMap.set(row.session_id, current);
  }

  return (sessionRows || []).map((item) => ({
    ...item,
    tags: Array.isArray(item.tags) ? item.tags.filter(Boolean) : [],
    points: (pointsMap.get(item.id) || []).slice(-80)
  }));
}

function drawNightBoard(context, state) {
  const { sessions, focusedSessionId, activeSessionId, latestPoint, timestamp } = state;
  context.clearRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

  const gradient = context.createLinearGradient(0, 0, 0, MAP_HEIGHT);
  gradient.addColorStop(0, "#090d18");
  gradient.addColorStop(1, "#101829");
  context.fillStyle = gradient;
  context.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

  drawNightGrid(context);

  const bounds = computeBounds(sessions, latestPoint, focusedSessionId);
  if (!bounds) {
    context.fillStyle = "rgba(235, 242, 255, 0.86)";
    context.font = '700 28px "Fraunces", "Iowan Old Style", serif';
    context.fillText("深夜のルートはまだありません", 54, 120);
    context.font = '15px "IBM Plex Mono", monospace';
    context.fillStyle = "rgba(191, 205, 229, 0.74)";
    context.fillText("徘徊開始を押すと、自分の軌跡がここに浮かびます。", 54, 154);
    return;
  }

  for (const item of sessions) {
    if (!item.points.length && !item.current_lat) continue;
    const isFocused = item.id === focusedSessionId;
    const isSelf = item.id === activeSessionId;
    const color = sessionColor(item.id, isSelf ? 1 : isFocused ? 0.92 : 0.76);
    drawSessionRoute(context, item, bounds, color, isSelf || isFocused);
  }

  for (const item of sessions) {
    if (!item.current_lat || !item.current_lng) continue;
    const isFocused = item.id === focusedSessionId;
    const isSelf = item.id === activeSessionId;
    drawSessionPoint(context, item, bounds, sessionColor(item.id, 1), isSelf || isFocused, timestamp);
  }

  if (latestPoint && !activeSessionId) {
    drawFloatingPoint(context, latestPoint, bounds, timestamp);
  }
}

function drawNightGrid(context) {
  context.strokeStyle = "rgba(122, 141, 173, 0.09)";
  context.lineWidth = 1;

  for (let x = 32; x < MAP_WIDTH; x += 56) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, MAP_HEIGHT);
    context.stroke();
  }

  for (let y = 28; y < MAP_HEIGHT; y += 56) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(MAP_WIDTH, y);
    context.stroke();
  }
}

function drawSessionRoute(context, session, bounds, color, emphasized) {
  const points = session.points.length
    ? session.points
    : session.current_lat && session.current_lng
      ? [{ lat: session.current_lat, lng: session.current_lng, created_at: session.current_point_at }]
      : [];

  if (points.length < 2) return;

  context.strokeStyle = color;
  context.lineWidth = emphasized ? 4 : 2.4;
  context.lineJoin = "round";
  context.lineCap = "round";
  context.beginPath();

  points.forEach((point, index) => {
    const mapped = projectPoint(point, bounds);
    if (index === 0) context.moveTo(mapped.x, mapped.y);
    else context.lineTo(mapped.x, mapped.y);
  });

  context.stroke();
}

function drawSessionPoint(context, session, bounds, color, emphasized, timestamp) {
  const mapped = projectPoint({ lat: session.current_lat, lng: session.current_lng }, bounds);
  const pulse = 6 + Math.sin(timestamp / 220) * 2;

  context.fillStyle = color;
  context.beginPath();
  context.arc(mapped.x, mapped.y, emphasized ? pulse : 5, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = "rgba(255,255,255,0.16)";
  context.lineWidth = 1.5;
  context.beginPath();
  context.arc(mapped.x, mapped.y, emphasized ? pulse + 5 : 9, 0, Math.PI * 2);
  context.stroke();
}

function drawFloatingPoint(context, point, bounds, timestamp) {
  const mapped = projectPoint(point, bounds);
  const pulse = 7 + Math.sin(timestamp / 220) * 2.5;

  context.fillStyle = "rgba(122, 215, 255, 0.95)";
  context.beginPath();
  context.arc(mapped.x, mapped.y, pulse, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = "rgba(255,255,255,0.28)";
  context.lineWidth = 2;
  context.beginPath();
  context.arc(mapped.x, mapped.y, pulse + 7, 0, Math.PI * 2);
  context.stroke();

  context.fillStyle = "rgba(235, 242, 255, 0.86)";
  context.font = '12px "IBM Plex Mono", monospace';
  context.fillText("CURRENT", mapped.x + 14, mapped.y - 12);
}

function computeBounds(sessions, latestPoint, focusedSessionId) {
  const points = [];
  for (const session of sessions) {
    const targetSet =
      focusedSessionId && session.id !== focusedSessionId ? [] : session.points;
    for (const point of targetSet) points.push(point);
    if ((!focusedSessionId || session.id === focusedSessionId) && session.current_lat && session.current_lng) {
      points.push({ lat: session.current_lat, lng: session.current_lng });
    }
  }
  if (latestPoint) points.push(latestPoint);
  if (!points.length) return null;

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const point of points) {
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
    minLng = Math.min(minLng, point.lng);
    maxLng = Math.max(maxLng, point.lng);
  }

  const latSpan = Math.max(maxLat - minLat, 0.003);
  const lngSpan = Math.max(maxLng - minLng, 0.003);
  const paddingLat = latSpan * 0.22;
  const paddingLng = lngSpan * 0.18;

  return {
    minLat: minLat - paddingLat,
    maxLat: maxLat + paddingLat,
    minLng: minLng - paddingLng,
    maxLng: maxLng + paddingLng
  };
}

function projectPoint(point, bounds) {
  const width = MAP_WIDTH - 80;
  const height = MAP_HEIGHT - 80;
  const x = 40 + ((point.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * width;
  const y = MAP_HEIGHT - 40 - ((point.lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * height;
  return { x, y };
}

function sessionColor(id, alpha = 1) {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) % 360;
  }
  return `hsla(${hash}, 80%, 68%, ${alpha})`;
}

function getPreferredMapPoint(sessions, latestPoint, focusedSessionId, activeSessionId) {
  if (latestPoint) return latestPoint;

  const pickOrder = [focusedSessionId, activeSessionId].filter(Boolean);
  for (const id of pickOrder) {
    const session = sessions.find((item) => item.id === id);
    if (session?.current_lat && session?.current_lng) {
      return { lat: session.current_lat, lng: session.current_lng };
    }
    if (session?.points?.length) {
      const last = session.points[session.points.length - 1];
      return { lat: last.lat, lng: last.lng };
    }
  }

  const fallback = sessions.find((item) => item.current_lat && item.current_lng) || sessions.find((item) => item.points?.length);
  if (!fallback) return null;
  if (fallback.current_lat && fallback.current_lng) return { lat: fallback.current_lat, lng: fallback.current_lng };
  const last = fallback.points[fallback.points.length - 1];
  return { lat: last.lat, lng: last.lng };
}

function buildMapEmbedUrl(bounds, marker) {
  if (!bounds || !marker) return "";

  const bbox = [bounds.minLng, bounds.minLat, bounds.maxLng, bounds.maxLat]
    .map((value) => Number(value.toFixed(6)))
    .join("%2C");
  const markerValue = `${Number(marker.lat.toFixed(6))}%2C${Number(marker.lng.toFixed(6))}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${markerValue}`;
}

function findUserActiveSession(sessions, userId) {
  if (!userId) return null;
  return sessions.find((item) => item.user_id === userId && item.status === "active") || null;
}

function parseTags(value) {
  return `${value || ""}`
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function formatRelative(value) {
  if (!value) return "いま";
  const date = new Date(value).getTime();
  const diff = Date.now() - date;
  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  return `${Math.round(hours / 24)}日前`;
}

function formatCoordinate(point) {
  if (!point) return "位置情報未取得";
  return `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;
}

function distanceMeters(left, right) {
  const toRad = (value) => (value * Math.PI) / 180;
  const earth = 6371000;
  const dLat = toRad(right.lat - left.lat);
  const dLng = toRad(right.lng - left.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(left.lat)) * Math.cos(toRad(right.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return earth * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function uniq(values) {
  return [...new Set(values)];
}
