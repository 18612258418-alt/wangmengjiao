# 双环境部署与 DNS 配置说明

本文档说明如何将 **开发版** 与 **用户演示版** 分离部署，避免你在 `main` 上持续开发时，用户体验地址被自动更新。

---

## 架构概览

```
GitHub 仓库: 01-ai-memory-notes
├── main                 → Vercel 项目 A（开发版）
└── release/demo-v1      → Vercel 项目 B（用户演示版，冻结）

域名规划（示例，请替换为你的真实域名）:
├── dev.你的域名.com     → 开发版（可选，或用 Vercel 默认域名）
└── demo.你的域名.com    → 用户演示版（推荐给外部体验者）
```

| 环境 | Git 分支 | Vercel 项目 | 建议域名 | 谁访问 |
|------|----------|-------------|----------|--------|
| 开发版 | `main` | `ai-memory-notes`（已有） | `dev.xxx.com` 或 `ai-memory-notes.vercel.app` | 你自己 |
| 演示版 | `release/demo-v1` | `ai-memory-notes-demo`（新建） | `demo.xxx.com` | 外部用户体验 |

---

## 第一步：确认 Git 分支（已完成）

仓库中已存在分支：

- `main` — 日常开发，持续更新
- `release/demo-v1` — 用户演示冻结版，仅在你主动合并时更新

查看分支：

```bash
git branch -a
```

---

## 第二步：在 Vercel 创建「演示版」项目

> 注意：当前 Vercel 新建项目页面**没有** "Configure Project" 折叠区，Production Branch 必须在**项目创建完成后**进 Settings 修改。

### 2.1 创建项目（先用默认值部署）

1. 打开 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 **Add New → Project**
3. 选择 GitHub 仓库 **`01-ai-memory-notes`**
4. 项目名称填：**`ai-memory-notes-demo`**
5. Framework Preset 保持 **Vite**（自动识别），Build/Output 不用改
6. 展开 **Environment Variables**，添加与开发版相同的 4 个变量：

   | Key | Value |
   |-----|-------|
   | `VITE_DOUBAO_API_KEY` | 豆包 API Key（同开发版） |
   | `VITE_DOUBAO_MODEL_ID` | 豆包视觉模型接入点 ID（同开发版） |
   | `VITE_DEEPSEEK_API_KEY` | DeepSeek API Key（同开发版） |
   | `VITE_DEEPSEEK_MODEL_ID` | `deepseek-chat` |

7. 点击 **Deploy**，等待首次部署完成（此时部署的是 main，没关系，下一步马上修正）

### 2.2 ⚠️ 关键步骤：改 Production Branch 为 `release/demo-v1`

首次部署完成后**立刻**做，否则演示版仍会随 main 更新：

1. 进入刚建好的 **`ai-memory-notes-demo`** 项目页面
2. 点击顶部 **Settings**
3. 左侧菜单选 **Git**
4. 找到 **Production Branch**，默认是 `main`
5. 改为 `release/demo-v1` → 点击 **Save**
6. 回到 **Deployments** 页 → 找最新部署 → 右侧 `...` → **Redeploy**（不勾选"Use existing Build Cache"）

完成后，该项目绑定的域名永远只跟 `release/demo-v1` 分支同步，你在 main 上怎么改都不会影响。

---

## 第三步：DNS 解析（二级域名）

假设你的主域名是 **`example.com`**（请全部替换为你的真实域名）。

### 3.1 在域名服务商添加 DNS 记录

登录你的域名注册商（阿里云 / 腾讯云 / Cloudflare / GoDaddy 等），进入 **DNS 解析** 页面，添加：

#### 演示版：`demo.example.com`

| 记录类型 | 主机记录 | 记录值 | TTL |
|----------|----------|--------|-----|
| **CNAME** | `demo` | `cname.vercel-dns.com` | 600（或默认） |

#### 开发版（可选）：`dev.example.com`

| 记录类型 | 主机记录 | 记录值 | TTL |
|----------|----------|--------|-----|
| **CNAME** | `dev` | `cname.vercel-dns.com` | 600 |

> 若使用 Cloudflare，Proxy 状态建议先设为 **DNS only（灰云）**，待 Vercel 验证通过后再按需开启 CDN。

### 3.2 在 Vercel 绑定域名

**演示版项目 `ai-memory-notes-demo`：**

1. 进入项目 → **Settings** → **Domains**
2. 输入 `demo.example.com` → **Add**
3. Vercel 会显示验证状态；DNS 生效通常需要 **5 分钟 ~ 48 小时**（国内常见 10~30 分钟）
4. 状态变为 **Valid** 后，访问 `https://demo.example.com` 即为演示版

**开发版项目 `ai-memory-notes`（可选）：**

1. 同样在 **Settings → Domains** 添加 `dev.example.com`
2. 或继续使用默认地址 `https://ai-memory-notes.vercel.app`

### 3.3 DNS 生效检查

```bash
# macOS / Linux
dig demo.example.com CNAME +short
nslookup demo.example.com

# 应看到指向 vercel 相关地址
```

浏览器访问 `https://demo.example.com`，确认页面与 `release/demo-v1` 分支内容一致。

---

## 第四步：日常更新流程

### 你自己开发（不影响用户）

```bash
git checkout main
# ... 正常改代码 ...
git add .
git commit -m "feat: xxx"
git push origin main
# → 仅开发版自动部署，demo 域名不变
```

### 准备给用户推新版本体验

```bash
git checkout release/demo-v1
git merge main                    # 或 cherry-pick 特定 commit
git push origin release/demo-v1
# → 仅 demo 域名自动部署更新
git checkout main
```

### 大版本迭代（可选）

需要全新冻结点时，可新建分支：

```bash
git checkout -b release/demo-v2 main
git push -u origin release/demo-v2
# 在 Vercel 新建项目或修改 Production Branch
```

---

## 第五步：关闭演示版的自动更新（检查清单）

确保以下配置正确，用户地址才不会随 `main` 变化：

- [ ] 演示版 Vercel 项目的 **Production Branch = `release/demo-v1`**
- [ ] 演示版域名 `demo.xxx.com` 绑在 **`ai-memory-notes-demo`** 项目上，不是开发版项目
- [ ] 开发版项目 Production Branch 保持 **`main`**
- [ ] 不要给 `release/demo-v1` 配置与 `main` 相同的 Production 域名

---

## 常见问题

**Q：push 了 main，demo 域名也变了？**  
A：检查 demo 域名是否误绑在开发版项目上，或演示版 Production Branch 是否设成了 `main`。

**Q：DNS 加了 CNAME 但 Vercel 显示 Invalid Configuration？**  
A：确认主机记录是 `demo` 而不是 `demo.example.com`；Cloudflare 用户先关闭橙色代理。

**Q：两个环境 API Key 要分开吗？**  
A：不是必须；演示流量大时建议单独 Key 便于监控和限流。

**Q：能否用同一个 Vercel 项目？**  
A：一个项目的 Production 只能绑一个分支。要稳定隔离，推荐两个 Vercel 项目。

---

## 当前仓库信息（备忘）

| 项 | 值 |
|----|-----|
| GitHub | `https://github.com/youjihua196-wq/01-ai-memory-notes` |
| 开发版默认地址 | `https://ai-memory-notes.vercel.app` |
| 演示分支 | `release/demo-v1` |
| 构建命令 | `pnpm build` |
| 输出目录 | `dist` |

---

*文档生成日期：2026-05-22*
