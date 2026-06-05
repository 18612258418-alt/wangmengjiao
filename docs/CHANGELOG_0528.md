# 更新日志 · 2026-05-25 ~ 2026-05-28

本文档记录本轮开发窗口内的全部改动，供下一轮优化参考。

---

## 一、侧边栏重设计

**涉及文件：** `src/features/sidebar/Sidebar.tsx`

### 变更内容
- **去掉了 entries / extra 字段显示**：每个学科卡片之前会展示时间记录（entries）和额外说明（extra），现在只显示 `学科名 + 数量`，视觉更简洁。
- **搜索按钮图标化**：原来是带文字的"搜索记忆"按钮，改为纯图标（放大镜）。
- **新增上传图标**：放大镜左侧新增一个上传箭头图标，点击触发图片上传。
- **图标尺寸和颜色调整**：图标从 16px → 19px，颜色从淡灰 `#7B8291` → 深灰 `#3D4754`。
- **顶部新增「全部」入口**：位于所有学科卡片之上，显示全部记忆总条数，点击进入全部视图。

### 新增 Props
```ts
onUploadFile: () => void   // 触发文件选择器
totalCount: number         // 所有学科的记忆总数
```

---

## 二、「全部」视图（AllCardsView）

**涉及文件：** `src/features/all/AllCardsView.tsx`（新建）

### 功能说明
点击侧边栏"全部"进入此视图，替换原来的 `MainContent`。

### 核心特性
- **两层标签筛选**
  - 第一层：知识类型标签（理论概念 / 数学解题 / 外语学习 / 实验研究 / 代码算法 / 文献论述），只显示当前数据中实际存在的类型。
  - 第二层：从所有卡片 `aiKeyPoints` 提取，**出现频次 ≥ 2** 的关键词才显示，按频次排序，上限 30 个，超过 12 个可展开。
  - 多标签 AND 逻辑，支持一键清除（`✕ 清除` 按钮，仅在有选中标签时出现）。
- **纯卡片网格**：3 列 `grid`，按时间降序排列，无日期分组、无学习报告、无日期标题。
- **正确传递 subjectId**：为支持从全部视图删除/打开卡片，`onOpenCard` 新增第三个可选参数 `subjectId`。

---

## 三、图片上传功能

**涉及文件：** `src/app/App.tsx`

### 实现方式
- 侧边栏上传图标 → 触发 `uploadInputRef.current?.click()`
- 隐藏的 `<input type="file" accept="image/*">` 接收选中文件
- `FileReader` 读取为 DataURL，走完全相同的 `processImage()` 流程（豆包视觉提取 + DeepSeek 流式生成）
- `hasAnnotations = false`（无手写批注，走全图分析模式）
- 处理完成后新卡片归入 AI 判断的学科分类

---

## 四、内置卡片元数据补全

**涉及文件：**
- `src/data/builtinCardMeta.ts`（新建）
- `src/data/initialData.ts`（更新）
- `src/utils/db.ts`（新增函数）
- `src/hooks/useMemoryDB.ts`（新增调用）

### 问题背景
原有 23 张内置卡片没有 `skill` 字段和 `aiKeyPoints`，导致「全部」视图标签区只显示"理论概念"一个标签。

### 解决方案
1. **新建 `builtinCardMeta.ts`**：为每张内置卡片手动指定 `skill` 类型和 `aiKeyPoints` 数组。
   - 物理卡片 → `theory_concept`
   - 数学卡片 → `math_problem`
   - 外语卡片 → `language`
   - 化学（电化学）→ `experiment_lab`
   - 其他 → `theory_concept`

2. **`initialData.ts` 注入**：将 `injectUnifiedDetails()` 升级为 `injectBuiltinMeta()`，同时注入 `unifiedDetail` + `skill` + `aiKeyPoints`。

3. **IndexedDB 存量数据补写**：新增 `applyCardMetaPatch()` 函数，在应用启动时对已存在于 IndexedDB 的内置卡片补写缺失的字段（使用 `CARD_META_PATCH_KEY` localStorage guard 只跑一次）。

### 效果
「全部」视图会出现多种技能标签，以及"公式推导"、"能量守恒"、"学习方法"、"句型结构"等跨卡片出现的关键词标签。

---

## 五、API Key 安全修复（重要）

