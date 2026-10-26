export function FlyThumbnail({ phase, imgSrc }: { phase: "idle" | "center" | "corner" | "fading"; imgSrc: string }) {
  if (phase === "idle") return null;

  const isCorner = phase === "corner" || phase === "fading";

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 800 }}>
      <div
        style={{
          position: "fixed",
          transition: "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
          opacity: phase === "fading" ? 0 : 1,
          ...(isCorner
            ? {
              left: "60px",
              bottom: "60px",
              width: "18vw",
              minWidth: "160px",
              maxWidth: "260px",
              height: "auto",
            }
            : {
              left: "50%",
              bottom: "50%",
              width: "320px",
              height: "200px",
              transform: "translate(-50%, 50%)",
            }),
        }}
      >
        <div className="relative w-full rounded-xl overflow-hidden shadow-2xl border-2 border-white">
          <img src={imgSrc} alt="thumb" className="w-full h-auto block" />
        </div>

        {isCorner && phase !== "fading" && (
          <div
            className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-[#111218] text-white rounded-full whitespace-nowrap shadow-xl"
            style={{ animation: "fadeInUp 0.3s ease-out", padding: "6px 14px 6px 9px" }}
          >
            <svg width="14" height="14" viewBox="0 0 25.3235 25.3235" fill="none" style={{ flexShrink: 0 }}>
              <path
                d="M1.92474 2.57717C1.73373 2.22387 2.22383 1.73377 2.57714 1.92477C4.70504 3.07516 8.68339 4.88398 12.6617 4.88398C16.6401 4.88398 20.6184 3.07515 22.7463 1.92474C23.0996 1.73373 23.5897 2.22383 23.3987 2.57714C22.2483 4.70504 20.4395 8.68339 20.4395 12.6617C20.4395 16.6401 22.2484 20.6185 23.3988 22.7464C23.5898 23.0997 23.0997 23.5898 22.7464 23.3988C20.6185 22.2484 16.6401 20.4395 12.6617 20.4395C8.68339 20.4395 4.70504 22.2483 2.57714 23.3988C2.22384 23.5898 1.73374 23.0997 1.92474 22.7464C3.07515 20.6185 4.88398 16.6401 4.88398 12.6617C4.88398 8.68339 3.07515 4.70506 1.92474 2.57717Z"
                stroke="url(#toast_grad)"
                strokeWidth="3.75"
              />
              <defs>
                <linearGradient id="toast_grad" x1="2" y1="2" x2="23" y2="23" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#EC6392" />
                  <stop offset="0.5" stopColor="#CB6CDA" />
                  <stop offset="1" stopColor="#618AFF" />
                </linearGradient>
              </defs>
            </svg>
            <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.01em" }}>已保存到记忆，</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: "#618AFF" }}>可查看</span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translate(-50%, 6px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
}
