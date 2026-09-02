import { useEffect, useMemo, useState } from "react";
import { BookOpen, Bookmark, Check, ChevronLeft, ChevronRight, FileText, Globe2, Headphones, Library, Map as MapIcon, Pause, Play, Podcast, Presentation, X } from "lucide-react";
import { AiConversationModule } from "../ai-conversation/AiConversationModule";

type SourceType = "电子书" | "PDF" | "课件" | "音频" | "网页";

export type LibrarySource = {
  id: string;
  type: SourceType;
  title: string;
  creator: string;
  detail: string;
  progress: number;
  lastPosition: string;
  subjectIds: string[];
  contexts: string[];
  notes: Array<{ title: string; anchor: string }>;
  tone: "indigo" | "green" | "orange" | "blue" | "rose";
};

export const SOURCE_LIBRARY_ITEMS:LibrarySource[]=[
  {id:"social-psychology",type:"电子书",title:"社会心理学",creator:"戴维·迈尔斯",detail:"第11版 · 428页",progress:46,lastPosition:"第183页 · 社会比较",subjectIds:["other"],contexts:["社会科学","冲动消费论文"],tone:"indigo",notes:[{title:"社会比较理论",anchor:"第183—186页"},{title:"向上比较与自我评价",anchor:"第190—193页"},{title:"群体规范如何影响消费",anchor:"第217页"}]},
  {id:"social-report",type:"PDF",title:"社会比较与青年消费研究报告",creator:"青年消费研究中心",detail:"研究报告 · 32页",progress:72,lastPosition:"第7页 · 变量测量",subjectIds:["other"],contexts:["社会科学","冲动消费论文"],tone:"rose",notes:[{title:"社会比较如何影响冲动消费",anchor:"第2—4页"},{title:"反向题可能造成理解偏差",anchor:"第6—7页"}]},
  {id:"math-review",type:"课件",title:"高等数学总复习用典型题目",creator:"高等数学教研室",detail:"PPTX · 28页",progress:18,lastPosition:"第3页 · 数列极限",subjectIds:["math"],contexts:["高等数学","期末备考"],tone:"orange",notes:[{title:"极限运算的基本方法",anchor:"第1页"},{title:"数列极限典型题",anchor:"第2—3页"}]},
  {id:"math-chapter-nine",type:"课件",title:"第9章复习：多元函数微分法",creator:"高等数学教研室",detail:"PPTX · 36页",progress:31,lastPosition:"第11页 · 偏导数",subjectIds:["math"],contexts:["高等数学"],tone:"indigo",notes:[{title:"多元函数的定义域",anchor:"第2—4页"},{title:"偏导数与全微分",anchor:"第9—12页"}]},
  {id:"physics-lab",type:"PDF",title:"物理实验操作与安全手册",creator:"大学物理实验中心",detail:"实验手册 · 64页",progress:38,lastPosition:"第24页 · 误差分析",subjectIds:["physics"],contexts:["大学物理","物理实验"],tone:"green",notes:[{title:"系统误差与随机误差",anchor:"第24—27页"},{title:"仪器操作安全步骤",anchor:"第8—10页"}]},
  {id:"english-audio",type:"音频",title:"Academic Listening：Argument Structure",creator:"大学英语课程组",detail:"MP3 · 18分钟",progress:63,lastPosition:"11:24 · 让步与转折",subjectIds:["english"],contexts:["大学英语","六级备考"],tone:"blue",notes:[{title:"学术听力中的转折信号",anchor:"08:42—11:24"},{title:"论证结构常用表达",anchor:"12:10—15:30"}]},
  {id:"chemistry-book",type:"电子书",title:"基础化学原理与应用",creator:"大学化学课程组",detail:"电子教材 · 312页",progress:27,lastPosition:"第84页 · 电化学",subjectIds:["chemistry"],contexts:["大学化学"],tone:"green",notes:[{title:"原电池与电解池",anchor:"第84—91页"},{title:"电极反应判断",anchor:"第92—96页"}]},
  {id:"gdp-web",type:"网页",title:"Macro Core: Measuring National Wealth",creator:"Open Economics",detail:"网页文章 · 已保存",progress:100,lastPosition:"净出口与GDP核算",subjectIds:["other"],contexts:["社会科学"],tone:"blue",notes:[{title:"净出口（NX）的概念",anchor:"GDP Accounting Identity"}]},
  {id:"unclassified-platform",type:"PDF",title:"平台算法与青年行为观察资料",creator:"临时导入",detail:"PDF · 18页",progress:0,lastPosition:"尚未开始",subjectIds:[],contexts:[],tone:"rose",notes:[]},
];

const RECENT_SOURCE_IDS=new Set(["social-psychology","math-review","physics-lab","english-audio"]);

const TYPE_ICON={电子书:BookOpen,PDF:FileText,课件:Presentation,音频:Headphones,网页:Globe2};
const TONE_STYLE={
  indigo:"bg-[#EEF0FF] text-[#4D5CFF]",
  green:"bg-[#EAF8F2] text-[#21845A]",
  orange:"bg-[#FFF4E5] text-[#B66A0A]",
  blue:"bg-[#EAF3FF] text-[#3575C7]",
  rose:"bg-[#FFF0F5] text-[#B34D72]",
};

