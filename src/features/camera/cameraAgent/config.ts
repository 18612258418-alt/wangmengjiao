export const isCameraAgentEnabled = import.meta.env.VITE_CAMERA_AGENT !== "false";

/** 默认开启蓝框自动拍摄；内存优化后可用。若要仅手动快门：VITE_CAMERA_AUTO_CAPTURE=false */
export const isCameraAutoCaptureEnabled =
  import.meta.env.VITE_CAMERA_AUTO_CAPTURE !== "false";

export type AgentPhase =
  | "preview"
  | "detecting"
  | "stable"
  | "processing"
  | "saving";

export interface AgentSaveMeta {
  autoCapture: boolean;
  demo?: boolean;
  /** 仅触发缩略图飞入左下角，不出卡 */
  flyOnly?: boolean;
}
