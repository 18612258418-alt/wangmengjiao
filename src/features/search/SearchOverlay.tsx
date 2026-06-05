import { useState, useRef, useEffect, useMemo } from "react";
import type { CardData, FeedGroup, SubjectData } from "../../types";
import { sourceLabel } from "../../shared/SourceIcon";
import { CardDetailContent } from "../drawer/CardDetailContent";

function highlightText(text: string, query: string) {
  if (!query || query.length < 2) return <>{text}</>;
  const q = query.toLowerCase();
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: "#FEF08A", borderRadius: 2, padding: "0 1px" }}>
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

export function SearchOverlay({
  isOpen, onClose, allFeedGroups, subjects, onUpdateCard,
}: {
  isOpen: boolean;
  onClose: () => void;
  allFeedGroups: Record<string, FeedGroup[]>;
  subjects: SubjectData[];
  onUpdateCard: (subjectId: string, date: string, cardId: string, updates: Partial<CardData>) => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
  const [selectedMeta, setSelectedMeta] = useState<{ subjectId: string; date: string } | null>(null);
  const [isWide, setIsWide] = useState(window.innerWidth >= 768);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onResize = () => setIsWide(window.innerWidth >= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80);
      setQuery("");
      setSelectedCard(null);
      setSelectedMeta(null);
    }
  }, [isOpen]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const grouped: Array<{ subjectId: string; subjectName: string; cards: Array<{ card: CardData; date: string }> }> = [];
    for (const subject of subjects) {
      const groups = allFeedGroups[subject.id] ?? [];
      const matched: Array<{ card: CardData; date: string }> = [];
      for (const group of groups) {
        for (const card of group.cards) {
          const searchable = [
            card.title, card.overview ?? "", card.detailIntro ?? "",
            ...(card.detailSections?.flatMap(s => [s.title, ...s.items]) ?? []),
            card.unifiedDetail ?? "",
          ].join(" ").toLowerCase();
          if (searchable.includes(q)) matched.push({ card, date: group.date });
        }
      }
      if (matched.length > 0) grouped.push({ subjectId: subject.id, subjectName: subject.name, cards: matched });
    }
    return grouped;
  }, [query, allFeedGroups, subjects]);

  const totalCount = results.reduce((n, g) => n + g.cards.length, 0);

  if (!isOpen) return null;

  const BackIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7B8291" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );

  const ResultList = ({ compact }: { compact?: boolean }) => (
    <>
      {results.map(group => (
        <div key={group.subjectId}>
          <div style={{ padding: compact ? "8px 16px 4px" : "10px 20px 6px", fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: 0.8, textTransform: "uppercase" }}>
            {group.subjectName} · {group.cards.length} 条
          </div>
          {group.cards.map(({ card, date }) => (
            <button key={card.id}
              onClick={() => { setSelectedCard(card); setSelectedMeta({ subjectId: group.subjectId, date }); }}
              style={{
                display: "flex", gap: 10, alignItems: "flex-start", width: "100%", textAlign: "left",
                padding: compact ? "10px 16px" : "12px 20px",
                background: selectedCard?.id === card.id ? "#EEF2FF" : "none",
                border: "none",
                borderLeft: selectedCard?.id === card.id ? "3px solid #4D5CFF" : "3px solid transparent",
                cursor: "pointer", transition: "all 0.15s",
              }}
              onMouseEnter={e => { if (selectedCard?.id !== card.id) e.currentTarget.style.background = "#F5F6FA"; }}
              onMouseLeave={e => { if (selectedCard?.id !== card.id) e.currentTarget.style.background = "none"; }}
            >
              {card.img && (
                <img src={card.img} alt="" style={{ width: 48, height: 34, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#020418", lineHeight: 1.5, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {highlightText(card.title, query)}
                </p>
                <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>{card.time}</p>
              </div>
            </button>
          ))}
        </div>
      ))}
    </>
  );

  const handleCardUpdate = (cardId: string, updates: Partial<CardData>) => {
    if (selectedMeta) {
      onUpdateCard(selectedMeta.subjectId, selectedMeta.date, cardId, updates);
      setSelectedCard(prev => prev ? { ...prev, ...updates } : prev);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 70, background: "#F5F6FA", display: "flex", flexDirection: "column", animation: "searchSlideDown 0.18s ease-out" }}>
      <style>{`@keyframes searchSlideDown{from{transform:translateY(-16px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "#fff", borderBottom: "1px solid #EAEDF2", flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", display: "flex", alignItems: "center", borderRadius: 8 }}>
          <BackIcon />
        </button>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: "#F5F6FA", borderRadius: 12, padding: "9px 14px" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
            placeholder="搜索记忆卡片..."
            style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 15, color: "#020418" }}
          />
          {query && (
            <button onClick={() => setQuery("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex", alignItems: "center" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
        {query.trim().length >= 2 && (
          <span style={{ fontSize: 12, color: "#9CA3AF", flexShrink: 0, minWidth: 40 }}>{totalCount} 条</span>
        )}
      </div>

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {query.trim().length < 2 && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <p style={{ fontSize: 14, color: "#B0B5C0" }}>输入 2 个字以上开始搜索</p>
          </div>
        )}

        {query.trim().length >= 2 && results.length === 0 && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p style={{ fontSize: 14, color: "#B0B5C0" }}>没有找到「{query}」相关记忆</p>
          </div>
        )}

        {results.length > 0 && isWide && (
          <>
            <div style={{ width: 320, flexShrink: 0, overflowY: "auto", borderRight: "1px solid #EAEDF2", background: "#fff", padding: "8px 0" }}>
              <ResultList />
            </div>
            <div style={{ flex: 1, background: "#fff", display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {!selectedCard ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <p style={{ fontSize: 14, color: "#B0B5C0" }}>← 选择左侧记忆卡片查看详情</p>
                </div>
              ) : (
                <>
                  <div style={{ padding: "14px 20px 10px", borderBottom: "1px solid #F0F2F5", flexShrink: 0 }}>
                    <p style={{ fontSize: 15, fontWeight: 600, color: "#020418", marginBottom: 3 }}>{selectedCard.title}</p>
                    <p style={{ fontSize: 12, color: "#7B8291", margin: 0 }}>{sourceLabel(selectedCard.source)} · {selectedCard.time}</p>
                  </div>
                  <CardDetailContent
                    card={selectedCard}
                    unifiedContent={selectedCard.unifiedDetail ?? ""}
                    onUpdateCard={handleCardUpdate}
                  />
                </>
              )}
            </div>
          </>
        )}

        {results.length > 0 && !isWide && (
          <div style={{ flex: 1, overflowY: "auto", background: "#fff", paddingTop: 8 }}>
            <ResultList compact />
            {selectedCard && (
              <div style={{ position: "fixed", inset: 0, zIndex: 80, background: "#fff", display: "flex", flexDirection: "column", animation: "searchSlideDown 0.18s ease-out" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid #EAEDF2", flexShrink: 0 }}>
                  <button onClick={() => setSelectedCard(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", display: "flex", alignItems: "center", borderRadius: 8 }}>
                    <BackIcon />
                  </button>
                  <p style={{ flex: 1, fontSize: 15, fontWeight: 600, color: "#020418", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedCard.title}</p>
                </div>
                <CardDetailContent
                  card={selectedCard}
                  unifiedContent={selectedCard.unifiedDetail ?? ""}
                  onUpdateCard={handleCardUpdate}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
