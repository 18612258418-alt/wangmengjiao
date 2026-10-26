import { ArrowRight, BookOpen, Database, FileText, FlaskConical, Layers3, Microscope, Sparkles } from "lucide-react";

export function ResearchHome({onOpen}:{onOpen:(title:string)=>void}){
  const initialProjects = [
    ["短视频平台与大学生冲动消费","学位论文课题","开题中 · 35%","10月12日完成开题",FlaskConical],
    ["社会比较与青年消费行为","文献综述","整理中 · 18篇文献","本周完成理论框架",BookOpen],
    ["大学生短视频使用预测试","调查研究","数据收集中 · 24/30","还差6份有效问卷",Microscope],
    ["推荐算法暴露与购买决策","自主研究","构思中","已发现3个研究问题",Layers3],
    ["青年数字媒介使用数据库","数据项目","建设中 · 120条记录","本周新增18条",Database],
  ];
  const projects = initialProjects;
  return <div className="h-full overflow-y-auto px-8 py-7"><p className="text-[11px] font-bold tracking-[.12em] text-[#8C93A3]">研究工作台</p><div className="mt-2 flex items-end"><div><h1 className="text-[28px] font-bold">研究</h1><p className="mt-1 text-[13px] text-[#7B8291]">AI 从持续积累的资料、问题与判断中识别研究脉络，并自动挂靠到已有课题。</p></div></div>
    <section className="mt-7 rounded-2xl border border-[#DDE1FF] bg-gradient-to-r from-[#F5F6FF] to-white p-5"><div className="flex items-center"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#4D5CFF] text-white"><Layers3 size={19}/></span><div className="ml-3"><small className="text-[#7B8291]">研究方向</small><h2 className="text-[16px] font-bold">数字媒介与青年消费</h2></div><div className="ml-auto text-right"><b className="text-[13px] text-[#4D5CFF]">5 个课题 · 3 项成果</b><p className="text-[10px] text-[#9CA3AF]">持续积累 26 条相关知识</p></div></div></section>
    <div className="mt-6 flex items-center"><h2 className="text-[15px] font-bold">正在研究 · {projects.length}</h2></div><div className="mt-3 grid grid-cols-2 gap-3">{projects.map(x=>{const Icon=x[4] as typeof BookOpen;const title=x[0] as string;return <button key={title} onClick={()=>onOpen(title)} className="rounded-2xl border border-[#E7EAF0] bg-white p-5 text-left transition hover:border-[#BEC5FF] hover:shadow-sm"><div className="flex items-start"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#EEF0FF] text-[#4D5CFF]"><Icon size={18}/></span><span className="ml-auto rounded-full bg-[#F4F5F8] px-2 py-1 text-[10px] text-[#7B8291]">{x[1] as string}</span></div><b className="mt-4 block text-[14px]">{title}</b><p className="mt-1 text-[11px] text-[#4D5CFF]">{x[2] as string}</p><div className="mt-4 flex items-center border-t border-[#F0F1F5] pt-3"><small className="text-[#8A909C]">下一步：{x[3] as string}</small><ArrowRight size={14} className="ml-auto text-[#4D5CFF]"/></div></button>})}</div>
    <div className="mt-7 flex items-center"><h2 className="text-[15px] font-bold">近期产出</h2></div><div className="mt-3 grid grid-cols-3 gap-3">{[["学位论文","撰写准备"],["开题报告","编辑中 · 35%"],["调查问卷","初稿 · 待预测试"]].map(x=><div key={x[0]} className="rounded-2xl border border-[#E7EAF0] bg-white p-4"><FileText size={17} className="text-[#4D5CFF]"/><b className="mt-3 block text-[13px]">{x[0]}</b><p className="mt-1 text-[10px] text-[#8A909C]">{x[1]}</p></div>)}</div>
    <section className="mt-7 rounded-2xl border border-[#DDE1FF] bg-[#F8F9FF] p-5"><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[#4D5CFF]"><Sparkles size={17}/></span><div><h2 className="text-[14px] font-bold">研究会从记忆中生长</h2><p className="mt-1 text-[11px] leading-5 text-[#6F7685]">通过左上角统一入口添加论文、报告、网页、语音或对话。AI 会优先关联已有研究；只有当多条记忆形成新的稳定问题簇时，才会邀请你确认是否作为独立研究持续跟踪。</p><div className="mt-3 flex flex-wrap gap-2">{["自动挂靠已有研究","无法确定时再询问","新研究需要你确认"].map(x=><span key={x} className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-[#4D5CFF]">{x}</span>)}</div></div></div></section>
    <div className="mt-7"><h2 className="text-[15px] font-bold">跨阶段延展样例</h2><p className="mt-1 text-[11px] text-[#8A909C]">研究记忆同时连接课程训练、学术协作、考核与成果，不把硕博过程缩减成写论文。</p></div><div className="mt-3 grid grid-cols-2 gap-3">{[["硕士阶段","推荐机制、社会比较与消费决策","文献矩阵 · 方法课训练 · 每周组会","课程论文、开题、助研任务与学位论文共享 31 条知识"],["博士阶段","平台化消费的长期追踪研究","第二轮数据 · 资格考核 · 论文返修","导师反馈、同行评议、会议报告与教学经历进入同一证据链"]].map(x=><div key={x[0]} className="rounded-2xl border border-[#E7EAF0] bg-white p-4"><span className="rounded-full bg-[#F1F3FF] px-2 py-1 text-[10px] font-semibold text-[#4D5CFF]">{x[0]}</span><b className="mt-3 block text-[13px]">{x[1]}</b><p className="mt-1 text-[11px] text-[#626977]">{x[2]}</p><p className="mt-3 text-[10px] text-[#9CA3AF]">{x[3]}</p></div>)}</div>
  </div>;
}

export function ResearchWorkspace({children}:{children:React.ReactNode;onAddSource:()=>void}){
  return <div className="flex min-h-0 flex-1 flex-col">{children}</div>;
}
