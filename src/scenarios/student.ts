import type { ScenarioPackage } from "./types";
export const studentScenario: ScenarioPackage = {
  id:"student", workspaceLabel:"课程", tabs:{notes:"笔记",homework:"作业",reviewPlan:"复习",exam:"备考",sources:"资料"},
  userProfile:{eyebrow:"MEMO 对我的理解",title:"晓雨，这是我目前对你的理解",description:"它会随着课程、作答、笔记和对话持续更新，你可以随时查看依据或纠正。",goalLabel:"当前目标",goal:"准备 8 天后的高数结课考试",goalDetail:"本学期继续完成冲动消费研究初稿；长期积累研究与结构化表达能力。",statusTitle:"学习状态",status:[{label:"高等数学",value:"基础稳定，边界题待巩固",detail:"最近两次错误集中在换元上下限"},{label:"学术英语",value:"听力连续练习 4 天",detail:"论证转折识别正在变稳定"}],methodsTitle:"适合你的学习方式",methods:["数学：先做题，再根据错误获得讲解","英语：短音频跟读，再用闪卡巩固","复杂实验：课前观看操作视频并核对步骤"],traitsTitle:"正在形成的能力",traits:["研究问题拆解","证据比较","结构化表达","持续复盘"],warning:"定积分换元后容易忘记同步修改上下限；六级听力复习仍容易被临时任务打断。",evidence:["高数第 5、6 次作业的错题记录","近 7 天课程音频和闪卡使用情况","课表中的结课考试与实验安排","社会心理学阅读、笔记和论文调用记录"]}
};
