import { useEffect, useMemo, useState } from "react";
import { BookOpen, Bookmark, Check, ChevronLeft, ChevronRight, FileText, Globe2, Headphones, Library, Map as MapIcon, Pause, Play, Podcast, Presentation, Sparkles, X } from "lucide-react";
import { AiConversationModule } from "../ai-conversation/AiConversationModule";

export type SourceType = "电子书" | "PDF" | "课件" | "音频" | "网页" | "图片";

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
  {id:"rickshaw-boy",type:"电子书",title:"骆驼祥子",creator:"老舍",detail:"长篇小说 · 24章",progress:32,lastPosition:"第8章 · 希望再次破灭",subjectIds:["other"],contexts:["文学阅读","中国现代文学"],tone:"blue",notes:[{title:"祥子的三起三落",anchor:"第1—20章"},{title:"祥子与虎妞的关系变化",anchor:"第5—19章"},{title:"个人奋斗为何走向幻灭",anchor:"第20—24章"}]},
  {id:"math-textbook",type:"电子书",title:"高等数学（上册）",creator:"同济大学数学科学学院",detail:"第7版 · 312页",progress:34,lastPosition:"第3章 · 微分中值定理",subjectIds:["math"],contexts:["高等数学","期末复习"],tone:"orange",notes:[{title:"函数极限与连续",anchor:"第36—72页"},{title:"导数与微分",anchor:"第74—118页"},{title:"微分中值定理",anchor:"第120—156页"},{title:"不定积分与换元法",anchor:"第158—204页"}]},
  {id:"math-review",type:"课件",title:"高等数学总复习用典型题目",creator:"高等数学教研室",detail:"PPTX · 28页",progress:18,lastPosition:"第3页 · 数列极限",subjectIds:["math"],contexts:["高等数学","期末备考"],tone:"orange",notes:[{title:"极限运算的基本方法",anchor:"第1页"},{title:"数列极限典型题",anchor:"第2—3页"}]},
  {id:"math-chapter-nine",type:"课件",title:"第9章复习：多元函数微分法",creator:"高等数学教研室",detail:"PPTX · 36页",progress:31,lastPosition:"第11页 · 偏导数",subjectIds:["math"],contexts:["高等数学"],tone:"indigo",notes:[{title:"多元函数的定义域",anchor:"第2—4页"},{title:"偏导数与全微分",anchor:"第9—12页"}]},
  {id:"physics-lab",type:"PDF",title:"物理实验操作与安全手册",creator:"大学物理实验中心",detail:"实验手册 · 64页",progress:38,lastPosition:"第24页 · 误差分析",subjectIds:["physics"],contexts:["大学物理","物理实验"],tone:"green",notes:[{title:"系统误差与随机误差",anchor:"第24—27页"},{title:"仪器操作安全步骤",anchor:"第8—10页"}]},
  {id:"english-audio",type:"音频",title:"Academic Listening：Argument Structure",creator:"大学英语课程组",detail:"MP3 · 18分钟",progress:63,lastPosition:"11:24 · 让步与转折",subjectIds:["english"],contexts:["大学英语","六级备考"],tone:"blue",notes:[{title:"学术听力中的转折信号",anchor:"08:42—11:24"},{title:"论证结构常用表达",anchor:"12:10—15:30"}]},
  {id:"chemistry-book",type:"电子书",title:"基础化学原理与应用",creator:"大学化学课程组",detail:"电子教材 · 312页",progress:27,lastPosition:"第84页 · 电化学",subjectIds:["chemistry"],contexts:["大学化学"],tone:"green",notes:[{title:"原电池与电解池",anchor:"第84—91页"},{title:"电极反应判断",anchor:"第92—96页"}]},
  {id:"gdp-web",type:"网页",title:"Macro Core: Measuring National Wealth",creator:"Open Economics",detail:"网页文章 · 已保存",progress:100,lastPosition:"净出口与GDP核算",subjectIds:["other"],contexts:["社会科学"],tone:"blue",notes:[{title:"净出口（NX）的概念",anchor:"GDP Accounting Identity"}]},
  {id:"unclassified-platform",type:"PDF",title:"平台算法与青年行为观察资料",creator:"临时导入",detail:"PDF · 18页",progress:0,lastPosition:"尚未开始",subjectIds:[],contexts:[],tone:"rose",notes:[]},
];

const RECENT_SOURCE_IDS=new Set(["social-psychology","math-review","physics-lab","english-audio"]);

const TYPE_ICON={电子书:BookOpen,PDF:FileText,课件:Presentation,音频:Headphones,网页:Globe2,图片:FileText};
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

type DeepReadingDimension = {
  title:string;
  prompt:string;
  content:string;
  anchor:string;
  bullets?:string[];
};

