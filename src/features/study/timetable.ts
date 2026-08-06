export const DAY_KEYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"] as const;
export type TimetableDay = (typeof DAY_KEYS)[number];

export interface TimetableCourse {
  id: string;
  courseId: string;
  day: TimetableDay;
  time: string;
  end: string;
  course: string;
  room: string;
  teacher?: string;
  weekRule?: "单周" | "双周";
  weeks?: string;
}

export interface TimetableData {
  semester: string;
  semesterDetection?: {
    source: "file_name" | "sheet_name" | "sheet_content" | "file_date";
    confidence: number;
  };
  sourceFileName: string;
  sourceSheetName: string;
  importedAt: number;
  courses: TimetableCourse[];
  /** 原工作表的格式化单元格内容，用于“查看源文件”而不是展示二次整理结果 */
  sourceRows?: string[][];
  sourceMerges?: TimetableCellMerge[];
}

export interface TimetableCellMerge {
  s: { r: number; c: number };
  e: { r: number; c: number };
}

const STORAGE_KEY = "memo_semester_timetable_v1";
const STORAGE_COLLECTION_KEY = "memo_semester_timetables_v2";
const STORAGE_ACTIVE_KEY = "memo_active_semester_v2";

const TIME_BY_SECTION: Record<string, [string, string]> = {
  "1": ["08:00", "08:45"],
  "2": ["08:55", "09:40"],
  "1-2": ["08:00", "09:40"],
  "3": ["10:10", "10:55"],
  "4": ["11:10", "11:55"],
  "3-4": ["10:10", "11:55"],
  "5": ["13:30", "14:15"],
  "6": ["14:30", "15:15"],
  "5-6": ["13:30", "15:15"],
  "7": ["15:40", "16:25"],
  "8": ["16:40", "17:25"],
  "7-8": ["15:40", "17:25"],
  "9": ["18:30", "19:15"],
  "10": ["19:30", "20:15"],
  "9-10": ["18:30", "20:15"],
};

function text(value: unknown): string {
  return String(value ?? "").replace(/\r/g, "").trim();
}

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function normalizeCourseName(name: string): string {
  return name.toLowerCase().replace(/[\s（）()·\-—_]/g, "");
}

export function courseIdForName(name: string): string {
  return `course_${stableHash(normalizeCourseName(name))}`;
}

export function cleanCourseName(name: string): string {
  return name.replace(/^[\s:：;；、，,]+/, "").trim();
}

function normalizeDay(value: unknown): TimetableDay | null {
  return normalizeDays(value)[0] ?? null;
}

function normalizeDays(value: unknown): TimetableDay[] {
  const raw = text(value).replace(/\s/g, "");
  if (!raw) return [];
  const indexMap: Record<string, number> = {
    一: 0, "1": 0, 二: 1, "2": 1, 三: 2, "3": 2, 四: 3, "4": 3,
    五: 4, "5": 4, 六: 5, "6": 5, 日: 6, 天: 6, "7": 6,
  };
  const range = raw.match(/(?:周|星期|礼拜)?([一二三四五六日天1-7])(?:至|到|[-—~])(?:周|星期|礼拜)?([一二三四五六日天1-7])/);
  if (range) {
    const start = indexMap[range[1]];
    const end = indexMap[range[2]];
    if (start !== undefined && end !== undefined) {
      return DAY_KEYS.slice(Math.min(start, end), Math.max(start, end) + 1);
    }
  }
  const matches = Array.from(raw.matchAll(/(?:周|星期|礼拜)([一二三四五六日天1-7])/g))
    .map(match => DAY_KEYS[indexMap[match[1]]])
    .filter((day): day is TimetableDay => !!day);
  if (matches.length) return Array.from(new Set(matches));
  const direct = DAY_KEYS.filter(day => raw.includes(day));
  if (direct.length) return direct;
  const single = raw.match(/^([一二三四五六日天1-7])$/);
  return single ? [DAY_KEYS[indexMap[single[1]]]] : [];
}

