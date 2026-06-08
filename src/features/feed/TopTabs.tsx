export type TopTabId = "notes" | "homework" | "exam";

const TABS: Array<{ id: TopTabId; label: string }> = [
  { id: "notes", label: "笔记" },
  { id: "homework", label: "作业" },
  { id: "exam", label: "备考" },
];

export function TopTabs({
  activeTab,
  onChangeTab,
}: {
  activeTab: TopTabId;
  onChangeTab: (id: TopTabId) => void;
}) {
  return (
    <div className="flex items-center px-6 pt-3 pb-3 flex-shrink-0">
      <div
        className="inline-flex items-center bg-white rounded-2xl border border-[#EAEDF2] p-1"
        style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}
      >
        {TABS.map(tab => {
          const active = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className="px-5 py-1.5 rounded-xl text-[13px] transition-all duration-150"
              style={{
                background: active ? "#4D5CFF" : "transparent",
                color: active ? "#fff" : "#41464F",
                fontWeight: active ? 600 : 500,
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