function getHumanitiesDeepReading(source:LibrarySource):DeepReadingDimension[]{
  if(source.id==="social-psychology")return [
    {title:"核心主张",prompt:"作者到底想解决什么根本问题？",content:"人的判断和行为并不只由性格决定。自我认知、他人影响与群体情境共同塑造我们的选择；理解这些机制，才能解释人为什么会比较、从众、偏见或合作。",anchor:"第1—23页、第167—238页"},
    {title:"思维框架",prompt:"作者的底层逻辑是什么？",content:"全书沿着一条因果链展开：情境输入 → 个体解释 → 社会影响 → 行为选择 → 群体反馈。判断一个社会行为时，先看处境，再看认知，最后看关系与群体规范。",anchor:"第24—82页、第83—166页",bullets:["情境：此刻有哪些外部刺激？","解释：个体如何理解自己和他人？","影响：规范、说服和比较如何介入？","反馈：行为结果如何反过来强化认知？"]},
    {title:"可执行清单",prompt:"可以直接照做什么？",content:"把理论变成观察和判断工具，而不是只记概念。",anchor:"第183—217页",bullets:["遇到强烈情绪时，先区分事实与社会比较","做决定前，写下正在影响自己的群体规范","评价他人行为时，同时列出性格与情境解释","用一次真实观察验证理论，不只摘抄定义"]},
    {title:"场景化应用",prompt:"在真实场景里怎么用？",content:"职场中用于识别团队从众和归因偏差；研究中用于建立“平台刺激—社会比较—消费选择”的假设；个人成长中用于辨认向上比较何时带来激励、何时放大挫败。",anchor:"第190—193页、第217页",bullets:["职场：复盘一次群体意见如何改变个人判断","研究：把概念转成变量、路径和可验证问题","个人：为高频比较设置触发提醒和替代参照"]},
    {title:"关键反常识观点",prompt:"哪些洞察最容易被忽略？",content:"我们常把行为归因于一个人的性格，却低估情境；向上比较不一定使人进步，只有当差距被认为可缩小时才可能产生激励；群体规范即使没有被明说，也会持续改变选择。",anchor:"第52—68页、第190—217页"},
    {title:"一句话总结",prompt:"留下哪一句话？",content:"你以为自己在独立选择，其实情境、比较对象和群体规范一直在共同塑造答案。",anchor:"全书主线"},
  ];
  if(source.id==="social-report")return [
    {title:"核心主张",prompt:"这份报告要解决什么问题？",content:"解释社会比较如何影响青年消费，并判断这种影响能否被可靠测量，而不是把所有冲动购买都简单归因于平台。",anchor:"第2—4页"},
    {title:"思维框架",prompt:"研究逻辑是什么？",content:"平台内容暴露 → 社会比较 → 相对剥夺或身份认同 → 冲动消费；同时检验消费能力、同伴规范等变量的影响。",anchor:"第4—8页"},
    {title:"可执行清单",prompt:"可以直接照做什么？",content:"明确变量定义、检查量表反向题、先做小样本预测试，再根据理解偏差修订问卷。",anchor:"第6—12页",bullets:["标出自变量、中介变量与结果变量","访谈受试者如何理解每一道反向题","记录无效作答原因，而不只删除数据"]},
    {title:"场景化应用",prompt:"在研究中怎么使用？",content:"可直接用于毕业论文的理论模型、问卷设计和访谈提纲；也可以帮助产品团队判断消费刺激来自比较、认同还是即时奖励。",anchor:"第13—24页"},
    {title:"关键反常识观点",prompt:"最值得警惕的结论是什么？",content:"反向题不一定提高数据质量，复杂表述反而可能测量阅读理解；高相关也不等于平台刺激直接导致冲动消费。",anchor:"第6—7页、第25—28页"},
    {title:"一句话总结",prompt:"留下哪一句话？",content:"先证明你测到的是社会比较，再讨论它是否推动了冲动消费。",anchor:"第29—32页"},
  ];
  return [
    {title:"核心主张",prompt:"作者到底想解决什么根本问题？",content:`这份资料试图围绕“${source.title}”建立一个可以解释和判断现实问题的核心观点。`,anchor:source.lastPosition},
    {title:"思维框架",prompt:"作者的底层逻辑是什么？",content:"先界定问题，再拆分影响因素，随后用证据验证关系，最后说明结论的适用边界。",anchor:source.lastPosition},
    {title:"可执行清单",prompt:"可以直接照做什么？",content:"提取关键概念、记录证据、寻找反例，并把结论放入一个真实问题中验证。",anchor:source.lastPosition},
    {title:"场景化应用",prompt:"在真实场景里怎么用？",content:"可以用于课程理解、研究选题与个人判断；具体应用应同时标明目标、情境和限制条件。",anchor:source.lastPosition},
    {title:"关键反常识观点",prompt:"哪些洞察最容易被忽略？",content:"最值得保留的不是熟悉的结论，而是与直觉冲突、且有证据支持的判断。",anchor:source.lastPosition},
    {title:"一句话总结",prompt:"留下哪一句话？",content:`理解《${source.title}》，不是记住全部内容，而是能够调用它解释一个真实问题。`,anchor:source.lastPosition},
  ];
}

type LiteraryDimension = {
  title:string;
  subtitle:string;
  content:string;
  anchor:string;
  items?:string[];
};

function getLiteraryReading(source:LibrarySource):LiteraryDimension[]{
  return [
    {title:"故事脉络",subtitle:"人物经历了什么变化？",content:"祥子带着靠劳动获得独立生活的信念来到北平。他反复买车、失车、重新积攒，却在战争、剥削与关系困境中逐步失去生活的主动权。",anchor:"第1—24章",items:["第一次买车：个人奋斗带来希望","被抓与失车：外部秩序打断计划","再次攒钱：信念仍在维持","婚姻与生活重压：选择空间持续缩小","最终转变：从要强走向麻木"]},
    {title:"人物与关系",subtitle:"谁在推动人物改变？",content:"人物关系不是静态名单，而是一组不断变化的力量。虎妞既提供现实资源，也改变祥子的生活路径；小福子代表另一种情感可能，但贫困使这种可能无法兑现。",anchor:"第5—22章",items:["祥子 ↔ 虎妞：依赖、抗拒与共同生活","祥子 ↔ 小福子：理解、希望与错失","祥子 ↔ 孙侦探：权力对个人积累的掠夺"]},
    {title:"人物弧光",subtitle:"祥子为什么变成后来的人？",content:"他的变化不是一次选择造成的，而是理想不断被现实击碎后形成的累积结果。阅读时要同时观察个人性格、制度环境与每次关键选择。",anchor:"第1章、第18—24章",items:["起点：相信勤劳可以换来自主","转折：多次努力无法形成稳定结果","终点：不再相信努力与尊严的关系"]},
    {title:"主题网络",subtitle:"作品持续讨论哪些问题？",content:"作品将个人奋斗、城市贫困、尊严、婚姻与社会结构连在一起。它追问的不是“祥子够不够努力”，而是个人努力在怎样的环境中才有可能成立。",anchor:"全书",items:["个人奋斗与社会结构","劳动、尊严与生存","城市空间与阶层差异","希望如何被逐步消耗"]},
    {title:"叙事与语言",subtitle:"作品是怎么让读者感受到这些变化的？",content:"老舍通过北京口语、身体细节、天气和街道空间，把抽象的社会压力变成可感知的生活经验。前后语言节奏的变化也对应祥子精神状态的转变。",anchor:"第1—3章、第23—24章",items:["口语化叙事让人物贴近日常生活","烈日、暴雨等环境放大身体困境","前后行为和语言形成强烈对照"]},
    {title:"我的阅读",subtitle:"我如何理解，而不是接受标准答案？",content:"你可以保留对人物的判断、困惑和情绪变化。AI会把它们关联到具体章节，并在后续阅读中提示你的观点是否发生变化。",anchor:source.lastPosition,items:["我目前如何评价祥子？","哪一次转折最改变我的判断？","如果只归因于个人性格，会遗漏什么？"]},
  ];
}

