import imgPhysicsEM from "../imports/physics-em.jpg";
import type { CardData, FeedGroup } from "../types";
import { courseIdForName } from "../features/study/timetable";

const physicsPreviewCard: CardData = {
  id: "demo_preview_physics_em",
  title: "大学物理（2）· 电磁感应课前预习",
  source: "courseware",
  time: "老师刚刚发布",
  img: imgPhysicsEM,
  contentType: "note",
  syllabusEntryId: "phy-2-3",
  unread: true,
  overview: "明天课程将进入电磁感应与楞次定律，先掌握磁通量变化和感应电流方向的判断。",
  detailIntro: "这份预习由老师课件整理而来，已自动关联到明天的大学物理（2）课程。",
  detailSections: [
    {
      title: "课前先看",
      items: [
        "理解磁通量 Φ = BS cosθ 中各物理量的含义",
        "区分磁通量变化与磁场强度变化",
        "用“增反减同”初步判断感应磁场方向",
      ],
    },
    {
      title: "带着问题上课",
      items: [
        "楞次定律为什么体现能量守恒？",
        "导体棒切割磁感线时，电动势方向如何判断？",
      ],
    },
  ],
  aiKeyPoints: ["磁通量", "法拉第电磁感应定律", "楞次定律"],
  nextAction: "明天上课前完成 10 分钟预习",
  sourceDocument: {
    type: "pdf",
    title: "大学物理（2）第七讲_电磁感应.pdf",
    author: "大学物理课程组",
    page: 1,
    pageCount: 18,
    paragraphs: [
      "本讲介绍磁通量、法拉第电磁感应定律和楞次定律。",
      "预习时先关注概念与方向判断，上课后再完成公式推导与例题。",
    ],
  },
  learningContext: {
    courseId: courseIdForName("大学物理（2）"),
    course: "大学物理（2）",
    subject: "大学物理",
    chapter: "第二章 电磁学 · 电磁感应与楞次定律",
    phase: "before_class",
    classTime: "明天 08:00—09:40",
    location: "主楼 F101",
    sourceRole: "teacher",
    capabilities: { knowledgeMap: true, interactive: true },
  },
  ingestionDecision: {
    validCourseContent: true,
    confidence: 0.98,
    reason: "教师课件与明天的大学物理课程及现有知识点直接对应",
    materialType: "courseware",
    subjectName: "大学物理",
    courseName: "大学物理（2）",
    chapterTitle: "电磁感应与楞次定律",
    knowledgePoints: ["磁通量", "法拉第电磁感应定律", "楞次定律"],
    destinations: ["knowledge"],
  },
  learningActions: [
    {
      type: "preview",
      title: "预习电磁感应与楞次定律",
      evidence: "老师发布了明天大学物理（2）的第七讲课件",
    },
  ],
};

export const PREVIEW_SEED_PATCH: Record<string, FeedGroup[]> = {
  physics: [
    {
      date: "20260830",
      label: "新增了1个课前资料",
      summary: "明天有大学物理（2），建议先完成电磁感应与楞次定律的课前预习。",
      cards: [physicsPreviewCard],
    },
  ],
};

export const PREVIEW_SEED_PATCH_KEY = "seed-patch-v1-physics-preview";
