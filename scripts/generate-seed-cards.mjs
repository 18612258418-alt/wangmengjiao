#!/usr/bin/env node
/**
 * One-off script: analyze annotation images with Doubao + DeepSeek,
 * output structured card JSON for embedding in initialData.ts
 *
 * Usage: node scripts/generate-seed-cards.mjs
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

function imageToDataUrl(filePath) {
  const buf = fs.readFileSync(filePath);
  return `data:image/png;base64,${buf.toString("base64")}`;
}

const DOUBAO_SYSTEM = `你是一位专业的中国大学学习助手，专门帮助大学生整理课堂批注笔记、提炼核心知识点。
你的工作规则：
1. 无论图片中出现何种语言（英文、日文、数学公式、化学符号等），你的所有文字输出内容必须使用中文。
2. subjectId 字段固定使用指定的英文标识符，其余所有字段内容一律输出中文。
3. 你的语气像一位细心的学长，帮同学整理笔记，亲切自然，不要过于正式。
4. 只输出 JSON，不要输出任何解释、markdown 代码块或其他多余文字。
5. 【关键规则】图中可能存在红色/彩色的手写圆圈、下划线、箭头、高亮等人工标记。你必须首先精准定位这些标记覆盖的具体文字/公式/图表内容，然后将 detailIntro、detailSections、aiKeyPoints、expandedKnowledge 严格限定为只分析这些被标记的内容。
6. nextAction 必须给出具体可执行的下一步学习建议。`;

const DOUBAO_USER = `请分两步处理这张学习批注图片：

【第一步-内部定位，不输出】仔细观察图中所有人工标记（红色或彩色的圆圈、下划线、方框、箭头等），在内心提炼出这些标记覆盖的精确文字/公式/图表原文。

【第二步-输出JSON】严格按以下格式输出，所有字段用中文：

{
  "subjectId": "physics / math / chemistry / english / other",
  "title": "记忆：[基于圈选内容的中文知识点标题，不超过20字]",
  "summary": "[50字以内的摘要]",
  "overview": "[约200字全局概述]",
  "detailIntro": "[30字以内，明确指出圈选了哪里]",
  "detailSections": [{"title": "...", "items": ["...", "..."]}],
  "aiKeyPoints": ["...", "...", "..."],
  "expandedKnowledge": [{"concept": "...", "explanation": "..."}],
  "knowledgeTree": [{"label": "...", "level": 1, "current": false}],
  "skill": "theory_concept / math_problem / language / experiment_lab / code_cs / literature_essay",
  "nextAction": "[50字以内的下一步建议]"
}`;

function buildDetailPagePrompt(params) {
  const { skill, title, overview, detailIntro, detailSections, aiKeyPoints } = params;
  const contextLines = [
    `卡片标题：${title}`,
    `分析模式：用户已圈选重点区域`,
    `图片概述：${overview || "(无)"}`,
  ];
  if (detailIntro) contextLines.push(`重点定位：${detailIntro}`);
  if (detailSections?.length) {
    contextLines.push("已提取重点内容：");
    detailSections.forEach(s => contextLines.push(`  · ${s.title}：${s.items.join("；")}`));
  }
  if (aiKeyPoints?.length) contextLines.push(`核心关键词：${aiKeyPoints.join("、")}`);
  const context = contextLines.join("\n");

  return `你是一位有丰富大学教学经验的学长/学姐。以下是AI从学生学习图片中自动提取的原始内容：

===原始提取内容===
${context}
=================

请基于以上内容，输出一份完整的"记忆详情"分析报告，严格按以下五个模块顺序输出，每个模块以【模块名】单独占一行作为标题；不使用任何 markdown 符号。

【内容概述】
【核心原理】或【解题思路】或【核心思路】（根据内容选择）
【考点解析】或【易错陷阱】等
【知识关联】
【学习建议】

每句话以中文句号收尾。自然穿插 [[学术名词]] 蓝色链接。`;
}

async function callDoubao(imageDataUrl, apiKey, modelId) {
  const res = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: "system", content: DOUBAO_SYSTEM },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: imageDataUrl } },
            { type: "text", text: DOUBAO_USER },
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Doubao ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const raw = (data.choices?.[0]?.message?.content ?? "").trim();
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in Doubao response: " + raw.slice(0, 200));
  return JSON.parse(jsonMatch[0]);
}

async function streamDeepSeek(prompt, deepseekApiKey, deepseekModelId) {
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${deepseekApiKey}` },
    body: JSON.stringify({
      model: deepseekModelId || "deepseek-chat",
      stream: true,
      max_tokens: 8192,
      messages: [
        { role: "system", content: "你是一位专业的中国大学学习助手。用亲切自然的语气输出中文内容。不要使用 markdown 符号。" },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok || !res.body) throw new Error(`DeepSeek ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result = "";

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
      try {
        const delta = JSON.parse(data).choices?.[0]?.delta?.content ?? "";
        result += delta;
      } catch { /* skip */ }
    }
  }
  return result;
}

const IMAGES = [
  { file: "demo-gdp-economics.png", id: "demo_gdp", time: "14:20" },
  { file: "demo-calculus-limit.png", id: "demo_calc", time: "15:10" },
  { file: "demo-von-neumann.png", id: "demo_von", time: "16:00" },
];

async function main() {
  const env = loadEnv();
  const apiKey = env.VITE_DOUBAO_API_KEY;
  const modelId = env.VITE_DOUBAO_MODEL_ID;
  const deepseekApiKey = env.VITE_DEEPSEEK_API_KEY;
  const deepseekModelId = env.VITE_DEEPSEEK_MODEL_ID || "deepseek-chat";

  if (!apiKey || !deepseekApiKey) {
    console.error("Missing API keys in .env.local");
    process.exit(1);
  }

  const results = [];

  for (const img of IMAGES) {
    const filePath = path.join(ROOT, "src/imports", img.file);
    console.log(`\n=== Processing ${img.file} ===`);
    const dataUrl = imageToDataUrl(filePath);

    console.log("Calling Doubao...");
    const doubao = await callDoubao(dataUrl, apiKey, modelId);
    console.log("  title:", doubao.title);
    console.log("  subject:", doubao.subjectId);

    console.log("Calling DeepSeek...");
    const prompt = buildDetailPagePrompt({
      skill: doubao.skill ?? "theory_concept",
      title: doubao.title,
      overview: doubao.overview,
      detailIntro: doubao.detailIntro,
      detailSections: doubao.detailSections ?? [],
      aiKeyPoints: doubao.aiKeyPoints ?? [],
    });
    const unifiedDetail = await streamDeepSeek(prompt, deepseekApiKey, deepseekModelId);
    console.log("  unifiedDetail length:", unifiedDetail.length);

    results.push({
      ...img,
      doubao,
      unifiedDetail,
    });
  }

  const outPath = path.join(ROOT, "src/data/generatedSeedCards.json");
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2), "utf8");
  console.log(`\nSaved to ${outPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