const KNOWLEDGE_CHAPTERS:KnowledgeChapter[] = [
  {number:"01",title:"自我与社会认知",anchor:"第1—82页",summary:"人如何理解自己，并形成对他人的判断",points:[{name:"自我概念",anchor:"第24—31页",state:"",note:""},{name:"归因与判断偏差",anchor:"第52—68页",state:"已读",note:""}]},
  {number:"02",title:"社会影响",anchor:"第83—166页",summary:"态度、说服与群体如何改变个体行为",points:[{name:"态度与行为",anchor:"第91—108页",state:"",note:""},{name:"从众与服从",anchor:"第132—151页",state:"已读",note:""}]},
  {number:"03",title:"社会比较与人际关系",anchor:"第167—238页",summary:"比较、吸引与群体规范如何影响自我评价和选择",points:[{name:"社会比较理论",anchor:"第183—186页",state:"有笔记",note:"比较是形成自我判断的参照机制"},{name:"向上比较与自我评价",anchor:"第190—193页",state:"需要巩固",note:"差距可缩小时更可能产生激励"},{name:"群体规范如何影响消费",anchor:"第217页",state:"用于论文",note:"社交平台让群体规范成为高频刺激"}]},
  {number:"04",title:"群体、冲突与合作",anchor:"第239—336页",summary:"群体身份如何形成偏见、冲突与合作",points:[{name:"群体极化",anchor:"第258—270页",state:"",note:""},{name:"社会困境与合作",anchor:"第304—321页",state:"",note:""}]},
  {number:"05",title:"社会心理学的应用",anchor:"第337—428页",summary:"将社会心理学用于健康、司法与可持续行为",points:[{name:"行为改变",anchor:"第356—371页",state:"",note:""},{name:"幸福感与消费",anchor:"第402—416页",state:"",note:""}]},
];

const MATH_KNOWLEDGE_CHAPTERS:KnowledgeChapter[] = [
  {number:"01",title:"函数与极限",anchor:"第1—72页",summary:"建立后续微积分所需的函数、极限与连续性基础",points:[{name:"函数极限与连续",anchor:"第36—72页",state:"已掌握",note:"极限运算稳定，分段函数连续性仍需检查左右极限"}]},
  {number:"02",title:"导数与微分",anchor:"第74—118页",summary:"用局部变化率描述函数变化，并建立微分近似",points:[{name:"导数与微分",anchor:"第74—118页",state:"需复习",note:"复合函数求导是后续换元积分的关键前置"}]},
  {number:"03",title:"微分中值定理",anchor:"第120—156页",summary:"连接局部导数与区间整体性质",points:[{name:"微分中值定理",anchor:"第120—156页",state:"学习中",note:"定理条件容易遗漏，需要先判断连续与可导"}]},
  {number:"04",title:"不定积分",anchor:"第158—204页",summary:"从导数反向寻找原函数，并掌握换元和分部积分",points:[{name:"不定积分与换元法",anchor:"第158—204页",state:"3道错题",note:"第二类换元与换元后边界处理仍不稳定"}]},
  {number:"05",title:"定积分及其应用",anchor:"第206—312页",summary:"用极限累积思想解决面积、体积与变化总量",points:[{name:"定积分与几何应用",anchor:"第206—312页",state:"未学习",note:""}]},
];

const LITERARY_CHAPTERS:KnowledgeChapter[] = [
  {number:"01",title:"带着希望进入北平",anchor:"第1—4章",summary:"祥子相信依靠体力和节制可以获得独立生活",points:[{name:"第一次买车",anchor:"第1章",state:"已读",note:"劳动与尊严在这里紧密相连"}]},
  {number:"02",title:"第一次失去",anchor:"第2—4章",summary:"战争和失序打断个人积累",points:[{name:"车被抢走",anchor:"第2章",state:"已读",note:"个人计划第一次被外部力量彻底改变"}]},
  {number:"03",title:"重新积攒与关系纠缠",anchor:"第5—12章",summary:"祥子重新攒钱，同时进入与虎妞的复杂关系",points:[{name:"希望再次破灭",anchor:"第8章",state:"阅读中",note:"孙侦探夺走积蓄，使努力与结果再次断裂"},{name:"祥子与虎妞",anchor:"第5—12章",state:"有笔记",note:"资源依赖与情感抗拒同时存在"}]},
  {number:"04",title:"生活重压",anchor:"第13—20章",summary:"婚姻、贫困和失去不断压缩人物的选择",points:[{name:"虎妞之死",anchor:"第19章",state:"未读",note:""}]},
  {number:"05",title:"走向幻灭",anchor:"第21—24章",summary:"希望最终消失，人物的行为与价值发生根本变化",points:[{name:"祥子的最终转变",anchor:"第24章",state:"未读",note:""}]},
];

type MathLearningContent = {
  goal:string;
  prerequisite:string;
  next:string;
  understanding:string[];
  decision:string[];
  exercises:Array<{label:string;detail:string;state:string}>;
  mastery:Array<{label:string;value:string;tone:"good"|"warn"|"neutral"}>;
};

