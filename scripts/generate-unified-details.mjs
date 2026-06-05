#!/usr/bin/env node
/**
 * Batch-generate unifiedDetail for all built-in cards.
 * Usage: node scripts/generate-unified-details.mjs
 * Output: src/data/generatedUnifiedDetails.json  (id -> unifiedDetail map)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function loadEnv() {
  const envPath = path.join(ROOT, ".env.local");
  const text = fs.readFileSync(envPath, "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

function buildPrompt({ title, detailIntro, detailSections }) {
  const lines = [`卡片标题：${title}`];
  if (detailIntro) lines.push(`重点定位：${detailIntro}`);
  if (detailSections?.length) {
    lines.push("已提取重点内容：");
    detailSections.forEach(s => lines.push(`  · ${s.title}：${s.items.join("；")}`));
  }
  return `你是一位有丰富大学教学经验的学长/学姐。以下是AI从学生学习图片中自动提取的原始内容：

===原始提取内容===
${lines.join("\n")}
=================

请基于以上内容，输出一份完整的"记忆详情"分析报告，严格按以下五个模块顺序输出，每个模块以【模块名】单独占一行作为标题；不使用任何 markdown 符号。

【内容概述】
【核心原理】或【解题思路】或【核心思路】（根据内容选择）
【考点解析】或【易错陷阱】等
【知识关联】
【学习建议】

每句话以中文句号收尾。自然穿插 [[学术名词]] 蓝色链接。`;
}

async function callDeepSeek(prompt, apiKey, modelId) {
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: modelId || "deepseek-chat",
      stream: true,
      max_tokens: 8192,
      messages: [
        { role: "system", content: "你是一位专业的中国大学学习助手。用亲切自然的语气输出中文内容。不要使用 markdown 符号。" },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok || !res.body) throw new Error(`DeepSeek ${res.status}: ${await res.text()}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "", result = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") break;
      try { result += JSON.parse(data).choices?.[0]?.delta?.content ?? ""; } catch { /* skip */ }
    }
  }
  return result;
}

