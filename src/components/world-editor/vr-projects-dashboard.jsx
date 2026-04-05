"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export function VrProjectsDashboard() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [projects, setProjects] = useState([]);
  const [openProjects, setOpenProjects] = useState([]);
  const [createName, setCreateName] = useState("");
  const [createAccessMode, setCreateAccessMode] = useState("invite_only");
  const [status, setStatus] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let active = true;

    async function hydrate() {
      const {
        data: { session: nextSession }
      } = await supabase.auth.getSession();

      if (!active) return;
      setSession(nextSession);

      if (nextSession?.user) {
        await loadProjects(nextSession.user.id);
      } else {
        setLoading(false);
      }
    }

    void hydrate();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user) {
        void loadProjects(nextSession.user.id);
      } else {
        setProjects([]);
        setLoading(false);
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  async function loadProjects(userId) {
    setLoading(true);

    const { data: memberships, error: membershipError } = await supabase
      .from("project_members")
      .select("project_id, role")
      .eq("user_id", userId);

    if (membershipError) {
      setStatus(membershipError.message || "プロジェクト一覧を取得できませんでした。");
      setLoading(false);
      return;
    }

    const projectIds = (memberships || []).map((row) => row.project_id);

    const [{ data: projectRows, error: projectError }, { data: memberRows, error: memberRowsError }, { data: openRows, error: openError }] = await Promise.all([
      projectIds.length
        ? supabase.from("projects").select("id, name, owner_id, created_at, updated_at, settings, access_mode").in("id", projectIds).order("updated_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from("project_members")
        .select("project_id, user_id, role, profiles!project_members_user_id_fkey(id, username, display_name, avatar_url)")
        .in("project_id", projectIds.length ? projectIds : ["00000000-0000-0000-0000-000000000000"]),
      supabase.from("projects").select("id, name, owner_id, created_at, updated_at, access_mode").eq("access_mode", "open").order("updated_at", { ascending: false })
    ]);

    if (projectError || memberRowsError || openError) {
      setStatus(projectError?.message || memberRowsError?.message || openError?.message || "プロジェクト一覧を取得できませんでした。");
      setLoading(false);
      return;
    }

    const membershipMap = new Map((memberships || []).map((row) => [row.project_id, row.role]));
    const membersByProject = new Map();
    (memberRows || []).forEach((row) => {
      const list = membersByProject.get(row.project_id) || [];
      list.push({
        userId: row.user_id,
        role: row.role,
        name: row.profiles?.display_name || row.profiles?.username || "member"
      });
      membersByProject.set(row.project_id, list);
    });

    setProjects(
      (projectRows || []).map((project) => ({
        ...project,
        myRole: membershipMap.get(project.id) || "viewer",
        members: membersByProject.get(project.id) || []
      }))
    );
    setOpenProjects(
      (openRows || []).filter((project) => !membershipMap.has(project.id)).map((project) => ({
        ...project,
        members: []
      }))
    );
    setLoading(false);
  }

  async function handleCreateProject() {
    if (!session?.user || !createName.trim()) return;
    setCreating(true);
    setStatus("");

    const { data: projectId, error } = await supabase.rpc("create_vr_project", {
      p_name: createName.trim(),
      p_access_mode: createAccessMode
    });

    if (error || !projectId) {
      setStatus(error?.message || "プロジェクトを作成できませんでした。");
      setCreating(false);
      return;
    }

    setCreateName("");
    setCreateAccessMode("invite_only");
    router.push(`/apps/vr/${projectId}`);
  }

  async function handleGoogleSignIn() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/apps/vr`
      }
    });
  }

  async function handleDeleteProject(projectId) {
    const target = projects.find((project) => project.id === projectId);
    if (!target || target.myRole !== "owner") return;
    const { error } = await supabase.from("projects").delete().eq("id", projectId);
    if (error) {
      setStatus(error.message || "プロジェクトを削除できませんでした。");
      return;
    }
    setProjects((previous) => previous.filter((project) => project.id !== projectId));
  }

  return (
    <section className="section-grid gap-6">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="eyebrow">みんなで作るVR空間</p>
          <h1 className="page-title">共同で組み上げる3D空間のプロジェクト一覧</h1>
        </div>
      </div>

      {!session ? (
        <section className="surface grid gap-4 rounded-[32px] border border-slate-200 bg-white/85 p-6 shadow-[0_24px_60px_rgba(20,29,40,0.08)] backdrop-blur">
          <h2 className="text-2xl font-semibold text-slate-900">共同編集を始めるには認証が必要です</h2>
          <p className="text-sm leading-7 text-slate-600">既存の FieldCard アカウントで入るか、Google 認証を有効にしてそのまま続行できます。</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/auth" className="button button-primary">
              メールで入る
            </Link>
            <button type="button" onClick={() => void handleGoogleSignIn()} className="button button-secondary">
              Google で入る
            </button>
          </div>
        </section>
      ) : (
        <>
          <section className="surface grid gap-4 rounded-[32px] border border-slate-200 bg-white/85 p-6 shadow-[0_24px_60px_rgba(20,29,40,0.08)] backdrop-blur lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="grid gap-3">
              <h2 className="text-xl font-semibold text-slate-900">新しいプロジェクトを作る</h2>
              <input
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
                placeholder="例: 深夜の展示空間"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-300"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCreateAccessMode("invite_only")}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    createAccessMode === "invite_only" ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  招待制
                </button>
                <button
                  type="button"
                  onClick={() => setCreateAccessMode("open")}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    createAccessMode === "open" ? "bg-cyan-600 text-white" : "border border-cyan-200 bg-cyan-50 text-cyan-800"
                  }`}
                >
                  開放モード
                </button>
              </div>
              {status ? <p className="text-sm text-slate-600">{status}</p> : null}
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => void handleCreateProject()}
                disabled={creating || !createName.trim()}
                className="button button-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating ? "作成中…" : "プロジェクトを作成"}
              </button>
            </div>
          </section>

          <section className="card-grid">
            {loading ? (
              <article className="surface feature-card">
                <h2>読み込み中…</h2>
              </article>
            ) : projects.length ? (
              projects.map((project) => (
                <article key={project.id} className="surface feature-card">
                  <div className="grid gap-4">
                    <div>
                      <h2>{project.name}</h2>
                      <p className="text-sm text-slate-500">あなたの権限: {project.myRole}</p>
                      <p className="text-xs text-slate-400">{project.access_mode === "open" ? "開放モード" : "招待制"}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {project.members.slice(0, 4).map((member) => (
                        <span key={member.userId} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-700">
                          {member.name}
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Link href={`/apps/vr/${project.id}`} className="button button-secondary">
                        開く
                      </Link>
                      {project.myRole === "owner" ? (
                        <button
                          type="button"
                          onClick={() => void handleDeleteProject(project.id)}
                          className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
                        >
                          削除
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <article className="surface feature-card">
                <h2>まだプロジェクトはありません</h2>
              </article>
            )}
          </section>

          {openProjects.length ? (
            <section className="grid gap-3">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-slate-900">開放中の空間</h2>
                <p className="text-sm text-slate-600">招待リンクなしで、そのまま参加できる共同空間です。</p>
              </div>
              <div className="card-grid">
                {openProjects.map((project) => (
                  <article key={project.id} className="surface feature-card">
                    <div className="grid gap-4">
                      <div>
                        <h2>{project.name}</h2>
                        <p className="text-sm text-slate-500">誰でも参加可能</p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Link href={`/apps/vr/${project.id}`} className="button button-secondary">
                          入る
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </section>
  );
}
