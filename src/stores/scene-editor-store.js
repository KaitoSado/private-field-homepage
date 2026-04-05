"use client";

import { create } from "zustand";

const MAX_HISTORY = 50;
const MAX_BOOKMARKS = 5;

const DEFAULT_CAMERA_POSE = {
  position: [8, 6, 10],
  target: [0, 1, 0]
};

function deepCopy(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function createDefaultLighting() {
  return {
    ambient: {
      color: "#ffffff",
      intensity: 0.85
    },
    directional: {
      color: "#ffffff",
      intensity: 1.8,
      direction: [6, 9, 4]
    }
  };
}

function createDefaultEnvironment() {
  return {
    mode: "color",
    backgroundColor: "#0c1222",
    environmentPreset: "sunset"
  };
}

function createDefaultFog() {
  return {
    enabled: false,
    color: "#dbe7ff",
    near: 18,
    far: 46
  };
}

function createDefaultCamera() {
  return {
    currentPose: deepCopy(DEFAULT_CAMERA_POSE),
    bookmarks: []
  };
}

export function createEmptySceneState(sceneName = "新しいシーン") {
  return {
    sceneName,
    objects: [],
    selectedId: null,
    lighting: createDefaultLighting(),
    environment: createDefaultEnvironment(),
    fog: createDefaultFog(),
    camera: createDefaultCamera()
  };
}

function normalizeSnapshot(scene) {
  return {
    sceneName: scene.sceneName || "新しいシーン",
    objects: deepCopy(scene.objects || []),
    selectedId: scene.selectedId || null,
    lighting: deepCopy(scene.lighting || createDefaultLighting()),
    environment: deepCopy(scene.environment || createDefaultEnvironment()),
    fog: deepCopy(scene.fog || createDefaultFog()),
    camera: {
      currentPose: deepCopy(scene.camera?.currentPose || DEFAULT_CAMERA_POSE),
      bookmarks: deepCopy(scene.camera?.bookmarks || [])
    }
  };
}

function buildHistorySnapshot(state) {
  return normalizeSnapshot(state);
}

function sceneChanged(nextSnapshot, prevSnapshot) {
  return JSON.stringify(nextSnapshot) !== JSON.stringify(prevSnapshot);
}

function applySnapshot(snapshot) {
  const normalized = normalizeSnapshot(snapshot);
  return {
    ...normalized,
    transformMode: "translate",
    orbitEnabled: true,
    cameraRequest: null,
    historyPast: [],
    historyFuture: [],
    pendingHistorySnapshot: null
  };
}

function withHistory(set, get, mutate) {
  const before = buildHistorySnapshot(get());
  set((state) => mutate(state));
  const after = buildHistorySnapshot(get());
  if (!sceneChanged(after, before)) {
    return;
  }
  set((state) => ({
    historyPast: [...state.historyPast, before].slice(-MAX_HISTORY),
    historyFuture: []
  }));
}

function nextObjectName(objects, fallback) {
  if (!fallback) {
    return `Model ${objects.length + 1}`;
  }
  return fallback;
}

export const useSceneEditorStore = create((set, get) => ({
  ...applySnapshot(createEmptySceneState()),
  transformMode: "translate",
  orbitEnabled: true,
  cameraRequest: null,
  historyPast: [],
  historyFuture: [],
  pendingHistorySnapshot: null,

  addObjects(nextObjects) {
    withHistory(set, get, (state) => ({
      objects: [
        ...state.objects,
        ...nextObjects.map((object, index) => ({
          ...object,
          name: nextObjectName(state.objects, object.name || `Model ${state.objects.length + index + 1}`)
        }))
      ],
      selectedId: nextObjects[0]?.id || state.selectedId
    }));
  },

  selectObject(selectedId) {
    set({ selectedId });
  },

  renameObject(id, name) {
    return get().renameObjectWithOptions(id, name, { recordHistory: true });
  },

  renameObjectWithOptions(id, name, options = {}) {
    const apply = (state) => ({
      objects: state.objects.map((object) => (object.id === id ? { ...object, name: name || object.name } : object))
    });
    if (options.recordHistory) {
      withHistory(set, get, apply);
      return;
    }
    set((state) => apply(state));
  },

  updateObjectTransform(id, updates, options = {}) {
    const apply = (state) => ({
      objects: state.objects.map((object) => (object.id === id ? { ...object, ...deepCopy(updates) } : object))
    });
    if (options.recordHistory) {
      withHistory(set, get, apply);
      return;
    }
    set((state) => apply(state));
  },

  beginTransform() {
    set({ pendingHistorySnapshot: buildHistorySnapshot(get()) });
  },

  endTransform() {
    const before = get().pendingHistorySnapshot;
    if (!before) {
      return;
    }
    const after = buildHistorySnapshot(get());
    if (!sceneChanged(after, before)) {
      set({ pendingHistorySnapshot: null });
      return;
    }
    set((state) => ({
      pendingHistorySnapshot: null,
      historyPast: [...state.historyPast, before].slice(-MAX_HISTORY),
      historyFuture: []
    }));
  },

  setTransformMode(transformMode) {
    set({ transformMode });
  },

  setOrbitEnabled(orbitEnabled) {
    set({ orbitEnabled });
  },

  removeObject(id) {
    return get().removeObjectWithOptions(id, { recordHistory: true });
  },

  removeObjectWithOptions(id, options = {}) {
    let removed = null;
    const apply = (state) => {
      const objects = state.objects.filter((object) => {
        if (object.id === id) {
          removed = object;
          return false;
        }
        return true;
      });
      return {
        objects,
        selectedId: state.selectedId === id ? objects[0]?.id || null : state.selectedId
      };
    };

    if (options.recordHistory) {
      withHistory(set, get, apply);
    } else {
      set((state) => apply(state));
    }
    return removed;
  },

  removeSelectedObject() {
    const selectedId = get().selectedId;
    if (!selectedId) {
      return null;
    }
    return get().removeObject(selectedId);
  },

  setSceneName(sceneName) {
    withHistory(set, get, () => ({ sceneName }));
  },

  updateLightingField(scope, field, value) {
    return get().updateLightingFieldWithOptions(scope, field, value, { recordHistory: true });
  },

  updateLightingFieldWithOptions(scope, field, value, options = {}) {
    const apply = (state) => ({
      lighting: {
        ...state.lighting,
        [scope]: {
          ...state.lighting[scope],
          [field]: Array.isArray(value) ? [...value] : value
        }
      }
    });
    if (options.recordHistory) {
      withHistory(set, get, apply);
      return;
    }
    set((state) => apply(state));
  },

  updateEnvironmentField(field, value) {
    return get().updateEnvironmentFieldWithOptions(field, value, { recordHistory: true });
  },

  updateEnvironmentFieldWithOptions(field, value, options = {}) {
    const apply = (state) => ({
      environment: {
        ...state.environment,
        [field]: value
      }
    });
    if (options.recordHistory) {
      withHistory(set, get, apply);
      return;
    }
    set((state) => apply(state));
  },

  updateFogField(field, value) {
    return get().updateFogFieldWithOptions(field, value, { recordHistory: true });
  },

  updateFogFieldWithOptions(field, value, options = {}) {
    const apply = (state) => ({
      fog: {
        ...state.fog,
        [field]: value
      }
    });
    if (options.recordHistory) {
      withHistory(set, get, apply);
      return;
    }
    set((state) => apply(state));
  },

  updateCurrentCameraPose(pose) {
    set((state) => ({
      camera: {
        ...state.camera,
        currentPose: deepCopy(pose)
      }
    }));
  },

  requestCameraPose(pose) {
    set({
      cameraRequest: {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        pose: deepCopy(pose)
      }
    });
  },

  clearCameraRequest() {
    set({ cameraRequest: null });
  },

  replaceSceneObjects(objects, selectedId = null) {
    set((state) => ({
      objects: deepCopy(objects || []),
      selectedId: selectedId ?? state.selectedId
    }));
  },

  upsertObject(nextObject, options = {}) {
    const apply = (state) => {
      const exists = state.objects.some((object) => object.id === nextObject.id);
      const objects = exists
        ? state.objects.map((object) => (object.id === nextObject.id ? { ...object, ...deepCopy(nextObject) } : object))
        : [...state.objects, deepCopy(nextObject)];
      return {
        objects,
        selectedId: options.select ? nextObject.id : state.selectedId
      };
    };
    if (options.recordHistory) {
      withHistory(set, get, apply);
      return;
    }
    set((state) => apply(state));
  },

  applyRemoteSceneSettings(settings) {
    set((state) => ({
      sceneName: settings.sceneName ?? state.sceneName,
      lighting: settings.lighting ? deepCopy(settings.lighting) : state.lighting,
      environment: settings.environment ? deepCopy(settings.environment) : state.environment,
      fog: settings.fog ? deepCopy(settings.fog) : state.fog
    }));
  },

  saveCurrentCameraBookmark(label) {
    withHistory(set, get, (state) => ({
      camera: {
        ...state.camera,
        bookmarks: [
          ...state.camera.bookmarks.slice(-(MAX_BOOKMARKS - 1)),
          {
            id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `bookmark-${Date.now()}`,
            label: label || `視点 ${state.camera.bookmarks.length + 1}`,
            pose: deepCopy(state.camera.currentPose)
          }
        ]
      }
    }));
  },

  renameCameraBookmark(id, label) {
    withHistory(set, get, (state) => ({
      camera: {
        ...state.camera,
        bookmarks: state.camera.bookmarks.map((bookmark) => (bookmark.id === id ? { ...bookmark, label } : bookmark))
      }
    }));
  },

  removeCameraBookmark(id) {
    withHistory(set, get, (state) => ({
      camera: {
        ...state.camera,
        bookmarks: state.camera.bookmarks.filter((bookmark) => bookmark.id !== id)
      }
    }));
  },

  clearScene() {
    const previous = get().objects;
    set((state) => ({
      ...state,
      ...applySnapshot(createEmptySceneState(state.sceneName || "新しいシーン")),
      transformMode: state.transformMode
    }));
    return previous;
  },

  replaceScene(scene) {
    set((state) => ({
      ...state,
      ...applySnapshot(scene)
    }));
  },

  undo() {
    const { historyPast, historyFuture } = get();
    if (!historyPast.length) {
      return false;
    }
    const current = buildHistorySnapshot(get());
    const previous = historyPast[historyPast.length - 1];
    set((state) => ({
      ...applySnapshot(previous),
      historyPast: state.historyPast.slice(0, -1),
      historyFuture: [current, ...historyFuture].slice(0, MAX_HISTORY)
    }));
    return true;
  },

  redo() {
    const { historyFuture } = get();
    if (!historyFuture.length) {
      return false;
    }
    const current = buildHistorySnapshot(get());
    const next = historyFuture[0];
    set((state) => ({
      ...applySnapshot(next),
      historyPast: [...state.historyPast, current].slice(-MAX_HISTORY),
      historyFuture: state.historyFuture.slice(1)
    }));
    return true;
  }
}));
