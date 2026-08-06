import { Fragment, useEffect, useState } from "react";
import {
  Bell,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Headphones,
  MapPin,
  Pause,
  Play,
  X,
} from "lucide-react";
import type { CardData, FeedGroup } from "../../types";
import { imgNotesBg } from "../../data/initialData";
import {
  cleanCourseName,
  courseIdForName,
  DAY_KEYS,
  normalizeCourseName,
  type TimetableCourse,
  type TimetableData,
} from "../study/timetable";

type ViewMode = "today" | "week";
type PreviewFormat = "video" | "podcast";
export type StudyCourseDestination = "notes" | "homework" | "exam";

type CourseItem = {
  id?: string;
  courseId?: string;
  day: string;
  date: string;
  time: string;
  end: string;
  course: string;
  room: string;
  teacher?: string;
  color: string;
  status?: "new-file" | "questions" | "quiet";
  statusText?: string;
  current?: boolean;
  weekRule?: "单周" | "双周";
  contentLabel?: string;
  previewMinutes?: number;
  previewScope?: string;
  weeks?: string;
  attachedCard?: CardData;
};

const todayCourses: CourseItem[] = [
  {
    day: "周一",
    date: "8月31日",
    time: "08:00",
    end: "09:40",
    course: "大学物理（2）",
    room: "主楼 F101",
    color: "#FF3D67",
    status: "quiet",
    current: true,
  },
  {
    day: "周一",
    date: "8月31日",
    time: "10:10",
    end: "11:55",
    course: "概率论与数理统计 B",
    room: "教4 A503",
    color: "#20CDB0",
    status: "new-file",
    statusText: "老师刚发了《第一章 随机事件与概率》",
    contentLabel: "开始预习",
    previewMinutes: 15,
    previewScope: "定义 + 例题 1",
  },
  {
    day: "周一",
    date: "8月31日",
    time: "13:30",
    end: "15:15",
    course: "信号与系统",
    room: "主楼 C204",
    color: "#FF572D",
    status: "questions",
    statusText: "上节课有 2 个问题未解决",
    contentLabel: "继续笔记",
  },
];

const weekCourses: CourseItem[] = [
  ...todayCourses,
  { day: "周二", date: "9月1日", time: "08:00", end: "09:40", course: "模拟电子技术基础 A", room: "主楼 C101", color: "#F16F86", status: "new-file", statusText: "有 1 份新课件", contentLabel: "开始预习", previewMinutes: 12, previewScope: "二极管特性 + 电路图" },
  { day: "周二", date: "9月1日", time: "10:10", end: "11:55", course: "复变函数与积分变换", room: "教4 A401", color: "#906CEB", status: "quiet" },
  { day: "周三", date: "9月2日", time: "08:00", end: "09:40", course: "大学物理（2）", room: "主楼 F101", color: "#FF3D67", status: "quiet" },
  { day: "周五", date: "9月4日", time: "08:00", end: "09:40", course: "通信专业导论", room: "主楼 B309", color: "#4389EE", status: "quiet" },
  { day: "周五", date: "9月4日", time: "10:10", end: "11:55", course: "形势与政策（3）", room: "教3 A313", color: "#F5A126", status: "quiet" },
  { day: "周一", date: "8月31日", time: "15:40", end: "17:25", course: "物理实验（2）", room: "物理实验室 1", color: "#72A9DE", status: "quiet", weekRule: "双周" },
];

const DAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];
function weekDates(week: number) {
  const start = new Date(2026, 7, 31 + (week - 1) * 7);
  return DAY_LABELS.map((label, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      label,
      dayKey: DAY_KEYS[index],
      month: date.getMonth() + 1,
      date: date.getDate(),
    };
  });
}

const relatedNote: CardData = {
  id: "signal-question-demo",
  title: "记忆：信号与系统课堂疑问",
  source: "notes",
  time: "15:20",
  img: imgNotesBg,
  detailIntro: "上节课留下的两个问题，Memo 已整理到信号与系统课程中。",
  detailSections: [
    { title: "未解决问题", items: ["单位冲激信号为什么可以用于描述瞬时输入？", "卷积积分的图解法如何确定积分区间？"] },
    { title: "建议处理", items: ["下节课重点听老师对卷积上下限的推导", "课后用一个分段函数完成图解练习"] },
  ],
  aiKeyPoints: ["单位冲激", "卷积积分", "图解法"],
  learningContext: {
    course: "信号与系统",
    subject: "通信工程",
    chapter: "卷积与单位冲激",
    phase: "after_class",
    classTime: "周一 13:30—15:15",
    location: "主楼 C204",
    sourceRole: "student",
    capabilities: { knowledgeMap: true, interactive: true },
  },
};

