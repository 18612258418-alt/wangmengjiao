export type PenScene =
  | "idle"
  | "annotation"
  | "pdf"
  | "screenshot"
  | "camera"
  | "voice"
  | "form-fill";

export type PenToolKind = "pencil" | "marker" | "eraser";

export interface PenSceneMeta {
  annotationType?: string;
  fileName?: string;
}

export interface PenContextValue {
  scene: PenScene;
  sceneMeta: PenSceneMeta;
  isPenActive: boolean;
  showToolbar: boolean;
  hint: string | null;
  setScene: (scene: PenScene, meta?: PenSceneMeta) => void;
  activatePen: () => void;
  deactivatePen: () => void;
}
