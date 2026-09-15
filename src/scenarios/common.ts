import { imgNotesBg, imgWebBg } from "../data/initialData";
import imgKyotoRoute from "../imports/common-kyoto-route.png";
import imgHomeCompare from "../imports/common-home-compare.png";
import imgFamilyRecipe from "../imports/common-family-recipe.png";
import imgHomeWechat from "../imports/common-home-wechat.png";
import imgTripWechat from "../imports/common-trip-wechat.png";
import type { CardData, FeedGroup, SubjectData } from "../types";
import type { ScenarioPackage } from "./types";
const workspaces:SubjectData[]=[
  {id:"physics",name:"搬家与新住处",short:"搬家与新住处",count:7,unit:"条笔记",entries:[],extra:"今天 · 7 条笔记"},
  {id:"math",name:"日本旅行",short:"日本旅行",count:11,unit:"条笔记",entries:[],extra:"3 天前 · 11 条笔记"},
  {id:"chemistry",name:"工作项目",short:"工作项目",count:14,unit:"条笔记",entries:[],extra:"今天 · 14 条笔记"},
  {id:"english",name:"家庭生活",short:"家庭生活",count:8,unit:"条笔记",entries:[],extra:"昨天 · 8 条笔记"},
  {id:"other",name:"AI 产品研究",short:"AI 产品研究",count:18,unit:"条笔记",entries:[],extra:"今天 · 18 条笔记"},
];
const c=(x:CardData)=>x.id==="common-home-1"?{...x,nextAction:undefined,homeworkTasks:["比较三套房源并确定优先顺序"]}:x.id==="common-home-2"?{...x,img:imgHomeWechat,homeworkTasks:["周六看房前确认房屋关键事项"]}:x.id==="common-trip-1"?{...x,nextAction:undefined}:x.id==="common-trip-2"?{...x,img:imgTripWechat,homeworkTasks:["出发前确认旅行关键事项"]}:x; const g=(summary:string,cards:CardData[]):FeedGroup[]=>[{date:"20260914",label:`新增了 ${cards.length} 条笔记`,summary,cards}];
const memories:Record<string,FeedGroup[]>={
 physics:g("房源、通勤、预算和入住安排已经汇总；周六看房前仍需确认押金与宠物政策。",[
  c({id:"common-home-1",title:"三套房源的通勤与采光比较",img:imgHomeCompare,source:"screenshot",time:"10:42",detailIntro:"三套候选房源已经按月租、通勤、采光和入住时间放在同一处比较。",detailSections:[{title:"比较后更清楚的",items:["湖畔家园通勤最短，但只有一室","阳光里采光最好，月租居中","城市之光空间更大，但通勤刚好达到 40 分钟上限"]},{title:"看房时要核实",items:["实际噪声和早晚采光","物业费、中介费及押金","是否允许养宠物"]}],aiKeyPoints:["通勤不超过 40 分钟","需要自然光","希望可以养宠物"],nextAction:"周六看房前确认押金和宠物政策。"}),
  c({id:"common-home-2",title:"周六看房前确认事项",img:imgHomeCompare,source:"screenshot",time:"09:10",contentType:"homework",homeworkTasks:["向中介确认押金与退租条款","确认是否允许养宠物","与房东确认最快入住时间"],taskDueDate:"20260919"})]),
 math:g("酒店、攻略与同行人的聊天已形成五日路线，尚待确认请假和交通票。",[
  c({id:"common-trip-1",title:"京都五日路线：减少跨区往返",img:imgKyotoRoute,source:"browser",time:"21:06",detailIntro:"这份攻略把住宿点和每天的活动区域放在同一张地图上，适合用来减少跨区往返。",detailSections:[{title:"可以直接采用",items:["前三天住四条河原町，方便步行和市区活动","后两天转到京都站附近，返程更省时间","岚山和金阁寺分开安排，避免同一天横跨城市"]},{title:"仍需确认",items:["同行人的最终请假日期","红叶季酒店价格是否还能接受","换酒店带来的行李寄存安排"]}],nextAction:"确认同行人的请假日期后再订不可退房型。"}),
  c({id:"common-trip-2",title:"出发前待确认",img:imgKyotoRoute,source:"browser",time:"18:20",contentType:"homework",homeworkTasks:["确认请假","购买往返机票","比较 ICOCA 与游客交通券"],taskDueDate:"20260920"})]),
 chemistry:g("产品周会、用户访谈和竞品截图共同指向：搜索应成为找回内容的主入口。",[c({id:"common-work-1",title:"新用户为什么找不到自己的内容",img:"",source:"upload",time:"09:18",sourceDocument:{type:"web",title:"产品周会纪要：内容找回问题",author:"产品组",publishedAt:"今天 09:18",paragraphs:["访谈中，多位新用户能记得自己保存过内容，却无法判断它被放进了哪个分类。","讨论认为，问题不在分类数量，而在用户必须先理解系统结构才能找回内容。搜索应承担找回，主题负责浏览。","同一条内容可以关联多个场景，但底层只保存一次，避免版本不一致。"]},detailIntro:"会议围绕“用户保存之后为什么找不回来”形成了一个明确判断：不要让分类结构成为检索前提。",detailSections:[{title:"会议结论",items:["搜索成为找回内容的主入口","主题用于浏览，不作为唯一归档位置","同一内容可以关联多个主题，底层只保存一次"]},{title:"需要验证",items:["新用户是否能理解自动形成的主题","搜索无结果时如何引导补充条件"]}],nextAction:"把统一场景数据包方案补进下次评审稿。"})]),
 english:g("菜谱、家人语音和重要资料被关联到家庭生活主题。",[c({id:"common-family-1",title:"妈妈说的番茄牛腩做法",img:imgFamilyRecipe,source:"camera",time:"19:35",detailIntro:"手写菜谱和家人语音已经合并，原照片仍保留，可以做饭时直接核对。",detailSections:[{title:"关键用量",items:["牛腩约 800 克，番茄 4 个","洋葱 1 个，姜 3 片","八角 2 个，桂皮 1 小段"]},{title:"容易漏掉的步骤",items:["牛腩先冷水下锅焯水","番茄分两次放，先炒底味再保留口感","大火煮开后转小火炖 1.5—2 小时"]}],nextAction:"下次做完后记录实际炖煮时间和家人口味。"})]),
 other:g("围绕个人记忆产品的会议、研究与临时想法正在形成一条连续脉络。",[c({id:"common-ai-1",title:"个人记忆产品不是第二个文件系统",img:"",source:"upload",time:"18:35",sourceDocument:{type:"web",title:"语音速记转写",author:"我",publishedAt:"昨天 18:35",paragraphs:["用户不是想维护第二个文件系统。他更希望在真正需要的时候，系统能把之前保存的信息带回来。","保存时不要逼用户先决定放在哪里。分类可以是之后逐渐形成的结果，而不是记录之前的门槛。","AI 给出建议时，应该让人知道判断来自哪些原始内容，也要允许用户纠正。"]},detailIntro:"这是一段走路时录下的临时想法。Memo 去掉重复口语后，保留了三个可以继续验证的产品原则。",detailSections:[{title:"核心想法",items:["正确时间带回正确的信息，比维护分类更重要","保存动作应该足够轻，不要求预先整理","AI 判断需要保留来源并允许纠正"]},{title:"与现有讨论的联系",items:["与产品周会中的“搜索承担找回”一致","支持用场景数据包而不是复制整套产品"]}],nextAction:"整理成下一轮原型的设计原则。"})])
};
export const commonScenario:ScenarioPackage={id:"common",workspaceLabel:"主题",tabs:{notes:"笔记",homework:"行动"},hiddenTabs:["reviewPlan","exam","sources"],workspaces,memories,userProfile:{eyebrow:"MEMO 对我的理解",title:"这是我目前了解的你",description:"这些理解来自你保存的内容、近期事件和使用方式，可以随时查看依据或纠正。",goalLabel:"最近关注",goal:"准备搬家，也在规划一次日本旅行",goalDetail:"重要决定希望看到原始依据；更习惯先记录，再让 Memo 帮忙整理。",statusTitle:"进行中的事情",status:[{label:"搬家",value:"周六已约看房",detail:"押金和宠物政策仍待确认"},{label:"日本旅行",value:"五日路线已形成",detail:"请假与机票仍未确定"}],methodsTitle:"你的记录习惯",methods:["常用截图和语音快速记录","做决定前会比较多个来源","希望行动建议保留原始依据"],traitsTitle:"长期关注",traits:["AI 产品","个人知识管理","城市生活","家庭信息"],warning:"周六已经约了看房，出发前需要确认押金、宠物政策和最快入住时间。",evidence:["三套房源截图与地图路线","与中介的聊天和语音偏好","酒店订单、攻略与同行人聊天","产品会议录音和用户访谈"]}};
