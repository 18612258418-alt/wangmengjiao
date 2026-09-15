import { useEffect, useMemo, useState } from "react";
import { ClipboardList, CheckCircle2, Circle, FileText } from "lucide-react";
import type { CardData, FeedGroup, SubjectData } from "../../types";
import { formatFeedDateKey } from "../../utils/feedFilters";
import { hasHomeworkIntent } from "../../utils/cardSurfaces";
import {
  getHomeworkTasks,
  isHomeworkTaskCompleted,
  toggleHomeworkTaskCompletion,
} from "../../utils/cardTasks";
import { buildHomeworkTaskBreakdown } from "../../utils/generateHomeworkBreakdown";
import { HomeworkTaskPanel } from "../homework/HomeworkTaskPanel";
import { OriginalImageOverlay, ViewOriginalImageButton } from "../../shared/OriginalImageViewer";
import { OriginalSourceOverlay, ViewOriginalSourceButton } from "../../shared/OriginalSourceViewer";

type TaskItem = {
  card: CardData;
  task: string;
  taskIndex: number;
  /** 卡片在 feed 中的存储日期（用于 updateCard，可能与展示用的截止日不同） */
  feedDate: string;
};

type DayTasks = {
  dateKey: string;
  items: TaskItem[];
};

type SelectedTask = TaskItem & { dateKey: string };

function buildHomeworkByDay(feedGroups: FeedGroup[], scenarioId:"student"|"common"): DayTasks[] {
  const map = new Map<string, TaskItem[]>();

  for (const group of feedGroups) {
    for (const card of group.cards) {
      const hasExplicitCommonAction = card.contentType === "homework" || Boolean(card.nextAction?.trim()) || Boolean(card.homeworkTasks?.some(task=>task.trim()));
      if (scenarioId === "common" ? !hasExplicitCommonAction : !hasHomeworkIntent(card)) continue;
      const tasks = getHomeworkTasks(card);
      const dayKey =
        card.taskDueDate && /^\d{8}$/.test(card.taskDueDate)
          ? card.taskDueDate
          : group.date;
      const bucket = map.get(dayKey) ?? [];
      tasks.forEach((task, taskIndex) => {
        bucket.push({ card, task, taskIndex, feedDate: group.date });
      });
      map.set(dayKey, bucket);
    }
  }

  return [...map.entries()]
    .sort((a, b) => Number(b[0]) - Number(a[0]))
    .map(([dateKey, items]) => ({ dateKey, items }));
}

function taskKey(item: TaskItem, dateKey: string) {
  return `${dateKey}:${item.card.id}:${item.taskIndex}`;
}