function SourceCover({source,large=false}:{source:LibrarySource;large?:boolean}){
  const Icon=TYPE_ICON[source.type];
  return <div className={`relative flex shrink-0 flex-col justify-between overflow-hidden rounded-2xl ${TONE_STYLE[source.tone]} ${large?"h-[260px] w-[188px] p-6":"h-[154px] w-[112px] p-4"}`}>
    <span className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/40"/>
    <Icon size={large?28:20}/>
    <div><b className={`${large?"text-[19px] leading-7":"text-[11px] leading-4"} line-clamp-3 block text-[#252936]`}>{source.title}</b><small className="mt-2 block opacity-70">{source.type}</small></div>
  </div>;
}

function LegacySourceReader({source,onClose}:{source:LibrarySource;onClose:()=>void}){
  const [answer,setAnswer]=useState<string>("");
  const [saved,setSaved]=useState(false);
  const [view,setView]=useState<"阅读"|"知识地图">("阅读");
  const [podcastOpen,setPodcastOpen]=useState(false);
  const [podcastReady,setPodcastReady]=useState(false);
  const [podcastPlaying,setPodcastPlaying]=useState(false);
  const [podcastPurpose,setPodcastPurpose]=useState("理解全书");
  const [podcastDuration,setPodcastDuration]=useState("15分钟");
  const [podcastFormat,setPodcastFormat]=useState("双人讨论");
  const [podcastTopics,setPodcastTopics]=useState(["社会比较理论","向上比较与自我评价","群体规范如何影响消费"]);
  const isBook=source.type==="电子书";
  const chapters=[
    {number:"01",title:"自我与社会认知",anchor:"第1—82页",summary:"人如何理解自己，并形成对他人的判断",points:[{name:"自我概念",anchor:"第24—31页",state:"书中包含",note:""},{name:"归因与判断偏差",anchor:"第52—68页",state:"我接触过",note:""}]},
    {number:"02",title:"社会影响",anchor:"第83—166页",summary:"态度、说服与群体如何改变个体行为",points:[{name:"态度与行为",anchor:"第91—108页",state:"书中包含",note:""},{name:"从众与服从",anchor:"第132—151页",state:"我接触过",note:""}]},
    {number:"03",title:"社会比较与人际关系",anchor:"第167—238页",summary:"比较、吸引与群体规范如何影响自我评价和选择",points:[{name:"社会比较理论",anchor:"第183—186页",state:"我有笔记",note:"比较是形成自我判断的参照机制"},{name:"向上比较与自我评价",anchor:"第190—193页",state:"需要巩固",note:"差距可缩小时更可能产生激励"},{name:"群体规范如何影响消费",anchor:"第217页",state:"已用于论文",note:"社交平台让群体规范成为高频刺激"}]},
    {number:"04",title:"群体、冲突与合作",anchor:"第239—336页",summary:"群体身份如何形成偏见、冲突与合作",points:[{name:"群体极化",anchor:"第258—270页",state:"书中包含",note:""},{name:"社会困境与合作",anchor:"第304—321页",state:"书中包含",note:""}]},
    {number:"05",title:"社会心理学的应用",anchor:"第337—428页",summary:"将社会心理学用于健康、司法与可持续行为",points:[{name:"行为改变",anchor:"第356—371页",state:"书中包含",note:""},{name:"幸福感与消费",anchor:"第402—416页",state:"书中包含",note:""}]},
  ];
  const ask=(question:string)=>{
    if(view==="知识地图")return `我会从《${source.title}》的知识地图、个人笔记和原文页码回答“${question}”。当前地图包含 5 个主题区和 11 个可追溯知识点。`;
    if(/位置|来源|哪一页|依据/.test(question))return `我会依据《${source.title}》的原文位置和已形成的笔记回答。当前最相关的是“${source.notes[0]?.title??"当前阅读内容"}”${source.notes[0]?.anchor?`，来源位于${source.notes[0].anchor}`:""}。`;
    return `我已带上《${source.title}》当前阅读位置“${source.lastPosition}”。关于“${question}”，可以继续结合原文、已有笔记和使用场景讨论。`;
  };
  return <div className="fixed inset-0 z-[220] flex bg-[#EEF0F5]">
    <section className="relative flex min-w-0 flex-[1.15] flex-col border-r border-[#DDE1E9]">
      <header className="flex h-[66px] shrink-0 items-center border-b border-[#E2E5EB] bg-white px-5"><span className={`rounded-full px-3 py-1.5 text-[10px] font-semibold ${TONE_STYLE[source.tone]}`}>{source.type}</span><b className="ml-3 truncate text-[13px]">{source.title}</b>{isBook&&<div className="ml-6 flex rounded-xl bg-[#F1F2F6] p-1">{(["阅读","知识地图"] as const).map(item=><button key={item} onClick={()=>setView(item)} className={`rounded-lg px-4 py-1.5 text-[10px] font-semibold transition ${view===item?"bg-white text-[#4D5CFF] shadow-sm":"text-[#747B89]"}`}>{item}</button>)}</div>}<button onClick={()=>setSaved(x=>!x)} className={`ml-auto grid h-9 w-9 place-items-center rounded-xl ${saved?"bg-[#EEF0FF] text-[#4D5CFF]":"bg-[#F4F5F8] text-[#727986]"}`} aria-label="收藏资料"><Bookmark size={15} fill={saved?"currentColor":"none"}/></button></header>
      <div className="min-h-0 flex-1 overflow-y-auto p-7">
        {view==="知识地图"&&isBook?<div className="mx-auto w-full max-w-[820px] pb-6">
          <section className="rounded-3xl bg-white p-6 shadow-[0_8px_28px_rgba(34,40,64,.07)]"><div className="flex items-start justify-between gap-4"><div><span className="text-[10px] font-semibold text-[#4D5CFF]">知识地图</span><h1 className="mt-2 text-[22px] font-bold text-[#202432]">全书结构与我的理解</h1><p className="mt-2 text-[11px] leading-6 text-[#7D8492]">原文是骨架，笔记直接生长在对应知识点上</p></div><button onClick={()=>setPodcastOpen(true)} className="flex shrink-0 items-center gap-2 rounded-full bg-[#4D5CFF] px-4 py-2.5 text-[10px] font-semibold text-white"><Podcast size={14}/>生成播客</button></div><div className="mt-5 rounded-2xl bg-[#F6F7FB] p-5"><span className="text-[9px] font-semibold text-[#8990A0]">这本书持续回答的核心问题</span><p className="mt-2 text-[14px] font-semibold leading-7 text-[#303646]">社会环境如何塑造人的自我判断、人际关系与行为选择？</p></div>{podcastReady&&<div className="mt-4 flex items-center rounded-2xl bg-[#EEF0FF] p-4"><button onClick={()=>setPodcastPlaying(value=>!value)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#4D5CFF] text-white" aria-label={podcastPlaying?"暂停播客":"播放播客"}>{podcastPlaying?<Pause size={14}/>:<Play size={14} fill="currentColor"/>}</button><div className="ml-3 min-w-0 flex-1"><b className="block truncate text-[11px] text-[#30364A]">《社会比较如何影响消费选择》</b><span className="mt-1 block text-[9px] text-[#7E86A2]">{podcastDuration} · {podcastFormat} · {podcastTopics.length} 个知识点</span><div className="mt-2 h-1 overflow-hidden rounded-full bg-white"><i className={`block h-full rounded-full bg-[#4D5CFF] ${podcastPlaying?"w-[38%]":"w-[8%]"}`}/></div></div></div>}</section>
          <div className="scrollbar-hide mt-5 overflow-x-auto pb-3"><div className="flex min-w-[790px] items-stretch"><div className="flex w-[155px] shrink-0 items-center"><button onClick={()=>setAnswer(`这是《${source.title}》的全书主线：社会环境如何通过社会认知、社会影响、人际关系和群体过程塑造人的行为。`)} className="relative z-10 w-full rounded-2xl bg-[#4D5CFF] p-5 text-left text-white shadow-lg"><BookOpen size={18}/><b className="mt-3 block text-[13px]">{source.title}</b><span className="mt-2 block text-[9px] text-white/70">5个主题 · 11个知识点 · 3条笔记</span></button></div><div className="relative ml-10 flex-1 space-y-4 before:absolute before:bottom-[58px] before:left-0 before:top-[58px] before:w-px before:bg-[#C7CCDA] after:absolute after:left-[-40px] after:top-1/2 after:h-px after:w-10 after:bg-[#C7CCDA]">{chapters.map((chapter,index)=><section key={chapter.number} className="relative ml-8 grid grid-cols-[190px_1fr] items-center gap-3 before:absolute before:left-[-32px] before:top-1/2 before:h-px before:w-8 before:bg-[#C7CCDA]"><button onClick={()=>setAnswer(`“${chapter.title}”是《${source.title}》${chapter.anchor}的主题分支，重点回答：${chapter.summary}。`)} className={`rounded-2xl p-4 text-left shadow-[0_5px_18px_rgba(34,40,64,.06)] ${index===2?"bg-[#EEF0FF] ring-1 ring-[#B9C0FF]":"bg-white"}`}><div className="flex items-center gap-2"><span className={`grid h-7 w-7 place-items-center rounded-lg text-[9px] font-bold ${index===2?"bg-[#4D5CFF] text-white":"bg-[#EFF1F5] text-[#737A88]"}`}>{chapter.number}</span><b className="text-[11px] text-[#303644]">{chapter.title}</b></div><span className="mt-2 block text-[8px] text-[#9299A6]">{chapter.anchor}</span><p className="mt-1 text-[9px] leading-4 text-[#777F8E]">{chapter.summary}</p></button><div className="scrollbar-hide flex gap-2 overflow-x-auto py-1">{chapter.points.map(point=><button key={point.name} onClick={()=>setAnswer(`你选择了“${point.name}”，它位于《${source.title}》${point.anchor}。${point.note?`你的笔记是：“${point.note}”。`:"目前只有书中原文，还没有形成个人笔记。"}`)} className={`min-w-[175px] rounded-xl p-3 text-left transition hover:-translate-y-0.5 ${point.note?"bg-white ring-1 ring-[#D8DCFF]":"bg-[#F7F8FB]"}`}><div className="flex items-start justify-between gap-2"><b className="block text-[10px] leading-4 text-[#343A49]">{point.name}</b>{point.note&&<span className="shrink-0 rounded-full bg-[#EEF0FF] px-2 py-1 text-[7px] font-semibold text-[#4D5CFF]">笔记 1</span>}</div><span className="mt-1 block text-[8px] text-[#9198A5]">{point.anchor}</span>{point.note&&<p className="mt-2 line-clamp-2 text-[8px] leading-4 text-[#656D7D]">{point.note}</p>}<span className={`mt-2 inline-block rounded-full px-2 py-1 text-[7px] font-semibold ${point.state==="已用于论文"?"bg-[#E9F8F1] text-[#22845C]":point.state==="需要巩固"?"bg-[#FFF3E2] text-[#B46B12]":point.state==="我有笔记"?"bg-[#EEF0FF] text-[#4D5CFF]":point.state==="我接触过"?"bg-[#EAF3FF] text-[#3575C7]":"bg-[#EDEFF3] text-[#7B8290]"}`}>{point.state}</span></button>)}</div></section>)}</div></div></div>
        </div>:<div className="mx-auto w-full max-w-[660px]">
          <div className="mb-4 rounded-2xl bg-white px-5 py-4 shadow-[0_6px_22px_rgba(34,40,64,.06)]">
            <div className="flex items-center gap-3"><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><b className="truncate text-[12px]">{source.lastPosition}</b><span className="text-[9px] text-[#9298A5]">已读 {source.progress}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#ECEEF3]"><i className="block h-full rounded-full bg-[#4D5CFF]" style={{width:`${source.progress}%`}}/></div></div><span className="shrink-0 text-[9px] text-[#8D94A2]">{source.creator} · {source.detail}</span></div>
          </div>
          <div className="min-h-[620px] w-full rounded-[8px] bg-white px-14 py-12 shadow-[0_12px_45px_rgba(34,40,64,.12)]">
          {source.type==="电子书"?<><p className="text-[10px] font-semibold tracking-[.16em] text-[#9AA0AC]">{source.creator}</p><h1 className="mt-5 text-[28px] font-bold leading-10">{source.title}</h1><div className="my-8 h-px bg-[#E8EAF0]"/><p className="text-[11px] font-semibold text-[#4D5CFF]">第七章 · 社会比较与自我评价</p><h2 className="mt-3 text-[20px] font-bold">我们为什么会和他人比较</h2><p className="mt-6 text-[13px] leading-8 text-[#434956]">当缺少客观标准时，人们会通过与他人比较来判断自己的能力、观点与处境。比较对象并不是随机选择的，我们更倾向于关注与自己相似、又在某些方面具有参照意义的人。</p><p className="mt-5 rounded-xl bg-[#FFF8DD] px-4 py-3 text-[12px] leading-7 text-[#64541A]">向上比较可能带来激励，也可能放大相对剥夺感。其结果取决于个体是否认为差距可以缩小，以及比较对象是否与自我高度相关。</p><p className="mt-5 text-[13px] leading-8 text-[#434956]">在消费情境中，社交媒体持续呈现他人的生活方式和消费选择，使比较从偶发行为转变为高频刺激。</p><p className="mt-10 text-center text-[10px] text-[#A1A6B0]">— 183 —</p></>:source.type==="音频"?<><div className="flex justify-center"><SourceCover source={source} large/></div><h2 className="mt-8 text-[16px] font-bold">正在播放 · 11:24</h2><div className="mt-4 flex h-16 items-center gap-1 overflow-hidden">{Array.from({length:52},(_,i)=><i key={i} className="w-1 shrink-0 rounded-full bg-[#6F7BFF]" style={{height:`${12+(i*17)%48}px`,opacity:i<33?1:.25}}/>)}</div><p className="mt-6 rounded-xl bg-[#F7F8FB] p-4 text-[12px] leading-7 text-[#626977]">The speaker first presents the common assumption, then signals a contrast with “however”. This transition introduces the central claim of the lecture...</p></>:<><p className="text-[10px] font-semibold tracking-[.14em] text-[#8F96A4]">{source.creator}</p><h1 className="mt-4 text-[24px] font-bold leading-9">{source.title}</h1><div className={`mt-8 rounded-2xl p-6 ${TONE_STYLE[source.tone]}`}><p className="text-[11px] font-semibold">当前阅读位置</p><h2 className="mt-3 text-[20px] font-bold text-[#252936]">{source.lastPosition}</h2></div><h3 className="mt-8 text-[15px] font-bold">原始内容</h3><p className="mt-4 text-[13px] leading-8 text-[#4C5260]">这份资料保留原始章节、页码和版面位置。用户的圈选、手写和提问会锚定在当前位置，不会改变源文件本身。</p><div className="mt-6 grid grid-cols-2 gap-3">{["核心概念与适用条件","案例、公式与推导过程","容易混淆的边界","章节后的练习与问题"].map(x=><div key={x} className="rounded-xl border border-[#E5E8EF] p-4 text-[12px]">{x}</div>)}</div></>}
          </div>
        </div>}
      </div>
      {podcastOpen&&<div className="absolute inset-0 z-30 grid place-items-center bg-[#252936]/30 p-6 backdrop-blur-[2px]"><section className="w-full max-w-[520px] rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-start"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#EEF0FF] text-[#4D5CFF]"><Podcast size={18}/></span><div className="ml-3"><h2 className="text-[16px] font-bold text-[#252A38]">生成知识播客</h2><p className="mt-1 text-[9px] text-[#8A919F]">把选中的知识点和你的笔记组织成一段可听内容</p></div><button onClick={()=>setPodcastOpen(false)} className="ml-auto grid h-8 w-8 place-items-center rounded-xl bg-[#F3F4F7] text-[#7B8290]" aria-label="关闭播客设置"><X size={14}/></button></div><div className="mt-5"><b className="text-[10px] text-[#343A49]">选择内容</b><div className="mt-2 grid grid-cols-2 gap-2">{["社会比较理论","向上比较与自我评价","群体规范如何影响消费","从众与服从"].map(topic=>{const active=podcastTopics.includes(topic);return <button key={topic} onClick={()=>setPodcastTopics(current=>active?current.filter(item=>item!==topic):[...current,topic])} className={`flex items-center rounded-xl p-3 text-left text-[9px] font-semibold ${active?"bg-[#EEF0FF] text-[#4D5CFF] ring-1 ring-[#C8CEFF]":"bg-[#F6F7F9] text-[#666D7C]"}`}><span className={`mr-2 grid h-5 w-5 shrink-0 place-items-center rounded-md ${active?"bg-[#4D5CFF] text-white":"bg-white"}`}>{active&&<Check size={11}/>}</span>{topic}</button>})}</div></div><div className="mt-5 grid grid-cols-3 gap-4"><div><b className="text-[10px] text-[#343A49]">使用目的</b><div className="mt-2 space-y-1.5">{["理解全书","考前复习","论文启发"].map(item=><button key={item} onClick={()=>setPodcastPurpose(item)} className={`w-full rounded-lg px-2 py-2 text-[9px] ${podcastPurpose===item?"bg-[#EEF0FF] font-semibold text-[#4D5CFF]":"bg-[#F6F7F9] text-[#737A88]"}`}>{item}</button>)}</div></div><div><b className="text-[10px] text-[#343A49]">时长</b><div className="mt-2 space-y-1.5">{["5分钟","15分钟","30分钟"].map(item=><button key={item} onClick={()=>setPodcastDuration(item)} className={`w-full rounded-lg px-2 py-2 text-[9px] ${podcastDuration===item?"bg-[#EEF0FF] font-semibold text-[#4D5CFF]":"bg-[#F6F7F9] text-[#737A88]"}`}>{item}</button>)}</div></div><div><b className="text-[10px] text-[#343A49]">讲述方式</b><div className="mt-2 space-y-1.5">{["单人讲解","双人讨论","问答复习"].map(item=><button key={item} onClick={()=>setPodcastFormat(item)} className={`w-full rounded-lg px-2 py-2 text-[9px] ${podcastFormat===item?"bg-[#EEF0FF] font-semibold text-[#4D5CFF]":"bg-[#F6F7F9] text-[#737A88]"}`}>{item}</button>)}</div></div></div><button disabled={!podcastTopics.length} onClick={()=>{setPodcastReady(true);setPodcastOpen(false);setAnswer(`已根据“${podcastTopics.join("、")}”生成一段${podcastDuration}的${podcastFormat}播客，用于${podcastPurpose}。播放时可以随时追问某句话的原文依据。`)}} className="mt-6 w-full rounded-full bg-[#4D5CFF] py-3 text-[10px] font-semibold text-white disabled:opacity-40">生成播客</button></section></div>}
    </section>
    <aside className="min-w-[390px] flex-1 bg-white">
      <AiConversationModule contextKey={`${source.id}-${view}`} contextLabel={view==="知识地图"?`${source.title} · 知识地图`:`${source.title} · ${source.lastPosition}`} initialAssistant={view==="知识地图"?`我已带上《${source.title}》的知识地图、个人笔记和原文页码。你可以从整本书提问，也可以点击左侧节点继续深入。`:`我已带上《${source.title}》当前阅读位置和已经形成的笔记。可以直接问原文含义、来源依据或它与学习场景的关系。`} externalAssistantMessage={answer} onAsk={ask} onClose={onClose} placeholder={view==="知识地图"?"针对知识地图继续聊…":"针对这份资料继续聊…"} suggestions={view==="知识地图"?["概括全书主线","哪些笔记与论文有关？","帮我选择播客内容"]:["解释当前内容","这段形成了哪些笔记？","原文依据在哪里？"]} className="h-full rounded-none border-0"/>
    </aside>
  </div>;
}

type KnowledgePoint = { name:string; anchor:string; state:string; note:string };
type KnowledgeChapter = { number:string; title:string; anchor:string; summary:string; points:KnowledgePoint[] };

const KNOWLEDGE_CHAPTERS:KnowledgeChapter[] = [
  {number:"01",title:"自我与社会认知",anchor:"第1—82页",summary:"人如何理解自己，并形成对他人的判断",points:[{name:"自我概念",anchor:"第24—31页",state:"",note:""},{name:"归因与判断偏差",anchor:"第52—68页",state:"已读",note:""}]},
  {number:"02",title:"社会影响",anchor:"第83—166页",summary:"态度、说服与群体如何改变个体行为",points:[{name:"态度与行为",anchor:"第91—108页",state:"",note:""},{name:"从众与服从",anchor:"第132—151页",state:"已读",note:""}]},
  {number:"03",title:"社会比较与人际关系",anchor:"第167—238页",summary:"比较、吸引与群体规范如何影响自我评价和选择",points:[{name:"社会比较理论",anchor:"第183—186页",state:"有笔记",note:"比较是形成自我判断的参照机制"},{name:"向上比较与自我评价",anchor:"第190—193页",state:"需要巩固",note:"差距可缩小时更可能产生激励"},{name:"群体规范如何影响消费",anchor:"第217页",state:"用于论文",note:"社交平台让群体规范成为高频刺激"}]},
  {number:"04",title:"群体、冲突与合作",anchor:"第239—336页",summary:"群体身份如何形成偏见、冲突与合作",points:[{name:"群体极化",anchor:"第258—270页",state:"",note:""},{name:"社会困境与合作",anchor:"第304—321页",state:"",note:""}]},
  {number:"05",title:"社会心理学的应用",anchor:"第337—428页",summary:"将社会心理学用于健康、司法与可持续行为",points:[{name:"行为改变",anchor:"第356—371页",state:"",note:""},{name:"幸福感与消费",anchor:"第402—416页",state:"",note:""}]},
];

function SourceReader({source,onClose}:{source:LibrarySource;onClose:()=>void}){
  const isBook=source.type==="电子书";
  const [answer,setAnswer]=useState("");
  const [expandedChapter,setExpandedChapter]=useState(2);
  const [focusedPointName,setFocusedPointName]=useState<string|null>(()=>isBook?"社会比较理论":null);
  const [readingAnchor,setReadingAnchor]=useState(()=>isBook?"第183—186页":source.lastPosition);
  const [mapCollapsed,setMapCollapsed]=useState(false);
  const activeChapter=KNOWLEDGE_CHAPTERS[expandedChapter];
  const focusedPoint=KNOWLEDGE_CHAPTERS.flatMap(chapter=>chapter.points).find(point=>point.name===focusedPointName)??null;
  const currentTitle=focusedPoint?.name||activeChapter.title;
  const pageNumber=readingAnchor.match(/\d+/)?.[0]||"183";

  const locateChapter=(index:number)=>{setExpandedChapter(index);setFocusedPointName(null);setReadingAnchor(KNOWLEDGE_CHAPTERS[index].anchor)};
  const locatePoint=(index:number,point:{name:string;anchor:string})=>{setExpandedChapter(index);setFocusedPointName(point.name);setReadingAnchor(point.anchor)};
  const ask=(question:string)=>{
    const scope=focusedPoint?`知识点“${focusedPoint.name}”（${readingAnchor}）`:`当前章节“${activeChapter.title}”（${readingAnchor}）`;
    if(question.includes("生成播客"))return `已根据${scope}整理一段 8 分钟共读播客，重点讲清核心概念、原文例子和你的笔记关联。生成结果会保留在本次对话中，你可以继续要求缩短、改成问答形式或补充原文依据。`;
    if(question.includes("生成视频"))return `已根据${scope}生成视频讲解方案：先用原文解释概念，再用一个校园场景举例，最后回到你的笔记做总结。当前版本约 3 分钟，可继续调整讲述风格。`;
    if(question.includes("生成脑图"))return `已将${scope}整理为脑图：中心节点是“${focusedPoint?.name||activeChapter.title}”，向外连接核心定义、作用机制、原文案例和个人笔记。点击节点时可回到中间对应原文。`;
    if(question.includes("关联笔记"))return focusedPoint?.note?`当前知识点已经关联笔记：“${focusedPoint.note}”。另外发现一条可能相关的旧笔记“冲动消费中的群体影响”，可以在确认后建立关联，不会复制原内容。`:`当前内容还没有挂靠笔记。我找到两条可能相关的旧笔记，可以查看依据后确认关联，也可以直接从当前原文新建笔记。`;
    if(focusedPoint)return `关于“${question}”，我会结合《${source.title}》${readingAnchor}的原文、知识节点“${focusedPoint.name}”和你的笔记回答。你可以点击页码回到中间原文核对。`;
    if(/位置|来源|哪一页|依据/.test(question))return `当前内容来自《${source.title}》${readingAnchor}，中间原文已经定位到对应位置。`;
    return `我已带上《${source.title}》当前阅读位置“${readingAnchor}”。关于“${question}”，可以继续结合原文讨论。`;
  };

  return <div className="fixed inset-0 z-[220] flex bg-[#EEF0F5]">
    {isBook&&(mapCollapsed?<aside className="flex w-[52px] shrink-0 flex-col items-center border-r border-[#E0E3EA] bg-white py-4"><button onClick={()=>setMapCollapsed(false)} className="grid h-10 w-10 place-items-center rounded-xl bg-[#EEF0FF] text-[#4D5CFF]" aria-label="展开知识地图"><MapIcon size={17}/></button><span className="mt-3 [writing-mode:vertical-rl] text-[9px] font-semibold tracking-[.18em] text-[#8C93A2]">知识地图</span></aside>:<aside className="relative flex w-[230px] shrink-0 flex-col border-r border-[#E0E3EA] bg-white">
      <header className="flex h-[66px] shrink-0 items-center border-b border-[#ECEEF3] px-4"><span className="grid h-8 w-8 place-items-center rounded-xl bg-[#EEF0FF] text-[#4D5CFF]"><MapIcon size={15}/></span><div className="ml-2"><b className="block text-[11px]">知识地图</b><span className="text-[8px] text-[#9299A6]">5章 · 11个知识点</span></div><button onClick={()=>setMapCollapsed(true)} className="ml-auto grid h-8 w-8 place-items-center rounded-xl bg-[#F4F5F8] text-[#7A818F]" aria-label="收起知识地图"><ChevronLeft size={14}/></button></header>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="space-y-2">{KNOWLEDGE_CHAPTERS.map((chapter,index)=>{const expanded=expandedChapter===index;return <section key={chapter.number}><button onClick={()=>locateChapter(index)} className={`flex w-full items-center rounded-xl px-3 py-2.5 text-left ${expanded?"bg-[#EEF0FF] ring-1 ring-[#C5CBFF]":"bg-[#F7F8FA]"}`}><div className="min-w-0"><b className="block truncate text-[9px] text-[#343A49]">{chapter.title}</b><span className="mt-0.5 block text-[7px] text-[#969CA8]">{chapter.anchor}</span></div><ChevronRight className="ml-auto shrink-0 text-[#A0A6B2]" size={12}/></button>{expanded&&<div className="mt-2 space-y-1.5 border-l border-[#DDE1EA] pl-2">{chapter.points.map(point=>{const focused=focusedPointName===point.name;return <button key={point.name} onClick={()=>locatePoint(index,point)} className={`flex w-full items-center rounded-xl p-2 text-left ${focused?"bg-white ring-2 ring-[#AEB7FF] shadow-sm":"bg-[#F8F9FB]"}`}><b className="min-w-0 flex-1 truncate text-[8px] leading-4 text-[#343A49]">{point.name}</b>{point.note&&<span className="ml-2 shrink-0 rounded-full bg-[#EEF0FF] px-2 py-1 text-[7px] font-semibold text-[#4D5CFF]">1 条笔记</span>}</button>})}</div>}</section>})}</div>
      </div>
    </aside>)}

    <section className="relative flex min-w-[360px] flex-1 flex-col border-r border-[#DDE1E9]">
      <header className="flex h-[66px] shrink-0 items-center border-b border-[#E2E5EB] bg-white px-4">
        {isBook&&mapCollapsed&&<button onClick={()=>setMapCollapsed(false)} className="mr-3 grid h-9 w-9 place-items-center rounded-xl bg-[#EEF0FF] text-[#4D5CFF]" aria-label="展开知识地图"><MapIcon size={15}/></button>}
        <b className="truncate text-[12px]">{source.title}</b><span className="ml-3 truncate text-[8px] text-[#8D94A2]">{readingAnchor}{focusedPoint?` · ${focusedPoint.name}`:""}</span>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-5"><div className="mx-auto w-full max-w-[660px]">
        <div className="min-h-[620px] rounded-lg bg-white px-10 py-10 shadow-[0_12px_45px_rgba(34,40,64,.12)]">{isBook?<><p className="text-[9px] font-semibold tracking-[.16em] text-[#9AA0AC]">{source.creator}</p><h1 className="mt-4 text-[24px] font-bold">{source.title}</h1><div className="my-7 h-px bg-[#E8EAF0]"/><p className="text-[9px] font-semibold text-[#4D5CFF]">{activeChapter.number} · {activeChapter.title}</p><h2 className="mt-3 text-[18px] font-bold">{currentTitle}</h2><p className="mt-5 text-[12px] leading-7 text-[#434956]">当缺少客观标准时，人们会通过与他人比较来判断自己的能力、观点与处境。比较对象并不是随机选择的，我们更倾向于关注与自己相似、又具有参照意义的人。</p><p className="mt-4 rounded-xl bg-[#FFF8DD] px-4 py-3 text-[11px] leading-6 text-[#64541A]">当前知识点位于{readingAnchor}。{focusedPoint?.note||activeChapter.summary}。这段原文已与左侧知识地图和右侧AI共读上下文同步。</p><p className="mt-4 text-[12px] leading-7 text-[#434956]">在具体情境中，这种心理机制会持续影响人的判断、选择以及对自身处境的解释。你可以圈选原文，或直接向右侧AI助手追问。</p><p className="mt-9 text-center text-[9px] text-[#A1A6B0]">— {pageNumber} —</p></>:source.type==="音频"?<><div className="flex justify-center"><SourceCover source={source} large/></div><h2 className="mt-8 text-[16px] font-bold">正在播放 · 11:24</h2><div className="mt-4 flex h-16 items-center gap-1 overflow-hidden">{Array.from({length:52},(_,i)=><i key={i} className="w-1 shrink-0 rounded-full bg-[#6F7BFF]" style={{height:`${12+(i*17)%48}px`,opacity:i<33?1:.25}}/>)}</div></>:<><p className="text-[10px] font-semibold text-[#8F96A4]">{source.creator}</p><h1 className="mt-4 text-[22px] font-bold">{source.title}</h1><div className={`mt-8 rounded-2xl p-6 ${TONE_STYLE[source.tone]}`}><p className="text-[10px] font-semibold">当前阅读位置</p><h2 className="mt-3 text-[18px] font-bold">{source.lastPosition}</h2></div></>}</div>
      </div></div>
    </section>

    <aside className="relative flex w-[350px] min-w-[320px] flex-col bg-white">
      <AiConversationModule contextKey={`${source.id}-assistant`} contextLabel={`${source.title} · ${readingAnchor}${focusedPoint?` · ${focusedPoint.name}`:""}`} initialAssistant={isBook?`我会和你共读《${source.title}》。左侧地图、中间原文和这里共享同一个阅读位置；选择知识点时，我会自动跟随，但不会打断你。`:`我已带上《${source.title}》当前阅读位置和已形成的笔记。`} externalAssistantMessage={answer} onAsk={ask} onClose={onClose} placeholder="针对当前内容提问…" suggestions={["解释当前内容","原文依据在哪里？"]} actions={[{label:"播客",prompt:"为当前内容生成播客",kind:"podcast"},{label:"视频",prompt:"为当前内容生成视频",kind:"video"},{label:"脑图",prompt:"为当前内容生成脑图",kind:"mindmap"},{label:"关联笔记",prompt:"查看并关联笔记",kind:"notes"}]} className="min-h-0 flex-1 rounded-none border-0 [&>header]:h-[66px] [&>header]:py-0"/>
    </aside>

  </div>;
}

export function SourceLibraryView({subjectId,embedded=false,openSourceId,onOpened}:{subjectId?:string;embedded?:boolean;openSourceId?:string|null;onOpened?:()=>void}){
  const [filter,setFilter]=useState<"最近"|"全部"|"未归类">("最近");
  const [selected,setSelected]=useState<LibrarySource|null>(null);
  useEffect(()=>{if(!openSourceId)return;const source=SOURCE_LIBRARY_ITEMS.find(item=>item.id===openSourceId);if(source)setSelected(source);onOpened?.()},[openSourceId]);
  const sources=useMemo(()=>SOURCE_LIBRARY_ITEMS.filter(source=>{
    if(subjectId)return source.subjectIds.includes(subjectId);
    if(filter==="最近")return RECENT_SOURCE_IDS.has(source.id);
    if(filter==="未归类")return source.contexts.length===0;
    return true;
  }),[subjectId,filter]);
  const content=<>
    {!embedded&&<><h1 className="text-[28px] font-bold text-[#171A24]">资料库</h1><div className="mt-5 flex w-fit gap-1 rounded-xl bg-[#ECEEF3] p-1">{(["最近","全部","未归类"] as const).map(x=><button key={x} onClick={()=>setFilter(x)} className={`rounded-lg px-4 py-1.5 text-[10px] font-semibold ${filter===x?"bg-white text-[#4D5CFF] shadow-sm":"text-[#707784]"}`}>{x}</button>)}</div></>}
    {sources.length?<div className={`${embedded?"mt-1":"mt-6"} grid grid-cols-2 gap-4 xl:grid-cols-3`}>{sources.map(source=>{const Icon=TYPE_ICON[source.type];return <button key={source.id} onClick={()=>setSelected(source)} className="flex min-h-[190px] rounded-2xl border border-[#E4E7ED] bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-[#C8CEFF] hover:shadow-md"><SourceCover source={source}/><div className="ml-4 flex min-w-0 flex-1 flex-col"><div className="flex items-center gap-1.5 text-[9px] font-semibold text-[#7B8291]"><Icon size={12}/>{source.type}</div><h2 className="mt-2 line-clamp-2 text-[13px] font-bold leading-5">{source.title}</h2><p className="mt-1 text-[9px] text-[#9298A5]">{source.creator} · {source.detail}</p><p className={`mt-3 truncate text-[9px] ${source.contexts.length?"text-[#4D5CFF]":"text-[#B66A0A]"}`}>{source.contexts.length?source.contexts.join(" · "):"暂未关联学习场景"}</p><div className="mt-auto"><div className="h-1 overflow-hidden rounded-full bg-[#ECEEF3]"><i className="block h-full rounded-full bg-[#4D5CFF]" style={{width:`${source.progress}%`}}/></div><div className="mt-2 flex items-center text-[9px] text-[#9298A5]"><span>{source.lastPosition}</span><span className="ml-auto font-semibold text-[#4D5CFF]">{source.notes.length ? `形成 ${source.notes.length} 条笔记` : "尚未形成笔记"}</span></div></div></div></button>})}</div>:<div className={`${embedded?"mt-1":"mt-6"} rounded-2xl border border-dashed border-[#D9DDE7] bg-white py-16 text-center`}><Library className="mx-auto text-[#B1B6C1]"/><b className="mt-4 block text-[13px]">还没有符合条件的资料</b><p className="mt-1 text-[10px] text-[#9399A5]">可以切换到“全部”，或从左上角添加资料。</p></div>}
    {selected&&<SourceReader source={selected} onClose={()=>setSelected(null)}/>} 
  </>;
  return embedded?<div className="min-h-0 flex-1 overflow-y-auto px-6 pb-8 pt-2">{content}</div>:<div className="h-full overflow-y-auto px-8 py-7">{content}</div>;
}