function normalizeTime(value: unknown): string {
  if (typeof value === "number" && value > 0 && value < 1) {
    const totalMinutes = Math.round(value * 24 * 60);
    return `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(totalMinutes % 60).padStart(2, "0")}`;
  }
  const raw = text(value);
  const match = raw.match(/(\d{1,2})[:：点时](\d{1,2})?/);
  if (!match) return "";
  return `${match[1].padStart(2, "0")}:${(match[2] ?? "00").padStart(2, "0")}`;
}

function sectionTimes(value: unknown): [string, string] | null {
  const raw = text(value);
  const times = raw.match(/\d{1,2}[:：]\d{2}/g);
  if (times?.length) {
    const start = normalizeTime(times[0]);
    const end = times[1] ? normalizeTime(times[1]) : "";
    return [start, end || inferEndTime(start)];
  }
  const numbers = raw.match(/\d+/g);
  if (!numbers?.length) return null;
  const key = numbers.length >= 2 ? `${numbers[0]}-${numbers[numbers.length - 1]}` : numbers[0];
  return TIME_BY_SECTION[key] ?? TIME_BY_SECTION[numbers[0]] ?? null;
}

function inferEndTime(start: string): string {
  const defaults: Record<string, string> = {
    "08:00": "09:40", "08:55": "09:40", "10:10": "11:55", "11:10": "11:55",
    "13:30": "15:15", "14:30": "15:15", "15:40": "17:25", "16:40": "17:25",
    "18:30": "20:15", "19:30": "20:15",
  };
  return defaults[start] ?? start;
}

function parseWeekRule(value: unknown): "单周" | "双周" | undefined {
  const raw = text(value);
  if (/单周|单数周/.test(raw)) return "单周";
  if (/双周|双数周/.test(raw)) return "双周";
  return undefined;
}

function makeCourse(
  raw: Omit<TimetableCourse, "id" | "courseId">,
): TimetableCourse {
  const cleanedCourse = cleanCourseName(raw.course);
  const courseId = courseIdForName(cleanedCourse);
  return {
    ...raw,
    course: cleanedCourse,
    courseId,
    id: `${courseId}_${raw.day}_${raw.time}_${stableHash(`${raw.room}${raw.weeks ?? ""}`)}`,
  };
}

/**
 * 新用户首次打开演示站时展示的课程表。
 * 真实课表一旦导入，会以同学期的数据替换此示例；已有本地课表不会被改动。
 */
const DEMO_TIMETABLE: TimetableData = {
  semester: "2026—2027 学年第一学期",
  semesterDetection: { source: "sheet_content", confidence: 1 },
  sourceFileName: "Memo 演示课表.xlsx",
  sourceSheetName: "2026-2027-1",
  importedAt: 1786051200000,
  courses: [
    makeCourse({ day: "周一", time: "08:00", end: "09:40", course: "大学物理（2）", room: "主楼 F101", teacher: "李老师", weeks: "1-18周" }),
    makeCourse({ day: "周一", time: "10:10", end: "11:55", course: "高等数学", room: "教4 A503", teacher: "王老师", weeks: "1-18周" }),
    makeCourse({ day: "周一", time: "13:30", end: "15:15", course: "信号与系统", room: "主楼 C204", teacher: "张老师", weeks: "1-18周" }),
    makeCourse({ day: "周二", time: "08:00", end: "09:40", course: "模拟电子技术基础 A", room: "主楼 C101", teacher: "陈老师", weeks: "1-18周" }),
    makeCourse({ day: "周三", time: "08:00", end: "09:40", course: "大学物理（2）", room: "主楼 F101", teacher: "李老师", weeks: "1-18周" }),
    makeCourse({ day: "周三", time: "10:10", end: "11:55", course: "高等数学", room: "教4 A503", teacher: "王老师", weeks: "1-18周" }),
    makeCourse({ day: "周五", time: "08:00", end: "09:40", course: "通信专业导论", room: "主楼 B309", teacher: "周老师", weeks: "1-18周" }),
  ],
  sourceRows: [
    ["2026—2027 学年第一学期课程表", "", "", "", "", ""],
    ["课程名称", "星期", "节次", "教室", "任课教师", "上课周次"],
    ["大学物理（2）", "周一", "1-2", "主楼 F101", "李老师", "1-18周"],
    ["高等数学", "周一", "3-4", "教4 A503", "王老师", "1-18周"],
    ["信号与系统", "周一", "5-6", "主楼 C204", "张老师", "1-18周"],
    ["模拟电子技术基础 A", "周二", "1-2", "主楼 C101", "陈老师", "1-18周"],
    ["大学物理（2）", "周三", "1-2", "主楼 F101", "李老师", "1-18周"],
    ["高等数学", "周三", "3-4", "教4 A503", "王老师", "1-18周"],
    ["通信专业导论", "周五", "1-2", "主楼 B309", "周老师", "1-18周"],
  ],
  sourceMerges: [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }],
};

