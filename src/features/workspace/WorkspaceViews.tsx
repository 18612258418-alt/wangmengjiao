import { useState } from "react";
import { Archive, BookOpen, BrainCircuit, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Database, FileText, Inbox, Library, Link2, MapPin, MessageSquareText, Mic, Sparkles, Target, X } from "lucide-react";
import type { FeedGroup, SubjectData } from "../../types";

const Card = ({children,className=""}:{children:React.ReactNode;className?:string}) => <section className={`rounded-2xl border border-[#E7EAF0] bg-white ${className}`}>{children}</section>;
const Header = ({icon,title,action,onAction}:{icon:React.ReactNode;title:string;action?:string;onAction?:()=>void}) => <div className="flex items-center gap-2 text-[#4D5CFF]">{icon}<h2 className="text-[14px] font-bold text-[#252936]">{title}</h2>{action&&<button onClick={onAction} className="ml-auto text-[11px] font-semibold text-[#4D5CFF]">{action}</button>}</div>;
const Page = ({eyebrow,title,subtitle,action,children}:{eyebrow:string;title:string;subtitle:string;action?:React.ReactNode;children:React.ReactNode}) => <div className="h-full overflow-y-auto px-8 py-7"><p className="text-[11px] font-bold tracking-[.12em] text-[#8C93A3]">{eyebrow}</p><div className={`mt-2 flex items-center ${action?"max-w-[900px]":""}`}><h1 className="text-[28px] font-bold text-[#171A24]">{title}</h1>{action&&<div className="ml-auto">{action}</div>}</div>{subtitle&&<p className="mb-7 mt-1 text-[13px] text-[#7B8291]">{subtitle}</p>}{!subtitle&&<div className="mb-7"/>}{children}</div>;