const CARDS = [
  { id: "c1", title: "记忆：带电粒子在匀强磁场中的圆周运动",
    detailIntro: "洛伦兹力可是物理压轴大户，帮你把找圆心和算时间的套路总结好了，大题直接套用：",
    detailSections: [
      { title: "核心公式（必背）", items: ["半径 R = mv/(qB)：R 与速度 v 成正比，加速电压×4 → v×2 → R×2", "周期 T = 2πm/(qB)：与速度无关，粒子种类不变则转一圈时间相同"] },
      { title: "几何找圆心（作图关键）", items: ["方法一：入射/出射速度垂线的交点即为圆心", "方法二：入射点与出射点连线的中垂线必定过圆心"] },
      { title: "考试易错陷阱", items: ["运动时间必须用 t = (θ/2π)×T，θ 是圆心角而非弦角", "千万别用距离÷速度——粒子走的是弧线不是直线"] },
    ] },
  { id: "c2", title: "记忆：光电效应与爱因斯坦方程",
    detailIntro: "光电效应综合题经常和遏止电压一起考，帮你整理成答题框架：",
    detailSections: [
      { title: "爱因斯坦方程核心", items: ["Ek = hν − W₀：入射光频率决定光电子最大初动能", "光强只影响光电子数量，不影响单个光电子的动能"] },
      { title: "遏止电压与伏安特性", items: ["eUc = Ek = hν − W₀：截止电压与频率成线性关系", "图像中：饱和电流↔光强；截止电压↔光频（独立无关）"] },
      { title: "极限频率记忆点", items: ["ν₀ = W₀/h：低于极限频率绝对不发生光电效应", "光电效应是瞬时的，与光照时间无关"] },
    ] },
  { id: "c3", title: "记忆：机械能守恒定律应用",
    detailIntro: "机械能守恒和动量守恒常组合成三阶段大题，你在弹簧压缩那段的批注思路完全正确：",
    detailSections: [
      { title: "守恒条件判断", items: ["只有重力或弹簧弹力做功 → 机械能守恒", "有摩擦力、空气阻力、其他外力做功 → 不守恒，改用动能定理"] },
      { title: "三阶段经典模型", items: ["阶段①碰撞：用动量守恒 m₁v₁=(m₁+m₂)v′（有动能损失）", "阶段②压弹簧：用机械能守恒 ½mv²=½kx²"] },
      { title: "最容易失分的地方", items: ["碰撞阶段有动能损失，千万不能用机械能守恒", "弹性碰撞才动能守恒，题目会明确说明"] },
    ] },
  { id: "c4", title: "记忆：万有引力定律与卫星轨道参数",
    detailIntro: "卫星运动一张公式推出六个量，你批注的那道多轨道比较题用这套方法就能秒做：",
    detailSections: [
      { title: "核心推导链（必背）", items: ["万有引力=向心力：GMm/r² = mv²/r = mω²r = m(2π/T)²r", "轨道越高：v↓、ω↓、T↑、加速度↓（离地越远引力越弱）"] },
      { title: "第一/第二宇宙速度", items: ["第一宇宙速度 v₁=7.9km/s：地面附近最小发射速度（环绕速度）", "第二宇宙速度 v₂=11.2km/s：脱离地球引力场所需最小速度"] },
      { title: "同步卫星特殊性质", items: ["周期=24h，轨道在赤道平面，高度约3.6×10⁴km（固定值）", "「赤道、向东、同步」三个条件缺一不可"] },
    ] },
  { id: "c5", title: "记忆：电磁感应与楞次定律",
    detailIntro: "楞次定律判断电流方向是大学物理经典考点，帮你提炼出最快的判断路径：",
    detailSections: [
      { title: "楞次定律口诀", items: ["「来拒去留」：磁通量增加→感应磁场阻碍增加（方向相反）；磁通量减少→感应磁场阻碍减少（方向相同）", "再由感应磁场方向，用右手定则确定线圈中电流方向"] },
      { title: "法拉第电磁感应定律", items: ["ε = ΔΦ/Δt（平均）；匀速切割磁场：ε = BLv", "感应电动势与磁通量变化率成正比，与面积无关"] },
      { title: "自感与互感", items: ["自感：线圈自身电流变化产生感应电动势，阻碍电流变化（「线圈记忆」效应）", "日光灯镇流器就是自感线圈，用来限制启动瞬间大电流"] },
    ] },
  { id: "c6", title: "记忆：静电场场强与电势的关系",
    detailIntro: "静电场最容易混淆的就是场强E和电势φ，帮你彻底厘清：",
    detailSections: [
      { title: "E 与 φ 的本质区别", items: ["E（场强）是矢量，有方向，描述力的性质：E = F/q", "φ（电势）是标量，无方向，描述能的性质：φ = Ep/q"] },
      { title: "二者关系（重要！）", items: ["E 沿电场线方向由高电势指向低电势", "匀强电场：E = U/d（两等势面间距离 d）", "等势面越密集处，场强越大（类比等高线）"] },
      { title: "电场力做功", items: ["W = qU = q(φ_A − φ_B)：只与起终点电势差有关，与路径无关", "正电荷沿电场线方向移动：电场力做正功，电势能减少"] },
    ] },
  { id: "c9", title: "记忆：交流电与变压器综合应用",
    detailIntro: "交流电和变压器的综合计算是常考题型，帮你把完整思路整理好：",
    detailSections: [
      { title: "交流电有效值", items: ["正弦交流电：U有效 = U₀/√2 ≈ 0.707U₀；I有效 = I₀/√2", "220V 家用电是有效值，峰值约 311V；电气设备额定值均指有效值"] },
      { title: "理想变压器规律", items: ["电压比：U₁/U₂ = n₁/n₂（匝数多的一侧电压高）", "电流比：I₁/I₂ = n₂/n₁（匝数多的一侧电流小）", "功率守恒：P₁ = P₂，即 U₁I₁ = U₂I₂（理想状态无损耗）"] },
      { title: "输电线损耗计算", items: ["线路热功率：P损 = I²R线（电流是关键，升压可大幅降低损耗）", "解题步骤：升压→求输电电流→求线路压降→求末端电压→降压到用户电压"] },
    ] },
  { id: "m1", title: "记忆：导数定义与几何意义",
    detailIntro: "把几何意义和运算法则帮你整理成直接套用的格式：",
    detailSections: [
      { title: "导数几何意义", items: ["f'(x₀) 表示曲线在 x₀ 处切线的斜率", "导数>0 → 函数递增；导数<0 → 函数递减；导数=0 → 极值候选点"] },
      { title: "常用求导法则", items: ["(uv)' = u'v + uv'（乘积法则）", "(u/v)' = (u'v−uv')/v²（商法则）", "复合函数链式法则：(f(g(x)))' = f'(g(x))·g'(x)"] },
    ] },
  { id: "m2", title: "记忆：不定积分换元法",
    detailIntro: "换元积分其实就两种套路，帮你整理了最高频的考法：",
    detailSections: [
      { title: "第一换元法（凑微分）", items: ["认出 f(g(x))·g'(x) 的形式，令 u=g(x) 直接套公式", "例：∫sin(2x)dx，令 u=2x，得 −½cos(2x)+C"] },
      { title: "第二换元法（三角换元）", items: ["含 √(a²−x²)：令 x=asinθ", "含 √(a²+x²)：令 x=atanθ"] },
    ] },
  { id: "m3", title: "记忆：三角函数和差化积公式",
    detailIntro: "三角恒等变换是大题失分重灾区，这几个公式要反复默写直到条件反射：",
    detailSections: [
      { title: "基础恒等式", items: ["sin²θ+cos²θ=1（万能基础，变形出1±sin2θ等）", "sin(A+B)=sinAcosB+cosAsinB；cos(A+B)=cosAcosB−sinAsinB"] },
      { title: "辅助角公式", items: ["asinθ+bcosθ=√(a²+b²)·sin(θ+φ)，其中 tanφ=b/a", "用于把混合三角式化为单一 sin 函数再求最值"] },
    ] },
  { id: "m4", title: "记忆：数列通项公式与求和",
    detailIntro: "数列通项推导是基础考点，帮你整理了正确路径：",
    detailSections: [
      { title: "等差与等比", items: ["等差：aₙ=a₁+(n−1)d；Sₙ=na₁+n(n−1)d/2", "等比：aₙ=a₁·qⁿ⁻¹；Sₙ=a₁(1−qⁿ)/(1−q)（q≠1时）"] },
      { title: "递推求通项技巧", items: ["累差法：写出 aₙ₊₁−aₙ 再逐项相加消去中间项", "待定系数法：令 bₙ=aₙ+k，构造等比数列再求解"] },
    ] },
  { id: "m5", title: "记忆：空间向量基本运算",
    detailIntro: "空间向量是立体几何的万能工具，用好向量法就不用画辅助线了：",
    detailSections: [
      { title: "向量运算", items: ["点积：a·b=|a||b|cosθ，用于求夹角或验证垂直（=0）", "模长：|a|=√(x²+y²+z²)"] },
      { title: "法向量求法", items: ["设 n=(x,y,z)，列 n·a=0 和 n·b=0 的方程组解出", "法向量用于求平面方程、点到平面距离、二面角"] },
    ] },
  { id: "m6", title: "记忆：概率与期望值计算",
    detailIntro: "概率题要先分清是古典概型还是条件概率：",
    detailSections: [
      { title: "古典概型", items: ["P(A)=A的基本事件数/总基本事件数", "排列数 Aₙᵐ=n!/(n−m)!；组合数 Cₙᵐ=n!/[m!(n−m)!]"] },
      { title: "条件概率与独立性", items: ["条件概率：P(B|A)=P(AB)/P(A)", "独立事件：P(AB)=P(A)·P(B)，即 A 发生不影响 B 的概率"] },
    ] },
  { id: "m7", title: "记忆：定积分几何应用",
    detailIntro: "定积分求面积是压轴题常见考点，上下限搞清楚才不会算错：",
    detailSections: [
      { title: "面积公式", items: ["两曲线围成面积：∫[a,b]|f(x)−g(x)|dx", "先求交点定积分上下限，再判断哪个函数在上方"] },
      { title: "常见陷阱", items: ["积分值可能为负，要取绝对值才是面积", "关于 y 轴对称的图形，只算一半再×2 节省时间"] },
    ] },
  { id: "m8", title: "记忆：二项式定理展开",
    detailIntro: "二项式定理考展开项系数，记住通项公式就够了：",
    detailSections: [
      { title: "通项公式", items: ["(a+b)ⁿ 的第 r+1 项：Tᵣ₊₁ = Cₙʳ·aⁿ⁻ʳ·bʳ", "找特定项：令 bʳ 的指数等于目标值，解出 r"] },
      { title: "常考结论", items: ["令 a=b=1，所有项系数之和 = 2ⁿ", "奇数项系数和 = 偶数项系数和 = 2ⁿ⁻¹"] },
    ] },
  { id: "c_c1", title: "记忆：化学键类型与极性判断",
    detailIntro: "化学键判断是大题第一步，帮你整理成答题框架：",
    detailSections: [
      { title: "化学键类型", items: ["离子键：金属+非金属，电子完全转移（NaCl等）", "共价键：非金属+非金属，电子共用（H₂O、CO₂等）", "金属键：金属原子间，自由电子共有"] },
      { title: "极性分子判断", items: ["极性键：两原子电负性不同（如 H−Cl）", "极性分子：空间结构不对称（H₂O是V形→极性分子）", "CO₂是线形结构→非极性分子（虽含极性键）"] },
    ] },
  { id: "c_c2", title: "记忆：电化学与电极反应",
    detailIntro: "帮你把原电池和电解池的电极判断整理了：",
    detailSections: [
      { title: "原电池", items: ["负极：失去电子（氧化），较活泼金属", "正极：得到电子（还原），较不活泼或碳棒"] },
      { title: "电解池", items: ["阴极：得到电子，发生还原（接电源负极）", "阳极：失去电子，发生氧化（接电源正极）", "记忆口诀：阴负阳正，氧化阳极"] },
    ] },
  { id: "c_c3", title: "记忆：有机物系统命名规则",
    detailIntro: "有机命名有套路，先定主链再编号：",
    detailSections: [
      { title: "命名三步法", items: ["第一步：找最长碳链为主链，含官能团的链优先", "第二步：从离取代基最近的一端开始编号", "第三步：按取代基位次+名称+主链名称顺序命名"] },
      { title: "常见官能团名称", items: ["羟基 −OH（醇/酚），羧基 −COOH（羧酸）", "氨基 −NH₂（胺），酯基 −COO−（酯）"] },
    ] },
  { id: "e1", title: "记忆：时态与语态综合运用",
    detailIntro: "时态错误是英语最高频失分点，把最容易混的几组时态帮你彻底分清：",
    detailSections: [
      { title: "完成时 vs 过去时", items: ["现在完成时（have/has done）：动作与现在有关联，结果持续到现在", "一般过去时（did）：强调过去某时间点，与现在无关"] },
      { title: "被动语态构成", items: ["结构：be+过去分词，be 随时态和主语变化", "情态动词被动：modal + be + 过去分词（如 must be done）"] },
    ] },
  { id: "e2", title: "记忆：长难句结构分析方法",
    detailIntro: "长难句最重要的是找主干，帮你总结方法：",
    detailSections: [
      { title: "分析步骤", items: ["第一步：找谓语动词确定主句", "第二步：找从句连接词（that/which/when/because…）", "第三步：分析从句类型（定语/状语/同位语）"] },
      { title: "高频复杂结构", items: ["同位语从句：the fact that...（that 本身无意义）", "非限制性定语从句：which 引导，补充说明，可删去"] },
    ] },
  { id: "e3", title: "记忆：写作高分句式模板",
    detailIntro: "作文高分的秘诀是句式多样，直接套用：",
    detailSections: [
      { title: "强调与对比句型", items: ["强调句：It is...that/who...（可强调任何成分）", "Not only...but also...：并列递进，高频首选"] },
      { title: "高分过渡词", items: ["转折：however / nevertheless / on the contrary", "递进：furthermore / in addition / what's more", "因果：consequently / as a result / therefore"] },
    ] },
  { id: "o1", title: "记忆：思维导图制作核心原则",
    detailIntro: "思维导图能让知识结构可视化，帮你优化了几个细节：",
    detailSections: [
      { title: "基本结构原则", items: ["中心主题→主干（一级节点）→分支（二级/三级）", "每个节点只写关键词，不写完整句子"] },
      { title: "配色与视觉规则", items: ["同一主干分支用同色，整图不超过 5 种颜色", "越重要的节点字体越大、线条越粗"] },
    ] },
  { id: "o2", title: "记忆：费曼学习法四步骤",
    detailIntro: "费曼学习法是提高知识留存率最有效的方法之一：",
    detailSections: [
      { title: "四个核心步骤", items: ["①选择一个概念 → ②用简单语言向外行解释 → ③找出卡壳处 → ④返回学习卡壳点", "目标：能向 8 岁孩子解释清楚为止"] },
      { title: "适用场景", items: ["理解性知识（原理/定理/概念）效果最佳", "考前用「教别人」法快速检验掌握程度"] },
    ] },
];

