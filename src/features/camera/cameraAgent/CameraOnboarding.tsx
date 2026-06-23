import { useEffect } from "react";

const STORAGE_KEY = "imemo_camera_agent_onboarded";

interface Props {
  onDismiss: () => void;
}

export function CameraOnboarding({ onDismiss }: Props) {
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, "1");
  }, []);

  return (
    <div className="absolute inset-0 z-20 flex items-end justify-center pb-28 px-6 pointer-events-none">
      <div className="pointer-events-auto max-w-sm w-full bg-black/75 backdrop-blur-md rounded-2xl border border-white/10 px-5 py-4 text-center">
        <p className="text-white text-[15px] font-semibold mb-2">AI 情境感知相机</p>
        <p className="text-white/75 text-[13px] leading-relaxed">
          对准文档、板书、课本或证件，让内容进入取景框。识别到资料边缘后会显示校准框，保持稳定即可自动整理并存入记忆。
        </p>
        <button
          onClick={onDismiss}
          className="mt-4 w-full py-2.5 rounded-xl bg-white text-[#020418] text-[14px] font-semibold active:scale-[0.98] transition-transform"
        >
          知道了
        </button>
      </div>
    </div>
  );
}

export function shouldShowCameraOnboarding(): boolean {
  return !localStorage.getItem(STORAGE_KEY);
}