function saveDemoTimetable(): TimetableData[] {
  const items = [DEMO_TIMETABLE];
  localStorage.setItem(STORAGE_COLLECTION_KEY, JSON.stringify(items));
  localStorage.setItem(STORAGE_ACTIVE_KEY, DEMO_TIMETABLE.semester);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO_TIMETABLE));
  return items;
}

const HEADER_MATCHERS = {
  course: /课程(?:名称)?|科目|课名/i,
  day: /星期|周次?日|上课日期|week\s*day|day/i,
  time: /开始时间|上课时间|时间|start/i,
  end: /结束时间|下课时间|end/i,
  section: /节次|节数|课节/i,
  room: /教室|地点|上课地点|location|room/i,
  teacher: /教师|老师|任课教师|teacher/i,
  weeks: /周数|起止周|上课周次|教学周/i,
} as const;

function findHeader(rows: unknown[][]): { rowIndex: number; columns: Partial<Record<keyof typeof HEADER_MATCHERS, number>> } | null {
  let best: { rowIndex: number; columns: Partial<Record<keyof typeof HEADER_MATCHERS, number>>; score: number } | null = null;
  rows.slice(0, 20).forEach((row, rowIndex) => {
    const columns: Partial<Record<keyof typeof HEADER_MATCHERS, number>> = {};
    row.forEach((cell, columnIndex) => {
      const value = text(cell);
      for (const [key, matcher] of Object.entries(HEADER_MATCHERS) as [keyof typeof HEADER_MATCHERS, RegExp][]) {
        if (columns[key] === undefined && matcher.test(value)) columns[key] = columnIndex;
      }
    });
    const score = Object.keys(columns).length;
    if (!best || score > best.score) best = { rowIndex, columns, score };
  });
  return best && best.score >= 3 && best.columns.course !== undefined ? best : null;
}

function parseLongTable(rows: unknown[][]): TimetableCourse[] {
  const header = findHeader(rows);
  if (!header) return [];
  const { columns } = header;
  const result: TimetableCourse[] = [];

  for (const row of rows.slice(header.rowIndex + 1)) {
    const course = text(row[columns.course!]);
    const days = columns.day === undefined ? [] : normalizeDays(row[columns.day]);
    if (!course || !days.length) continue;
    const section = columns.section === undefined ? null : sectionTimes(row[columns.section]);
    const rowText = row.map(text).join(" ");
    const rowTiming = /\d{1,2}[:：]\d{2}/.test(rowText) ? sectionTimes(rowText) : null;
    const start = columns.time === undefined ? (section?.[0] ?? rowTiming?.[0] ?? "时间待定") : (normalizeTime(row[columns.time]) || section?.[0] || rowTiming?.[0] || "时间待定");
    const end = columns.end === undefined ? (section?.[1] ?? rowTiming?.[1] ?? inferEndTime(start)) : (normalizeTime(row[columns.end]) || section?.[1] || rowTiming?.[1] || inferEndTime(start));
    const weeks = columns.weeks === undefined ? undefined : text(row[columns.weeks]);
    days.forEach(day => {
      result.push(makeCourse({
        day,
        time: start,
        end: end || inferEndTime(start),
        course,
        room: columns.room === undefined ? "地点待补充" : (text(row[columns.room]) || "地点待补充"),
        teacher: columns.teacher === undefined ? undefined : text(row[columns.teacher]),
        weeks,
        weekRule: parseWeekRule(weeks),
      }));
    });
  }
  return result;
}