function linkedContent(item: CourseItem): CardData {
  if (item.attachedCard) return item.attachedCard;
  if (item.status === "questions") return relatedNote;

  if (item.status === "new-file") {
    return {
      id: `courseware-${item.course}-${item.day}-${item.time}`,
      title: item.course === "概率论与数理统计 B"
        ? "第一章 随机事件与概率"
        : `${item.course}新课件`,
      source: "courseware",
      time: "10 分钟前",
      img: imgNotesBg,
      detailIntro: `老师为${item.course}发布的课前资料，Memo 已按本次课程自动归档。`,
      detailSections: [
        { title: "本节内容", items: item.course.includes("概率")
          ? ["随机试验、样本空间与随机事件", "事件关系与运算", "概率的公理化定义"]
          : ["本节核心概念与课堂讲解顺序", "需要提前理解的公式和图示"] },
        { title: "预习提示", items: ["先浏览目录与例题，不要求课前完全掌握", "标记看不懂的概念，上课时重点确认"] },
      ],
      aiKeyPoints: item.course.includes("概率")
        ? ["随机事件", "样本空间", "概率公理"]
        : ["课前预习", "核心概念", "课堂重点"],
      hasAnnotations: false,
      sourceDocument: {
        type: "pdf",
        title: item.course === "概率论与数理统计 B"
          ? "第一章 随机事件与概率.pdf"
          : `${item.course}课件.pdf`,
        author: "任课教师",
        paragraphs: [
          "这是演示课件的原文预览。接入学校课程平台后，这里会显示老师实际上传的 PDF。",
          `本文件已自动关联到${item.day} ${item.time}的“${item.course}”课程。`,
        ],
      },
      learningContext: {
        courseId: item.courseId ?? courseIdForName(item.course),
        course: item.course,
        subject: item.course.includes("概率") ? "数学" : "专业课",
        chapter: item.course.includes("概率") ? "第一章 随机事件与概率" : "本周课件",
        phase: "before_class",
        classTime: `${item.day} ${item.time}—${item.end}`,
        location: item.room,
        sourceRole: "teacher",
        capabilities: {
          knowledgeMap: true,
          interactive: false,
        },
      },
    };
  }

  return {
    id: `lesson-${item.course}-${item.day}-${item.time}`,
    title: `${item.course} · 本节课堂笔记`,
    source: "notes",
    time: item.time,
    img: imgNotesBg,
    detailIntro: `与${item.day} ${item.time}课程直接关联的课堂内容。`,
    detailSections: [
      { title: "课程信息", items: [`时间：${item.day} ${item.time}—${item.end}`, `地点：${item.room}`] },
      { title: "课堂记录", items: ["本节笔记尚未补充完整", "拍照、录音或上传课件后，Memo 会继续整理到这里"] },
    ],
    aiKeyPoints: [item.course, "课堂记录", "待补充"],
    hasAnnotations: false,
    learningContext: {
      courseId: item.courseId ?? courseIdForName(item.course),
      course: item.course,
      classTime: `${item.day} ${item.time}—${item.end}`,
      location: item.room,
      phase: item.current ? "in_class" : "after_class",
      sourceRole: "student",
      capabilities: { knowledgeMap: false, interactive: false },
    },
  };
}

function destinationForCourse(item: CourseItem, card: CardData): StudyCourseDestination {
  const explicitAction = [item.contentLabel, item.statusText].filter(Boolean).join(" ");

  // 课表上呈现给用户的动作拥有最高优先级，后台资料标签不能覆盖用户刚点击的入口。
  if (/打开课堂笔记|继续笔记|预习|课前/.test(explicitAction)) return "notes";
  if (/作业|提交|习题|实验报告/.test(explicitAction)) return "homework";
  if (/复习|备考|考试|考前|测验/.test(explicitAction)) return "exam";

  const visibleAction = [
    card.nextAction,
    ...((card.learningActions ?? []).map(action => `${action.type} ${action.title}`)),
  ].filter(Boolean).join(" ");

  // 课表没有明确动作时，再根据资料中抽取出的学习任务判断。
  if (/作业|提交|习题|实验报告/.test(visibleAction)) return "homework";
  if (/复习|备考|考试|考前|测验|review/.test(visibleAction)) return "exam";
  if (/预习|课前|preview/.test(visibleAction)) return "notes";

  // 没有显式动作时，再使用入库识别结果和学习阶段。
  if (
    card.contentType === "homework"
    || card.learningContext?.phase === "homework"
    || card.ingestionDecision?.materialType === "homework"
    || card.ingestionDecision?.destinations.includes("homework")
  ) {
    return "homework";
  }
  if (
    card.learningContext?.phase === "exam"
    || card.ingestionDecision?.materialType === "exam"
    || card.ingestionDecision?.destinations.includes("exam")
  ) {
    return "exam";
  }
  return "notes";
}

