import { create } from "zustand";

function safeObjectName(name, index) {
  const trimmed = `${name || ""}`.trim();
  return trimmed || `Object ${index + 1}`;
}

export const useSceneEditorStore = create((set, get) => ({
  sceneName: "みんなで作るVR空間",
  objects: [],
  selectedId: null,
  transformMode: "translate",
  orbitEnabled: true,

  addObjects: (incoming) =>
    set((state) => {
      const nextObjects = [...state.objects, ...incoming];
      return {
        objects: nextObjects,
        selectedId: incoming[0]?.id || state.selectedId
      };
    }),

  selectObject: (id) => set({ selectedId: id }),

  renameObject: (id, name) =>
    set((state) => ({
      objects: state.objects.map((item) => (item.id === id ? { ...item, name } : item))
    })),

  updateObjectTransform: (id, patch) =>
    set((state) => ({
      objects: state.objects.map((item) => (item.id === id ? { ...item, ...patch } : item))
    })),

  setTransformMode: (transformMode) => set({ transformMode }),
  setOrbitEnabled: (orbitEnabled) => set({ orbitEnabled }),

  removeObject: (id) => {
    const current = get();
    const removed = current.objects.find((item) => item.id === id) || null;
    set((state) => {
      const remaining = state.objects.filter((item) => item.id !== id);
      return {
        objects: remaining,
        selectedId: state.selectedId === id ? remaining[0]?.id || null : state.selectedId
      };
    });
    return removed;
  },

  removeSelectedObject: () => {
    const { selectedId, removeObject } = get();
    if (!selectedId) return null;
    return removeObject(selectedId);
  },

  replaceScene: ({ sceneName, objects, selectedId }) =>
    set({
      sceneName: sceneName || "みんなで作るVR空間",
      objects: (objects || []).map((item, index) => ({
        ...item,
        name: safeObjectName(item.name, index)
      })),
      selectedId: selectedId || objects?.[0]?.id || null
    }),

  clearScene: () => {
    const previous = get().objects;
    set({
      sceneName: "みんなで作るVR空間",
      objects: [],
      selectedId: null,
      transformMode: "translate",
      orbitEnabled: true
    });
    return previous;
  }
}));
