import { Inbox } from "lucide-react";

export function SubjectEmptyState({ title, description }: { title: string; description: string }) {
  return <div className="flex min-h-[280px] flex-1 flex-col items-center justify-center gap-3 px-8 pb-12 text-center">
    <span className="grid h-14 w-14 place-items-center rounded-full bg-[#E9EBF0] text-[#8E95A2]">
      <Inbox size={23} strokeWidth={1.8}/>
    </span>
    <p className="text-[14px] font-semibold text-[#626A78]">{title}</p>
    <p className="max-w-[390px] text-[11px] leading-6 text-[#A0A6B1]">{description}</p>
  </div>;
}