function parseCompactCourseBlock(
  block: string,
  day: TimetableDay,
  timing: [string, string],
  sharedRoom: string,
): TimetableCourse | null {
  const weeksMatch = block.match(/(?:第)?\d+\s*(?:[-—~至]\s*\d+)?\s*周(?:\s*[单双]周)?/);
  const weeks = weeksMatch?.[0]?.replace(/\s/g, "");
  let remaining = block.replace(weeksMatch?.[0] ?? "", "").trim();
  const teacherMatch = remaining.match(/((?:[\u4e00-\u9fa5·]{2,5})(?:\s*[,，、]\s*[\u4e00-\u9fa5·]{2,5})*)$/);
  const teacher = teacherMatch?.[1]?.replace(/\s*([,，、])\s*/g, "$1");
  if (teacher) remaining = remaining.slice(0, -teacherMatch![0].length).trim();
  const course = remaining.replace(/[，,、:：]+$/, "").trim();
  if (!course) return null;
  return makeCourse({
    day,
    time: timing[0],
    end: timing[1],
    course,
    room: sharedRoom,
    teacher,
    weeks,
    weekRule: parseWeekRule(weeks),
  });
}

function parseGridCells(cell: unknown, day: TimetableDay, rowLabel: unknown): TimetableCourse[] {
  const raw = text(cell);
  if (!raw) return [];
  const timing = sectionTimes(rowLabel) ?? sectionTimes(raw);
  if (!timing) return [];
  const lines = raw.split(/\n| {2,}/).map(line => line.trim()).filter(Boolean);
  const room = lines.find(line => /(?:楼|室|馆|校区|教\d|[A-Z]\d{2,})/.test(line)) ?? "地点待补充";
  const compactBlocks = raw.split(/[;；]+/).map(block => block.trim()).filter(Boolean);
  if (compactBlocks.length > 1) {
    return compactBlocks
      .map(block => parseCompactCourseBlock(block, day, timing, room))
      .filter((course): course is TimetableCourse => !!course);
  }
  const course = lines.find(line =>
    !/^\d+[-—~至]\d+周/.test(line)
    && !/^(?:周|星期)[一二三四五六日天]/.test(line)
    && !/(?:楼|室|馆|校区|教\d|[A-Z]\d{2,})/.test(line)
    && !/(?:老师|教师|讲师|教授)$/.test(line),
  ) ?? lines[0];
  if (!course) return [];
  const weeks = lines.find(line => /\d+[-—~至]\d+周|单周|双周/.test(line));
  const teacher = lines.find(line => /(?:教师|老师|讲师|教授)[:：]?/.test(line))
    ?? lines.find(line => /^[\u4e00-\u9fa5·]{2,5}$/.test(line) && line !== course);
  return [makeCourse({
    day,
    time: timing[0],
    end: timing[1],
    course,
    room,
    teacher,
    weeks,
    weekRule: parseWeekRule(weeks),
  })];
}

function parseGrid(rows: unknown[][]): TimetableCourse[] {
  let best: { rowIndex: number; dayColumns: { column: number; day: TimetableDay }[] } | null = null;
  rows.slice(0, 20).forEach((row, rowIndex) => {
    const dayColumns = row
      .map((cell, column) => ({ column, day: normalizeDay(cell) }))
      .filter((item): item is { column: number; day: TimetableDay } => !!item.day);
    if (dayColumns.length >= 2 && (!best || dayColumns.length > best.dayColumns.length)) {
      best = { rowIndex, dayColumns };
    }
  });
  if (!best) return [];
  const result: TimetableCourse[] = [];
  for (const row of rows.slice(best.rowIndex + 1)) {
    const rowLabel = row.slice(0, best.dayColumns[0].column).map(text).find(Boolean) ?? row[0];
    for (const { column, day } of best.dayColumns) {
      result.push(...parseGridCells(row[column], day, rowLabel));
    }
  }
  return result;
}