function commonActionDetail(task:string,subject:string){
  type Detail={context:string[];done:string[];after:string;comparison?:Array<{name:string;commute:string;light:string;space:string}>};
  const details:Record<string,Detail>={
    "比较三套房源并确定优先顺序":{context:["按你最在意的通勤、采光和空间重新排了一次"],comparison:[{name:"湖畔家园",commute:"25 分钟 · 最短",light:"一般",space:"一室"},{name:"阳光里",commute:"35 分钟",light:"最好",space:"两室"},{name:"城市之光",commute:"40 分钟 · 达上限",light:"良好",space:"最大"}],done:["优先看阳光里：采光和空间更均衡","湖畔家园作为通勤优先的备选","现场重点核实城市之光高峰通勤"],after:"看房后补充噪声、实际采光和全部费用，再确定最终排序。"},
    "周六看房前确认房屋关键事项":{context:["中介已确认周六下午两点看房、押一付三，提前退租需提前一个月说明","宠物政策仍待房东确认；打扫完成后最早下周三入住"],done:["索要合同原文，核对押金退还与提前退租条款","确认是否允许养猫及是否增加押金或租金","确认交钥匙、清洁完成和租金起算日期"],after:"三项确认完成后，再决定是否保留这套房源。"},
    "出发前确认旅行关键事项":{context:["小林可请 9 月 21—25 日，前后最多调整 1 天；暂定 21 日出发、26 日返程，大阪进出"],done:["确定双方最终请假日期","选择包含托运行李且退改条件合适的航班","计算岚山、宇治和机场往返后决定使用 ICOCA 或交通券"],after:"日期和交通确定后，再锁定不可退的机票与酒店。"},
    "确认请假":{context:["小林可以请 9 月 21—25 日，前后最多调整 1 天；酒店暂不订不可退房型"],done:["确认自己的请假是否覆盖 9 月 21—26 日","和小林确定最终出发、返程日期"],after:"日期确定后再购买机票和锁定酒店。"},
    "购买往返机票":{context:["聊天中暂定 9 月 21 日出发、26 日返程，大阪进出，机票需要包含托运行李"],done:["比较可接受时段的往返航班","确认价格包含托运行李","核对退改条件后出票"],after:"出票后再按实际航班调整首末日安排。"},
    "比较 ICOCA 与游客交通券":{context:["行程包含京都市区、岚山和宇治","住宿会从四条河原町转到京都站","机场往返费用尚未计入"],done:["按每天路线算出预计乘车费用","核对交通券覆盖线路和有效天数","明确选择 ICOCA、交通券或组合使用"],after:"选择结果会写回旅行预算，并标注每天使用哪种支付方式。"},
    "向中介确认押金与退租条款":{context:["中介已回复押一付三，提前退租需提前一个月说明，具体条款仍以合同为准","宠物政策还要向房东确认，完成打扫后最早下周三入住"],done:["索要合同原文并核对押金退还条件","确认提前退租是否另有违约金","确认保洁费和维修费如何扣除"],after:"确认合同条款后，再决定是否保留这套房源。"},
    "确认是否允许养宠物":{context:["房源描述没有写宠物政策","养宠物是不可妥协的居住需求","周六将现场看房"],done:["确认允许的宠物种类和数量","确认是否增加押金或租金","要求相关约定写入租赁合同"],after:"如果不允许养宠物，这套房源会从候选列表中移除。"},
    "与房东确认最快入住时间":{context:["希望本月底前完成搬家","当前租约结束日已经确定","新房可能还需要清洁或维修"],done:["确认最早交钥匙日期","确认清洁和维修完成时间","确认租金从哪一天开始计算"],after:"入住日期会决定搬家公司预约、旧房退租和租金重叠天数。"},
    "下次做完后记录实际炖煮时间和家人口味。":{context:["现有菜谱建议小火炖 1.5—2 小时","番茄分两次加入","配方来自手写笔记和家人语音"],done:["记录这次实际炖煮时长","记下咸淡、酸甜和软烂程度","写下下次要调整的用量或时间"],after:"这份菜谱会从“经验描述”变成下次可以直接复现的家庭配方。"},
    "把统一场景数据包方案补进下次评审稿。":{context:["学生场景是默认能力","普通场景共用同一套页面组件","当前普通场景通过 URL 参数加载"],done:["列清 workspaces、tabs、memories 和 actions 字段","说明学生与普通场景的默认切换规则","把已验证页面截图放入评审稿"],after:"评审时可以讨论场景数据和识别规则，不再争论是否维护两套 App。"},
    "整理成下一轮原型的设计原则。":{context:["保存时不应要求用户先理解分类","搜索负责找回，主题负责浏览","AI 判断需要保留来源并允许纠正"],done:["原则控制在 3—5 条","每条原则配一个真实使用例子","标明下一轮原型如何验证"],after:"这些原则会成为下一轮原型取舍功能和判断评审结果的统一依据。"},
  };
  return details[task]??{context:[`当前行动属于“${subject}”`],done:["获得可以保存的明确结果"],after:"只有产生明确结果后，相关安排才会更新。"};
}

function commonOriginDetail(card:CardData,subject:string){
  if(card.originTitle) return {title:card.originTitle,description:card.originDescription};
  if(card.sourceDocument) return {title:card.sourceDocument.title,description:card.sourceDocument.paragraphs?.[0]};
  const origins:Record<string,{title:string;description:string}>={
    "搬家与新住处":{title:"三套房源截图、地图路线与中介聊天",description:"9 月 14 日通过加号上传 · 3 张图片和 1 段聊天记录"},
    "日本旅行":{title:"与小林的旅行聊天",description:"9 月 14 日通过加号上传 · 微信聊天截图"},
    "家庭生活":{title:"手写菜谱照片与家人语音",description:"9 月 13 日通过加号上传 · 1 张照片和 1 段语音"},
  };
  return origins[subject]??{title:card.title.replace(/^记忆[:：]\s*/, ""),description:"通过加号上传的原始内容"};
}

