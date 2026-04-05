"use client";

// Supabase collaborative editor setup:
// 1. Enable Email auth and Google auth in Supabase Auth.
// 2. Apply /supabase/schema.sql so projects, members, scene_objects, chat_messages,
//    the invite RPC, and Storage policies are created.
// 3. Enable Realtime for projects / project_members / scene_objects / chat_messages if
//    you later move from broadcast-only to row subscriptions. Current sync uses
//    Realtime broadcast + presence and treats Postgres as source of truth.

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { getSceneModelBucket, uploadPublicFile } from "@/lib/storage";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { CollabChatPanel } from "@/src/components/world-editor/collab-chat-panel";
import { ObjectInspectorPanel } from "@/src/components/world-editor/object-inspector-panel";
import { ObjectListPanel } from "@/src/components/world-editor/object-list-panel";
import { SceneViewport } from "@/src/components/world-editor/scene-viewport";
import { createEmptySceneState, useSceneEditorStore } from "@/src/stores/scene-editor-store";
import { exportAssetsForObjects } from "@/src/utils/asset-db";
import { filesToSceneObjects, revokeSceneObjectUrl } from "@/src/utils/file-loaders";
import { parseSceneJson, serializePortableScene } from "@/src/utils/scene-serialize";
import { buildProjectSettingsFromStore, buildInviteUrl, colorForUser, normalizeProjectSettings, objectToSceneObjectRow, sceneObjectRowToObject, throttle } from "@/src/utils/world-projects";

