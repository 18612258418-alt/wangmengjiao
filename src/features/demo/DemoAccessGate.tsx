import { useState, useEffect, type ReactNode } from "react";

const ACCESS_CODE = import.meta.env.VITE_DEMO_ACCESS_CODE as string | undefined;
const STORAGE_KEY = "imemo_demo_access_ok";

/** 仅当配置了 VITE_DEMO_ACCESS_CODE 时启用，用于预览环境拦截未授权访问 */
export function DemoAccessGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(() => {
    if (!ACCESS_CODE) return true;
    try {
      return sessionStorage.getItem(STORAGE_KEY) === ACCESS_CODE;
    } catch {
      return false;
    }
  });
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!ACCESS_CODE) return;
    try {
      setUnlocked(sessionStorage.getItem(STORAGE_KEY) === ACCESS_CODE);
    } catch {
      setUnlocked(false);
    }
  }, []);

  if (!ACCESS_CODE || unlocked) return <>{children}</>;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() === ACCESS_CODE) {
      try { sessionStorage.setItem(STORAGE_KEY, ACCESS_CODE); } catch { /* ignore */ }
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#F5F6FA] px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl border border-[#EAEDF2]"
      >
        <p className="text-[18px] text-[#020418]" style={{ fontWeight: 700 }}>内测访问</p>
        <p className="text-[13px] text-[#7B8291] mt-2 leading-6">
          请输入测试口令后继续。此页面仅供内部验证，请勿外传。
        </p>
        <input
          type="password"
          value={input}
          onChange={e => { setInput(e.target.value); setError(false); }}
          placeholder="测试口令"
          autoFocus
          className="mt-4 w-full rounded-2xl border border-[#EAEDF2] px-4 py-3 text-[14px] outline-none focus:border-[#4D5CFF]"
        />
        {error && (
          <p className="mt-2 text-[12px] text-red-500">口令错误，请向测试负责人索取</p>
        )}
        <button
          type="submit"
          className="mt-4 w-full rounded-2xl bg-[#4D5CFF] py-3 text-[14px] text-white"
          style={{ fontWeight: 600 }}
        >
          进入
        </button>
      </form>
    </div>
  );
}