export function HomeworkView({
  subject,
  feedGroups,
  onUpdateCard,
  onUploadCheck,
  initialTaskQuery,
  scenarioId = "student",
}: {
  subject: SubjectData;
  feedGroups: FeedGroup[];
  onUpdateCard?: (cardId: string, date: string, updates: Partial<CardData>) => void;
  /** 「上传检查」按钮：打开上传入口 */
  onUploadCheck?: () => void;
  /** 从今日待办进入时，优先选中包含该关键词的作业 */
  initialTaskQuery?: string | null;
  scenarioId?: "student" | "common";
}) {
  const days = useMemo(() => buildHomeworkByDay(feedGroups, scenarioId), [feedGroups, scenarioId]);
  const totalTasks = days.reduce((n, d) => n + d.items.length, 0);

  const firstTask = useMemo((): SelectedTask | null => {
    const day = days[0];
    const item = day?.items[0];
    if (!day || !item) return null;
    return { ...item, dateKey: day.dateKey };
  }, [days]);

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [sourceImageOpen, setSourceImageOpen] = useState(false);
  const [sourceTextOpen, setSourceTextOpen] = useState(false);

  const selected = useMemo((): SelectedTask | null => {
    if (!selectedKey) return firstTask;
    for (const day of days) {
      for (const item of day.items) {
        if (taskKey(item, day.dateKey) === selectedKey) {
          return { ...item, dateKey: day.dateKey };
        }
      }
    }
    return firstTask;
  }, [days, selectedKey, firstTask]);

  useEffect(() => {
    if (firstTask) {
      setSelectedKey(taskKey(firstTask, firstTask.dateKey));
    } else {
      setSelectedKey(null);
    }
  }, [subject.id, firstTask?.card.id, firstTask?.taskIndex, firstTask?.dateKey]);

  useEffect(() => {
    if (!initialTaskQuery) return;
    for (const day of days) {
      const item = day.items.find(x => x.task.includes(initialTaskQuery));
      if (item) {
        setSelectedKey(taskKey(item, day.dateKey));
        return;
      }
    }
  }, [days, initialTaskQuery]);

  const breakdown = useMemo(
    () =>
      selected
        ? buildHomeworkTaskBreakdown(subject.id, selected.task, selected.card)
        : null,
    [subject.id, selected],
  );

  const handleToggleComplete = (item: TaskItem) => {
    if (!onUpdateCard) return;
    onUpdateCard(item.card.id, item.feedDate, toggleHomeworkTaskCompletion(item.card, item.taskIndex));
  };

  if (days.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto px-6 pb-8">
        <div className="flex flex-col items-center justify-center h-72 gap-3">
          <div className="w-14 h-14 rounded-full bg-[#EEF0FF] flex items-center justify-center">
            <ClipboardList size={24} className="text-[#4D5CFF]" />
          </div>
          <p className="text-[14px] text-[#7B8291]">{scenarioId==="common"?`${subject.short}暂无行动`:`${subject.short}学科暂无作业待办`}</p>
          <p className="text-[12px] text-[#B0B5C0] text-center max-w-xs">
            {scenarioId==="common"?"通过加号上传的内容中出现时间、承诺或未决问题时，Memo 会将它分发为可完成的行动。":"上传含截止时间、作业要求或任务清单的内容后，AI 会整理为文字 task 并按天展示"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden bg-[#F5F6FA]">
      {/* 左侧：task 列表 */}
      <div
        className="flex-shrink-0 flex flex-col min-h-0 border-r border-[#EAEDF2]/60"
        style={{ width: "clamp(280px, 38%, 420px)" }}
      >
        <div className="px-5 pt-4 pb-3 flex-shrink-0">
          <p className="text-[13px] text-[#7B8291]">
            共 {totalTasks} 条待办 · 点击圆圈或详情页可标记完成/取消完成
          </p>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-8">
          {days.map(day => (
            <section key={day.dateKey} className="space-y-3">
              <div className="flex items-center gap-3">
                <p className="text-[15px] text-[#41464F]" style={{ fontWeight: 700 }}>
                  {formatFeedDateKey(day.dateKey)}
                </p>
                <span className="text-[12px] text-[#7B8291]">{day.items.length} 条</span>
              </div>
              <ul className="space-y-2">
                {day.items.map((item, i) => {
                  const key = taskKey(item, day.dateKey);
                  const active = selected && taskKey(selected, selected.dateKey) === key;
                  const done = isHomeworkTaskCompleted(item.card, item.taskIndex);
                  return (
                    <li
                      key={`${item.card.id}-${item.taskIndex}-${i}`}
                      className={`flex items-stretch gap-2 rounded-2xl border transition-colors ${
                        done
                          ? active
                            ? "bg-[#BBF7D0] border-[#4ADE80]"
                            : "bg-[#DCFCE7] border-[#86EFAC]"
                          : active
                            ? "bg-[#4D5CFF]/10 border-[#C5CCFF]"
                            : "bg-white border-[#EAEDF2]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleComplete(item)}
                        disabled={!onUpdateCard}
                        className={`flex-shrink-0 pl-3 pr-1 py-3.5 rounded-l-2xl transition-colors disabled:opacity-40 ${
                          done ? "text-[#059669] hover:text-[#047857]" : "text-[#B0B5C0] hover:text-[#10B981]"
                        }`}
                        aria-label={done ? "取消完成" : "标记完成"}
                        title={done ? "取消完成" : "标记完成"}
                      >
                        {done ? (
                          <CheckCircle2 size={22} className="fill-[#10B981] text-white" />
                        ) : (
                          <Circle size={22} strokeWidth={1.75} />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedKey(key)}
                        className={`flex-1 min-w-0 text-left py-3.5 pr-4 rounded-r-2xl transition-colors ${
                          done
                            ? "text-[#065F46] hover:bg-[#BBF7D0]/50"
                            : active
                              ? "text-[#4D5CFF]"
                              : "text-[#020418] hover:bg-[#FAFBFF]"
                        }`}
                      >
                        <p
                          className="text-[14px] leading-relaxed"
                          style={{ fontWeight: active || done ? 600 : 500 }}
                        >
                          {item.task}
                        </p>
                        {scenarioId !== "common" ? <p
                          className={`text-[12px] mt-1.5 truncate ${
                            done
                              ? "text-[#059669]/80"
                              : active
                                ? "text-[#4D5CFF]/70"
                                : "text-[#9CA3AF]"
                          }`}
                        >
                          {done ? "已完成 · " : ""}
                          {item.card.title.replace(/^记忆[:：]\s*/, "")}
                        </p> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>

      {/* 右侧：学生场景展示作业拆解，普通场景展示行动详情 */}
      {selected && breakdown ? (
        scenarioId==="common" ? (()=>{const detail=commonActionDetail(selected.task,subject.short);const origin=commonOriginDetail(selected.card,subject.short);return <div className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-[#F7F8FB]">
          <div className="p-7">
            <section className="overflow-hidden rounded-2xl border border-[#DDE1E9] bg-white shadow-[0_3px_14px_rgba(35,42,70,.04)]">
              <div className="p-5">
                <h2 className="text-[18px] font-bold leading-7 text-[#202532]">{selected.task}</h2>
              </div>
              {selected.card.img ? <div className="flex items-center gap-4 border-b border-[#EAEDF2] bg-[#FAFBFC] px-5 py-3"><button type="button" onClick={()=>setSourceImageOpen(true)} className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-[#E0E4EB] bg-[#F4F5F8]" aria-label="查看完整原图"><img src={selected.card.img} alt={origin.title} className="h-full w-full object-cover object-top transition-transform duration-200 hover:scale-[1.03]" /></button><ViewOriginalImageButton onClick={()=>setSourceImageOpen(true)} label="查看原图" /></div> : selected.card.sourceDocument ? <div className="flex items-center gap-4 border-b border-[#EAEDF2] bg-[#FAFBFC] px-5 py-3"><button type="button" onClick={()=>setSourceTextOpen(true)} className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-xl border border-[#E0E4EB] bg-white text-[#7B8291]" aria-label="查看完整原文"><FileText size={24}/><span className="mt-1 text-[9px]">文档</span></button><ViewOriginalSourceButton onClick={()=>setSourceTextOpen(true)} /></div> : null}
              <div className="p-5">
                <p className="text-[13px] leading-7 text-[#555D6C]">{detail.context.join("；")}。</p>
                {detail.comparison ? <div className="mt-4 overflow-hidden rounded-xl border border-[#E5E8EE]"><div className="grid grid-cols-[1.15fr_1fr_.8fr_.8fr] bg-[#F2F4F8] px-4 py-2 text-[11px] font-semibold text-[#7B8291]"><span>房源</span><span>通勤</span><span>采光</span><span>空间</span></div>{detail.comparison.map(row=><div key={row.name} className="grid grid-cols-[1.15fr_1fr_.8fr_.8fr] border-t border-[#EAEDF2] px-4 py-3 text-[11px] text-[#424957]"><span className="font-semibold">{row.name}</span><span>{row.commute}</span><span>{row.light}</span><span>{row.space}</span></div>)}</div> : null}
                <div className="mt-4 space-y-2">{detail.done.map(item=><div key={item} className="flex items-center rounded-xl bg-[#F7F8FB] px-4 py-3"><Circle size={15} className="mr-3 shrink-0 text-[#4D5CFF]"/><p className="text-[12px] text-[#4F5664]">{item}</p></div>)}</div>
                <p className="mt-4 text-[12px] leading-6 text-[#7B8291]">{detail.after}</p>
              </div>
            </section>
            {selected.card.img ? <OriginalImageOverlay open={sourceImageOpen} onClose={()=>setSourceImageOpen(false)} src={selected.card.img} alt={origin.title} /> : null}
            {selected.card.sourceDocument ? <OriginalSourceOverlay open={sourceTextOpen} onClose={()=>setSourceTextOpen(false)} source={selected.card.sourceDocument} /> : null}
          </div>
        </div>})() : <HomeworkTaskPanel
          task={selected.task}
          breakdown={breakdown}
          subjectShort={subject.short}
          sourceTitle={selected.card.title}
          sourceImage={selected.card.img}
          sourceImageAlt={selected.card.title}
          onUploadCheck={onUploadCheck}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center text-[14px] text-[#B0B5C0]">
          请选择左侧 task
        </div>
      )}
    </div>
  );
}