export function CollaborativeWorldEditorApp() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = `${params.projectId || ""}`;
  const inviteToken = searchParams.get("invite");
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const broadcastChannelRef = useRef(null);
  const settingsTimerRef = useRef(null);
  const selectedIdRef = useRef(null);
  const cameraPoseRef = useRef(null);
  const profileRef = useRef(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [project, setProject] = useState(null);
  const [projectRole, setProjectRole] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("プロジェクトを読み込み中です。");
  const [chatOpen, setChatOpen] = useState(true);
  const [chatDraft, setChatDraft] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [presenceUsers, setPresenceUsers] = useState([]);

  const sceneName = useSceneEditorStore((state) => state.sceneName);
  const objects = useSceneEditorStore((state) => state.objects);
  const selectedId = useSceneEditorStore((state) => state.selectedId);
  const transformMode = useSceneEditorStore((state) => state.transformMode);
  const orbitEnabled = useSceneEditorStore((state) => state.orbitEnabled);
  const lighting = useSceneEditorStore((state) => state.lighting);
  const environment = useSceneEditorStore((state) => state.environment);
  const fog = useSceneEditorStore((state) => state.fog);
  const camera = useSceneEditorStore((state) => state.camera);
  const cameraRequest = useSceneEditorStore((state) => state.cameraRequest);
  const historyPast = useSceneEditorStore((state) => state.historyPast);
  const historyFuture = useSceneEditorStore((state) => state.historyFuture);

  const addObjects = useSceneEditorStore((state) => state.addObjects);
  const selectObject = useSceneEditorStore((state) => state.selectObject);
  const renameObject = useSceneEditorStore((state) => state.renameObject);
  const renameObjectWithOptions = useSceneEditorStore((state) => state.renameObjectWithOptions);
  const updateObjectTransform = useSceneEditorStore((state) => state.updateObjectTransform);
  const beginTransform = useSceneEditorStore((state) => state.beginTransform);
  const endTransform = useSceneEditorStore((state) => state.endTransform);
  const setTransformMode = useSceneEditorStore((state) => state.setTransformMode);
  const setOrbitEnabled = useSceneEditorStore((state) => state.setOrbitEnabled);
  const removeSelectedObject = useSceneEditorStore((state) => state.removeSelectedObject);
  const removeObjectWithOptions = useSceneEditorStore((state) => state.removeObjectWithOptions);
  const setSceneName = useSceneEditorStore((state) => state.setSceneName);
  const replaceScene = useSceneEditorStore((state) => state.replaceScene);
  const replaceSceneObjects = useSceneEditorStore((state) => state.replaceSceneObjects);
  const upsertObject = useSceneEditorStore((state) => state.upsertObject);
  const updateLightingField = useSceneEditorStore((state) => state.updateLightingField);
  const updateLightingFieldWithOptions = useSceneEditorStore((state) => state.updateLightingFieldWithOptions);
  const updateEnvironmentField = useSceneEditorStore((state) => state.updateEnvironmentField);
  const updateEnvironmentFieldWithOptions = useSceneEditorStore((state) => state.updateEnvironmentFieldWithOptions);
  const updateFogField = useSceneEditorStore((state) => state.updateFogField);
  const updateFogFieldWithOptions = useSceneEditorStore((state) => state.updateFogFieldWithOptions);
  const updateCurrentCameraPose = useSceneEditorStore((state) => state.updateCurrentCameraPose);
  const requestCameraPose = useSceneEditorStore((state) => state.requestCameraPose);
  const clearCameraRequest = useSceneEditorStore((state) => state.clearCameraRequest);
  const saveCurrentCameraBookmark = useSceneEditorStore((state) => state.saveCurrentCameraBookmark);
  const renameCameraBookmark = useSceneEditorStore((state) => state.renameCameraBookmark);
  const removeCameraBookmark = useSceneEditorStore((state) => state.removeCameraBookmark);
  const applyRemoteSceneSettings = useSceneEditorStore((state) => state.applyRemoteSceneSettings);
  const undo = useSceneEditorStore((state) => state.undo);
  const redo = useSceneEditorStore((state) => state.redo);

  const selectedObject = useMemo(() => objects.find((item) => item.id === selectedId) || null, [objects, selectedId]);
  const canEdit = projectRole === "owner" || projectRole === "editor";
  const projectSettings = useMemo(() => buildProjectSettingsFromStore({ sceneName, lighting, environment, fog }), [sceneName, lighting, environment, fog]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    cameraPoseRef.current = camera.currentPose;
  }, [camera.currentPose]);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const broadcastTransform = useMemo(
    () =>
      throttle((payload) => {
        broadcastEvent("scene-event", {
          type: "object:update",
          userId: session?.user?.id,
          objectId: payload.objectId,
          updates: payload.updates
        });
      }, 100),
    [session?.user?.id]
  );

  const trackPresence = useMemo(
    () =>
      throttle((nextPresence) => {
        const channel = broadcastChannelRef.current;
        if (!channel) return;
        void channel.track(nextPresence);
      }, 120),
    []
  );

  useEffect(() => {
    let active = true;

    async function hydrate() {
      const {
        data: { session: nextSession }
      } = await supabase.auth.getSession();

      if (!active) return;
      setSession(nextSession);
      if (!nextSession?.user) {
        setLoading(false);
        setStatus("共同編集にはログインが必要です。");
        return;
      }

      const { data: profileRow } = await supabase.from("profiles").select("id, username, display_name, avatar_url").eq("id", nextSession.user.id).maybeSingle();
      if (!active) return;
      setProfile(profileRow || { id: nextSession.user.id, username: nextSession.user.email, display_name: nextSession.user.email });
      await loadProject(nextSession.user.id, profileRow || null);
    }

    void hydrate();
    return () => {
      active = false;
    };
  }, [projectId, supabase]);

  useEffect(() => {
    if (!session?.user || !profile || !projectId || !projectRole) return;

    const channel = supabase.channel(`vr-project:${projectId}`, {
      config: {
        broadcast: { self: false },
        presence: { key: session.user.id }
      }
    });

    channel
      .on("broadcast", { event: "scene-event" }, ({ payload }) => {
        if (!payload || payload.userId === session.user.id) return;
        handleSceneBroadcast(payload);
      })
      .on("broadcast", { event: "chat-event" }, ({ payload }) => {
        if (!payload?.message || payload.userId === session.user.id) return;
        setChatMessages((previous) => dedupeMessages([...previous, payload.message]).slice(-100));
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setPresenceUsers(readPresenceState(state, session.user.id));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const currentProfile = profileRef.current || profile;
          await channel.track(buildPresencePayload(currentProfile, selectedIdRef.current, cameraPoseRef.current));
        }
      });

    broadcastChannelRef.current = channel;
    return () => {
      broadcastChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [profile, projectId, projectRole, session?.user?.id, supabase]);

  useEffect(() => {
    if (!profile || !session?.user || !broadcastChannelRef.current) return;
    trackPresence(buildPresencePayload(profile, selectedId, camera.currentPose));
  }, [camera.currentPose, profile, selectedId, session?.user, trackPresence]);

  useEffect(() => {
    function handleKeyDown(event) {
      const tag = event.target?.tagName?.toLowerCase();
      const isTyping = tag === "input" || tag === "textarea";

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveProjectSettings();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          void handleRedo();
          return;
        }
        void handleUndo();
        return;
      }

      if (isTyping) return;
      if (event.key === "Delete" || event.key === "Backspace") {
        void handleDeleteSelected();
      }
      if (event.key.toLowerCase() === "w") setTransformMode("translate");
      if (event.key.toLowerCase() === "e") setTransformMode("rotate");
      if (event.key.toLowerCase() === "r") setTransformMode("scale");
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleDeleteSelected, handleRedo, handleUndo, saveProjectSettings, setTransformMode]);

  async function loadProject(userId, profileRow) {
    setLoading(true);
    setStatus("プロジェクトを読み込み中です。");

    if (inviteToken) {
      await supabase.rpc("accept_vr_project_invite", {
        p_project_id: projectId,
        p_token: inviteToken
      });
    }

    const { data: projectRow, error: projectError } = await supabase
      .from("projects")
      .select("id, name, owner_id, created_at, updated_at, settings, invite_token, access_mode")
      .eq("id", projectId)
      .maybeSingle();

    if (projectError || !projectRow) {
      setStatus(projectError?.message || "プロジェクトを開けませんでした。");
      setLoading(false);
      return;
    }

    let { data: memberRows, error: memberError } = await supabase
      .from("project_members")
      .select("project_id, user_id, role, profiles!project_members_user_id_fkey(id, username, display_name, avatar_url)")
      .eq("project_id", projectId);

    if (memberError) {
      setStatus(memberError.message || "メンバー情報を取得できませんでした。");
      setLoading(false);
      return;
    }

    let myMembership = (memberRows || []).find((member) => member.user_id === userId);
    if (!myMembership && projectRow.access_mode === "open") {
      const { error: joinError } = await supabase.rpc("join_open_vr_project", {
        p_project_id: projectId
      });
      if (joinError) {
        setStatus(joinError.message || "開放モードの参加に失敗しました。");
        setLoading(false);
        return;
      }

      const membershipResult = await supabase
        .from("project_members")
        .select("project_id, user_id, role, profiles!project_members_user_id_fkey(id, username, display_name, avatar_url)")
        .eq("project_id", projectId);
      memberRows = membershipResult.data || [];
      memberError = membershipResult.error;
      if (memberError) {
        setStatus(memberError.message || "メンバー情報を更新できませんでした。");
        setLoading(false);
        return;
      }
      myMembership = memberRows.find((member) => member.user_id === userId);
    }

    if (!myMembership || !projectRow) {
      setStatus("このプロジェクトに参加する権限がありません。");
      setLoading(false);
      return;
    }

    const [{ data: objectRows, error: objectError }, { data: chatRows, error: chatError }] = await Promise.all([
      supabase.from("scene_objects").select("id, project_id, name, model_url, mime_type, position, rotation, scale, updated_by, updated_at").eq("project_id", projectId).order("updated_at", { ascending: true }),
      supabase
        .from("chat_messages")
        .select("id, project_id, user_id, content, created_at, profiles!chat_messages_user_id_fkey(id, username, display_name, avatar_url)")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true })
        .limit(100)
    ]);

    if (objectError || chatError) {
      setStatus(objectError?.message || chatError?.message || "プロジェクトを開けませんでした。");
      setLoading(false);
      return;
    }

    const defaults = createEmptySceneState(projectRow.name);
    const settings = normalizeProjectSettings(projectRow.settings, defaults);
    const sceneObjects = (objectRows || []).map(sceneObjectRowToObject);

    replaceScene({
      ...defaults,
      sceneName: settings.sceneName || projectRow.name,
      lighting: settings.lighting,
      environment: settings.environment,
      fog: settings.fog,
      objects: sceneObjects,
      selectedId: null
    });

    setProject(projectRow);
    setProjectRole(myMembership.role);
    setMembers(
      (memberRows || []).map((member) => ({
        userId: member.user_id,
        role: member.role,
        name: member.profiles?.display_name || member.profiles?.username || "member",
        avatarUrl: member.profiles?.avatar_url || "",
        color: colorForUser(member.user_id)
      }))
    );
    setChatMessages(
      (chatRows || []).map((message) => ({
        id: message.id,
        userId: message.user_id,
        content: message.content,
        createdAt: message.created_at,
        authorName: message.profiles?.display_name || message.profiles?.username || "member"
      }))
    );
    setLoading(false);
    setStatus(inviteToken ? "招待リンクから参加しました。" : projectRow.access_mode === "open" && !inviteToken ? "開放モードの空間に参加しました。" : "プロジェクトを開きました。");
  }

  async function handleDropFiles(files) {
    if (!canEdit || !session?.user) return;
    const validFiles = files.filter((file) => /\.gltf?$/i.test(file.name));
    if (!validFiles.length) {
      setStatus("GLB / GLTF を落としてください。");
      return;
    }

    const localObjects = await filesToSceneObjects(validFiles);
    if (!localObjects.length) {
      setStatus("この GLB / GLTF は読み込めませんでした。別のファイルを試してください。");
      return;
    }
    addObjects(localObjects);
    setStatus(`${localObjects.length}個のモデルを追加し、同期しています。`);

    await Promise.all(
      localObjects.map(async (object, index) => {
        const file = validFiles[index];
        try {
          const modelUrl = await uploadPublicFile({
            supabase,
            bucket: getSceneModelBucket(),
            userId: session.user.id,
            file,
            folder: `vr/${projectId}`
          });
          upsertObject({ ...object, url: modelUrl, modelUrl, isRemote: true });
          const row = objectToSceneObjectRow({
            object: { ...object, url: modelUrl, modelUrl },
            projectId,
            userId: session.user.id
          });
          const { error } = await supabase.from("scene_objects").upsert(row);
          if (error) {
            throw error;
          }
          broadcastEvent("scene-event", {
            type: "object:add",
            userId: session.user.id,
            object: row
          });
          revokeSceneObjectUrl(object);
        } catch (error) {
          setStatus(error.message || "モデルのアップロードに失敗しました。");
        }
      })
    );
  }

  async function handleDeleteSelected() {
    if (!canEdit) return;
    const removed = removeSelectedObject();
    if (!removed) return;
    revokeSceneObjectUrl(removed);
    broadcastEvent("scene-event", { type: "object:remove", userId: session?.user?.id, objectId: removed.id });
    await supabase.from("scene_objects").delete().eq("id", removed.id).eq("project_id", projectId);
    setStatus(`${removed.name} を削除しました。`);
  }

  async function handleRenameObject(id, name) {
    renameObject(id, name);
    if (!canEdit) return;
    broadcastEvent("scene-event", { type: "object:update", userId: session?.user?.id, objectId: id, updates: { name } });
    await supabase.from("scene_objects").update({ name, updated_by: session?.user?.id }).eq("id", id).eq("project_id", projectId);
  }

  function handleTransformChange(objectId, updates) {
    updateObjectTransform(objectId, updates);
    if (!canEdit) return;
    broadcastTransform({ objectId, updates });
  }

  async function handleTransformEnd() {
    endTransform();
    setOrbitEnabled(true);
    if (!canEdit || !selectedId) return;
    const object = useSceneEditorStore.getState().objects.find((item) => item.id === selectedId);
    if (!object) return;
    await supabase
      .from("scene_objects")
      .update({
        position: object.position,
        rotation: object.rotation,
        scale: object.scale,
        updated_by: session?.user?.id
      })
      .eq("id", object.id)
      .eq("project_id", projectId);
  }

  function handleSettingsChange(mutator) {
    mutator();
    broadcastEvent("scene-event", {
      type: "settings:update",
      userId: session?.user?.id,
      settings: buildProjectSettingsFromStore(useSceneEditorStore.getState())
    });
    if (settingsTimerRef.current) {
      clearTimeout(settingsTimerRef.current);
    }
    settingsTimerRef.current = window.setTimeout(() => {
      void saveProjectSettings();
    }, 300);
  }

  async function saveProjectSettings() {
    if (!canEdit) return;
    const nextSettings = buildProjectSettingsFromStore(useSceneEditorStore.getState());
    await supabase.from("projects").update({ settings: nextSettings }).eq("id", projectId);
  }

  async function handleImportScene(event) {
    if (!canEdit) return;
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = parseSceneJson(await file.text());
      const assetMap = new Map((parsed.assets || []).map((asset) => [asset.id, asset]));
      if (!assetMap.size) {
        throw new Error("このJSONには共有できるモデル本体が含まれていません。ポータブルJSONを書き出して取り込んでください。");
      }

      const uploadedObjects = [];

      for (const sourceObject of parsed.objects || []) {
        const asset = assetMap.get(sourceObject.assetId);
        if (!asset?.dataUrl) continue;
        const uploadFile = await createFileFromDataUrl({
          dataUrl: asset.dataUrl,
          name: asset.name || `${sourceObject.name || "model"}.${asset.mimeType === "model/gltf+json" ? "gltf" : "glb"}`,
          mimeType: asset.mimeType || sourceObject.mimeType || "model/gltf-binary"
        });

        const modelUrl = await uploadPublicFile({
          supabase,
          bucket: getSceneModelBucket(),
          userId: session.user.id,
          file: uploadFile,
          folder: `vr/${projectId}`
        });

        uploadedObjects.push({
          id: createCollaborativeObjectId(),
          name: sourceObject.name,
          modelUrl,
          url: modelUrl,
          mimeType: uploadFile.type || asset.mimeType || sourceObject.mimeType,
          position: sourceObject.position || [0, 0, 0],
          rotation: sourceObject.rotation || [0, 0, 0],
          scale: sourceObject.scale || [1, 1, 1],
          isRemote: true
        });
      }

      for (const object of uploadedObjects) {
        upsertObject(object);
      }

      await Promise.all(
        uploadedObjects.map(async (object) => {
          const row = objectToSceneObjectRow({ object, projectId, userId: session?.user?.id });
          await supabase.from("scene_objects").upsert(row);
          broadcastEvent("scene-event", {
            type: "object:add",
            userId: session?.user?.id,
            object: row
          });
        })
      );
      setStatus("JSON シーンを取り込みました。");
    } catch (error) {
      setStatus(error.message || "シーンJSONの読み込みに失敗しました。");
    } finally {
      event.target.value = "";
    }
  }

  async function handleExportScene() {
    const assets = await exportAssetsForObjects(objects);
    const payload = serializePortableScene(
      {
        sceneName,
        objects,
        selectedId,
        lighting,
        environment,
        fog,
        camera
      },
      assets
    );
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${project?.name || "vr-project"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function handleCopyInvite() {
    if (!project || projectRole !== "owner") return;
    if (project.access_mode === "open") {
      await navigator.clipboard.writeText(buildInviteUrl({ origin: window.location.origin, projectId: project.id }));
      setStatus("開放リンクをコピーしました。");
      return;
    }
    let token = project.invite_token;
    if (!token) {
      token = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const { error } = await supabase.from("projects").update({ invite_token: token }).eq("id", project.id);
      if (error) {
        setStatus(error.message || "招待リンクを作れませんでした。");
        return;
      }
      setProject((previous) => ({ ...previous, invite_token: token }));
    }
    await navigator.clipboard.writeText(buildInviteUrl({ origin: window.location.origin, projectId: project.id, token }));
    setStatus("招待リンクをコピーしました。");
  }

  async function handleToggleAccessMode() {
    if (!project || projectRole !== "owner") return;
    const nextMode = project.access_mode === "open" ? "invite_only" : "open";
    const { error } = await supabase.from("projects").update({ access_mode: nextMode }).eq("id", project.id);
    if (error) {
      setStatus(error.message || "アクセスモードを変更できませんでした。");
      return;
    }
    setProject((previous) => (previous ? { ...previous, access_mode: nextMode } : previous));
    setStatus(nextMode === "open" ? "この空間を開放モードにしました。" : "この空間を招待制に戻しました。");
  }

  async function handleUndo() {
    const didUndo = undo();
    if (!didUndo) return;
    await syncEntireSceneState("1つ前の状態に戻しました。");
  }

  async function handleRedo() {
    const didRedo = redo();
    if (!didRedo) return;
    await syncEntireSceneState("やり直しました。");
  }

  async function handleSendChat() {
    if (!chatDraft.trim() || !session?.user) return;
    const content = chatDraft.trim();
    setChatDraft("");
    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        project_id: projectId,
        user_id: session.user.id,
        content
      })
      .select("id, project_id, user_id, content, created_at, profiles!chat_messages_user_id_fkey(id, username, display_name)")
      .single();

    if (error || !data) {
      setStatus(error?.message || "チャット送信に失敗しました。");
      return;
    }

    const message = {
      id: data.id,
      userId: data.user_id,
      content: data.content,
      createdAt: data.created_at,
      authorName: data.profiles?.display_name || data.profiles?.username || profile?.display_name || profile?.username || "member"
    };
    setChatMessages((previous) => dedupeMessages([...previous, message]).slice(-100));
    broadcastEvent("chat-event", { userId: session.user.id, message });
  }

  function handleSceneBroadcast(payload) {
    if (payload.type === "object:add" && payload.object) {
      upsertObject(sceneObjectRowToObject(payload.object));
      return;
    }

    if (payload.type === "object:update" && payload.objectId) {
      const current = useSceneEditorStore.getState().objects.find((item) => item.id === payload.objectId);
      if (!current) return;
      upsertObject(
        {
          ...current,
          ...payload.updates
        },
        { select: false }
      );
      return;
    }

    if (payload.type === "object:remove" && payload.objectId) {
      const removed = removeObjectWithOptions(payload.objectId, { recordHistory: false });
      if (removed) {
        revokeSceneObjectUrl(removed);
      }
      return;
    }

    if (payload.type === "settings:update" && payload.settings) {
      applyRemoteSceneSettings(payload.settings);
      return;
    }

    if (payload.type === "scene:replace") {
      if (payload.objects) {
        replaceSceneObjects((payload.objects || []).map(sceneObjectRowToObject), null);
      }
      if (payload.settings) {
        applyRemoteSceneSettings(payload.settings);
      }
    }
  }

  function broadcastEvent(event, payload) {
    broadcastChannelRef.current?.send({
      type: "broadcast",
      event,
      payload
    });
  }

  const remoteSelections = useMemo(() => {
    const selectionMap = {};
    presenceUsers.forEach((user) => {
      if (user.selectedId) {
        selectionMap[user.selectedId] = {
          color: user.color,
          name: user.name
        };
      }
    });
    return selectionMap;
  }, [presenceUsers]);

  const presenceCameras = useMemo(
    () =>
      presenceUsers
        .filter((user) => Array.isArray(user.cameraPose?.position))
        .map((user) => ({
          userId: user.userId,
          name: user.name,
          color: user.color,
          position: user.cameraPose.position
        })),
    [presenceUsers]
  );

  if (loading) {
    return (
      <section className="section-grid gap-6">
        <div className="surface rounded-[32px] border border-slate-200 bg-white/85 p-6">読み込み中…</div>
      </section>
    );
  }

  if (!session) {
    return (
      <section className="section-grid gap-6">
        <div className="surface rounded-[32px] border border-slate-200 bg-white/85 p-6 shadow-[0_24px_60px_rgba(20,29,40,0.08)] backdrop-blur">
          <h1 className="page-title">共同編集を始めるには認証が必要です</h1>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/auth" className="button button-primary">
              メールで入る
            </Link>
            <button
              type="button"
              onClick={() =>
                void supabase.auth.signInWithOAuth({
                  provider: "google",
                  options: {
                    redirectTo: window.location.href
                  }
                })
              }
              className="button button-secondary"
            >
              Google で入る
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section-grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="eyebrow">みんなで作るVR空間</p>
          <h1 className="page-title">{project?.name || "共同編集プロジェクト"}</h1>
          <p className="text-sm text-slate-600">{status}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/apps/vr" className="button button-secondary">
            一覧へ戻る
          </Link>
          {projectRole === "owner" ? (
            <>
              <button type="button" onClick={() => void handleToggleAccessMode()} className="button button-secondary">
                {project?.access_mode === "open" ? "招待制に戻す" : "開放モードにする"}
              </button>
              <button type="button" onClick={() => void handleCopyInvite()} className="button button-primary">
                {project?.access_mode === "open" ? "開放リンクをコピー" : "招待リンクをコピー"}
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="surface rounded-[24px] border border-slate-200 bg-white/85 px-4 py-3 shadow-[0_24px_60px_rgba(20,29,40,0.08)] backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          {members.map((member) => {
            const present = presenceUsers.some((user) => user.userId === member.userId);
            return (
              <span
                key={member.userId}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-700"
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: member.color, opacity: present ? 1 : 0.35 }} />
                {member.name}
              </span>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)_360px]">
        <ObjectListPanel
          sceneName={sceneName}
          onSceneNameChange={(nextName) => {
            if (!canEdit) return;
            setSceneName(nextName);
            handleSettingsChange(() => {});
          }}
          objects={objects}
          selectedId={selectedId}
          onSelect={selectObject}
          onRename={(id, name) => void handleRenameObject(id, name)}
          onTriggerImport={() => {
            if (!canEdit) {
              setStatus("viewer は読み込みできません。");
              return;
            }
            document.getElementById("vr-project-import")?.click();
          }}
          onTriggerSceneImport={() => {
            if (!canEdit) {
              setStatus("viewer は読み込みできません。");
              return;
            }
            document.getElementById("vr-project-scene-import")?.click();
          }}
          onExportScene={() => void handleExportScene()}
          onShareScene={() => void handleCopyInvite()}
          onSaveScene={() => void saveProjectSettings()}
          status={status}
          showSceneManager={false}
          projectLabel={project?.name}
          projectRole={projectRole}
          members={members}
          onCopyInvite={() => void handleCopyInvite()}
          inviteEnabled={projectRole === "owner"}
          inviteLabel={project?.access_mode === "open" ? "開放リンク" : "招待リンク"}
          projectAccessMode={project?.access_mode || "invite_only"}
          onToggleProjectAccessMode={() => void handleToggleAccessMode()}
          accessModeEnabled={projectRole === "owner"}
        />

        <div className="relative grid gap-4">
          <SceneViewport
            objects={objects}
            selectedId={selectedId}
            transformMode={transformMode}
            orbitEnabled={orbitEnabled}
            lighting={lighting}
            environment={environment}
            fog={fog}
            cameraPose={camera.currentPose}
            cameraRequest={cameraRequest}
            onSelect={selectObject}
            onTransformStart={() => {
              beginTransform();
              setOrbitEnabled(false);
            }}
            onTransformEnd={() => void handleTransformEnd()}
            onTransformCommit={handleTransformChange}
            onDropFiles={(files) => void handleDropFiles(files)}
            dragActive={false}
            onDragStateChange={() => {}}
            onCameraPoseChange={updateCurrentCameraPose}
            onCameraRequestSettled={clearCameraRequest}
            onRequestCameraPose={requestCameraPose}
            remoteSelections={remoteSelections}
            presenceCameras={presenceCameras}
          />

          <CollabChatPanel
            open={chatOpen}
            onToggle={() => setChatOpen((previous) => !previous)}
            messages={chatMessages}
            draft={chatDraft}
            onDraftChange={setChatDraft}
            onSend={() => void handleSendChat()}
          />
        </div>

        <ObjectInspectorPanel
          object={selectedObject}
          transformMode={transformMode}
          onSetTransformMode={setTransformMode}
          onDelete={() => void handleDeleteSelected()}
          canDelete={Boolean(selectedObject) && canEdit}
          onUpdateField={(field, axis, value) => {
            if (!selectedObject || !canEdit) return;
            const next = [...selectedObject[field]];
            next[axis] = Number.isFinite(value) ? value : 0;
            updateObjectTransform(selectedObject.id, { [field]: next }, { recordHistory: true });
            broadcastEvent("scene-event", {
              type: "object:update",
              userId: session?.user?.id,
              objectId: selectedObject.id,
              updates: { [field]: next }
            });
            void supabase
              .from("scene_objects")
              .update({
                [field]: next,
                updated_by: session?.user?.id
              })
              .eq("id", selectedObject.id)
              .eq("project_id", projectId);
          }}
          sceneStats={{ count: objects.length }}
          lighting={lighting}
          environment={environment}
          fog={fog}
          camera={camera}
          onUpdateLightingField={(scope, field, value) => {
            if (!canEdit) return;
            handleSettingsChange(() => updateLightingFieldWithOptions(scope, field, value, { recordHistory: true }));
          }}
          onUpdateEnvironmentField={(field, value) => {
            if (!canEdit) return;
            handleSettingsChange(() => updateEnvironmentFieldWithOptions(field, value, { recordHistory: true }));
          }}
          onUpdateFogField={(field, value) => {
            if (!canEdit) return;
            handleSettingsChange(() => updateFogFieldWithOptions(field, value, { recordHistory: true }));
          }}
          onSaveCameraBookmark={() => saveCurrentCameraBookmark(`視点 ${camera.bookmarks.length + 1}`)}
          onRequestCameraPose={requestCameraPose}
          onRenameCameraBookmark={renameCameraBookmark}
          onRemoveCameraBookmark={removeCameraBookmark}
          canUndo={historyPast.length > 0}
          canRedo={historyFuture.length > 0}
          onUndo={() => void handleUndo()}
          onRedo={() => void handleRedo()}
        />
      </div>

      <input
        id="vr-project-import"
        type="file"
        accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
        multiple
        hidden
        onChange={(event) => {
          void handleDropFiles(Array.from(event.target.files || []));
          event.target.value = "";
        }}
      />
      <input id="vr-project-scene-import" type="file" accept="application/json,.json" hidden onChange={(event) => void handleImportScene(event)} />
    </section>
  );

  function buildPresencePayload(currentProfile, currentSelectedId, currentCameraPose) {
    return {
      userId: session?.user?.id,
      name: currentProfile?.display_name || currentProfile?.username || "member",
      avatarUrl: currentProfile?.avatar_url || "",
      color: colorForUser(session?.user?.id),
      selectedId: currentSelectedId,
      cameraPose: currentCameraPose
    };
  }

  async function syncEntireSceneState(nextStatus) {
    if (!canEdit || !session?.user) return;

    const state = useSceneEditorStore.getState();
    const settings = buildProjectSettingsFromStore(state);
    const rows = state.objects.map((object) => objectToSceneObjectRow({ object, projectId, userId: session.user.id }));

    const { data: existingRows, error: existingError } = await supabase.from("scene_objects").select("id").eq("project_id", projectId);
    if (existingError) {
      setStatus(existingError.message || "シーンの同期に失敗しました。");
      return;
    }

    if (rows.length) {
      const { error: upsertError } = await supabase.from("scene_objects").upsert(rows);
      if (upsertError) {
        setStatus(upsertError.message || "シーンの保存に失敗しました。");
        return;
      }
    }

    const keepIds = new Set(rows.map((row) => row.id));
    const deleteIds = (existingRows || []).map((row) => row.id).filter((id) => !keepIds.has(id));
    if (deleteIds.length) {
      const { error: deleteError } = await supabase.from("scene_objects").delete().eq("project_id", projectId).in("id", deleteIds);
      if (deleteError) {
        setStatus(deleteError.message || "削除差分の同期に失敗しました。");
        return;
      }
    }

    const { error: projectError } = await supabase.from("projects").update({ settings }).eq("id", projectId);
    if (projectError) {
      setStatus(projectError.message || "プロジェクト設定の保存に失敗しました。");
      return;
    }

    broadcastEvent("scene-event", {
      type: "scene:replace",
      userId: session.user.id,
      settings,
      objects: rows
    });
    setStatus(nextStatus);
  }
}

function readPresenceState(state, ownUserId) {
  return Object.values(state)
    .flat()
    .map((entry) => entry)
    .filter((entry) => entry.userId && entry.userId !== ownUserId)
    .map((entry) => ({
      userId: entry.userId,
      name: entry.name || "member",
      avatarUrl: entry.avatarUrl || "",
      color: entry.color || colorForUser(entry.userId),
      selectedId: entry.selectedId || null,
      cameraPose: entry.cameraPose || null
    }));
}

function dedupeMessages(messages) {
  const seen = new Set();
  return messages.filter((message) => {
    if (seen.has(message.id)) return false;
    seen.add(message.id);
    return true;
  });
}

async function createFileFromDataUrl({ dataUrl, name, mimeType }) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], name, { type: mimeType || blob.type || "application/octet-stream" });
}

function createCollaborativeObjectId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `object-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