function getMathLearningContent(pointName:string):MathLearningContent{
  if(pointName.includes("极限"))return {goal:"能够判断极限类型，并选择等价无穷小、夹逼或洛必达法完成计算。",prerequisite:"函数性质 · 基本初等函数",next:"连续性 · 导数定义",understanding:["极限描述的是趋近过程，不是简单代入","左右极限相等时函数极限才存在","等价替换需要检查使用位置和运算结构"],decision:["先尝试直接代入，确认未定式类型","含标准小量结构时考虑等价无穷小","有界量与趋零量乘积优先考虑夹逼","满足条件的 0/0 或 ∞/∞ 型再用洛必达法"],exercises:[{label:"教材例题",detail:"看懂两种典型极限的标准过程",state:"已完成"},{label:"典型题",detail:"独立完成 4 道不同未定式",state:"2/4"},{label:"变式检测",detail:"判断一次方法选择是否稳定",state:"待完成"}],mastery:[{label:"概念理解",value:"稳定",tone:"good"},{label:"方法选择",value:"基本掌握",tone:"good"},{label:"等价替换边界",value:"需要加强",tone:"warn"},{label:"延迟复测",value:"3天后",tone:"neutral"}]};
  if(pointName.includes("导数")||pointName.includes("微分"))return {goal:"理解导数的变化率含义，并稳定完成复合函数、隐函数与参数方程求导。",prerequisite:"函数极限与连续",next:"中值定理 · 不定积分",understanding:["导数是函数在一点附近的瞬时变化率","可导一定连续，但连续不一定可导","微分表达函数的局部线性近似"],decision:["先识别函数由哪些层复合而成","逐层应用链式法则并保留中间变量","隐函数求导时两边同时对 x 求导","最后检查定义域与不可导点"],exercises:[{label:"教材例题",detail:"复合函数求导标准过程",state:"已完成"},{label:"典型题",detail:"独立完成隐函数求导",state:"待完成"},{label:"变式检测",detail:"结合图像判断可导性",state:"待完成"}],mastery:[{label:"概念理解",value:"稳定",tone:"good"},{label:"复合函数求导",value:"需复习",tone:"warn"},{label:"隐函数求导",value:"尚未验证",tone:"neutral"},{label:"延迟复测",value:"明天",tone:"neutral"}]};
  if(pointName.includes("中值"))return {goal:"能够根据题目目标选择罗尔、拉格朗日或柯西中值定理，并完整检查条件。",prerequisite:"连续性 · 导数与微分",next:"单调性、极值与曲线分析",understanding:["中值定理把区间整体变化与某一点的导数连接起来","三个定理的差异主要在结论形式和附加条件","使用前必须先验证闭区间连续、开区间可导"],decision:["证明零点或导数为零时先考虑罗尔定理","连接函数增量与导数时考虑拉格朗日定理","涉及两个函数增量之比时考虑柯西定理","结论形式不匹配时尝试构造辅助函数"],exercises:[{label:"教材例题",detail:"辨认三个定理的使用条件",state:"已完成"},{label:"典型题",detail:"构造辅助函数证明等式",state:"1/3"},{label:"变式检测",detail:"不提示定理名称完成证明",state:"待完成"}],mastery:[{label:"定理条件",value:"容易遗漏",tone:"warn"},{label:"定理选择",value:"学习中",tone:"neutral"},{label:"辅助函数",value:"尚未掌握",tone:"warn"},{label:"延迟复测",value:"今晚",tone:"neutral"}]};
  return {goal:"能够识别积分结构，选择换元或分部积分，并完成边界与结果检查。",prerequisite:"复合函数求导 · 基本积分公式",next:"定积分 · 面积与体积",understanding:["不定积分寻找的是一族原函数","换元法本质上是链式法则的逆用","定积分换元时变量与上下限必须同步变化"],decision:["出现内层函数及其导数时优先第一类换元","根式或三角结构明显时考虑第二类换元","乘积中一部分求导后更简单时考虑分部积分","定积分完成换元后立即同步修改上下限"],exercises:[{label:"教材例题",detail:"看懂第一、第二类换元的标准过程",state:"已完成"},{label:"个人错题",detail:"重做换元后上下限未同步的题",state:"1道"},{label:"变式检测",detail:"独立选择方法完成 3 道题",state:"待完成"}],mastery:[{label:"概念理解",value:"稳定",tone:"good"},{label:"方法识别",value:"基本掌握",tone:"good"},{label:"边界条件",value:"容易出错",tone:"warn"},{label:"延迟复测",value:"明天",tone:"neutral"}]};
}