function courseRunsInWeek(item: CourseItem, week: number): boolean {
  if (item.weekRule === "单周" && week % 2 === 0) return false;
  if (item.weekRule === "双周" && week % 2 === 1) return false;
  if (!item.weeks) return true;
  const ranges = item.weeks.match(/\d+\s*(?:[-—~至]\s*\d+)?/g);
  if (!ranges?.length) return true;
  return ranges.some(range => {
    const values = range.match(/\d+/g)?.map(Number) ?? [];
    return values.length === 1 ? week === values[0] : week >= values[0] && week <= values[1];
  });
}

function allCards(feedGroups: Record<string, FeedGroup[]>): CardData[] {
  return Object.values(feedGroups).flatMap(groups => groups.flatMap(group => group.cards));
}

function attachedCardsForCourse(course: CourseItem, cards: CardData[]): CardData[] {
  const courseId = course.courseId ?? courseIdForName(course.course);
  const normalizedName = normalizeCourseName(course.course);
  return cards.filter(card =>
    card.learningContext?.courseId === courseId
    || (!!card.learningContext?.course && normalizeCourseName(card.learningContext.course) === normalizedName),
  );
}

function enrichCourse(
  course: CourseItem,
  cards: CardData[],
  fallbackIndex: number,
): CourseItem {
  const linked = attachedCardsForCourse(course, cards);
  if (!linked.length) return course;
  const beforeClass = linked.find(card => card.learningContext?.phase === "before_class");
  const afterClass = linked.find(card =>
    card.learningContext?.phase === "in_class" || card.learningContext?.phase === "after_class",
  );
  const attachedCard = course.current ? (afterClass ?? linked[0]) : (beforeClass ?? afterClass ?? linked[0]);
  if (course.current) {
    return { ...course, attachedCard, status: "quiet" };
  }
  if (beforeClass) {
    const previewAction = beforeClass.learningActions?.find(action =>
      action.type === "preview" || action.type === "class_reminder",
    );
    return {
      ...course,
      attachedCard,
      status: "new-file",
      statusText: previewAction?.title ?? `已关联《${beforeClass.title.replace(/^记忆：/, "")}》`,
      contentLabel: "开始预习",
      previewMinutes: course.previewMinutes ?? 15,
      previewScope: course.previewScope ?? "重点概念 + 例题",
    };
  }
  return {
    ...course,
    attachedCard,
    status: "questions",
    statusText: "有课堂笔记可以继续整理",
    contentLabel: "继续笔记",
    color: course.color || ["#4D5CFF", "#20CDB0", "#F59E0B"][fallbackIndex % 3],
  };
}

const COURSE_TINTS = [
  { background: "#EEF2FF", border: "#D9E0FF", text: "#4453B8" },
  { background: "#ECF9F5", border: "#D3F0E7", text: "#287A65" },
  { background: "#FFF7E8", border: "#F8E8C6", text: "#9A6A22" },
  { background: "#FFF0F5", border: "#F5DCE7", text: "#A34D70" },
  { background: "#F4F0FF", border: "#E4DAFA", text: "#6F55A9" },
  { background: "#EAF7FC", border: "#D4ECF5", text: "#2E718C" },
] as const;

function courseTint(courseName: string) {
  const normalized = normalizeCourseName(courseName);
  const hash = Array.from(normalized).reduce((sum, char) => sum + (char.codePointAt(0) ?? 0), 0);
  return COURSE_TINTS[hash % COURSE_TINTS.length];
}

function courseNameInText(value: string, timetable: TimetableData): string | null {
  const normalizedValue = normalizeCourseName(value);
  if (!normalizedValue) return null;
  return [...new Set(timetable.courses.map(course => cleanCourseName(course.course)))]
    .sort((a, b) => b.length - a.length)
    .find(course => normalizedValue.includes(normalizeCourseName(course))) ?? null;
}