**涉及文件：**
- `api/doubao.ts`（新建 · Vercel Edge Function）
- `api/deepseek.ts`（新建 · Vercel Edge Function）
- `src/utils/api.ts`（重写）
- `src/context/ApiConfigContext.tsx`（精简）
- `src/app/App.tsx`（移除 key 状态）
- `src/features/feed/FeedGroup.tsx`（移除 key 依赖）
- `src/features/drawer/CardDetailContent.tsx`（移除 key 依赖）
- `vercel.json`（新建）
- `.env.local`（更新变量名）

### 问题背景
`VITE_*` 前缀的环境变量会被 Vite **直接打包进 JS Bundle**，任何人打开 DevTools 即可看到 API Key。

### 解决方案：Vercel Edge Function 代理

| 代理端点 | 作用 |
|---|---|
| `POST /api/doubao` | 豆包视觉 API（接收图片 DataURL，返回结构化 JSON） |
| `POST /api/deepseek` | DeepSeek 文本 API（接收 prompt，支持流式/非流式两种模式） |

- API Key 只存在于服务器端环境变量，**不带 `VITE_` 前缀**，不会被 Vite 打包。
- 前端所有 AI 调用改为访问同域 `/api/*`，无跨域问题。
- 已验证：打包产物 `dist/` 中搜索不到任何 API Key 字符串。

### 函数签名变化

```ts
// 旧（key 暴露在前端）
callDoubao(imageDataUrl, apiKey, modelId, hasAnnotations)
streamText(prompt, apiKey, modelId, onChunk, onDone, textModelId, deepseekApiKey, deepseekModelId)
callDoubaoText(prompt, apiKey, modelId)

// 新（key 仅在服务器端）
callDoubao(imageDataUrl, hasAnnotations?)
streamText(prompt, onChunk, onDone?)
callText(prompt)          // 原 callDoubaoText，改走 DeepSeek 非流式
```

### Vercel Dashboard 环境变量（需手动配置）

删除旧的 `VITE_*` 变量，添加以下服务端变量：

| 变量名 | 说明 |
|---|---|
| `DOUBAO_API_KEY` | 火山引擎 Ark API Key |
| `DOUBAO_MODEL_ID` | 豆包视觉模型接入点 ID |
| `DEEPSEEK_API_KEY` | DeepSeek API Key |
| `DEEPSEEK_MODEL_ID` | `deepseek-chat` |

### 本地开发
不再使用 `pnpm dev`，改用：
```bash
vercel dev   # 同时启动 Vite 前端 + Edge 函数本地模拟
```

---

## 六、其他小修复

| 问题 | 修复 |
|---|---|
| 侧边栏 loading 区域过大、有白色背景和灰色边框 | 去掉背景/边框，缩小间距，spinner 从 22px → 18px |
| `✕ 清除` 按钮文字不够直观（容易看成"明确筛选"）| 加边框 badge 样式，明确展示关闭意图 |
| `drawerCardSubject` 缺失导致从全部视图删除卡片失败 | App.tsx 新增 `drawerCardSubject` state，`handleDeleteCard` 使用正确的 subjectId |
| 首次启动默认显示物理学科 | 改为默认选中"全部"视图（`activeSubject = "all"`） |

---

## 七、文件结构变化总览

```
新增：
  api/
    doubao.ts               # Vercel Edge Function · 豆包视觉代理
    deepseek.ts             # Vercel Edge Function · DeepSeek 代理
  src/
    features/all/
      AllCardsView.tsx      # 「全部」视图组件
    data/
      builtinCardMeta.ts    # 内置卡片 skill + aiKeyPoints 映射表
  vercel.json               # SPA 路由配置

修改：
  src/
    app/App.tsx
    utils/api.ts
    context/ApiConfigContext.tsx
    data/initialData.ts
    utils/db.ts
    hooks/useMemoryDB.ts
    features/sidebar/Sidebar.tsx
    features/feed/FeedGroup.tsx
    features/drawer/CardDetailContent.tsx
  .env.local                # VITE_* → 无前缀（服务端变量）
```

---

## 八、待优化 / 下一步方向（建议）

- [ ] **全部视图 → 支持多选上传**：当前只处理第一个文件，可扩展为队列批量处理
- [ ] **标签显示优化**：频次低于 2 的 aiKeyPoints 可以在卡片数量多时再显示
- [ ] **搜索功能**：目前搜索入口保留，但还是 Overlay 弹层形式，可考虑集成进全部视图
- [ ] **PDF 支持**：上传入口已预留，需接入 `pdfjs-dist` 做图片化处理
- [ ] **Vercel 环境变量更新提醒**：两个 Vercel 项目（main / release-demo-v1）都需要手动更新 Dashboard 里的环境变量