function dedupeCourses(courses: TimetableCourse[]): TimetableCourse[] {
  return Array.from(new Map(courses.map(course => [course.id, course])).values())
    .sort((a, b) => DAY_KEYS.indexOf(a.day) - DAY_KEYS.indexOf(b.day) || a.time.localeCompare(b.time));
}

function semesterFromText(value: string): { semester: string; confidence: number } | null {
  const normalized = value.replace(/\s+/g, "").replace(/[—–~至/]/g, "-");
  const pair = normalized.match(/(20\d{2})[-年](20\d{2})(?:学年)?(?:第)?([一二12上下])(?:学期)?/);
  if (pair) {
    const second = /二|2|下/.test(pair[3]);
    return {
      semester: `${pair[1]}–${pair[2]} 学年${second ? "第二学期" : "第一学期"}`,
      confidence: 0.99,
    };
  }
  const pairWithTerm = normalized.match(/(20\d{2})-(20\d{2})(?:学年)?[^\\d]{0,6}(第一|第二|1|2|上|下)学期/);
  if (pairWithTerm) {
    const second = /第二|2|下/.test(pairWithTerm[3]);
    return {
      semester: `${pairWithTerm[1]}–${pairWithTerm[2]} 学年${second ? "第二学期" : "第一学期"}`,
      confidence: 0.99,
    };
  }
  const season = normalized.match(/(20\d{2})年?(春季?|秋季?)/);
  if (season) {
    const year = Number(season[1]);
    const spring = season[2].startsWith("春");
    return {
      semester: spring
        ? `${year - 1}–${year} 学年第二学期`
        : `${year}–${year + 1} 学年第一学期`,
      confidence: 0.92,
    };
  }
  return null;
}

function guessSemester(
  file: File,
  sheetName: string,
  rows: string[][],
): { semester: string; detection: NonNullable<TimetableData["semesterDetection"]> } {
  const sources = [
    { source: "file_name" as const, value: file.name, confidence: 0.98 },
    { source: "sheet_name" as const, value: sheetName, confidence: 0.94 },
    { source: "sheet_content" as const, value: rows.slice(0, 20).flat().join(" "), confidence: 1 },
  ];
  for (const candidate of sources) {
    const result = semesterFromText(candidate.value);
    if (result) {
      return {
        semester: result.semester,
        detection: {
          source: candidate.source,
          confidence: Math.min(result.confidence, candidate.confidence),
        },
      };
    }
  }
  const date = new Date(file.lastModified || Date.now());
  const year = date.getFullYear();
  const second = date.getMonth() < 7;
  return {
    semester: second
      ? `${year - 1}–${year} 学年第二学期`
      : `${year}–${year + 1} 学年第一学期`,
    detection: { source: "file_date", confidence: 0.55 },
  };
}