function SourceSheetPreview({ timetable }: { timetable: TimetableData }) {
  const rows = timetable.sourceRows ?? [];
  const starts = new Map<string, { rowSpan: number; colSpan: number }>();
  const covered = new Set<string>();
  (timetable.sourceMerges ?? []).forEach(merge => {
    starts.set(`${merge.s.r}:${merge.s.c}`, {
      rowSpan: merge.e.r - merge.s.r + 1,
      colSpan: merge.e.c - merge.s.c + 1,
    });
    for (let row = merge.s.r; row <= merge.e.r; row += 1) {
      for (let column = merge.s.c; column <= merge.e.c; column += 1) {
        if (row !== merge.s.r || column !== merge.s.c) covered.add(`${row}:${column}`);
      }
    }
  });
  const columnCount = Math.max(...rows.map(row => row.length), 1);

  return (
    <div className="inline-block min-w-full overflow-hidden rounded-xl border border-[#DDE1EA] bg-white shadow-sm">
      <table className="border-collapse text-[10px] text-[#303644]">
        <tbody>
          {rows.map((row, rowIndex) => {
            const rowCourses = [...new Set(row.map(value => courseNameInText(value ?? "", timetable)).filter((course): course is string => !!course))];
            const singleRowCourse = rowCourses.length === 1 ? rowCourses[0] : null;
            return (
            <tr key={rowIndex}>
              {Array.from({ length: columnCount }, (_, columnIndex) => {
                const key = `${rowIndex}:${columnIndex}`;
                if (covered.has(key)) return null;
                const merge = starts.get(key);
                const value = row[columnIndex] ?? "";
                const matchedCourse = rowIndex > 1
                  ? (courseNameInText(value, timetable) ?? singleRowCourse)
                  : null;
                const tint = matchedCourse ? courseTint(matchedCourse) : null;
                return (
                  <td
                    key={key}
                    rowSpan={merge?.rowSpan}
                    colSpan={merge?.colSpan}
                    className={`min-w-[96px] whitespace-pre-line border border-[#E1E5EE] px-3 py-2 align-middle ${
                      rowIndex <= 1 ? "bg-[#F3F5FA] font-semibold text-[#242A36]" : "bg-white"
                    }`}
                    style={tint ? { backgroundColor: tint.background, color: tint.text } : undefined}
                  >
                    {value || "\u00a0"}
                  </td>
                );
              })}
            </tr>
          )})}
        </tbody>
      </table>
    </div>
  );
}

