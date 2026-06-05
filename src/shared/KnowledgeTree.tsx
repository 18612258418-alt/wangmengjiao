import type { KnowledgeNode } from "../types";

const LEVEL_STYLES: Record<number, { color: string; fontSize: number; fontWeight: number; opacity: number }> = {
  1: { color: "#6B7280", fontSize: 11, fontWeight: 500, opacity: 0.7 },
  2: { color: "#4B5563", fontSize: 12, fontWeight: 500, opacity: 0.8 },
  3: { color: "#374151", fontSize: 13, fontWeight: 600, opacity: 0.9 },
  4: { color: "#111827", fontSize: 14, fontWeight: 700, opacity: 1 },
  5: { color: "#374151", fontSize: 12, fontWeight: 500, opacity: 0.85 },
};

export function KnowledgeTree({ nodes }: { nodes: KnowledgeNode[] }) {
  if (!nodes || nodes.length === 0) {
    return <p style={{ fontSize: 13, color: "#B0B5C0", textAlign: "center", padding: "40px 0" }}>知识脉络生成中...</p>;
  }

  return (
    <div style={{ padding: "4px 0 16px 0" }}>
      {nodes.map((node, i) => {
        const style = LEVEL_STYLES[node.level] ?? LEVEL_STYLES[5];
        const indent = (node.level - 1) * 20;
        const hasChildren = nodes.some(n => n.level > node.level && nodes.indexOf(n) > i &&
          !nodes.slice(i + 1, nodes.indexOf(n)).some(m => m.level <= node.level));
        const isLast = !nodes.slice(i + 1).some(n => n.level <= node.level);

        return (
          <div key={i} style={{ position: "relative", display: "flex", alignItems: "flex-start", marginBottom: node.current ? 8 : 4 }}>
            {node.level > 1 && (
              <div style={{
                position: "absolute",
                left: indent - 13,
                top: 0,
                width: 1,
                height: isLast ? "50%" : "100%",
                background: "#E5E7EB",
              }} />
            )}
            {node.level > 1 && (
              <div style={{
                position: "absolute",
                left: indent - 13,
                top: "50%",
                width: 10,
                height: 1,
                background: "#E5E7EB",
              }} />
            )}

            <div style={{
              marginLeft: indent,
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: node.current ? "6px 12px" : "3px 8px",
              borderRadius: node.current ? 10 : 6,
              background: node.current
                ? "linear-gradient(135deg, #EEF2FF 0%, #E0F2FE 100%)"
                : "transparent",
              border: node.current ? "1.5px solid #C7D2FE" : "none",
              flex: 1,
            }}>
              <div style={{
                width: node.current ? 10 : 6,
                height: node.current ? 10 : 6,
                borderRadius: "50%",
                flexShrink: 0,
                background: node.current
                  ? "linear-gradient(135deg, #6366F1, #06B6D4)"
                  : "#D1D5DB",
              }} />
              <span style={{
                fontSize: style.fontSize,
                fontWeight: style.fontWeight,
                color: node.current ? "#4F46E5" : style.color,
                opacity: style.opacity,
                lineHeight: 1.4,
              }}>
                {node.label}
              </span>
              {node.current && (
                <span style={{
                  marginLeft: 4,
                  fontSize: 10,
                  fontWeight: 600,
                  color: "#6366F1",
                  background: "#EEF2FF",
                  border: "1px solid #C7D2FE",
                  borderRadius: 4,
                  padding: "1px 5px",
                  flexShrink: 0,
                }}>
                  📍当前
                </span>
              )}
            </div>
            {hasChildren && null}
          </div>
        );
      })}
    </div>
  );
}
