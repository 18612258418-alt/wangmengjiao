# 化学记忆卡片图片生成提示词（共6张）

> 使用说明：将每张卡片的【Gemini 提示词】完整复制到 Gemini Image Generation，生成后按标注的文件名保存。
> 风格统一要求：青绿色系配色，现代简洁教育风格，白色或浅灰背景，中文标题，化学式清晰显示。

---

## 卡片 c_c1：化学键类型与极性判断

**对应记忆**：离子键/共价键/金属键；极性分子判断（结构对称性）

**Gemini 提示词**：
```
Create a clean educational chemistry study card in Chinese. Style: modern, teal-green color scheme, white background.

Content to display:
- Title: "化学键类型与极性判断"
- Three-column comparison:
  | 离子键 | 共价键 | 金属键 |
  | 金属+非金属 | 非金属+非金属 | 金属原子间 |
  | NaCl | H₂O, CO₂ | Fe, Cu |
- Polarity section with molecule diagrams:
  - H₂O: V形结构 → 极性分子 (dipole arrow shown)
  - CO₂: 线形结构 → 非极性分子
- Key rule box: "结构不对称 → 极性分子"
- Teal (#10B981) color theme with molecule structure illustrations
```

**文件名**：chem_bond.png

---

## 卡片 c_c2：电化学与电极反应

**对应记忆**：原电池正负极、电解池阴阳极；口诀"阴负阳正，氧化阳极"

**Gemini 提示词**：
```
Create a clean educational chemistry study card in Chinese. Style: modern, blue-orange color scheme, white background.

Content to display:
- Title: "电化学与电极反应"
- Split diagram:
  Left: 原电池图 showing two metal electrodes in solution with electron flow arrows
    - "负极: 失电子(氧化)，活泼金属"
    - "正极: 得电子(还原)"
  Right: 电解池图 with external battery connected
    - "阴极: 得电子(还原)，接负极"
    - "阳极: 失电子(氧化)，接正极"
- Big mnemonic box at bottom: "口诀: 阴负阳正 | 氧化阳极"
- Orange for oxidation, blue for reduction reactions
```

**文件名**：chem_electrochemistry.png

---

## 卡片 c_c3：有机物系统命名规则

**对应记忆**：IUPAC三步法（定主链→编号→命名）；常见官能团

**Gemini 提示词**：
```
Create a clean educational chemistry study card in Chinese. Style: modern, green color scheme, white background.

Content to display:
- Title: "有机物系统命名规则"
- Three numbered steps with icons:
  1. "找最长碳链 → 含官能团的链优先"
  2. "从离取代基最近端开始编号"
  3. "位次-取代基名-主链名"
- Example: show a simple branched alkane structure with numbering
- Functional groups table:
  | 官能团 | 名称 | 化合物类型 |
  | −OH | 羟基 | 醇/酚 |
  | −COOH | 羧基 | 羧酸 |
  | −NH₂ | 氨基 | 胺 |
  | −COO− | 酯基 | 酯 |
- Green (#10B981) theme with structural formula illustrations
```

**文件名**：chem_organic_naming.png

---

## 卡片 c_c4：化学平衡常数K的计算

**对应记忆**：K只与温度有关；升温平衡移动方向

**Gemini 提示词**：
```
Create a clean educational chemistry study card in Chinese. Style: modern, purple-teal color scheme, white background.

Content to display:
- Title: "化学平衡常数K"
- Large K formula box:
  K = [产物浓度乘积] / [反应物浓度乘积]
  Note: "(固体和纯液体不写入K表达式)"
- Key rule highlighted: "K 只与温度有关！"
  - "浓度、压强、催化剂不改变K"
- Equilibrium shift table:
  | 条件改变 | 平衡移动 | K变化 |
  | 升温 | → 吸热方向 | 变化 |
  | 增压(气) | → 气体分子数少方向 | 不变 |
  | 加催化剂 | 不移动 | 不变 |
- Show a reaction coordinate energy diagram (energy vs reaction progress)
- Purple accent for K value, teal for equilibrium arrows
```

**文件名**：chem_equilibrium.png

---

## 卡片 c_c5：离子方程式书写配平

**对应记忆**：三步法；强拆弱不拆；微溶物不拆

**Gemini 提示词**：
```
Create a clean educational chemistry study card in Chinese. Style: modern, blue-red color scheme, white background.

Content to display:
- Title: "离子方程式书写配平"
- Three steps with numbered flow:
  ① "写出正确化学方程式"
  ② "强酸强碱可溶盐 → 拆成离子形式"
  ③ "消去相同离子 → 得净离子方程式"
- Important rules box (highlighted in red):
  "不拆的情况（重要！）"
  - "弱酸弱碱: CH₃COOH, NH₃·H₂O, H₂CO₃ ← 不拆"
  - "微溶物/沉淀: BaSO₄, AgCl ← 不拆（加↓符号）"
- Example: HCl + NaOH → H⁺ + OH⁻ → H₂O shown step by step
- Blue for ions, red for "不拆" warnings
```

**文件名**：chem_ionic_equation.png

---

## 卡片 c_c6：元素周期律规律汇总

**对应记忆**：同周期从左到右规律；同族从上到下规律

**Gemini 提示词**：
```
Create a clean educational chemistry study card in Chinese. Style: modern, blue-orange color scheme, white background.

Content to display:
- Title: "元素周期律规律汇总"
- Show a mini periodic table outline (first 4 periods) with arrows indicating trends
- Two main sections with arrows:
  Horizontal arrow → "同周期（从左→右）":
    "金属性↓  非金属性↑  原子半径↓  电离能↑（整体）"
  Vertical arrow ↓ "同族（从上→下）":
    "金属性↑  非金属性↓  原子半径↑  碱性↑"
- Highlight box: "F是非金属性最强, Cs是金属性最强"
- Color gradient: metallic orange on left → nonmetallic blue on right of mini periodic table
```

**文件名**：chem_periodic_law.png
