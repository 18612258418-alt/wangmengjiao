import type { HardPointSection } from "../../types";
import { MathParagraph } from "../../shared/MathContent";

export function HardPointBlock({ sections }: { sections: HardPointSection[] }) {
  return (
    <div className="bg-white border border-[#EAEDF2] rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-5 rounded-full bg-[#FB7185]" />
        <h3 className="text-[15px] text-[#BE123C]" style={{ fontWeight: 700 }}>难点讲解</h3>
      </div>
      <div className="flex flex-col gap-3">
        {sections.map((section, index) => (
          <div key={`${section.title}-${index}`} className="rounded-xl bg-[#F8FAFB] border border-[#EAEDF2] p-3">
            <p className="text-[13px] text-[#020418] mb-1" style={{ fontWeight: 700 }}>{section.title}</p>
            <MathParagraph text={section.content} className="text-[13px]" />
          </div>
        ))}
      </div>
    </div>
  );
}
