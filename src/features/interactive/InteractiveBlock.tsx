import { useEffect, useState } from "react";
import type { InteractiveSpec } from "../../types";
import { buildSandpackFiles, SANDPACK_DEPENDENCIES } from "./sandpackStarter";

type SandpackModule = typeof import("@codesandbox/sandpack-react");

export function InteractiveBlock({ spec }: { spec: InteractiveSpec }) {
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

  return (
    <div className="bg-white border border-[#EAEDF2] rounded-2xl overflow-hidden">
      {SandpackProvider && SandpackLayout && SandpackPreview ? (
        <SandpackProvider
          template="react-ts"
          files={files}
          customSetup={{ dependencies: SANDPACK_DEPENDENCIES }}
          options={{
            externalResources: ["https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"],
          }}
        >
          <SandpackLayout style={{ border: 0, borderRadius: 0 }}>
            <div style={{ width: "100%" }}>
              <SandpackPreview
                showNavigator={false}
                showOpenInCodeSandbox={false}
                style={{ height: 430 }}
              />
            </div>
          </SandpackLayout>
        </SandpackProvider>
      ) : (
        <div className="h-[430px] flex items-center justify-center bg-[#F8FAFB] text-[13px] text-[#7B8291]">
          交互沙箱加载中...
        </div>
      )}
    </div>
  );
}