export async function parseTimetableFile(file: File): Promise<TimetableData> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  let best: {
    sheetName: string;
    courses: TimetableCourse[];
    sourceRows: string[][];
    sourceMerges: TimetableCellMerge[];
  } | null = null;
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: false,
      defval: "",
      blankrows: true,
    });
    const merges = ((sheet as unknown as { "!merges"?: TimetableCellMerge[] })["!merges"] ?? []);
    const lastContentRow = Math.min(
      119,
      rows.reduce((last, row, index) => row.some(cell => text(cell)) ? index : last, 0),
    );
    const maxContentColumn = Math.min(
      29,
      rows.slice(0, lastContentRow + 1).reduce(
        (max, row) => Math.max(max, row.reduce((last, cell, index) => text(cell) ? index : last, 0)),
        0,
      ),
    );
    const sourceRows = rows
      .slice(0, lastContentRow + 1)
      .map(row => Array.from({ length: maxContentColumn + 1 }, (_, column) => text(row[column])));
    const sourceMerges = merges
      .filter(merge => merge.s.r <= lastContentRow && merge.s.c <= maxContentColumn)
      .map(merge => ({
        s: { ...merge.s },
        e: {
          r: Math.min(merge.e.r, lastContentRow),
          c: Math.min(merge.e.c, maxContentColumn),
        },
      }));
    const longHeader = findHeader(rows);
    const firstDayColumn = rows.slice(0, 20)
      .flatMap(row => row.map((cell, column) => ({ column, day: normalizeDay(cell) })))
      .filter(item => item.day)
      .reduce((min, item) => Math.min(min, item.column), Number.POSITIVE_INFINITY);
    for (const merge of merges) {
      const shouldFill = !!longHeader || merge.s.c < firstDayColumn;
      if (!shouldFill) continue;
      const origin = rows[merge.s.r]?.[merge.s.c];
      if (!text(origin)) continue;
      for (let row = merge.s.r; row <= merge.e.r; row += 1) {
        rows[row] ??= [];
        for (let column = merge.s.c; column <= merge.e.c; column += 1) {
          if (!text(rows[row][column])) rows[row][column] = origin;
        }
      }
    }
    const longCourses = parseLongTable(rows);
    const courses = longCourses.length ? longCourses : parseGrid(rows);
    if (!best || courses.length > best.courses.length) {
      best = { sheetName, courses, sourceRows, sourceMerges };
    }
  }
  if (!best?.courses.length) {
    throw new Error("没有识别到课程。请确认表格中包含课程名称、星期、时间或节次、教室等信息。");
  }
  const semesterResult = guessSemester(file, best.sheetName, best.sourceRows);
  return {
    semester: semesterResult.semester,
    semesterDetection: semesterResult.detection,
    sourceFileName: file.name,
    sourceSheetName: best.sheetName,
    importedAt: Date.now(),
    courses: dedupeCourses(best.courses),
    sourceRows: best.sourceRows,
    sourceMerges: best.sourceMerges,
  };
}

export function saveTimetable(data: TimetableData): TimetableData[] {
  const existing = loadTimetables();
  const next = [
    data,
    ...existing.filter(item => item.semester !== data.semester),
  ].sort((a, b) => b.semester.localeCompare(a.semester, "zh"));
  localStorage.setItem(STORAGE_COLLECTION_KEY, JSON.stringify(next));
  localStorage.setItem(STORAGE_ACTIVE_KEY, data.semester);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return next;
}

function normalizeTimetable(parsed: TimetableData): TimetableData | null {
  if (!Array.isArray(parsed.courses)) return null;
  return {
    ...parsed,
    courses: parsed.courses.map(course => ({
      ...course,
      course: cleanCourseName(course.course),
    })),
  };
}

export function loadTimetables(): TimetableData[] {
  try {
    const collectionRaw = localStorage.getItem(STORAGE_COLLECTION_KEY);
    if (collectionRaw) {
      const stored = (JSON.parse(collectionRaw) as TimetableData[])
        .map(normalizeTimetable)
        .filter((item): item is TimetableData => !!item && item.courses.length > 0);
      // Earlier previews could persist an empty timetable collection. Treat that
      // as an uninitialised demo instead of leaving the deployed page blank.
      return stored.length > 0 ? stored : saveDemoTimetable();
    }
    const legacyRaw = localStorage.getItem(STORAGE_KEY);
    if (!legacyRaw) return saveDemoTimetable();
    const legacy = normalizeTimetable(JSON.parse(legacyRaw) as TimetableData);
    if (!legacy || legacy.courses.length === 0) return saveDemoTimetable();
    localStorage.setItem(STORAGE_COLLECTION_KEY, JSON.stringify([legacy]));
    return [legacy];
  } catch {
    return saveDemoTimetable();
  }
}

export function loadTimetable(): TimetableData | null {
  const items = loadTimetables();
  const activeSemester = localStorage.getItem(STORAGE_ACTIVE_KEY);
  return items.find(item => item.semester === activeSemester) ?? items[0] ?? null;
}

export function selectTimetableSemester(semester: string): TimetableData | null {
  const selected = loadTimetables().find(item => item.semester === semester) ?? null;
  if (selected) {
    localStorage.setItem(STORAGE_ACTIVE_KEY, semester);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selected));
  }
  return selected;
}