export function TodayView({onTask,onClassSession,onPractice,onProject,onGoals,memorySuggestion}:{onTask:(task:"physics-lab"|"english-review"|"physics-preview"|"math-homework")=>void;onClassSession:(subjectId:string,title:string)=>void;onPractice:()=>void;onProject:()=>void;onGoals:()=>void;memorySuggestion?:string|null}) {
  const [feedbackTask,setFeedbackTask]=useState<string|null>(null);
  const [completedIds,setCompletedIds]=useState<Set<string>>(()=>new Set());
  const [showCompleted,setShowCompleted]=useState(false);
  const [showSemester,setShowSemester]=useState(false);
  const [week,setWeek]=useState(6);
  const todayLabel=new Intl.DateTimeFormat("zh-CN",{year:"numeric",month:"long",day:"numeric",weekday:"long"}).format(new Date());
  const currentHour=new Date().getHours();
  const timeline = [
    {
      id:"math-exam",subjectId:"math",sort:"13:00",time:"今天下午",end:"建议安排 · 35分钟",title:"开始准备下周的高数结课考试",type:"复习",timing:"recommended",dueHour:17,
      action:"先做6道诊断题，再根据结果生成7天复习安排。",
      reason:"课表显示下周二结课考试；最近两次作业中，定积分边界题是主要失分点。",
      open:onPractice,
    },
    {
      id:"physics-lab",subjectId:"physics",sort:"18:00",time:"明天10:00前",end:"课前完成 · 15分钟",title:"预习明天的“误差测量”物理实验",type:"预习",timing:"before",dueHour:24,
      action:"看8分钟操作视频，记住仪器调零和安全步骤。",
      reason:"明天的实验步骤较多；老师在课件中明确要求提前看完操作演示。",
      open:()=>onTask("physics-lab"),
    },
    {
      id:"english",subjectId:"english",sort:"19:00",time:"通勤或晚饭后",end:"建议安排 · 12分钟",title:"听懂明天英语课要用的论证结构",type:"复习",timing:"recommended",dueHour:21,
      action:"听一遍8分钟课程音频，记下转折信号和两个高频表达。",
      reason:"明天的学术听说课会直接使用这段材料；上次课堂记录中“论证转折”仍未掌握。",
      open:()=>onTask("english-review"),
    },
    {
      id:"math-homework",subjectId:"math",sort:"22:00",time:"今天22:00前",end:"截止时间 · 10分钟",title:"提交定积分作业前检查边界条件",type:"作业",timing:"deadline",dueHour:22,
      action:"完成第3题，检查积分区间、换元边界和最终单位后提交。",
      reason:"作业今晚22:00截止；上一次同类题错误来自换元后没有同步修改上下限。",
      open:()=>onTask("math-homework"),
    },
    ...(memorySuggestion?[{
      id:"personal",subjectId:"personal",sort:"23:59",time:"今天内",end:"你安排的事",title:memorySuggestion,type:"个人",timing:"personal",dueHour:24,
      action:"继续上次的内容，不需要重新寻找入口。",reason:"这是你主动加入今天的安排。",open:memorySuggestion.includes("理论")?onProject:onGoals,
    }]:[]),
  ].sort((a,b)=>a.sort.localeCompare(b.sort));
  const finish=(id:string,title:string)=>{setCompletedIds(prev=>new Set(prev).add(id));setFeedbackTask(title);};
  const activeItems=timeline.filter(x=>!completedIds.has(x.id));
  const timedItems=activeItems.filter(x=>x.timing==="deadline"||x.timing==="before").sort((a,b)=>a.timing==="deadline"?-1:b.timing==="deadline"?1:a.sort.localeCompare(b.sort));
  const suggestedItems=activeItems.filter(x=>x.timing!=="deadline"&&x.timing!=="before");
  const completedItems=timeline.filter(x=>completedIds.has(x.id));
  const renderTask=(x:typeof timeline[number],done=false)=>{
    const passed=!done&&x.dueHour<=currentHour;
    const overdue=passed&&x.timing==="deadline";
    const hasFixedTime=x.timing==="deadline"||x.timing==="before";
    const groupLabelStyle=hasFixedTime?"bg-[rgba(124,58,237,0.8)] text-white":"bg-[rgba(37,99,235,0.8)] text-white";
    const groupBarStyle=hasFixedTime?"bg-[rgba(124,58,237,0.8)]":"bg-[rgba(37,99,235,0.8)]";
    const timeClass="bg-[#EEF6FF] text-[#4D78A5]";
    const duration=x.end.split("·").at(-1)?.trim();
    const timeText=done?"已完成":`${x.time} · ${duration}`;
    return <div key={x.id} className={`relative overflow-hidden rounded-2xl py-4 pl-6 pr-4 transition ${done?"bg-[#F4F5F7] opacity-55 grayscale":"bg-[#F6F9FF] hover:bg-[#F1F6FF]"}`}><span className={`absolute bottom-4 left-2 top-4 w-1 rounded-full ${groupBarStyle}`}/>
      <button onClick={x.open} className="block w-full text-left">
        <div className="flex items-start gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-2"><span className={`shrink-0 rounded-full px-2 py-0.5 text-[8px] font-semibold ${groupLabelStyle}`}>{x.type}</span><b className={`${done?"line-through":""} text-[13px] leading-5 text-[#252936]`}>{x.title}</b></div>
          <div className="flex shrink-0 items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[9px] font-semibold ${timeClass}`}>{timeText}</span>{overdue&&<span className="rounded-full bg-[#FFE2BD] px-2.5 py-1 text-[9px] font-semibold text-[#9B5707]">已逾期 · 仍未完成</span>}</div>
        </div>
        <p className="mt-2 text-[10px] leading-5 text-[#535A67]">{x.action}</p>
      </button>
      <div className="mt-2 flex items-end gap-4">
        <button onClick={x.open} className="flex min-w-0 flex-1 items-start gap-1.5 text-left text-[#A9BDDA]"><BrainCircuit size={12} className="mt-1 shrink-0"/><p className="line-clamp-1 text-[9px] leading-5">{x.reason}</p></button>
        {!done&&<button onClick={()=>finish(x.id,x.title)} className="min-w-[72px] shrink-0 rounded-full bg-[#E9ECFF] px-6 py-2 text-[10px] font-semibold text-[#4D5CFF] hover:bg-[#DEE3FF]">完成</button>}
      </div>
    </div>;
  };
  return <Page eyebrow={todayLabel} title={`晓雨，今天有 ${activeItems.length} 件事`} subtitle="" action={<button onClick={()=>setShowSemester(true)} className="rounded-full bg-[#EEF2FF] px-4 py-2 text-[11px] font-semibold text-[#4D5CFF] hover:bg-[#E4E9FF]">查看学期课表</button>}><div className="max-w-[900px]">
    <Card className="p-5">
      <section><div className="mb-3 flex items-end"><div><h3 className="text-[13px] font-bold text-[#252936]">有明确时间 · {timedItems.length}</h3><p className="mt-1 text-[9px] text-[#969CA8]">先做有时间要求的事</p></div></div><div className="space-y-3">{timedItems.map(x=>renderTask(x))}</div></section>
      <section className="mt-7"><div className="mb-3 flex items-end"><div><h3 className="text-[13px] font-bold text-[#252936]">建议今天推进 · {suggestedItems.length}</h3><p className="mt-1 text-[9px] text-[#969CA8]">今天有空时可以做</p></div></div><div className="space-y-3">{suggestedItems.map(x=>renderTask(x))}</div></section>
      {completedItems.length>0&&<section className="mt-6 border-t border-[#EEF0F4] pt-4"><button onClick={()=>setShowCompleted(!showCompleted)} className="flex w-full items-center text-left text-[11px] font-semibold text-[#7B8291]"><CheckCircle2 size={14} className="mr-2 text-[#22A06B]"/>今天已完成 · {completedItems.length}<ChevronRight size={14} className={`ml-auto transition ${showCompleted?"rotate-90":""}`}/></button>{showCompleted&&<div className="mt-3 space-y-2">{completedItems.map(x=>renderTask(x,true))}</div>}</section>}
    </Card>
    {feedbackTask&&<div className="fixed inset-0 z-[190] grid place-items-center bg-black/20" onClick={()=>setFeedbackTask(null)}><Card className="w-[420px] p-6" ><h2 className="text-[18px] font-bold">完成得怎么样？</h2><p className="mt-2 text-[12px] text-[#7B8291]">{feedbackTask}</p><div className="mt-5 grid grid-cols-2 gap-2">{["顺利完成","有点困难","没有帮助","计划变了"].map(x=><button key={x} onClick={()=>setFeedbackTask(null)} className="rounded-xl bg-[#F5F6FA] px-3 py-3 text-[11px] hover:bg-[#EEF0FF]">{x}</button>)}</div></Card></div>}
    {showSemester&&<SemesterSchedule week={week} onWeek={setWeek} onClose={()=>setShowSemester(false)} onOpen={(id,title)=>{setShowSemester(false);onClassSession(id,title)}}/>}
  </div></Page>;
}

function SemesterSchedule({week,onWeek,onClose,onOpen}:{week:number;onWeek:(week:number)=>void;onClose:()=>void;onOpen:(subjectId:string,title:string)=>void}) {
  type ScheduleItem = {
    day:number; time:string; end:string; title:string; place:string; subjectId:string;
    start:number; finish:number; tone:"indigo"|"blue"|"green"|"orange"|"violet"|"rose";
  };
  const days=["星期一","星期二","星期三","星期四","星期五"];
  const slots=[
    {time:"08:00",end:"09:40"},
    {time:"10:00",end:"11:40"},
    {time:"14:00",end:"15:40"},
    {time:"16:00",end:"17:40"},
  ];
  const items:ScheduleItem[]=[
    {day:0,time:"08:00",end:"09:40",title:"高等数学B(2)",place:"教4A501",subjectId:"math",start:1,finish:16,tone:"indigo"},
    {day:0,time:"10:00",end:"11:40",title:"电路分析基础",place:"教1楼05阶梯",subjectId:"other",start:1,finish:14,tone:"orange"},
    {day:0,time:"14:00",end:"15:40",title:"线性代数",place:"教3A305",subjectId:"math",start:1,finish:12,tone:"violet"},
    {day:1,time:"08:00",end:"09:40",title:"习近平新时代中国特色社会主义思想概论",place:"教3A309",subjectId:"other",start:1,finish:16,tone:"rose"},
    {day:1,time:"16:00",end:"17:40",title:"大学物理(1)",place:"主楼C102",subjectId:"physics",start:1,finish:14,tone:"green"},
    {day:2,time:"08:00",end:"09:40",title:"高等数学B(2)",place:"教4A501",subjectId:"math",start:1,finish:16,tone:"indigo"},
    {day:2,time:"10:00",end:"11:40",title:"电路分析基础",place:"教1楼05阶梯",subjectId:"other",start:1,finish:14,tone:"orange"},
    {day:2,time:"14:00",end:"15:40",title:"学术英语",place:week<=8?"教1楼313":"主楼G422",subjectId:"english",start:1,finish:16,tone:"blue"},
    {day:2,time:"16:00",end:"17:40",title:"线性代数",place:"教3A305",subjectId:"math",start:1,finish:12,tone:"violet"},
    {day:3,time:"10:00",end:"11:40",title:"体育(2)",place:"主楼礼堂排练厅",subjectId:"other",start:1,finish:15,tone:"blue"},
    {day:3,time:"14:00",end:"15:40",title:"形势与政策(2)",place:"教2楼报告厅",subjectId:"other",start:1,finish:4,tone:"rose"},
    {day:3,time:"14:00",end:"15:40",title:"电路实验",place:"教5B113",subjectId:"other",start:11,finish:14,tone:"orange"},
    {day:3,time:"16:00",end:"17:40",title:"大学物理(1)",place:"主楼C102",subjectId:"physics",start:1,finish:14,tone:"green"},
    {day:4,time:"08:00",end:"09:40",title:"高等数学B(2)",place:"教4A501",subjectId:"math",start:1,finish:16,tone:"indigo"},
    {day:4,time:"10:00",end:"11:40",title:"物理实验(1)",place:"物理4",subjectId:"physics",start:3,finish:13,tone:"green"},
    {day:4,time:"14:00",end:"15:40",title:"学术英语",place:week<=8?"教1楼313":"主楼G422",subjectId:"english",start:1,finish:16,tone:"blue"},
  ];
  const visible=items.filter(x=>week>=x.start&&week<=x.finish);
  const currentDayIndex=(()=>{const day=new Date().getDay()-1;return day>=0&&day<5?day:-1;})();
  const toneStyle={
    indigo:"border-[#CDD2FF] bg-[#F1F3FF] text-[#3948D8]",
    blue:"border-[#CDE4FF] bg-[#EEF6FF] text-[#2769A9]",
    green:"border-[#C7EBDD] bg-[#EEF9F5] text-[#187558]",
    orange:"border-[#F7D9AD] bg-[#FFF7EA] text-[#A85E08]",
    violet:"border-[#E0D3FF] bg-[#F7F2FF] text-[#7041B5]",
    rose:"border-[#F3D1DB] bg-[#FFF3F6] text-[#A94D69]",
  };
  const courseAt=(day:number,time:string)=>visible.find(x=>x.day===day&&x.time===time);
  const previousWeek=()=>onWeek(Math.max(1,week-1));
  const nextWeek=()=>onWeek(Math.min(16,week+1));
  return <div className="fixed inset-0 z-[205] bg-[#F3F5F9] p-5" onClick={onClose}>
    <div className="mx-auto flex h-full max-w-[1280px] flex-col overflow-hidden rounded-[24px] border border-[#E2E5EC] bg-white shadow-2xl" onClick={e=>e.stopPropagation()}>
      <header className="flex shrink-0 items-center border-b border-[#E7EAF0] px-7 py-5">
        <div>
          <p className="text-[10px] font-bold tracking-[.12em] text-[#8C93A3]">2025—2026学年第2学期</p>
          <h2 className="mt-1 text-[22px] font-bold text-[#202430]">学期课表</h2>
          <p className="mt-1 text-[11px] text-[#7B8291]">点击课程，可以进入这门课当前周的学习内容。</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={previousWeek} disabled={week===1} aria-label="上一周" className="grid h-9 w-9 place-items-center rounded-xl border border-[#E5E7ED] text-[#626977] disabled:opacity-30"><ChevronLeft size={16}/></button>
          <select value={week} onChange={e=>onWeek(Number(e.target.value))} aria-label="选择周次" className="h-9 rounded-xl bg-[#F3F5FF] px-4 text-[11px] font-semibold text-[#4D5CFF] outline-none">
            {Array.from({length:16},(_,i)=><option key={i+1} value={i+1}>第 {i+1} 周</option>)}
          </select>
          <button onClick={nextWeek} disabled={week===16} aria-label="下一周" className="grid h-9 w-9 place-items-center rounded-xl border border-[#E5E7ED] text-[#626977] disabled:opacity-30"><ChevronRight size={16}/></button>
          <button onClick={onClose} aria-label="关闭学期课表" className="ml-2 grid h-9 w-9 place-items-center rounded-xl bg-[#F4F5F8] text-[#626977]"><X size={16}/></button>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-auto p-6">
        <div className="min-w-[960px] overflow-hidden rounded-2xl border border-[#E5E8EF]">
          <div className="grid grid-cols-[92px_repeat(5,minmax(0,1fr))] bg-[#F7F8FB]">
            <div className="border-b border-r border-[#E5E8EF] p-3 text-center text-[10px] text-[#9AA0AC]">时间</div>
            {days.map((day,index)=><div key={day} className={`border-b border-r border-[#E5E8EF] p-3 text-center last:border-r-0 ${index===currentDayIndex?"bg-[#F1F3FF]":""}`}><b className="text-[12px] text-[#333846]">{day}</b>{index===currentDayIndex&&<span className="ml-2 rounded-full bg-[#4D5CFF] px-2 py-0.5 text-[8px] font-semibold text-white">今天</span>}</div>)}
            {slots.map((slot,slotIndex)=><div key={slot.time} className="contents">
              <div className={`flex min-h-[118px] flex-col items-center justify-center border-r border-[#E5E8EF] bg-[#FAFBFD] ${slotIndex<slots.length-1?"border-b":""}`}><b className="text-[12px] text-[#343946]">{slot.time}</b><small className="mt-1 text-[9px] text-[#A0A5AF]">{slot.end}</small></div>
              {days.map((_,dayIndex)=>{
                const course=courseAt(dayIndex,slot.time);
                return <div key={`${dayIndex}-${slot.time}`} className={`min-h-[118px] border-r border-[#E5E8EF] p-2 last:border-r-0 ${slotIndex<slots.length-1?"border-b":""} ${dayIndex===currentDayIndex?"bg-[#FBFBFF]":"bg-white"}`}>
                  {course&&<button onClick={()=>onOpen(course.subjectId,`${course.title} · 第${week}周`)} className={`flex h-full min-h-[100px] w-full flex-col rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md ${toneStyle[course.tone]}`}>
                    <span className="text-[9px] font-semibold opacity-75">{course.time}—{course.end}</span>
                    <b className="mt-2 line-clamp-2 text-[11px] leading-5 text-[#252936]">{course.title}</b>
                    <span className="mt-auto flex items-center gap-1 pt-2 text-[9px] opacity-75"><MapPin size={10}/>{course.place}</span>
                  </button>}
                </div>;
              })}
            </div>)}
          </div>
        </div>
        <div className="mt-4 flex items-center rounded-xl bg-[#F7F8FB] px-4 py-3 text-[10px] text-[#717887]"><Clock3 size={13} className="mr-2 text-[#4D5CFF]"/><span>当前显示第 {week} 周：分周课程已经自动切换，学术英语上课地点为 {week<=8?"教1楼313":"主楼G422"}。</span><span className="ml-auto font-semibold text-[#4D5CFF]">本周 {visible.length} 次课</span></div>
      </div>
    </div>
  </div>;
}

export function ClassSessionPanel({courseTitle,onAddSource,onClose,onOpenArea}:{courseTitle:string;onAddSource:()=>void;onClose:()=>void;onOpenArea:(area:"notes"|"homework"|"exam")=>void}) {
  const [started,setStarted]=useState(false);
  const isMath=courseTitle.includes("高等数学");
  const isEnglish=courseTitle.includes("英语");
  const isExperiment=courseTitle.includes("实验");
  const isPhysics=courseTitle.includes("大学物理")&&!isExperiment;
  const isCircuit=courseTitle.includes("电路");
  const profile=isEnglish?{
    time:"14:00—15:40",place:courseTitle.includes("第9周")?"主楼G422":"教1楼313",
    action:"用闪卡复习高频学术词，再听 8 分钟课程音频。",
    actionType:"闪卡 + 音频 · 13分钟",
    learned:"6个学术表达",uncertain:"论证转折",task:"今晚完成一次跟读",source:"课堂录音与讲义",
  }:isExperiment?{
    time:courseTitle.includes("物理")?"10:00—11:40":"14:00—15:40",place:courseTitle.includes("物理")?"物理4":"教5B113",
    action:"先看 6 分钟仪器操作视频，再用清单核对安全步骤。",
    actionType:"操作视频 + 清单 · 8分钟",
    learned:"3个仪器操作步骤",uncertain:"误差来源",task:"完成实验报告",source:"2张板书 · 1段录音",
  }:isPhysics?{
    time:"明天上课前",place:"主楼C102",
    action:"阅读误差分析讲义，标出还不确定的概念。",
    actionType:"讲义阅读 · 10分钟",
    learned:"误差分析的基本分类",uncertain:"系统误差与随机误差",task:"完成课后概念检查",source:"误差分析讲义",
  }:isMath||isCircuit?{
    time:isMath?"08:00—09:40":"10:00—11:40",place:isMath?"教4A501":"教1楼05阶梯",
    action:isMath?"先闭卷做一道旧题，卡住时再看对应例题。":"先画出电路关系，再完成一道节点分析题。",
    actionType:"提取练习 · 8分钟",
    learned:"2个解题方法",uncertain:isMath?"积分边界":"参考方向",task:"完成课后题",source:"课堂笔记与例题",
  }:{
    time:"本次课表时间",place:"课表教室",
    action:"先看本节目标，再用自己的话复述相关概念。",
    actionType:"阅读 + 复述 · 10分钟",
    learned:"2条新理解",uncertain:"概念边界",task:"完成课堂回顾",source:"课堂讲义与记录",
  };
  return <div className="h-full overflow-y-auto px-8 py-7"><div className="mx-auto max-w-[900px]">
    <button onClick={onClose} className="text-[11px] font-semibold text-[#4D5CFF]">← 返回整门课程</button>
    <div className="mt-5 flex items-start"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#4D5CFF] text-white"><BookOpen size={19}/></span><div className="ml-3"><span className="rounded-full bg-[#EEF0FF] px-2 py-1 text-[9px] font-semibold text-[#4D5CFF]">本次课</span><h1 className="mt-2 text-[24px] font-bold">{courseTitle}</h1><div className="mt-2 flex gap-4 text-[11px] text-[#7B8291]"><span className="flex items-center gap-1"><Clock3 size={12}/>{profile.time}</span><span className="flex items-center gap-1"><MapPin size={12}/>{profile.place}</span></div></div></div>
    <Card className="mt-6 p-6"><p className="text-[10px] font-bold tracking-[.1em] text-[#8C93A3]">现在做这件事</p><h2 className="mt-3 text-[17px] font-bold leading-7">{profile.action}</h2><p className="mt-2 text-[11px] text-[#7B8291]">{profile.actionType}</p><div className="mt-5 flex gap-2"><button onClick={()=>setStarted(true)} className="rounded-xl bg-[#4D5CFF] px-5 py-2.5 text-[11px] font-semibold text-white">{started?"已开始":"开始"}</button><button onClick={onAddSource} className="flex items-center gap-1 rounded-xl bg-[#F1F3FF] px-4 py-2.5 text-[11px] font-semibold text-[#4D5CFF]"><Mic size={13}/>添加课堂记录</button></div></Card>
    <h2 className="mt-7 text-[14px] font-bold">这次课留下的内容</h2><p className="mt-1 text-[10px] text-[#8A909C]">之后可以在整门课程的对应位置继续查看</p><div className="mt-3 grid grid-cols-2 gap-3">{[
      {label:"笔记",caption:"记住了",value:profile.learned,style:"bg-[#EEF0FF] text-[#4D5CFF]",target:"notes" as const},
      {label:"备考",caption:"还没弄懂",value:profile.uncertain,style:"bg-[#FFF4E5] text-[#B66A0A]",target:"exam" as const},
      {label:"作业",caption:"接下来要做",value:profile.task,style:"bg-[#F5EEFF] text-[#7C4DCC]",target:"homework" as const},
      {label:"课堂资料",caption:"本次记录",value:profile.source,style:"bg-[#EAF8F2] text-[#21845A]",target:null},
    ].map(x=><button key={x.label} onClick={()=>x.target?onOpenArea(x.target):onAddSource()} className="rounded-2xl border border-[#E7EAF0] bg-white p-4 text-left hover:border-[#BEC5FF]"><span className={`rounded-full px-2 py-1 text-[9px] font-semibold ${x.style}`}>{x.label}</span><small className="mt-4 block text-[9px] text-[#9CA3AF]">{x.caption}</small><b className="mt-1 block text-[12px]">{x.value}</b><span className="mt-3 block text-[9px] text-[#4D5CFF]">查看 →</span></button>)}</div>
    <div className="mt-6 rounded-xl bg-[#F1F3FF] p-4 text-[10px] leading-5 text-[#626977]">本次课属于课程进度中的一个节点。课堂理解进入“笔记”，待完成事项进入“作业”，需要巩固的内容进入“备考”，录音和板书保留在“课堂资料”中。</div>
  </div></div>;
}

export function InboxView({onOrganize}:{onOrganize:()=>void}) {
  const inputs = [["课堂板书照片","补充 2 条已有知识","刚刚"],["社会比较理论.pdf","新建 2 条 · 补充 3 条","昨天"],["与导师的选题对话","1 个观点 · 1 项行动","7月18日"]];
  return <Page eyebrow="AI 已完成初步整理" title="待确认" subtitle="这里只保留需要你判断的新增、合并与观点冲突。"><div className="grid grid-cols-3 gap-4">{inputs.map((x,i)=><Card key={x[0]} className="p-5"><div className="flex items-center justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#EEF0FF] text-[#4D5CFF]">{i===2?<MessageSquareText/>:i===0?<Inbox/>:<FileText/>}</span><small className="text-[#A0A5AF]">{x[2]}</small></div><b className="mt-5 block text-[14px]">{x[0]}</b><p className="mt-1 text-[12px] text-[#8A909C]">AI 建议：{x[1]}</p><div className="mt-4 flex gap-2"><button onClick={onOrganize} className="rounded-lg bg-[#4D5CFF] px-3 py-1.5 text-[11px] font-semibold text-white">确认吸收</button><button className="rounded-lg bg-[#F4F5F8] px-3 py-1.5 text-[11px]">逐项检查</button></div></Card>)}</div><button className="mt-5 text-[12px] font-semibold text-[#4D5CFF]">查看全部原始资料 →</button></Page>;
}

export function KnowledgeView(){
  const [filter,setFilter] = useState<"all"|"insights"|"needs">("all");
  const [selected,setSelected] = useState<string|null>(null);
  const [sourcePreview,setSourcePreview] = useState<string|null>(null);
  const [feedback,setFeedback] = useState<string|null>(null);
  const items = [["社会比较理论","概念","4份证据","研究 · 社会科学","稳定"],["短视频刺激可能通过社会比较影响冲动消费","研究判断","3份支持 · 1份反对","研究 · 博士申请","待验证"],["暂不纳入算法机制","研究决定","导师讨论 · 12:36","研究问题演化","已确认"],["楞次定律与电磁感应","原理","3份证据","大学物理","待复习"],["预测试反向题容易造成误解","研究经验","7份访谈","问卷设计 · 研究方法","待验证"],["英语议论文论证结构","方法","1份证据","大学英语 · 六级","稳定"]];
  const visible = filter==="needs" ? items.filter(x=>x[4].includes("待")) : filter==="insights"?items.filter(x=>["研究判断","研究决定","研究经验"].includes(x[1])):items;
  return <Page eyebrow="长期记忆" title="知识" subtitle="这里保存的不是文件目录，而是可追溯、可复用、会被新证据持续更新的理解。"><div className="mb-5 flex gap-2">{[["all","全部记忆 38"],["insights","观点与决定 9"],["needs","待验证 5"]].map(x=><button key={x[0]} onClick={()=>setFilter(x[0] as typeof filter)} className={`rounded-xl px-4 py-2 text-[12px] font-semibold ${filter===x[0]?"bg-[#4D5CFF] text-white":"bg-white text-[#626977]"}`}>{x[1]}</button>)}</div><div className="grid grid-cols-2 gap-3">{visible.map(x=><button onClick={()=>{setSelected(x[0]);setFeedback(null)}} key={x[0]} className="rounded-2xl border border-[#E7EAF0] bg-white p-4 text-left hover:border-[#BEC5FF]"><div className="flex gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#EEF0FF] text-[#4D5CFF]"><Library size={17}/></span><div className="min-w-0 flex-1"><div className="flex items-start gap-2"><b className="flex-1 text-[13px] leading-5">{x[0]}</b><small className="whitespace-nowrap rounded-full bg-[#F4F5F8] px-2 py-0.5 text-[9px]">{x[1]}</small></div><p className="mt-2 text-[10px] text-[#8A909C]">{x[3]}</p><div className="mt-3 flex items-center gap-1 text-[10px] text-[#4D5CFF]"><Link2 size={12}/>{x[2]} · {x[4]}</div></div></div></button>)}</div>{selected&&<div className="fixed inset-0 z-[180] bg-black/20" onClick={()=>{setSelected(null);setSourcePreview(null)}}><aside className="ml-auto h-full w-[450px] overflow-y-auto bg-white p-6 shadow-2xl" onClick={e=>e.stopPropagation()}><button onClick={()=>{setSelected(null);setSourcePreview(null)}} className="text-[11px] text-[#4D5CFF]">← 返回长期记忆</button><h2 className="mt-5 text-[20px] font-bold leading-8">{selected}</h2><div className="mt-3 flex gap-2"><span className="rounded-full bg-[#F1F3FF] px-2 py-1 text-[9px] text-[#4D5CFF]">AI 当前理解</span><span className="rounded-full bg-[#FFF7E8] px-2 py-1 text-[9px] text-[#B66A0A]">置信度：中等</span></div><p className="mt-4 rounded-xl bg-[#F8F9FC] p-4 text-[12px] leading-6 text-[#626977]">这条记忆由书籍、研究报告和导师讨论共同形成；它是当前可调用的理解，不等于不可改变的事实。</p><h3 className="mt-6 text-[13px] font-bold">来源与证据</h3>{["《社会心理学》第 7 章 · 第183页","青年消费行为研究.pdf · 第26页","与陈老师的讨论 · 12:36"].map((x,i)=><button onClick={()=>setSourcePreview(x)} key={x} className="mt-2 flex w-full items-center rounded-xl bg-[#F8F9FC] p-3 text-left text-[11px]"><FileText size={14} className="mr-2 text-[#4D5CFF]"/><span>{i===2?"建议证据":"支持证据"} · {x}</span><span className="ml-auto text-[#4D5CFF]">查看原文</span></button>)}{sourcePreview&&<div className="mt-3 rounded-xl border border-[#DDE1FF] bg-[#F7F8FF] p-4"><div className="flex"><b className="text-[11px]">{sourcePreview}</b><button onClick={()=>setSourcePreview(null)} className="ml-auto text-[10px] text-[#4D5CFF]">收起</button></div><p className="mt-2 text-[11px] leading-6 text-[#626977]">已定位到具体页码或时间点。该片段支持当前理解，但仍需结合反对证据与适用边界判断。</p></div>}<h3 className="mt-6 text-[13px] font-bold">正在被哪些场景调用</h3>{["学习：社会科学与研究方法","研究：短视频与大学生冲动消费","计划：博士申请方向观察"].map(x=><p key={x} className="mt-2 rounded-xl bg-[#F1F3FF] p-3 text-[11px] text-[#4D5CFF]">{x}</p>)}<h3 className="mt-6 text-[13px] font-bold">你拥有最终控制权</h3><div className="mt-3 flex flex-wrap gap-2">{["理解正确","纠正这条记忆","标记为过时","不再用于 AI 判断"].map(x=><button key={x} onClick={()=>setFeedback(x)} className="rounded-lg bg-[#F4F5F8] px-3 py-2 text-[10px] text-[#626977]">{x}</button>)}</div>{feedback&&<p className="mt-3 rounded-xl bg-[#EEF8F3] p-3 text-[10px] text-[#21845A]">已记录“{feedback}”，系统会保留历史版本并重新计算相关判断。</p>}</aside></div>}</Page>;
}

export function GoalsView({onAddToday}:{onAddToday?:(task:string)=>void}){
  const [selected,setSelected]=useState<string|null>(null);
  const [added,setAdded]=useState(false);
  const [showWhy,setShowWhy]=useState(false);
  const [detailPanel,setDetailPanel]=useState<"origin"|"evidence"|null>(null);
  const [judgmentFeedback,setJudgmentFeedback]=useState<string|null>(null);
  const [stage,setStage]=useState<"planning"|"review"|"sprint">("planning");
  const goals=[
    {name:"大学英语四六级",meta:"CET-6 · 12月14日",why:"希望能够无障碍阅读英文资料，也为后续研究和升学做准备。",state:"听力投入稳定，写作仍缺少真实练习反馈"},
    {name:"雅思",meta:"目标 7.0 · 留学申请准备",why:"希望达到海外项目的语言要求，并具备参与英文课堂与学术交流的能力。",state:"学术阅读基础较好，口语输出与写作评分依据仍不足"},
    {name:"托福",meta:"目标 100 · 留学申请准备",why:"希望达到目标院校的语言要求，并适应英文授课和学术表达。",state:"英文资料阅读积累可复用，但综合口语与限时写作尚未建立基线"},
    {name:"考研准备",meta:"2028 届 · 方向探索中",why:"社会科学课程和短视频研究，让你开始考虑接受更系统的研究训练。",state:"研究兴趣逐渐清晰，但专业与院校判断依据仍不足"},
    {name:"实习求职",meta:"产品方向 · 2027 暑期",why:"希望把研究、信息整理和表达能力转化为真实的产品实践。",state:"已有研究案例，但能力还没有被整理成招聘者能理解的证据"},
    {name:"博士申请",meta:"申请考核 · 研究方向匹配中",why:"希望围绕数字媒介与消费行为形成更长期、独立的研究方向。",state:"已有连续课题积累，但研究主线、导师匹配和代表性成果仍需验证"},
    {name:"考公考编",meta:"岗位探索 · 尚未锁定地区",why:"希望把专业能力投入稳定且具有公共价值的长期工作。",state:"职业偏好逐渐明确，但岗位条件、考试内容与个人优势尚未完成匹配"},
  ];
  const current=goals.find(x=>x.name===selected);
  if(current){
    const isCet=current.name==="大学英语四六级";
    const isPost=current.name==="考研准备";
    const isPhd=current.name==="博士申请";
    const isCivil=current.name==="考公考编";
    const isInternational=current.name==="雅思"||current.name==="托福";
    const stageNames=isCet||isInternational?["诊断规划","备考中","考前冲刺"]:isPost?["方向规划","备考中","考前冲刺"]:isPhd?["方向形成","申请准备","申请冲刺"]:isCivil?["岗位判断","备考中","招录冲刺"]:["方向规划","准备中","投递冲刺"];
    const stageIndex=stage==="planning"?0:stage==="review"?1:2;
    const phdMemory=stage==="planning"?{summary:"研究兴趣已经连续出现，但还不足以支持用学校排名替代导师与方向匹配。",good:"数字媒介与消费行为已有连续课题积累",risk:"独立问题意识 · 导师研究契合度",proof:"3 项关联研究 · 18 篇核心文献 · 5 次导师讨论",strategy:"先形成可解释的研究主线，再筛选导师与项目",focus:"用一页纸写清过去研究、当前问题和未来三年的延展关系。",reason:"博士申请首先验证的是能否持续提出问题，而不只是完成过多少项目。"}:stage==="review"?{summary:"研究主线已形成，当前缺口集中在代表作质量与申请材料的一致性。",good:"研究问题和方法路径能够连成主线",risk:"代表作成熟度 · 研究计划可执行性",proof:"1 篇工作论文 · 2 次学术汇报 · 6 位导师研究记录",strategy:"用真实成果校验研究计划，避免材料彼此割裂",focus:"把代表作中的关键判断改写为研究计划的前期证据。",reason:"导师需要判断未来方向是否建立在已有能力上。"}:{summary:"材料基本完整，最大不确定性来自导师沟通和面试表达。",good:"研究计划、代表作与个人陈述已对齐",risk:"面试追问 · 导师双向匹配",proof:"4 套申请材料 · 3 次模拟面试 · 2 次导师回复",strategy:"停止扩充材料，集中验证关键判断和研究边界",focus:"模拟回答为什么必须继续研究这个问题，并用两项既有证据支撑。",reason:"申请冲刺的核心不是增加经历，而是让研究选择可信。"};
    const civilMemory=stage==="planning"?{summary:"稳定与公共价值偏好较清晰，但目前还不能据此直接决定岗位。",good:"结构化表达、研究和材料分析能力可迁移",risk:"地区限制 · 专业目录 · 岗位真实工作",proof:"2 次职业访谈 · 1 份能力盘点 · 6 个关注岗位",strategy:"先做岗位—条件—能力匹配，再决定是否系统备考",focus:"筛选五个真实公告岗位，标出硬性条件和日常工作差异。",reason:"考公考编不是单一考试目标，岗位选择会直接改变准备路径。"}:stage==="review"?{summary:"行测基础相对稳定，申论论证和公共基础知识的调用仍不稳定。",good:"资料分析与逻辑判断正确率稳定",risk:"申论结构 · 公基遗忘",proof:"8 次模块练习 · 3 篇申论 · 126 道错题",strategy:"按错误模式调整练习密度，不平均刷题",focus:"重写最近一篇申论，只检查论点是否有材料证据支持。",reason:"记忆显示失分主要来自论证断裂，而不是阅读速度。"}:{summary:"笔试表现进入目标区间，当前风险转向岗位竞争与面试表达。",good:"整套模考成绩趋于稳定",risk:"面试情境表达 · 报名节点",proof:"4 次整套模考 · 2 个报名岗位 · 距笔试 16 天",strategy:"维持笔试手感，同时提前建立面试素材记忆",focus:"完成一次限时模考，并整理一个体现公共服务判断的真实经历。",reason:"招录冲刺需要同时管理考试表现和不可错过的流程节点。"};
    const internationalMemory=stage==="planning"?{summary:`${current.name}目标与申请方向一致，但还缺少一次完整模考确认真实起点。`,good:"英文文献阅读与词汇积累可以迁移",risk:current.name==="雅思"?"口语流利度 · 写作评分基线":"综合口语 · 限时综合写作",proof:"8 篇英文文献 · 近半年词汇记录 · 2 次英文汇报",strategy:"先用完整样本诊断，再决定各科投入比例",focus:`完成一套${current.name}完整模考，保留各题作答和用时记录。`,reason:"国际语言考试的短板常在输出与时间控制，不能只由阅读经历推断。"}:stage==="review"?{summary:current.name==="雅思"?"阅读接近目标分，口语连贯性和写作论证仍反复波动。":"阅读与听力趋于稳定，综合口语的信息组织仍是主要失分点。",good:"输入类题目已经形成稳定方法",risk:current.name==="雅思"?"口语展开 · 写作任务回应":"综合口语 · 写作信息整合",proof:"6 次单科测试 · 4 次口语录音 · 3 篇批改作文",strategy:"减少已稳定题型，把练习集中到反复出现的输出问题",focus:current.name==="雅思"?"录制一次口语 Part 2，并对照历史录音检查停顿和展开。":"完成一组综合口语，复盘听读信息是否被准确组织。",reason:"记忆显示当前瓶颈不是知识量，而是限时调用与表达。"}:{summary:`最近模拟已接近${current.name}目标区间，当前重点是稳定发挥和考试节奏。`,good:"主要题型正确率进入目标范围",risk:"输出波动 · 整套考试耐力",proof:"3 次完整模考 · 距考试 14 天",strategy:"停止扩充资料，用整套模拟处理最后的不稳定因素",focus:`按正式时间完成一次${current.name}整套模拟，只复盘重复错误。`,reason:"冲刺期继续增加方法会干扰已经形成的作答节奏。"};
    const memory=isCet?stage==="planning"?{summary:"目标合理，但还没有用完整样本判断真实起点。",good:"英文阅读和词汇积累可直接复用",risk:"听力与写作缺少基准数据",proof:"6 篇英文文献 · 近三个月词汇记录",strategy:"先诊断，再决定各题型投入比例",focus:"完成一套不暂停的六级真题，建立听力、阅读和写作基线。",reason:"没有基线时，任何复习表都只是套用模板。"}:stage==="review"?{summary:"阅读已经稳定，听力长对话和限时写作仍反复失分。",good:"阅读正确率连续三周超过 80%",risk:"听力长对话 · 写作时间分配",proof:"12 次练习 · 2 篇作文 · 86 道错题",strategy:"降低已稳定内容频率，把练习转向反复错误",focus:"重做最近三次听力中的长对话错题，并说出每个错误判断的原因。",reason:"记忆显示错误集中在转折信息，而不是词汇量不足。"}:{summary:"最近三次模拟在 485—505 分之间，最主要的不确定性仍是听力。",good:"阅读与翻译已达到目标区间",risk:"听力波动 · 写作时间不足",proof:"3 次整套模拟 · 距考试 18 天",strategy:"只处理最可能提分的风险，不再系统补新内容",focus:"今晚按真实考试时间完成一次听力与写作联练。",reason:"冲刺期需要验证时间和稳定性，继续扩充知识的收益已经很低。"}:isPost?stage==="planning"?{summary:"研究兴趣逐渐清晰，但专业和院校判断依据仍不足。",good:"数字媒介方向已有持续兴趣与研究经历",risk:"专业方向 · 院校训练特点",proof:"12 条知识 · 1 项论文课题 · 3 次导师讨论",strategy:"先确认方向，再决定院校和备考科目",focus:"比较数字媒介、传播学和消费社会学三个方向。",reason:"现在直接排备考表，会建立在尚未确认的方向上。"}:stage==="review"?{summary:"专业课第一轮已经形成框架，但研究方法和英文文献阅读偏弱。",good:"社会科学理论框架较完整",risk:"研究方法 · 英文文献速度",proof:"42 个知识点 · 6 次章节测试",strategy:"用测试结果决定复习密度，而不是平均推进",focus:"用一次闭卷测试确认研究方法中真正没有掌握的部分。",reason:"近期重复阅读很多，但缺少提取练习，熟悉感可能高估掌握度。"}:{summary:"基础内容基本稳定，当前风险是主观题表达和时间控制。",good:"核心理论召回稳定",risk:"论述题结构 · 模拟节奏",proof:"4 次模拟 · 距初试 21 天",strategy:"停止扩展资料，用整套模拟校准表达",focus:"完成一次专业课限时论述，并用已有研究案例补充论证。",reason:"冲刺期真正影响得分的是调用和表达，而不是再增加笔记。"}:stage==="planning"?{summary:"目标岗位大致明确，但项目经历还没有完成能力映射。",good:"用户研究与结构化表达已有真实素材",risk:"岗位要求 · 项目证据表达",proof:"1 项研究 · 2 份阶段产出",strategy:"先判断岗位匹配，再决定补什么经历",focus:"选择三个目标岗位，比较它们真正要求的能力。",reason:"不先确认岗位，优化简历只会反复改文案。"}:stage==="review"?{summary:"简历框架已经形成，核心问题是案例叙述缺少结果和个人判断。",good:"研究过程和方法描述完整",risk:"结果量化 · 决策贡献",proof:"2 版简历 · 1 次模拟面试",strategy:"把已有经历转成可验证的能力证据",focus:"重写短视频研究案例，只保留问题、判断、行动和结果。",reason:"招聘者需要看见你如何判断，而不只是项目做了哪些步骤。"}:{summary:"材料已经可投递，当前需要根据真实反馈快速校准。",good:"简历和项目案例已完成",risk:"面试表达 · 岗位匹配度",proof:"12 次投递 · 3 次面试反馈",strategy:"停止大改材料，集中解决反馈中反复出现的问题",focus:"根据最近两次面试反馈，重新讲一遍研究项目的关键取舍。",reason:"冲刺阶段最有价值的是外部反馈，不是继续美化页面。"};
    if(isPhd) Object.assign(memory,phdMemory);
    if(isCivil) Object.assign(memory,civilMemory);
    if(isInternational) Object.assign(memory,internationalMemory);
    return <Page eyebrow="长期计划" title={current.name} subtitle={current.meta}>
      <div className="mb-5 flex items-center"><button onClick={()=>{setSelected(null);setAdded(false);setShowWhy(false);setStage("planning");setDetailPanel(null)}} className="text-[11px] font-semibold text-[#4D5CFF]">← 返回全部计划</button><button onClick={()=>setDetailPanel("origin")} className="ml-auto text-[11px] text-[#7B8291]">查看目标原点与完整路径</button></div>
      <Card className="p-5"><div className="flex items-center"><div><small className="text-[#8A909C]">AI 判断的当前阶段</small><h2 className="mt-1 text-[18px] font-bold">{stageNames[stageIndex]}</h2></div><div className="ml-auto text-right"><small className="mb-1 block text-[9px] text-[#9CA3AF]">原型预览其他阶段</small><div className="flex rounded-xl bg-[#F4F5F8] p-1">{(["planning","review","sprint"] as const).map((x,i)=><button key={x} onClick={()=>{setStage(x);setAdded(false);setShowWhy(false)}} className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold ${stage===x?"bg-white text-[#4D5CFF] shadow-sm":"text-[#8A909C]"}`}>{stageNames[i]}</button>)}</div></div></div></Card>
      <div className="mt-4 grid grid-cols-5 gap-4"><Card className="col-span-3 p-5"><Header icon={<Library/>} title="AI 对当前状态的判断"/><p className="mt-4 text-[15px] font-semibold leading-7">{memory.summary}</p><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-[#EEF8F3] p-3"><b className="text-[11px] text-[#21845A]">已经稳定</b><p className="mt-1 text-[12px]">{memory.good}</p></div><div className="rounded-xl bg-[#FFF7E8] p-3"><b className="text-[11px] text-[#B66A0A]">当前风险</b><p className="mt-1 text-[12px]">{memory.risk}</p></div></div></Card><Card className="col-span-2 p-5"><Header icon={<Link2/>} title="判断依据"/><p className="mt-4 text-[13px] leading-6">{memory.proof}</p><button onClick={()=>setDetailPanel("evidence")} className="mt-4 text-[11px] font-semibold text-[#4D5CFF]">查看记忆依据 →</button></Card></div>
      <Card className="mt-4 p-5"><Header icon={<Target/>} title="本阶段策略"/><p className="mt-4 text-[14px] leading-7">{memory.strategy}</p><p className="mt-2 text-[11px] text-[#8A909C]">页面会随阶段变化：规划看选择，复习看掌握与遗忘，冲刺看风险和取舍。</p></Card>
      <Card className="mt-4 border-[#DDE1FF] bg-[#F7F8FF] p-5"><Header icon={<CheckCircle2/>} title="此刻最值得做"/><p className="mt-4 text-[15px] font-semibold leading-7">{memory.focus}</p>{showWhy&&<p className="mt-3 rounded-xl bg-white p-3 text-[11px] leading-6 text-[#626977]">{memory.reason}</p>}<div className="mt-4 flex gap-2"><button onClick={()=>{setAdded(true);onAddToday?.(memory.focus)}} className="rounded-xl bg-[#4D5CFF] px-4 py-2 text-[11px] font-semibold text-white">{added?"已加入今日 ✓":"加入今日"}</button><button onClick={()=>setShowWhy(!showWhy)} className="rounded-xl bg-white px-4 py-2 text-[11px] font-semibold text-[#4D5CFF]">{showWhy?"收起原因":"为什么这样建议"}</button></div></Card>
      {detailPanel&&<div onClick={()=>setDetailPanel(null)} className="fixed inset-0 z-[190] bg-black/20"><aside onClick={e=>e.stopPropagation()} className="ml-auto h-full w-[430px] overflow-y-auto bg-white p-6 shadow-2xl"><button onClick={()=>setDetailPanel(null)} className="text-[11px] text-[#4D5CFF]">← 返回计划</button><h2 className="mt-5 text-[20px] font-bold">{detailPanel==="origin"?"目标原点与路径":"AI 判断的记忆依据"}</h2>{detailPanel==="origin"?<><p className="mt-4 text-[13px] leading-7">{current.why}</p><h3 className="mt-6 text-[13px] font-bold">目标如何变化</h3><div className="mt-3 space-y-3">{[["最初","来自课程与一次真实经历"],["后来","相关学习和研究持续增加"],["现在","目标从模糊愿望变成可验证方向"]].map(x=><div key={x[0]} className="rounded-xl bg-[#F8F9FC] p-3"><b className="text-[11px] text-[#4D5CFF]">{x[0]}</b><p className="mt-1 text-[12px]">{x[1]}</p></div>)}</div></>:<><p className="mt-3 text-[12px] leading-6 text-[#626977]">这项判断由以下四类记忆共同支持，最后更新于今天。</p>{[["学习记录",memory.proof],["长期知识",memory.good],["近期表现",memory.risk],["历史判断",memory.reason]].map(x=><div key={x[0]} className="mt-3 rounded-xl border border-[#E7EAF0] p-4"><b className="text-[11px] text-[#4D5CFF]">{x[0]}</b><p className="mt-1 text-[12px] leading-5">{x[1]}</p><button onClick={()=>setJudgmentFeedback(`已定位：${x[0]}`)} className="mt-2 text-[9px] text-[#4D5CFF]">查看原始记录 →</button></div>)}<div className="mt-5 flex gap-2">{["判断准确","证据已过时","理解有误"].map(x=><button key={x} onClick={()=>setJudgmentFeedback(x)} className="rounded-lg bg-[#F4F5F8] px-3 py-2 text-[10px]">{x}</button>)}</div>{judgmentFeedback&&<p className="mt-3 rounded-xl bg-[#EEF8F3] p-3 text-[10px] text-[#21845A]">{judgmentFeedback.startsWith("已定位")?`${judgmentFeedback}，原始记录包含页码或时间点。`:`已记录“${judgmentFeedback}”，后续建议将重新计算。`}</p>}</>}</aside></div>}
    </Page>
  }
  const renderGoal=(x:typeof goals[number],tone:string,label:string)=><button onClick={()=>setSelected(x.name)} key={x.name} className="overflow-hidden rounded-2xl border border-[#E7EAF0] bg-white text-left hover:border-[#BEC5FF] hover:shadow-sm"><div className={`h-2 ${tone}`}/><div className="p-5"><div className="flex items-center"><Target className="text-[#4D5CFF]" size={19}/><span className="ml-auto rounded-full bg-[#F4F5F8] px-2 py-1 text-[9px] text-[#7B8291]">{label}</span></div><b className="mt-4 block">{x.name}</b><p className="mt-1 text-[11px] text-[#9CA3AF]">{x.meta}</p><p className="mt-4 rounded-xl bg-[#F8F9FC] p-3 text-[11px] leading-5">{x.state}</p></div></button>;
  const activeGoals=goals.filter(x=>["大学英语四六级","实习求职"].includes(x.name));
  const observing=goals.filter(x=>["考研准备","博士申请"].includes(x.name));
  const templates=goals.filter(x=>["雅思","托福","考公考编"].includes(x.name));
  return <Page eyebrow="长期方向" title="计划" subtitle="AI 帮你区分正在投入、值得观察和可以开始的方向，避免同时追逐所有目标。"><section><div className="flex items-end"><div><h2 className="text-[15px] font-bold">正在投入 · {activeGoals.length}</h2><p className="mt-1 text-[10px] text-[#8A909C]">已由你确认，会产生阶段判断与今日行动</p></div></div><div className="mt-3 grid grid-cols-2 gap-4">{activeGoals.map(x=>renderGoal(x,"bg-[#4D5CFF]","活跃"))}</div></section><section className="mt-8"><h2 className="text-[15px] font-bold">正在观察 · {observing.length}</h2><p className="mt-1 text-[10px] text-[#8A909C]">AI 继续收集证据，但不会自动安排任务</p><div className="mt-3 grid grid-cols-2 gap-4">{observing.map(x=>renderGoal(x,"bg-[#F59E0B]","观察中"))}</div></section><section className="mt-8"><h2 className="text-[15px] font-bold">可开始的方向</h2><p className="mt-1 text-[10px] text-[#8A909C]">这是启动脚手架，不代表你已经决定投入</p><div className="mt-3 grid grid-cols-3 gap-4">{templates.map(x=>renderGoal(x,"bg-[#CBD0DC]","未开始"))}</div></section></Page>
}

export function HistoryView(){return <Page eyebrow="学习档案" title="历程" subtitle="活跃内容会退出导航，但课程、研究和知识变化会被完整保留。"><div className="space-y-4">{[["2026 春季学期","高等数学 · 大学物理 · 社会科学","形成 21 条知识，完成 18 项任务"],["2025 秋季学期","大学化学 · 大学英语","形成 11 条知识，2 个专题"],["更早阶段","入学准备与基础学习","6 条知识已在后续学习中再次使用"]].map(x=><Card key={x[0]} className="flex items-center gap-4 p-5"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#F1F3FF] text-[#4D5CFF]"><Archive size={18}/></span><div className="flex-1"><b className="text-[14px]">{x[0]}</b><p className="mt-1 text-[12px]">{x[1]}</p><small className="text-[#9CA3AF]">{x[2]}</small></div><button className="text-[12px] font-semibold text-[#4D5CFF]">查看档案 →</button></Card>)}</div></Page>}

export function SourceLibraryView({onAddSource}:{onAddSource:()=>void}){
  const sources = [["社会比较视角下青年消费行为研究.pdf","PDF · 12 页","已产生 3 条知识","用于研究"],["《消费社会学》第三章","书籍章节","已产生 5 条知识","用于学习、研究"],["与陈老师的选题讨论","对话","1 个观点待确认","用于研究"],["电磁感应课堂板书","图片","已产生 2 条知识","用于大学物理"],["推荐算法如何改变内容消费","网页快照","已产生 2 条知识","用于研究"]];
  return <Page eyebrow="可追溯的原始来源" title="原始资料" subtitle="资料保存原貌，知识保存你的理解；两者始终可以双向跳转。"><div className="mb-5 flex items-center gap-2"><button className="rounded-xl bg-[#4D5CFF] px-4 py-2 text-[12px] font-semibold text-white">全部 24</button><button className="rounded-xl bg-white px-4 py-2 text-[12px]">待吸收 3</button><button className="rounded-xl bg-white px-4 py-2 text-[12px]">被研究引用 8</button><button onClick={onAddSource} className="ml-auto rounded-xl bg-[#4D5CFF] px-4 py-2 text-[12px] font-semibold text-white">+ 添加资料</button></div><div className="space-y-3">{sources.map(x=><Card key={x[0]} className="flex items-center gap-3 p-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#EEF0FF] text-[#4D5CFF]"><Database size={18}/></span><div className="min-w-0 flex-1"><b className="block truncate text-[13px]">{x[0]}</b><p className="mt-1 text-[11px] text-[#8A909C]">{x[1]} · {x[2]} · {x[3]}</p></div><button className="text-[11px] font-semibold text-[#4D5CFF]">查看原文</button></Card>)}</div></Page>;
}

export function CourseOverview({subject,feedGroups,onView}:{subject:SubjectData;feedGroups:FeedGroup[];onView:(id:"notes"|"homework"|"exam")=>void}) { return <Page eyebrow="学习空间" title={subject.short} subtitle={`已关联 ${feedGroups.reduce((n,g)=>n+g.cards.length,0)} 条笔记`}><Header icon={<BookOpen/>} title="继续学习" action="打开笔记" onAction={()=>onView("notes")}/></Page>; }
