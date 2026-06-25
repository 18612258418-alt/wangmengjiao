import { createContext, useCallback, useMemo, useState, type ReactNode } from "react";
import { getSceneHint } from "./sceneHints";
import type { PenContextValue, PenScene, PenSceneMeta } from "./types";

export const PenContext = createContext<PenContextValue | null>(null);

export function PenContextProvider({ children }: { children: ReactNode }) {
  const [scene, setSceneState] = useState<PenScene>("idle");
  const [sceneMeta, setSceneMeta] = useState<PenSceneMeta>({});
  const [isPenActive, setIsPenActive] = useState(false);

  const setScene = useCallback((next: PenScene, meta: PenSceneMeta = {}) => {
    setSceneState(next);
    setSceneMeta(meta);
    if (next === "idle") setIsPenActive(false);
  }, []);

  const activatePen = useCallback(() => setIsPenActive(true), []);
  const deactivatePen = useCallback(() => setIsPenActive(false), []);

  const hint = useMemo(() => getSceneHint(scene, sceneMeta), [scene, sceneMeta]);
  const showToolbar = isPenActive && scene !== "idle";

  const value = useMemo<PenContextValue>(
    () => ({
      scene,
      sceneMeta,
      isPenActive,
      showToolbar,
      hint,
      setScene,
      activatePen,
      deactivatePen,
    }),
    [scene, sceneMeta, isPenActive, showToolbar, hint, setScene, activatePen, deactivatePen],
  );

  return <PenContext.Provider value={value}>{children}</PenContext.Provider>;
}