async function main() {
  const env = loadEnv();
  const apiKey = env.VITE_DEEPSEEK_API_KEY;
  const modelId = env.VITE_DEEPSEEK_MODEL_ID || "deepseek-chat";
  if (!apiKey) { console.error("Missing VITE_DEEPSEEK_API_KEY in .env.local"); process.exit(1); }

  const outPath = path.join(ROOT, "src/data/generatedUnifiedDetails.json");
  let results = {};
  if (fs.existsSync(outPath)) {
    results = JSON.parse(fs.readFileSync(outPath, "utf8"));
    console.log(`Resuming: ${Object.keys(results).length} already done.`);
  }

  for (let i = 0; i < CARDS.length; i++) {
    const card = CARDS[i];
    if (results[card.id]) { console.log(`[${i+1}/${CARDS.length}] Skip ${card.id}`); continue; }
    console.log(`\n[${i+1}/${CARDS.length}] ${card.id}: ${card.title}`);
    try {
      const text = await callDeepSeek(buildPrompt(card), apiKey, modelId);
      results[card.id] = text;
      console.log(`  OK (${text.length} chars)`);
      fs.writeFileSync(outPath, JSON.stringify(results, null, 2), "utf8");
    } catch (err) {
      console.error(`  Error: ${err.message}`);
      fs.writeFileSync(outPath, JSON.stringify(results, null, 2), "utf8");
    }
  }
  console.log(`\nDone! ${Object.keys(results).length}/${CARDS.length} cards. Saved to ${outPath}`);
}

main().catch(err => { console.error(err); process.exit(1); });