export function StudyView({
  onNavigateCourse,
  timetable,
  timetables,
  onSelectSemester,
  allFeedGroups,
}: {
  onNavigateCourse: (
    courseId: string,
    destination: StudyCourseDestination,
    syllabusEntryId?: string,
  ) => void;
  timetable: TimetableData | null;
  timetables: TimetableData[];
  onSelectSemester: (semester: string) => void;
  allFeedGroups: Record<string, FeedGroup[]>;
}) {
  const [mode, setMode] = useState<ViewMode>("today");
  const [week, setWeek] = useState(1);
  const [selectedDay, setSelectedDay] = useState(0);
  const [semesterOpen, setSemesterOpen] = useState(false);
  const [selectedCourseKey, setSelectedCourseKey] = useState<string | null>(null);
  const [showTimetableSource, setShowTimetableSource] = useState(false);
  const [previewReminderVisible, setPreviewReminderVisible] = useState(
    () => localStorage.getItem("memo_preview_reminder_dismissed_v1") !== "1",
  );
  const [previewFormat, setPreviewFormat] = useState<PreviewFormat | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const semester = timetable?.semester ?? "暂无课表";
  const dates = weekDates(week);
  const selectedDate = dates[selectedDay];
  const storedCourses: CourseItem[] = timetable?.courses.map((course: TimetableCourse, index) => {
    const demoState = weekCourses.find(item =>
      item.day === course.day
      && item.time === course.time
      && normalizeCourseName(item.course) === normalizeCourseName(course.course),
    );
    return {
      ...demoState,
      ...course,
      course: cleanCourseName(course.course),
      date: "",
      color: demoState?.color ?? ["#4D5CFF", "#20CDB0", "#F59E0B", "#8B5CF6", "#EC4899"][index % 5],
    };
  }) ?? weekCourses.map(course => ({
    ...course,
    courseId: courseIdForName(course.course),
  }));
  const cards = allCards(allFeedGroups);
  const scheduledCourses = storedCourses
    .filter(item => courseRunsInWeek(item, week))
    .map((course, index) => enrichCourse(course, cards, index));
  const courses = mode === "today"
    ? scheduledCourses.filter(item => item.day === selectedDate.dayKey)
    : scheduledCourses;
  const weekStart = dates[0];
  const weekEnd = dates[6];
  const previewReminderCourse = scheduledCourses.find(item =>
    item.attachedCard?.learningContext?.phase === "before_class"
    && normalizeCourseName(item.course).includes("大学物理"),
  ) ?? scheduledCourses.find(item => item.attachedCard?.learningContext?.phase === "before_class");

  const changeWeek = (next: number) => {
    setWeek(Math.min(20, Math.max(1, next)));
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-[#F5F6FA] px-6 pb-10">
      <div className="mx-auto max-w-[1040px] pt-6">
        {previewReminderVisible && previewReminderCourse && (
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-[#D9DFFF] bg-[#F1F4FF] px-4 py-3">
            <button
              onClick={() => {
                setPreviewFormat("video");
                setPreviewPlaying(false);
              }}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
              aria-label={`查看${previewReminderCourse.course}的预习详情`}
            >
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white text-[#4D5CFF] shadow-sm">
                <Bell size={18} strokeWidth={2.2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-bold text-[#15182A]">
                  明天有{previewReminderCourse.course}，可以提前预习
                </span>
                <span className="mt-1 block truncate text-[10px] text-[#737B91]">
                  {previewReminderCourse.attachedCard?.title.replace(/^记忆：/, "")}
                </span>
              </span>
            </button>
            <button
              onClick={() => {
                setPreviewReminderVisible(false);
                localStorage.setItem("memo_preview_reminder_dismissed_v1", "1");
              }}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[#8D95A8] hover:bg-white hover:text-[#4D5CFF]"
              aria-label="关闭预习提醒"
            >
              <X size={15} />
            </button>
          </div>
        )}
        <header className="mb-4 flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CalendarDays size={19} className="text-[#4D5CFF]" />
              <h1 className="text-[22px] font-bold text-[#020418]">课程表</h1>
            </div>
            <div className="relative">
              <button
                onClick={() => setSemesterOpen(open => !open)}
                className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-[#7B8291]"
              >
                {semester} <ChevronRight size={11} />
              </button>
              {semesterOpen && (
                <div className="absolute left-0 top-8 z-20 w-[220px] rounded-xl border border-[#E4E7EF] bg-white p-1.5 shadow-[0_12px_30px_rgba(2,4,24,0.12)]">
                  {timetables.map(item => (
                    <button
                      key={item.semester}
                      onClick={() => {
                        onSelectSemester(item.semester);
                        setSemesterOpen(false);
                        setWeek(1);
                        setSelectedDay(0);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[10px] ${
                        semester === item.semester ? "bg-[#EEF0FF] font-semibold text-[#4D5CFF]" : "text-[#41464F] hover:bg-[#F5F6FA]"
                      }`}
                    >
                      <span>
                        {item.semester}
                        <span className="ml-1 text-[#A0A7B5]">
                          · {new Set(item.courses.map(course => course.courseId)).size} 门
                        </span>
                      </span>
                      {semester === item.semester && <Check size={12} />}
                    </button>
                  ))}
                  {timetables.length === 0 && (
                    <div className="px-3 py-2 text-[10px] text-[#A0A7B5]">请先上传课程表</div>
                  )}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowTimetableSource(true)}
            className="rounded-lg border border-[#E5E7EF] bg-white px-3 py-2 text-[10px] font-semibold text-[#7B8291] hover:border-[#D6DBFF] hover:text-[#4D5CFF]"
          >
            学期课表
          </button>
        </header>

        <section className="rounded-t-2xl border border-b-0 border-[#EAEDF2] bg-white px-5 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => changeWeek(week - 1)}
                disabled={week === 1}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-[#7B8291] hover:bg-[#F5F6FA] disabled:opacity-30"
                aria-label="上一周"
              >
                <ChevronLeft size={15} />
              </button>
              <div className="min-w-[150px] text-center">
                <p className="text-[12px] font-bold text-[#020418]">第 {week} 周</p>
                <p className="mt-0.5 text-[9px] text-[#9CA3AF]">
                  {weekStart.month}月{weekStart.date}日—{weekEnd.month}月{weekEnd.date}日
                </p>
              </div>
              <button
                onClick={() => changeWeek(week + 1)}
                disabled={week === 20}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-[#7B8291] hover:bg-[#F5F6FA] disabled:opacity-30"
                aria-label="下一周"
              >
                <ChevronRight size={15} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              {(week !== 1 || selectedDay !== 0 || mode !== "today") && (
                <button
                  onClick={() => { setWeek(1); setSelectedDay(0); setMode("today"); }}
                  className="rounded-lg bg-[#F5F6FA] px-3 py-1.5 text-[10px] font-semibold text-[#4D5CFF]"
                >
                  回到本周
                </button>
              )}
            </div>
          </div>

          {mode === "today" && (
            <div className="mt-3 grid grid-cols-7 gap-2 border-t border-[#F0F1F5] pt-2.5">
              {dates.map((item, index) => {
                const active = selectedDay === index;
                const courseCount = scheduledCourses.filter(course => course.day === item.dayKey).length;
                return (
                  <button
                    key={item.dayKey}
                    onClick={() => setSelectedDay(index)}
                    className={`rounded-xl py-1.5 text-center transition-colors ${
                      active ? "border border-[#C9CFFF] bg-[#EEF0FF] text-[#4D5CFF]" : "border border-transparent text-[#7B8291] hover:bg-[#F5F6FA]"
                    }`}
                  >
                    <span className={`block text-[9px] ${active ? "text-[#6F78B8]" : "text-[#9CA3AF]"}`}>周{item.label}</span>
                    <span className="mt-0.5 block text-[13px] font-bold">{item.date}</span>
                    <span className={`mx-auto mt-1 block h-1 w-1 rounded-full ${
                      courseCount > 0 ? "bg-[#4D5CFF]" : "bg-transparent"
                    }`} />
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <div>
          <section className="rounded-b-2xl border border-[#EAEDF2] bg-white px-5 pb-5 pt-3">
            <div className="space-y-1">
              {courses.length === 0 && (
                <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
                  <CalendarDays size={24} className="text-[#D4D8E1]" />
                  <p className="mt-3 text-[12px] font-semibold text-[#7B8291]">这一天没有课程</p>
                  <p className="mt-1 text-[10px] text-[#B0B5C0]">可以查看其他日期或切换周课表</p>
                </div>
              )}
              {courses.map((item, index) => {
                const showDay = mode === "week" && (index === 0 || courses[index - 1]?.day !== item.day);
                const content = linkedContent(item);
                const courseKey = `${item.day}-${item.time}-${item.course}`;
                const selected = selectedCourseKey === courseKey;
                const showReviewDemo = item.current && normalizeCourseName(item.course).includes("大学物理");
                const openContent = () => {
                  setSelectedCourseKey(courseKey);
                  onNavigateCourse(
                    item.courseId ?? courseIdForName(item.course),
                    destinationForCourse(item, content),
                    content.syllabusEntryId,
                  );
                };
                return (
                  <div key={`${item.day}-${item.time}-${item.course}`}>
                    {showDay && (
                      <div className="pb-2 pt-4 first:pt-0">
                        <span className="text-[10px] font-bold text-[#9CA3AF]">
                          {item.day} · {dates[DAY_KEYS.indexOf(item.day)]?.month}月{dates[DAY_KEYS.indexOf(item.day)]?.date}日
                        </span>
                      </div>
                    )}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={openContent}
                      onKeyDown={event => { if (event.key === "Enter") openContent(); }}
                      className={`grid cursor-pointer grid-cols-[64px_1fr] gap-3 rounded-xl border px-3 py-3.5 transition-colors ${
                        selected
                          ? "border-[#C9CFFF] bg-[#F5F6FF] shadow-[0_4px_16px_rgba(77,92,255,0.08)]"
                          : "border-transparent hover:bg-[#FAFAFC]"
                      }`}
                    >
                      <div className="pt-0.5">
                        <p className={`text-[12px] font-bold ${selected ? "text-[#4D5CFF]" : "text-[#020418]"}`}>{item.time}</p>
                        {item.end && item.end !== item.time && <p className="mt-1 text-[9px] text-[#B0B5C0]">{item.end}</p>}
                      </div>
                      <div
                        className="min-w-0 border-l-2 pl-4"
                        style={{ borderColor: selected ? "#AEB7FF" : "#DDE1EA" }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-[13px] font-bold text-[#020418]">{item.course}</p>
                              {item.weekRule && (
                                <span className="rounded bg-[#F5F6FA] px-1.5 py-0.5 text-[8px] font-semibold text-[#7B8291]">{item.weekRule}</span>
                              )}
                            </div>
                            <p className="mt-1 flex items-center gap-1 text-[10px] text-[#9CA3AF]"><MapPin size={10} />{item.room}</p>
                            {(item.teacher || item.weeks) && (
                              <p className="mt-1 text-[9px] text-[#A0A6B2]">
                                {[item.teacher, item.weeks].filter(Boolean).join(" · ")}
                              </p>
                            )}
                          </div>
                          {showReviewDemo && week === 1 && selectedDay === 0 && mode === "today" && (
                            <button
                              onClick={event => {
                                event.stopPropagation();
                                onNavigateCourse(
                                  item.courseId ?? courseIdForName(item.course),
                                  "exam",
                                );
                              }}
                              className="flex-shrink-0 rounded-lg border border-[#DDD8FF] bg-[#F7F5FF] px-3 py-2 text-[10px] font-semibold text-[#6C5BD7] hover:bg-[#EFECFF]"
                            >
                              开始备考
                            </button>
                          )}
                          {item.status === "new-file" && (
                            <button
                              onClick={event => {
                                event.stopPropagation();
                                openContent();
                              }}
                              className="flex-shrink-0 rounded-lg border border-[#DDE1F8] bg-white px-3 py-2 text-[10px] font-semibold text-[#6671C6] hover:bg-[#F7F8FF]"
                            >
                              {item.contentLabel ?? "打开课件"}
                            </button>
                          )}
                          {item.status === "questions" && (
                            <button
                              onClick={event => {
                                event.stopPropagation();
                                openContent();
                              }}
                              className="flex-shrink-0 rounded-lg border border-[#E7E0D5] bg-white px-3 py-2 text-[10px] font-semibold text-[#9A6B2F] hover:bg-[#FFFBF5]"
                            >
                              {item.contentLabel ?? "继续笔记"}
                            </button>
                          )}
                        </div>

                        {item.statusText && (
                          <div className={`mt-2 flex items-center gap-1.5 text-[10px] ${
                            item.status === "new-file" ? "text-[#4D5CFF]" : "text-[#C87911]"
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${item.status === "new-file" ? "bg-[#4D5CFF]" : "bg-[#F59E0B]"}`} />
                            <span>{item.statusText}</span>
                          </div>
                        )}
                        {item.previewMinutes && (
                          <div className="mt-2 flex items-center gap-3 text-[9px] text-[#7B8291]">
                            <span className="flex items-center gap-1"><Clock3 size={10} />预计 {item.previewMinutes} 分钟</span>
                            <span>建议：{item.previewScope}</span>
                          </div>
                        )}
                        {showReviewDemo && week === 1 && selectedDay === 0 && mode === "today" && (
                          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-[#6C5BD7]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#7C6BE8]" />
                            <span>7天后阶段考试 · 已整理 9 个考点</span>
                          </div>
                        )}

                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

        </div>
      </div>

      {previewFormat && previewReminderCourse && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#101326]/40 p-6"
          onClick={() => {
            setPreviewFormat(null);
            setPreviewPlaying(false);
          }}
        >
          <div
            className="relative w-full max-w-[560px] overflow-hidden rounded-3xl bg-white shadow-[0_24px_80px_rgba(15,23,42,0.24)]"
            onClick={event => event.stopPropagation()}
          >
            <button
              onClick={() => {
                setPreviewFormat(null);
                setPreviewPlaying(false);
              }}
              className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#7B8291] shadow-sm hover:text-[#4D5CFF]"
              aria-label="关闭预习详情"
            >
              <X size={15} />
            </button>

            <div className="p-6">
              <section className="rounded-2xl border border-[#E5E8F4] bg-[#F8F9FD] p-4">
                <p className="text-[10px] font-bold text-[#6872C8]">本次预习</p>
                <p className="mt-1 text-[14px] font-bold text-[#202541]">
                  {previewReminderCourse.attachedCard?.title.replace(/^记忆：/, "")}
                </p>
                <p className="mt-2 text-[11px] leading-5 text-[#697187]">
                  {previewReminderCourse.attachedCard?.overview ?? "先熟悉本节核心概念，带着问题进入课堂。"}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(previewReminderCourse.attachedCard?.aiKeyPoints ?? ["核心概念", "课堂重点"])
                    .slice(0, 3)
                    .map(point => (
                      <span key={point} className="rounded-md bg-white px-2 py-1 text-[9px] font-semibold text-[#5866D8] ring-1 ring-[#E1E5FF]">{point}</span>
                    ))}
                </div>
                <p className="mt-3 text-[9px] text-[#8C94A6]">
                  资料：{previewReminderCourse.attachedCard?.sourceDocument?.title ?? "课程预习资料"}
                  {previewReminderCourse.attachedCard?.sourceDocument?.page ? ` · 第 ${previewReminderCourse.attachedCard.sourceDocument.page} 页` : ""}
                </p>
              </section>

              <div className="mt-4 inline-flex rounded-xl border border-[#E1E5F1] bg-[#F7F8FC] p-1">
                <button
                  onClick={() => { setPreviewFormat("video"); setPreviewPlaying(false); }}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-semibold ${previewFormat === "video" ? "bg-white text-[#4D5CFF] shadow-sm" : "text-[#7B8291]"}`}
                >
                  <Play size={11} fill="currentColor" /> 视频预习 · 8分钟
                </button>
                <button
                  onClick={() => { setPreviewFormat("podcast"); setPreviewPlaying(false); }}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-semibold ${previewFormat === "podcast" ? "bg-white text-[#4D5CFF] shadow-sm" : "text-[#7B8291]"}`}
                >
                  <Headphones size={12} /> 播客预习 · 12分钟
                </button>
              </div>

              {previewFormat === "video" ? (
                <div className="relative mt-4 flex h-[232px] items-center justify-center overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#202B5B_0%,#4D5CFF_58%,#8C9AFF_100%)]">
                  <div className="absolute left-6 top-5 text-white">
                    <p className="text-[10px] font-semibold text-white/70">课前 8 分钟</p>
                    <p className="mt-1 text-[18px] font-bold">从磁通量到楞次定律</p>
                    <p className="mt-1 text-[10px] text-white/75">用一个线圈实验看懂“增反减同”</p>
                  </div>
                  <button
                    onClick={() => setPreviewPlaying(value => !value)}
                    className="mt-10 flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#4D5CFF] shadow-xl"
                    aria-label={previewPlaying ? "暂停视频" : "播放视频"}
                  >
                    {previewPlaying ? <Pause size={21} fill="currentColor" /> : <Play size={21} fill="currentColor" className="ml-0.5" />}
                  </button>
                  <div className="absolute bottom-4 left-5 right-5">
                    <div className="h-1 overflow-hidden rounded-full bg-white/30">
                      <div className={`h-full rounded-full bg-white transition-all duration-500 ${previewPlaying ? "w-[38%]" : "w-[12%]"}`} />
                    </div>
                    <div className="mt-1.5 flex justify-between text-[9px] text-white/70">
                      <span>{previewPlaying ? "03:04" : "00:00"}</span><span>08:00</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex h-[232px] items-center rounded-2xl bg-[#F4F1FF] px-6 py-7">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setPreviewPlaying(value => !value)}
                      className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-[#4D5CFF] text-white shadow-[0_8px_20px_rgba(77,92,255,0.24)]"
                      aria-label={previewPlaying ? "暂停播客" : "播放播客"}
                    >
                      {previewPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-bold text-[#282D49]">上课前听懂楞次定律</p>
                      <p className="mt-1 text-[10px] text-[#777F98]">从生活中的电磁制动讲到感应电流方向</p>
                      <div className="mt-4 flex h-7 items-center gap-1">
                        {[12, 19, 9, 24, 16, 27, 11, 21, 14, 25, 17, 10, 22, 15, 26, 12, 20, 9, 18, 13].map((height, index) => (
                          <span
                            key={index}
                            className={`w-1 rounded-full ${previewPlaying && index < 8 ? "bg-[#4D5CFF]" : "bg-[#C5C9DD]"}`}
                            style={{ height }}
                          />
                        ))}
                      </div>
                      <div className="mt-1 flex justify-between text-[9px] text-[#9299AC]"><span>{previewPlaying ? "04:18" : "00:00"}</span><span>12:00</span></div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {showTimetableSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-8" onClick={() => setShowTimetableSource(false)}>
          <div className="max-h-[88vh] w-full max-w-[920px] overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={event => event.stopPropagation()}>
            <header className="flex items-center justify-between border-b border-[#EAEDF2] px-6 py-4">
              <div>
                <h2 className="text-[16px] font-bold text-[#020418]">{timetable?.semester ?? "2026–2027 学年第一学期"}课表</h2>
                <p className="mt-1 text-[10px] text-[#9CA3AF]">
                  {timetable ? `${timetable.sourceFileName} · ${timetable.sourceSheetName}` : "教务系统导入 · 原课表"}
                </p>
              </div>
              <button onClick={() => setShowTimetableSource(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F5F6FA] text-[#7B8291]" aria-label="关闭原课表">
                <X size={16} />
              </button>
            </header>
            <div className="max-h-[calc(88vh-72px)] overflow-auto bg-[#F7F8FC] p-5">
              {timetable?.sourceRows?.length ? (
                <SourceSheetPreview timetable={timetable} />
              ) : (
              <div>
                {timetable && (
                  <div className="mb-3 rounded-xl border border-[#F5D9A8] bg-[#FFF9EE] px-4 py-3 text-[10px] text-[#93611C]">
                    这份课表是在源文件预览功能加入前导入的。重新上传同一个 Excel 后，这里会显示原工作表。
                  </div>
                )}
                <div className="grid min-w-[980px] grid-cols-[72px_repeat(7,1fr)] overflow-hidden rounded-xl border border-[#E1E5EE] bg-white">
                <div className="border-b border-r border-[#E1E5EE] p-3 text-center text-[10px] font-semibold text-[#9CA3AF]">节次</div>
                {DAY_KEYS.map(day => (
                  <div key={day} className="border-b border-r border-[#E1E5EE] p-3 text-center text-[11px] font-bold text-[#41464F] last:border-r-0">{day}</div>
                ))}
                {Array.from(new Set(storedCourses.map(course => course.time))).sort().map(time => (
                  <Fragment key={time}>
                    <div key={`${time}-label`} className="border-b border-r border-[#E1E5EE] p-3 text-center text-[10px] font-semibold text-[#7B8291]">{time}</div>
                    {DAY_KEYS.map(day => {
                      const cellCourses = storedCourses.filter(item => item.day === day && item.time === time);
                      return (
                        <div key={`${day}-${time}`} className="min-h-[86px] border-b border-r border-[#E1E5EE] p-2 last:border-r-0">
                          <div className="space-y-1.5">
                            {cellCourses.map(course => {
                              const tint = courseTint(course.course);
                              return (
                              <div
                                key={course.id ?? `${course.course}-${course.weeks}`}
                                className="rounded-lg border p-2"
                                style={{ backgroundColor: tint.background, borderColor: tint.border }}
                              >
                                <p className="text-[10px] font-bold leading-4" style={{ color: tint.text }}>{course.course}</p>
                                <p className="mt-1 text-[9px] text-[#7B8291]">{course.room}</p>
                                {course.teacher && <p className="mt-1 text-[8px] text-[#7B8291]">{course.teacher}</p>}
                                {(course.weeks || course.weekRule) && (
                                  <p className="mt-1 text-[8px] text-[#9CA3AF]">{course.weeks || course.weekRule}</p>
                                )}
                              </div>
                            )})}
                          </div>
                        </div>
                      );
                    })}
                  </Fragment>
                ))}
                </div>
              </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
