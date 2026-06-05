import { imgLoadingSpinner } from "../../data/initialData";
import type { SubjectData } from "../../types";

function subjectUpdateLabel(extra?: string): string {
  if (!extra) return "暂无更新";
  const timePart = extra.split("·")[0]?.trim();
  if (!timePart) return "暂无更新";
  if (timePart.includes("创建")) return timePart;
  if (timePart.includes("更新")) return timePart;
  return `${timePart}更新`;
}

export function Sidebar({
  activeSubject,
  onSelectSubject,
  isLoading,
  subjects,
  onOpenSearch,
  onUploadFile,
  onCreateSubject,
  totalCount,
}: {
  activeSubject: string;
  onSelectSubject: (id: string) => void;
  isLoading: boolean;
  subjects: SubjectData[];
  onOpenSearch: () => void;
  onUploadFile: () => void;
  onCreateSubject?: () => void;
  totalCount: number;
}) {
  const isAllActive = activeSubject === "all";

  return (
    <aside className="flex-shrink-0 bg-[#F5F6FA] h-full flex flex-col z-10" style={{ width: "clamp(200px, 22%, 320px)" }}>
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <svg width="17" height="17" viewBox="0 0 25.3235 25.3235" fill="none">
              <path
                d="M1.92474 2.57717C1.73373 2.22387 2.22383 1.73377 2.57714 1.92477C4.70504 3.07516 8.68339 4.88398 12.6617 4.88398C16.6401 4.88398 20.6184 3.07515 22.7463 1.92474C23.0996 1.73373 23.5897 2.22383 23.3987 2.57714C22.2483 4.70504 20.4395 8.68339 20.4395 12.6617C20.4395 16.6401 22.2484 20.6185 23.3988 22.7464C23.5898 23.0997 23.0997 23.5898 22.7464 23.3988C20.6185 22.2484 16.6401 20.4395 12.6617 20.4395C8.68339 20.4395 4.70504 22.2483 2.57714 23.3988C2.22384 23.5898 1.73374 23.0997 1.92474 22.7464C3.07515 20.6185 4.88398 16.6401 4.88398 12.6617C4.88398 8.68339 3.07515 4.70506 1.92474 2.57717Z"
                stroke="url(#logo_grad)"
                strokeWidth="3.75"
              />
              <defs>
                <radialGradient id="logo_grad" cx="0" cy="0" r="1"
                  gradientTransform="translate(28.8849 2.15998) rotate(126.197) scale(27.4705)"
                  gradientUnits="userSpaceOnUse">
                  <stop stopColor="#EC6392" />
                  <stop offset="0.331731" stopColor="#FA6E68" />
                  <stop offset="0.682692" stopColor="#CB6CDA" />
                  <stop offset="0.971154" stopColor="#618AFF" />
                </radialGradient>
              </defs>
            </svg>
            <span className="text-[17px] text-[#020418]" style={{ fontWeight: 600 }}>AI记忆</span>
          </div>

          {/* Icon toolbar: upload + search */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={onUploadFile}
              className="p-2 rounded-xl hover:bg-[#EAEDF2] transition-colors"
              title="添加资料"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3D4754" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <button
              onClick={onOpenSearch}
              className="p-2 rounded-xl hover:bg-[#EAEDF2] transition-colors"
              title="搜索记忆"
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#3D4754" strokeWidth="2.2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
          </div>
        </div>

        <div
          className="transition-all duration-500"
          style={{
            maxHeight: isLoading ? "40px" : "0px",
            opacity: isLoading ? 1 : 0,
            marginTop: isLoading ? "8px" : "0px",
            marginBottom: isLoading ? "4px" : "0px",
            overflow: isLoading ? "visible" : "hidden",
          }}
        >
          <div className="px-1 py-1.5 flex items-center gap-2.5">
            <img
              src={imgLoadingSpinner}
              alt="loading"
              width={18}
              height={18}
              style={{ animation: "spin-loading 1s linear infinite", flexShrink: 0 }}
            />
            <span className="text-[13px] text-[#020418]" style={{ fontWeight: 500 }}>
              批注AI分析中...
            </span>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-6 pb-4 space-y-1.5">
        {/* 全部 entry */}
        <button
          onClick={() => onSelectSubject("all")}
          className={`w-full text-left rounded-2xl px-4 py-3 transition-all duration-200 border ${
            isAllActive
              ? "border-[#4D5CFF] bg-[#EEF0FF]"
              : "border-[#E4E7EF] bg-white hover:bg-[#F5F6FA]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[15px] ${isAllActive ? "text-[#4D5CFF]" : "text-[#020418]"}`} style={{ fontWeight: 600 }}>
              全部
            </span>
            <span className={`text-[12px] ${isAllActive ? "text-[#4D5CFF]" : "text-[#7B8291]"}`}>
              {totalCount} 条记忆
            </span>
          </div>
        </button>

        {subjects.map((s, index) => {
          const isActive = activeSubject === s.id;
          const color = ["#4D5CFF", "#10B981", "#F59E0B", "#EC4899", "#8B5CF6", "#0EA5E9"][index % 6];
          return (
            <button
              key={s.id}
              onClick={() => onSelectSubject(s.id)}
              className={`w-full text-left rounded-2xl px-4 py-3 transition-all duration-200 border ${
                isActive
                  ? "border-[#4D5CFF] bg-[#EEF0FF]"
                  : "border-[#E4E7EF] bg-white hover:bg-[#F5F6FA]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                    <span className={`text-[15px] ${isActive ? "text-[#4D5CFF]" : "text-[#020418]"}`} style={{ fontWeight: 700 }}>
                      {s.short}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#9CA3AF] truncate mt-1 ml-4">{subjectUpdateLabel(s.extra)}</p>
                </div>
                <span className={`text-[12px] ${isActive ? "text-[#4D5CFF]" : "text-[#7B8291]"} flex-shrink-0`}>
                  {s.count}
                </span>
              </div>
            </button>
          );
        })}

        <button
          onClick={onCreateSubject}
          className="w-full text-left rounded-2xl px-4 py-3 transition-all duration-200 border border-dashed border-[#C9D0E3] bg-white hover:bg-[#F5F6FA]"
        >
          <span className="text-[13px] text-[#4D5CFF]" style={{ fontWeight: 700 }}>+ 新建学科</span>
        </button>
      </nav>

      <style>{`
        @keyframes spin-loading {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </aside>
  );
}
