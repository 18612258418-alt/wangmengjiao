import type { FormProfile } from "./formProfileStore";
import { getThesisContent } from "./thesisContent";

export function ThesisContentView({ profile }: { profile: FormProfile }) {
  const thesis = getThesisContent(profile);

  return (
    <article className="max-w-2xl mx-auto bg-white rounded-2xl border border-[#EAEDF2] shadow-sm overflow-hidden">
      <div className="px-8 pt-10 pb-6 text-center border-b border-[#EAEDF2]/80">
        <p className="text-[11px] text-[#9CA3AF] tracking-widest mb-4">学位论文 · 正文预览</p>
        <h1 className="text-[20px] text-[#020418] leading-snug px-2" style={{ fontWeight: 700 }}>
          {thesis.title}
        </h1>
        <div className="mt-4 space-y-1">
          {thesis.meta.map(line => (
            <p key={line} className="text-[12px] text-[#7B8291]">{line}</p>
          ))}
        </div>
      </div>

      <div className="px-8 py-6">
        <p className="text-[13px] text-[#020418] mb-2" style={{ fontWeight: 700 }}>摘要</p>
        <p className="text-[13px] text-[#41464F] leading-[1.9] mb-8 indent-[2em]">{thesis.abstract}</p>

        {thesis.sections.map(section => (
          <section key={section.heading} className="mb-6">
            <h2 className="text-[14px] text-[#020418] mb-3" style={{ fontWeight: 700 }}>
              {section.heading}
            </h2>
            {section.paragraphs.map((para, i) => (
              <p key={i} className="text-[13px] text-[#41464F] leading-[1.9] mb-3 indent-[2em]">
                {para}
              </p>
            ))}
          </section>
        ))}
      </div>
    </article>
  );
}
