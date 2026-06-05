import { useEffect, useState } from "react";
import type { InteractiveSpec } from "../../types";
import { buildSandpackFiles, SANDPACK_DEPENDENCIES } from "./sandpackStarter";

type SandpackModule = typeof import("@codesandbox/sandpack-react");

export function InteractiveBlock({ spec }: { spec: InteractiveSpec }) {
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
  const [sandpack, setSandpack] = useState<SandpackModule | null>(null);
  const files = buildSandpackFiles(spec);

  useEffect(() => {
    let cancelled = false;
    import("@codesandbox/sandpack-react").then(module => {
      if (!cancelled) setSandpack(module);
    });
    return () => { cancelled = true; };
  }, []);

  const SandpackProvider = sandpack?.SandpackProvider;
  const SandpackLayout = sandpack?.SandpackLayout;
  const SandpackPreview = sandpack?.SandpackPreview;
  const SandpackCodeEditor = sandpack?.SandpackCodeEditor;

  return (
    <div className="bg-white border border-[#EAEDF2] rounded-2xl overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-[#EAEDF2]">
        <div style={{ flex: "0 1 calc(100% - 136px)", minWidth: 0 }}>
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 rounded-full bg-[#8B5CF6]" />
            <h3 className="text-[15px] text-[#6D28D9]" style={{ fontWeight: 700 }}>交互演示</h3>
          </div>
          {spec.explanation && (
            <p className="text-[12px] text-[#7B8291] mt-1">{spec.explanation}</p>
          )}
        </div>
        <div className="flex items-center bg-[#F5F6FA] rounded-xl p-1 shrink-0" style={{ width: 120 }}>
          {([{ key: "preview", label: "演示" }, { key: "code", label: "源码" }] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="py-1 rounded-lg text-[12px]"
              style={{
                width: 56,
                background: activeTab === tab.key ? "#fff" : "transparent",
                color: activeTab === tab.key ? "#4D5CFF" : "#7B8291",
                fontWeight: activeTab === tab.key ? 700 : 500,
                boxShadow: activeTab === tab.key ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                whiteSpace: "nowrap",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {SandpackProvider && SandpackLayout && SandpackPreview && SandpackCodeEditor ? (
        <SandpackProvider
          template="react-ts"
          files={files}
          customSetup={{ dependencies: SANDPACK_DEPENDENCIES }}
          options={{
            externalResources: ["https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"],
          }}
        >
          <SandpackLayout style={{ border: 0, borderRadius: 0 }}>
            <div style={{ display: activeTab === "preview" ? "block" : "none", width: "100%" }}>
              <SandpackPreview
                showNavigator={false}
                showOpenInCodeSandbox={false}
                style={{ height: 720 }}
              />
            </div>
            <div style={{ display: activeTab === "code" ? "block" : "none", width: "100%" }}>
              <SandpackCodeEditor
                showTabs
                showLineNumbers
                wrapContent
                style={{ height: 720 }}
              />
            </div>
          </SandpackLayout>
        </SandpackProvider>
      ) : (
        <div className="h-[720px] flex items-center justify-center bg-[#F8FAFB] text-[13px] text-[#7B8291]">
          交互沙箱加载中...
        </div>
      )}
    </div>
  );
}
