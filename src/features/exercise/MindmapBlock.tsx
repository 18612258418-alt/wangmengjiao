import { useEffect, useId, useState } from "react";

export function MindmapBlock({ mermaid }: { mermaid: string }) {
  const id = useId().replace(/:/g, "");
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    setSvg("");
    setError("");
    import("mermaid")
      .then(module => {
        const mermaidLib = module.default;
        mermaidLib.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "base",
          themeVariables: {
            primaryColor: "#EEF0FF",
            primaryTextColor: "#020418",
            primaryBorderColor: "#4D5CFF",
            lineColor: "#94A3B8",
            secondaryColor: "#F8FAFB",
            tertiaryColor: "#FFFFFF",
          },
        });
        return mermaidLib.render(`mindmap_${id}`, mermaid);
      })
      .then(({ svg }) => {
        if (!cancelled) setSvg(svg);
      })
      .catch(err => {
        if (!cancelled) setError(err?.message || "Mermaid 渲染失败");
      });
    return () => { cancelled = true; };
  }, [id, mermaid]);

  return (
    <div className="bg-white border border-[#EAEDF2] rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-5 rounded-full bg-[#34D399]" />
        <h3 className="text-[15px] text-[#065F46]" style={{ fontWeight: 700 }}>思维导图</h3>
        <span className="text-[11px] text-[#9CA3AF]">{error ? "源码回退" : "Mermaid 渲染"}</span>
      </div>
      {svg && !error ? (
        <div
          className="bg-[#F8FAFB] border border-[#EAEDF2] rounded-xl p-3 overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <pre className="text-[12px] leading-6 text-[#334155] bg-[#F8FAFB] border border-[#EAEDF2] rounded-xl p-3 overflow-x-auto whitespace-pre-wrap">
          {error ? `${error}\n\n${mermaid}` : "思维导图渲染中..."}
        </pre>
      )}
    </div>
  );
}
