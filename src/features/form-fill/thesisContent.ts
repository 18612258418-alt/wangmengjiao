import type { FormProfile } from "./formProfileStore";

export interface ThesisSection {
  heading: string;
  paragraphs: string[];
}

/** 模拟学位论文正文（来自记忆库） */
export function getThesisContent(profile: FormProfile): {
  title: string;
  meta: string[];
  abstract: string;
  sections: ThesisSection[];
} {
  const title = profile.thesisTitle || "基于旋转矢量法的简谐振动与同频叠加研究";

  return {
    title,
    meta: [
      `作者：${profile.name || "张同学"}`,
      `学号：${profile.studentId || "2024010123"}`,
      `${profile.college || "理学院"} · ${profile.major || "应用物理学"}`,
      `指导教师：${profile.advisor || "李教授"}`,
    ],
    abstract:
      "本文以大学物理「机械振动」课程内容为背景，系统梳理简谐振动的运动方程、旋转矢量表示法及同频振动叠加规律。"
      + "通过单摆与小弹簧振子实验，验证角频率、初相位与合振幅随相位差的变化关系，"
      + "为理解波动与共振现象提供可复核的实验依据。",
    sections: [
      {
        heading: "第一章 引言",
        paragraphs: [
          "简谐振动是力学、电磁学乃至量子力学中描述周期现象的基本模型。学生在学习过程中常因代数形式与几何图像脱节而难以建立直观理解。",
          "旋转矢量法将质点在一维轴上的投影运动映射为匀速圆周运动，可统一处理相位、振幅与叠加问题。",
        ],
      },
      {
        heading: "1.1 研究背景与意义",
        paragraphs: [
          "同频振动叠加在声学、光学与工程振动分析中广泛出现。掌握合振幅与相位差的关系，是后续学习驻波、干涉与共振的前提。",
        ],
      },
      {
        heading: "第二章 简谐振动与旋转矢量法",
        paragraphs: [
          "位移满足 x(t) = A cos(ωt + φ₀)，其中 A 为振幅，ω 为角频率，φ₀ 为初相位。对应旋转矢量在 x 轴上的投影，矢量长度等于 A，角速度等于 ω。",
          "由参考圆模型可得速度 v(t) = −ωA sin(ωt + φ₀)，加速度 a(t) = −ω²x，与牛顿第二定律在弹性恢复力线性条件下一致。",
        ],
      },
      {
        heading: "2.1 同频振动叠加",
        paragraphs: [
          "N 个同频同向简谐振动叠加时，合振动仍为简谐振动。两振动 x₁ = A₁ cos(ωt + φ₁)、x₂ = A₂ cos(ωt + φ₂) 的合位移可用 phasor 加法求得。",
          "当 A₁ = A₂ 且 Δφ = π/3 时，合振幅 R = 2A cos(Δφ/2)，实验测量与理论值误差在允许范围内。",
          profile.experimentDataSource
            ? `实验部分：${profile.experimentDataSource}`
            : "实验数据已存档，可按学院要求提交原始记录复核。",
        ],
      },
      {
        heading: "第三章 结论",
        paragraphs: [
          "旋转矢量法有效降低了简谐振动与叠加问题的认知负荷；实验结果支持教材中关于合振幅与相位差的结论。",
          "后续工作可拓展至阻尼振动与受迫振动，讨论共振频率与品质因数。",
        ],
      },
    ],
  };
}
