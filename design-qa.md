# 录音工作台 Design QA

- source visual truth path: `/var/folders/5m/0x4bmj5s4bg507r3dyn21szw0000gn/T/TemporaryItems/NSIRD_screencaptureui_Fs6mrb/截屏2026-09-24 10.10.14.png`
- implementation screenshot path: `/var/folders/5m/0x4bmj5s4bg507r3dyn21szw0000gn/T/memo-voice-recording-final.png`
- viewport: Codex in-app browser，约 1089 × 908 CSS px
- pixels and normalization: source 2094 × 1562 px；implementation 1089 × 908 px；按各自完整工作台视图比较区域比例、信息层级和交互状态，不以像素一一复刻 macOS 窗口装饰
- state: 正在录音、实时转写已产生内容

## Full-view comparison evidence

参考图使用录音列表、录音主操作区、详情区的三栏骨架。实现保留这一主结构，并把右栏从空白详情改为 Memo 必需的实时转写和入库说明；中栏保留波形、计时与底部主控制；左栏保留搜索和录音记录。整体密度、留白、分隔关系与参考图同类，同时采用当前 Memo 的紫色主色和弹窗语义。

## Focused region comparison evidence

- 左栏：具备“所有录音”、数量、标题/转写搜索、当前录音选中态和状态时间。
- 中栏：标题可编辑，波形随录制变化，计时明确，暂停/继续/完成为分层操作。
- 右栏：边录边转文字，停止后切换为完整文稿，并明确保存后产生的知识记忆。
- 最小化态：保留计时、当前转写摘要、暂停/继续、停止、关闭与恢复窗口。

## Findings

- 无剩余 P0/P1/P2 视觉或交互问题。
- P3：小尺寸窗口下三栏会更紧凑；当前目标桌面视口下信息均完整可见。

## Comparison history

1. 首次功能检查发现 P0：录音保存卡片使用了旧的 `content` 字段，触发搜索与知识解析崩溃。
2. 修复：录音结构统一为 `DetailSection.items`，并为历史录音数据增加兼容读取。
3. 修复后证据：重新完成“开始录制 → 暂停 → 最小化 → 继续 → 完成 → 保存”，保存后返回首页且页面保持可用；最终录制态截图见 implementation screenshot path。

## Required fidelity surfaces

- Fonts and typography: 沿用 Memo 现有无衬线字体体系，标题、状态、计时、辅助文字层级清楚；未照搬 macOS 字体。
- Spacing and layout rhythm: 三栏比例稳定，16–24px 级间距、圆角和分隔线与 Memo 现有组件一致。
- Colors and visual tokens: 白/浅灰工作区，紫色代表 Memo 主动作，红色仅用于录制状态，语义明确。
- Image quality and asset fidelity: 无位图替代问题；图标均使用项目现有 Lucide 矢量系统。
- Copy and content: 文案从通用“语音备忘录”调整为“录音 → 转写 → 知识来源/知识记忆”的 Memo 业务闭环。

## Primary interactions tested

- 打开录音工作台
- 开始录音并实时转写
- 暂停与继续
- 最小化、展开和悬浮态控制
- 完成录音
- 保存到知识记忆并返回首页
- 录音标题编辑入口和搜索入口可用

## Console check

修复后未产生新的录音保存崩溃；此前日志中的搜索异常时间戳早于修复，来源为首次测试产生的旧格式录音卡片。

final result: passed
