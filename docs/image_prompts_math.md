# 数学记忆卡片图片生成提示词（共8张）

> 使用说明：将每张卡片的【Gemini 提示词】完整复制到 Gemini Image Generation，生成后按标注的文件名保存。
> 风格统一要求：蓝紫色系配色，现代简洁教育风格，白色或浅灰背景，中文标题，公式用清晰手写或印刷字体展示。

---

## 卡片 m1：导数定义与几何意义

**对应记忆**：导数几何意义 = 切线斜率；乘积法则、商法则、链式法则

**Gemini 提示词**：
```
Create a clean educational math study card in Chinese. Style: modern, light blue-purple color scheme, white background.

Content to display:
- Title: "导数定义与几何意义"
- Section 1 "导数几何意义":
  - Show a smooth curve with a tangent line drawn at point x₀
  - Label: "f'(x₀) = 切线斜率"
  - Three arrow indicators: "导数>0 → 递增", "导数<0 → 递减", "导数=0 → 极值"
- Section 2 "求导法则":
  - Formula boxes: "(uv)' = u'v + uv'", "(u/v)' = (u'v−uv')/v²"
  - Chain rule: "[f(g(x))]' = f'(g(x))·g'(x)"
- Layout: two-column card with graph on left, formulas on right
- Color: blue (#2371EE) headings, light purple formula boxes
```

**文件名**：math_derivative.png

---

## 卡片 m2：不定积分换元法

**对应记忆**：第一换元（凑微分）、第二换元（三角换元）

**Gemini 提示词**：
```
Create a clean educational math study card in Chinese. Style: modern, purple-blue color scheme, white background.

Content to display:
- Title: "不定积分换元法"
- Method 1 box labeled "第一换元法（凑微分）":
  - Text: "认出 f(g(x))·g'(x) 形式 → 令 u=g(x)"
  - Example: "∫sin(2x)dx → 令u=2x → −½cos(2x)+C"
- Method 2 box labeled "第二换元法（三角换元）":
  - "含 √(a²−x²) → 令 x = a·sinθ"
  - "含 √(a²+x²) → 令 x = a·tanθ"
- Show a small integral symbol graphic in the center
- Purple (#8B5CF6) accent colors, clean formula styling
```

**文件名**：math_integral.png

---

## 卡片 m3：三角函数和差化积公式

**对应记忆**：基础恒等式、辅助角公式求最值

**Gemini 提示词**：
```
Create a clean educational math study card in Chinese. Style: modern, teal-blue color scheme, white background.

Content to display:
- Title: "三角函数核心公式"
- Large formula display in styled boxes:
  - "sin²θ + cos²θ = 1"
  - "sin(A+B) = sinA·cosB + cosA·sinB"
  - "cos(A+B) = cosA·cosB − sinA·sinB"
- Highlighted section "辅助角公式（求最值必备）":
  - "a·sinθ + b·cosθ = √(a²+b²)·sin(θ+φ)"
  - "其中 tanφ = b/a"
- A small unit circle diagram in the corner
- Color: blue-teal headings, soft yellow highlight for the key formula
```

**文件名**：math_trig.png

---

## 卡片 m4：数列通项公式与求和

**对应记忆**：等差、等比数列公式；累差法、待定系数法

**Gemini 提示词**：
```
Create a clean educational math study card in Chinese. Style: modern, orange-blue color scheme, white background.

Content to display:
- Title: "数列通项公式与求和"
- Two-column comparison table:
  Left "等差数列": "aₙ = a₁+(n−1)d", "Sₙ = na₁ + n(n−1)d/2"
  Right "等比数列": "aₙ = a₁·qⁿ⁻¹", "Sₙ = a₁(1−qⁿ)/(1−q)"
- Tips section:
  - "累差法：逐项相减消去中间项"
  - "待定系数法：令 bₙ=aₙ+k 构造等比"
- Include a small visual of a number sequence ladder going upward
- Orange (#F59E0B) accents for formulas, blue for headings
```

**文件名**：math_sequence.png

---

## 卡片 m5：空间向量基本运算

**对应记忆**：点积求夹角、法向量求平面方程

**Gemini 提示词**：
```
Create a clean educational math study card in Chinese. Style: modern, blue-indigo color scheme, white background.

Content to display:
- Title: "空间向量基本运算"
- Show a 3D coordinate system (x, y, z axes) with two vectors drawn
- Formula section:
  - "点积: a·b = |a||b|cosθ → 夹角/验证垂直"
  - "模长: |a| = √(x²+y²+z²)"
- Box "法向量求法（重要）":
  - "设 n=(x,y,z)，列 n·a=0 和 n·b=0"
  - "→ 求平面方程、点面距离、二面角"
- Clean 3D geometric illustration style
- Indigo (#4D5CFF) color theme
```

**文件名**：math_vector.png

---

## 卡片 m6：概率与期望值计算

**对应记忆**：古典概型、条件概率、独立事件

**Gemini 提示词**：
```
Create a clean educational math study card in Chinese. Style: modern, green-blue color scheme, white background.

Content to display:
- Title: "概率与期望值计算"
- Section "古典概型":
  - "P(A) = A的基本事件数 / 总事件数"
  - "Aₙᵐ = n!/(n−m)!  Cₙᵐ = n!/[m!(n−m)!]"
- Section "条件概率与独立性":
  - "P(B|A) = P(AB)/P(A)"
  - "独立: P(AB) = P(A)·P(B)"
- A small probability tree diagram with branches labeled
- Green (#10B981) for correct answers, red for common mistakes
```

**文件名**：math_probability.png

---

## 卡片 m7：定积分几何应用

**对应记忆**：两曲线围成面积公式、上下限确定

**Gemini 提示词**：
```
Create a clean educational math study card in Chinese. Style: modern, blue color scheme, white background.

Content to display:
- Title: "定积分几何应用"
- Show a graph with two curves f(x) and g(x) intersecting, shaded region between them
- Formula: "面积 S = ∫[a,b] |f(x)−g(x)| dx"
- Step boxes:
  1. "求交点 → 确定积分上下限"
  2. "判断哪条曲线在上方"
  3. "积分值可能为负 → 取绝对值"
- Tip box: "对称图形只算一半再×2"
- Blue shaded area in the graph illustration
```

**文件名**：math_calculus_geo.png

---

## 卡片 m8：二项式定理展开

**对应记忆**：通项公式 Tᵣ₊₁、系数求和结论

**Gemini 提示词**：
```
Create a clean educational math study card in Chinese. Style: modern, purple-blue color scheme, white background.

Content to display:
- Title: "二项式定理展开"
- Large formula display:
  - "(a+b)ⁿ 第 r+1 项: Tᵣ₊₁ = Cₙʳ · aⁿ⁻ʳ · bʳ"
- Visual: Pascal's triangle (杨辉三角) showing first 5 rows
- Key conclusions box:
  - "令a=b=1: 所有项系数和 = 2ⁿ"
  - "奇数项系数和 = 偶数项系数和 = 2ⁿ⁻¹"
- Step guide: "找特定项: 令bʳ指数=目标值 → 解r"
- Purple (#8B5CF6) triangle visualization
```

**文件名**：math_binomial.png