function SourceReader({source,onClose}:{source:LibrarySource;onClose:()=>void}){
  const isBook=source.type==="电子书";
  const isMathBook=source.id==="math-textbook";
  const isLiteraryBook=source.id==="rickshaw-boy";
  const bookChapters=isMathBook?MATH_KNOWLEDGE_CHAPTERS:isLiteraryBook?LITERARY_CHAPTERS:KNOWLEDGE_CHAPTERS;
  const initialMathPoint=isMathBook?bookChapters.flatMap(chapter=>chapter.points).find(point=>source.lastPosition.includes(point.name)||source.lastPosition.includes(point.anchor))??bookChapters[2].points[0]:null;
  const initialLiteraryPoint=isLiteraryBook?bookChapters.flatMap(chapter=>chapter.points).find(point=>source.lastPosition.includes(point.name)||source.lastPosition.includes(point.anchor))??bookChapters[2].points[0]:null;
  const initialBookPoint=initialMathPoint??initialLiteraryPoint;
  const initialMathChapter=(isMathBook||isLiteraryBook)?Math.max(0,bookChapters.findIndex(chapter=>chapter.points.some(point=>point.name===initialBookPoint?.name))):2;
  const [answer,setAnswer]=useState("");
  const [expandedChapter,setExpandedChapter]=useState(initialMathChapter);
  const [focusedPointName,setFocusedPointName]=useState<string|null>(()=>isMathBook?initialMathPoint?.name??"微分中值定理":isLiteraryBook?initialLiteraryPoint?.name??"希望再次破灭":isBook?"社会比较理论":null);
  const [readingAnchor,setReadingAnchor]=useState(()=>isMathBook?initialMathPoint?.anchor??"第120—156页":isLiteraryBook?initialLiteraryPoint?.anchor??"第8章":isBook?"第183—186页":source.lastPosition);
  const [mapCollapsed,setMapCollapsed]=useState(false);
  const activeChapter=bookChapters[expandedChapter];
  const focusedPoint=bookChapters.flatMap(chapter=>chapter.points).find(point=>point.name===focusedPointName)??null;
  const currentTitle=focusedPoint?.name||activeChapter.title;
  const pageNumber=readingAnchor.match(/\d+/)?.[0]||"183";

  const locateChapter=(index:number)=>{setExpandedChapter(index);setFocusedPointName(null);setReadingAnchor(bookChapters[index].anchor)};
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
    {isBook&&(mapCollapsed?<aside className="flex w-[52px] shrink-0 flex-col items-center border-r border-[#E0E3EA] bg-white py-4"><button onClick={()=>setMapCollapsed(false)} className="grid h-10 w-10 place-items-center rounded-xl bg-[#EEF0FF] text-[#4D5CFF]" aria-label={isLiteraryBook?"展开作品地图":"展开知识地图"}><MapIcon size={17}/></button><span className="mt-3 [writing-mode:vertical-rl] text-[9px] font-semibold tracking-[.18em] text-[#8C93A2]">{isLiteraryBook?"作品地图":"知识地图"}</span></aside>:<aside className="relative flex w-[230px] shrink-0 flex-col border-r border-[#E0E3EA] bg-white">
      <header className="flex h-[66px] shrink-0 items-center border-b border-[#ECEEF3] px-4"><span className="grid h-8 w-8 place-items-center rounded-xl bg-[#EEF0FF] text-[#4D5CFF]"><MapIcon size={15}/></span><div className="ml-2"><b className="block text-[11px]">{isLiteraryBook?"作品地图":"知识地图"}</b><span className="text-[8px] text-[#9299A6]">{isLiteraryBook?"5个阶段 · 人物与主题":"5章 · 11个知识点"}</span></div><button onClick={()=>setMapCollapsed(true)} className="ml-auto grid h-8 w-8 place-items-center rounded-xl bg-[#F4F5F8] text-[#7A818F]" aria-label={isLiteraryBook?"收起作品地图":"收起知识地图"}><ChevronLeft size={14}/></button></header>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="space-y-2">{bookChapters.map((chapter,index)=>{const expanded=expandedChapter===index;return <section key={chapter.number}><button onClick={()=>locateChapter(index)} className={`flex w-full items-center rounded-xl px-3 py-2.5 text-left ${expanded?"bg-[#EEF0FF] ring-1 ring-[#C5CBFF]":"bg-[#F7F8FA]"}`}><div className="min-w-0"><b className="block truncate text-[9px] text-[#343A49]">{chapter.title}</b><span className="mt-0.5 block text-[7px] text-[#969CA8]">{chapter.anchor}</span></div><ChevronRight className="ml-auto shrink-0 text-[#A0A6B2]" size={12}/></button>{expanded&&<div className="mt-2 space-y-1.5 border-l border-[#DDE1EA] pl-2">{chapter.points.map(point=>{const focused=focusedPointName===point.name;return <button key={point.name} onClick={()=>locatePoint(index,point)} className={`flex w-full items-center rounded-xl p-2 text-left ${focused?"bg-white ring-2 ring-[#AEB7FF] shadow-sm":"bg-[#F8F9FB]"}`}><b className="min-w-0 flex-1 truncate text-[8px] leading-4 text-[#343A49]">{point.name}</b>{point.note&&<span className="ml-2 shrink-0 rounded-full bg-[#EEF0FF] px-2 py-1 text-[7px] font-semibold text-[#4D5CFF]">1 条笔记</span>}</button>})}</div>}</section>})}</div>
      </div>
    </aside>)}

    <section className="relative flex min-w-[360px] flex-1 flex-col border-r border-[#DDE1E9]">
      <header className="flex h-[66px] shrink-0 items-center border-b border-[#E2E5EB] bg-white px-4">
        {isBook&&mapCollapsed&&<button onClick={()=>setMapCollapsed(false)} className="mr-3 grid h-9 w-9 place-items-center rounded-xl bg-[#EEF0FF] text-[#4D5CFF]" aria-label="展开知识地图"><MapIcon size={15}/></button>}
        <b className="truncate text-[12px]">{source.title}</b><span className="ml-3 truncate text-[8px] text-[#8D94A2]">{readingAnchor}{focusedPoint?` · ${focusedPoint.name}`:""}</span>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-5"><div className="mx-auto w-full max-w-[660px]">
        <div className="min-h-[620px] rounded-lg bg-white px-10 py-10 shadow-[0_12px_45px_rgba(34,40,64,.12)]">{isBook?<><p className="text-[9px] font-semibold tracking-[.16em] text-[#9AA0AC]">{source.creator}</p><h1 className="mt-4 text-[24px] font-bold">{source.title}</h1><div className="my-7 h-px bg-[#E8EAF0]"/><p className="text-[9px] font-semibold text-[#4D5CFF]">{activeChapter.number} · {activeChapter.title}</p><h2 className="mt-3 text-[18px] font-bold">{currentTitle}</h2><p className="mt-5 text-[12px] leading-7 text-[#434956]">{isMathBook?"微分中值定理把函数在区间上的整体变化，与区间内某一点的导数联系起来。应用定理前，需要先检查函数在闭区间上连续、在开区间内可导。":isLiteraryBook?"祥子仍然相信，只要肯卖力气、肯节省，生活就能够被自己一点点攥在手里。可这一次，他辛苦积攒的钱又被夺走了，努力与结果之间的联系再次断裂。":"当缺少客观标准时，人们会通过与他人比较来判断自己的能力、观点与处境。比较对象并不是随机选择的，我们更倾向于关注与自己相似、又具有参照意义的人。"}</p><p className="mt-4 rounded-xl bg-[#FFF8DD] px-4 py-3 text-[11px] leading-6 text-[#64541A]">当前内容位于{readingAnchor}。{focusedPoint?.note||activeChapter.summary}。这段原文已与左侧{isLiteraryBook?"作品地图":"知识地图"}和右侧AI共读上下文同步。</p><p className="mt-4 text-[12px] leading-7 text-[#434956]">{isMathBook?"如果题目要求证明区间内存在某一点满足导数等式，应先观察目标式，再选择罗尔、拉格朗日或柯西中值定理。你可以直接圈题、手写推导，或向右侧AI助手追问。":isLiteraryBook?"这一转折不只是一次财产损失，也在改变祥子对努力、尊严和城市生活的理解。你可以圈选人物动作或环境描写，让AI与你一起判断人物变化。":"在具体情境中，这种心理机制会持续影响人的判断、选择以及对自身处境的解释。你可以圈选原文，或直接向右侧AI助手追问。"}</p><p className="mt-9 text-center text-[9px] text-[#A1A6B0]">— {pageNumber} —</p></>:source.type==="音频"?<><div className="flex justify-center"><SourceCover source={source} large/></div><h2 className="mt-8 text-[16px] font-bold">正在播放 · 11:24</h2><div className="mt-4 flex h-16 items-center gap-1 overflow-hidden">{Array.from({length:52},(_,i)=><i key={i} className="w-1 shrink-0 rounded-full bg-[#6F7BFF]" style={{height:`${12+(i*17)%48}px`,opacity:i<33?1:.25}}/>)}</div></>:<><p className="text-[10px] font-semibold text-[#8F96A4]">{source.creator}</p><h1 className="mt-4 text-[22px] font-bold">{source.title}</h1><div className={`mt-8 rounded-2xl p-6 ${TONE_STYLE[source.tone]}`}><p className="text-[10px] font-semibold">当前阅读位置</p><h2 className="mt-3 text-[18px] font-bold">{source.lastPosition}</h2></div></>}</div>
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
  const [activeOutlineSourceId,setActiveOutlineSourceId]=useState<string|null>(null);
  const [activeOutlineNoteTitle,setActiveOutlineNoteTitle]=useState<string|null>(null);
  const [importedSources,setImportedSources]=useState<LibrarySource[]>([]);
  useEffect(()=>{
    const syncImportedSources=()=>{
      try{
        const stored=JSON.parse(localStorage.getItem("memo_imported_sources")||"[]") as LibrarySource[];
        setImportedSources(Array.isArray(stored)?stored:[]);
      }catch{
        setImportedSources([]);
      }
    };
    syncImportedSources();
    window.addEventListener("memo:sources-updated",syncImportedSources);
    return()=>window.removeEventListener("memo:sources-updated",syncImportedSources);
  },[]);
  const allSources=useMemo(()=>[...importedSources,...SOURCE_LIBRARY_ITEMS],[importedSources]);
  useEffect(()=>{if(!openSourceId)return;const source=allSources.find(item=>item.id===openSourceId);if(source)setSelected(source);onOpened?.()},[openSourceId,allSources,onOpened]);
  const sources=useMemo(()=>allSources.filter(source=>{
    if(subjectId)return source.subjectIds.includes(subjectId);
    if(filter==="最近")return source.id.startsWith("imported_")||RECENT_SOURCE_IDS.has(source.id);
    if(filter==="未归类")return source.contexts.length===0;
    return true;
  }),[allSources,subjectId,filter]);
  const activeOutlineSource=sources.find(source=>source.id===activeOutlineSourceId)??sources[0]??null;
  const outlineNotes=activeOutlineSource?.notes.length?activeOutlineSource.notes:[{title:activeOutlineSource?.lastPosition??"当前内容",anchor:"最近阅读位置"}];
  const humanitiesDeepReading=activeOutlineSource&&subjectId==="other"?getHumanitiesDeepReading(activeOutlineSource):null;
  const literaryReading=activeOutlineSource?.id==="rickshaw-boy"?getLiteraryReading(activeOutlineSource):null;
  const activeMathPoint=subjectId==="math"?(outlineNotes.find(note=>note.title===activeOutlineNoteTitle)??outlineNotes[0]):null;
  const mathLearningContent=activeMathPoint?getMathLearningContent(activeMathPoint.title):null;
  const openActiveOriginal=()=>{
    if(!activeOutlineSource)return;
    setSelected(activeMathPoint?{...activeOutlineSource,lastPosition:`${activeMathPoint.anchor} · ${activeMathPoint.title}`}:activeOutlineSource);
  };

  if(embedded){
    return <div className="min-h-0 flex-1 overflow-hidden px-6 pb-8 pt-2">
      {sources.length?<div className="grid h-full min-h-0 grid-cols-[280px_1fr] overflow-hidden rounded-3xl bg-white shadow-[0_8px_30px_rgba(33,40,70,.05)]">
        <aside className="min-h-0 overflow-y-auto border-r border-[#E6E8EF] p-5">
          <div className="space-y-3">{sources.map(source=><section key={source.id}>
            <button onClick={()=>{setActiveOutlineSourceId(source.id);setActiveOutlineNoteTitle(null)}} className={`flex w-full items-center rounded-xl px-3 py-3 text-left ${activeOutlineSource?.id===source.id?"bg-[#EEF0FF] text-[#4D5CFF]":"bg-[#F7F8FA] text-[#4E5563]"}`}><BookOpen size={13} className="mr-2 shrink-0"/><b className="min-w-0 flex-1 truncate text-[10px]">{source.title}</b><ChevronRight size={12}/></button>
            {activeOutlineSource?.id===source.id&&<div className="ml-4 mt-2 space-y-1.5 border-l border-[#DDE1EA] pl-3">{outlineNotes.map((note,index)=>{const active=subjectId==="math"?(activeOutlineNoteTitle?activeOutlineNoteTitle===note.title:index===0):false;return <button key={`${source.id}-${note.title}`} onClick={()=>setActiveOutlineNoteTitle(note.title)} className={`w-full rounded-lg px-2 py-2 text-left ${active?"bg-white text-[#4D5CFF] shadow-sm":"hover:bg-[#F5F6FA]"}`}><b className="block text-[9px] leading-4">{note.title}</b>{subjectId==="math"&&<span className="mt-1 block text-[7px] text-[#9AA1AE]">{note.anchor}</span>}</button>})}</div>}
          </section>)}</div>
        </aside>
        <main className="min-h-0 overflow-y-auto bg-[#F6F7FA] p-6">
          <div className="mx-auto max-w-[760px]"><div className="flex items-center"><div className="flex min-w-0 items-center gap-2"><Sparkles size={17} className="shrink-0 text-[#4D5CFF]"/><h2 className="truncate text-[16px] font-bold text-[#252A37]">{literaryReading?"作品地图":subjectId==="math"?"学习地图":"AI 精读摘要"}</h2></div><button onClick={openActiveOriginal} className="ml-auto flex shrink-0 items-center rounded-full bg-[#EEF0FF] px-4 py-2 text-[9px] font-semibold text-[#4D5CFF]"><FileText size={12} className="mr-1.5"/>查看原文</button></div>
          {activeOutlineSource&&literaryReading?<><p className="mt-2 text-[10px] text-[#8C93A1]">{activeOutlineSource.title} · 跟随阅读位置理解人物、关系与主题</p><div className="mt-5 grid grid-cols-2 gap-3">{literaryReading.map((dimension,index)=><article key={dimension.title} className={`rounded-2xl bg-white p-5 shadow-[0_5px_18px_rgba(34,40,64,.04)] ${index===0?"col-span-2":""}`}><div className="flex items-start"><div><span className="text-[8px] font-semibold text-[#4D5CFF]">{dimension.subtitle}</span><h3 className="mt-1 text-[13px] font-bold text-[#303541]">{dimension.title}</h3></div><button onClick={()=>setSelected({...activeOutlineSource,lastPosition:`${dimension.anchor} · ${dimension.title}`})} className="ml-auto shrink-0 text-[9px] font-semibold text-[#4D5CFF]">回到作品 →</button></div><p className="mt-3 text-[10px] leading-6 text-[#5F6878]">{dimension.content}</p>{dimension.items&&<div className="mt-3 space-y-2">{dimension.items.map(item=><p key={item} className="flex rounded-xl bg-[#F7F8FA] px-3 py-2 text-[9px] leading-5 text-[#687181]"><span className="mr-2 mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[#6D78FF]"/>{item}</p>)}</div>}<p className="mt-3 border-t border-[#EEF0F4] pt-3 text-[8px] text-[#9AA1AE]">对应：{dimension.anchor}</p></article>)}</div></>:activeOutlineSource&&mathLearningContent&&activeMathPoint?<><p className="mt-2 text-[10px] text-[#8C93A1]">{activeOutlineSource.title} · {activeMathPoint.anchor}</p><section className="mt-5 rounded-2xl bg-white p-5 shadow-[0_5px_18px_rgba(34,40,64,.04)]"><div className="flex items-start"><div><span className="text-[8px] font-semibold text-[#4D5CFF]">当前知识点</span><h3 className="mt-1 text-[18px] font-bold text-[#252A37]">{activeMathPoint.title}</h3><p className="mt-2 text-[10px] leading-6 text-[#667080]">{mathLearningContent.goal}</p></div><button onClick={()=>setSelected({...activeOutlineSource,lastPosition:`${activeMathPoint.anchor} · ${activeMathPoint.title}`})} className="ml-auto shrink-0 rounded-full bg-[#EEF0FF] px-4 py-2 text-[9px] font-semibold text-[#4D5CFF]">查看原文</button></div><div className="mt-4 flex items-center gap-2 text-[8px]"><span className="rounded-full bg-[#F3F4F7] px-3 py-1.5 text-[#717887]">前置：{mathLearningContent.prerequisite}</span><span className="text-[#B0B5BF]">→</span><span className="rounded-full bg-[#FFF4E5] px-3 py-1.5 text-[#A76512]">当前：{activeMathPoint.title}</span><span className="text-[#B0B5BF]">→</span><span className="rounded-full bg-[#F3F4F7] px-3 py-1.5 text-[#717887]">后续：{mathLearningContent.next}</span></div></section><div className="mt-3 grid grid-cols-2 gap-3"><article className="rounded-2xl bg-white p-5"><h3 className="text-[12px] font-bold text-[#303541]">先理解</h3><div className="mt-3 space-y-2">{mathLearningContent.understanding.map(item=><p key={item} className="flex text-[9px] leading-5 text-[#687181]"><span className="mr-2 mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[#6D78FF]"/>{item}</p>)}</div></article><article className="rounded-2xl bg-white p-5"><h3 className="text-[12px] font-bold text-[#303541]">会选择方法</h3><div className="mt-3 space-y-2">{mathLearningContent.decision.map((item,index)=><p key={item} className="flex text-[9px] leading-5 text-[#687181]"><span className="mr-2 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[#EEF0FF] text-[7px] font-bold text-[#4D5CFF]">{index+1}</span>{item}</p>)}</div></article><article className="rounded-2xl bg-white p-5"><h3 className="text-[12px] font-bold text-[#303541]">用题目掌握</h3><div className="mt-3 space-y-2">{mathLearningContent.exercises.map(item=><button key={item.label} className="flex w-full items-center rounded-xl bg-[#F7F8FA] p-3 text-left"><div><b className="block text-[9px] text-[#3D4350]">{item.label}</b><span className="mt-1 block text-[8px] text-[#858C99]">{item.detail}</span></div><span className="ml-auto rounded-full bg-white px-2 py-1 text-[7px] font-semibold text-[#4D5CFF]">{item.state}</span></button>)}</div></article><article className="rounded-2xl bg-white p-5"><h3 className="text-[12px] font-bold text-[#303541]">我的掌握</h3><div className="mt-3 space-y-2">{mathLearningContent.mastery.map(item=><div key={item.label} className="flex items-center rounded-xl bg-[#F7F8FA] px-3 py-2.5"><span className="text-[9px] text-[#656D7C]">{item.label}</span><span className={`ml-auto rounded-full px-2 py-1 text-[7px] font-semibold ${item.tone==="good"?"bg-[#EAF8F2] text-[#21845A]":item.tone==="warn"?"bg-[#FFF3E2] text-[#B46B12]":"bg-[#ECEEF3] text-[#717887]"}`}>{item.value}</span></div>)}</div></article></div></>:activeOutlineSource&&humanitiesDeepReading?<><p className="mt-2 text-[10px] text-[#8C93A1]">{activeOutlineSource.title} · 从主张、方法到应用，形成一份可调用的整书理解</p><div className="mt-5 grid grid-cols-2 gap-3">{humanitiesDeepReading.map((dimension,index)=><article key={dimension.title} className={`rounded-2xl bg-white p-5 shadow-[0_5px_18px_rgba(34,40,64,.04)] ${index===5?"col-span-2 bg-[#EEF0FF]":""}`}><div className="flex items-start gap-3"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-[10px] font-bold ${index===5?"bg-[#4D5CFF] text-white":"bg-[#EEF0FF] text-[#4D5CFF]"}`}>{index+1}</span><div className="min-w-0 flex-1"><h3 className="text-[13px] font-bold text-[#303541]">{dimension.title}</h3><p className="mt-1 text-[8px] text-[#9AA1AE]">{dimension.prompt}</p></div></div><p className="mt-4 text-[10px] leading-6 text-[#5F6878]">{dimension.content}</p>{dimension.bullets&&<ul className="mt-3 space-y-2">{dimension.bullets.map(item=><li key={item} className="flex text-[9px] leading-5 text-[#687181]"><span className="mr-2 mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[#6D78FF]"/>{item}</li>)}</ul>}<div className="mt-4 flex items-center border-t border-[#EEF0F4] pt-3"><span className="truncate text-[8px] text-[#9AA1AE]">依据：{dimension.anchor}</span><button onClick={()=>setSelected(activeOutlineSource)} className="ml-auto shrink-0 text-[9px] font-semibold text-[#4D5CFF]">查看原文 →</button></div></article>)}</div></>:activeOutlineSource&&<><p className="mt-2 text-[10px] text-[#8C93A1]">{activeOutlineSource.title} · 已整理 {outlineNotes.length} 个重点</p><div className="mt-5 space-y-3">{outlineNotes.map((note,index)=><article key={note.title} className="rounded-2xl bg-white p-5 shadow-[0_5px_18px_rgba(34,40,64,.04)]"><div className="flex items-start gap-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#EEF0FF] text-[10px] font-bold text-[#4D5CFF]">{String(index+1).padStart(2,"0")}</span><div className="min-w-0 flex-1"><h3 className="text-[13px] font-bold text-[#303541]">{note.title}</h3><p className="mt-2 text-[10px] leading-6 text-[#667080]">{index===0?`这一部分建立了“${note.title}”的核心概念、适用条件和判断边界，是理解后续内容的基础。`:`这一部分把“${note.title}”与前面的核心概念连接起来，并通过例子说明它在具体问题中的使用方式。`}</p><p className="mt-2 text-[8px] text-[#9AA1AE]">原文位置：{note.anchor}</p></div><button onClick={()=>setSelected(activeOutlineSource)} className="shrink-0 rounded-full bg-[#EEF0FF] px-4 py-2 text-[9px] font-semibold text-[#4D5CFF]">查看原文</button></div></article>)}</div></>}
          </div>
        </main>
      </div>:<div className="grid h-full place-items-center rounded-3xl bg-white"><div className="text-center"><Library className="mx-auto text-[#B1B6C1]"/><b className="mt-4 block text-[13px]">还没有课程资料</b></div></div>}
      {selected&&<SourceReader source={selected} onClose={()=>setSelected(null)}/>}
    </div>;
  }
  const content=<>
    {!embedded&&<><h1 className="text-[28px] font-bold text-[#171A24]">资料库</h1><div className="mt-5 flex w-fit gap-1 rounded-xl bg-[#ECEEF3] p-1">{(["最近","全部","未归类"] as const).map(x=><button key={x} onClick={()=>setFilter(x)} className={`rounded-lg px-4 py-1.5 text-[10px] font-semibold ${filter===x?"bg-white text-[#4D5CFF] shadow-sm":"text-[#707784]"}`}>{x}</button>)}</div></>}
    {sources.length?<div className={`${embedded?"mt-1":"mt-6"} grid grid-cols-2 gap-4 xl:grid-cols-3`}>{sources.map(source=>{const Icon=TYPE_ICON[source.type];return <button key={source.id} onClick={()=>setSelected(source)} className="flex min-h-[190px] rounded-2xl border border-[#E4E7ED] bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-[#C8CEFF] hover:shadow-md"><SourceCover source={source}/><div className="ml-4 flex min-w-0 flex-1 flex-col"><div className="flex items-center gap-1.5 text-[9px] font-semibold text-[#7B8291]"><Icon size={12}/>{source.type}</div><h2 className="mt-2 line-clamp-2 text-[13px] font-bold leading-5">{source.title}</h2><p className="mt-1 text-[9px] text-[#9298A5]">{source.creator} · {source.detail}</p><p className={`mt-3 truncate text-[9px] ${source.contexts.length?"text-[#4D5CFF]":"text-[#B66A0A]"}`}>{source.contexts.length?source.contexts.join(" · "):"暂未关联学习场景"}</p><div className="mt-auto"><div className="h-1 overflow-hidden rounded-full bg-[#ECEEF3]"><i className="block h-full rounded-full bg-[#4D5CFF]" style={{width:`${source.progress}%`}}/></div><div className="mt-2 flex items-center text-[9px] text-[#9298A5]"><span>{source.lastPosition}</span><span className="ml-auto font-semibold text-[#4D5CFF]">{source.notes.length ? `形成 ${source.notes.length} 条笔记` : "尚未形成笔记"}</span></div></div></div></button>})}</div>:<div className={`${embedded?"mt-1":"mt-6"} rounded-2xl border border-dashed border-[#D9DDE7] bg-white py-16 text-center`}><Library className="mx-auto text-[#B1B6C1]"/><b className="mt-4 block text-[13px]">还没有符合条件的资料</b><p className="mt-1 text-[10px] text-[#9399A5]">可以切换到“全部”，或从左上角添加资料。</p></div>}
    {selected&&<SourceReader source={selected} onClose={()=>setSelected(null)}/>} 
  </>;
  return <div className="h-full overflow-y-auto px-8 py-7">{content}</div>;
}
