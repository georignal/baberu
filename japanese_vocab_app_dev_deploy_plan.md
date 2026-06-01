# 日语文档词汇学习 App：完整开发及部署方案

## 1. 项目定位

本项目是一个面向日语学习的文档驱动型词汇学习工具。用户可以上传、粘贴或导入日语文本，系统自动从原文中提取词汇，生成包含读音、释义、例句和来源定位的暗记卡片。用户可以在桌面端完成文档导入、词汇筛选和卡片制作，在移动端通过 PWA 或后期封装 App 进行复习。

推荐定位：

```text
云端 Web App + 移动端 PWA + 后期桌面/移动端封装
```

最终目标：

> 构建一个部署在公网的日语文档词汇学习 Web App。桌面端负责文档导入、词汇提取、候选词筛选与卡片制作；移动端通过 PWA 负责暗记卡片复习、词汇检索和原文例句回看。系统基于上传或粘贴的文本自动提取词汇，生成包含读音、释义、例句和来源定位的学习卡片，并通过云端数据库保存学习数据，通过本地缓存支持基础离线复习。

---

## 2. 核心需求

### 2.1 必须支持的核心功能

1. 用户上传或粘贴日语文本。
2. 系统自动切分句子。
3. 系统自动提取词汇。
4. 用户可以查看词汇候选列表。
5. 用户可以选择候选词生成暗记卡片。
6. 暗记卡片包含：
   - 词汇
   - 读音
   - 释义
   - 词性
   - 原文例句
   - 来源文档
   - 原文定位信息
7. 用户可以在移动端复习卡片。
8. 用户点击卡片来源，可以回到原文例句或上下文。
9. 系统保存学习状态和复习记录。
10. App 可以公网访问，并支持移动端添加到主屏幕。

### 2.2 第一版不建议做的功能

第一版应避免范围过大，暂不做：

- App Store / Google Play 上架
- 完整原生 App
- 复杂 PDF 精准字符定位
- 扫描版 PDF OCR
- 多用户复杂权限系统
- 社交功能
- 高级统计图表
- 推送通知
- 多端实时同步
- 完整 Anki 级别间隔重复算法

---

## 3. 产品形态

### 3.1 桌面端定位

桌面端主要负责“生产卡片”：

- 文档上传
- 文档阅读
- 词汇提取
- 候选词筛选
- 卡片编辑
- 原文定位
- 文档管理

桌面端适合大屏操作，尤其是以下布局：

```text
原文阅读器 + 词汇候选列表 + 卡片编辑区
```

### 3.2 移动端定位

移动端主要负责“消费卡片”：

- 今日复习
- 卡片学习
- 例句查看
- 原文上下文回看
- 词汇搜索
- 简单学习状态标记

移动端第一版不建议承担复杂文档处理。手机端重点是高频复习，不是复杂制作。

### 3.3 移动端假 App 方案

推荐顺序：

```text
响应式 Web
→ PWA
→ Capacitor 封装
```

第一版采用 PWA 即可满足移动端“像 App 一样使用”的需求：

- 手机浏览器打开网址
- 添加到主屏幕
- 全屏启动
- 基础离线缓存
- 本地保存近期卡片

---

## 4. 技术选型

## 4.1 推荐主技术栈

```text
前端：React + TypeScript + Vite
样式：Tailwind CSS 或 CSS Modules
PWA：vite-plugin-pwa
后端 API：Node.js / FastAPI
数据库：Postgres
文件存储：Supabase Storage / Cloudflare R2 / S3
本地缓存：IndexedDB
日语分词：SudachiPy / kuromoji.js
部署：Cloudflare Pages / Vercel / Render / Railway
移动端封装：Capacitor，后期可选
桌面端封装：Tauri，后期可选
```

### 4.2 前端

推荐：

```text
React + TypeScript + Vite
```

原因：

- 适合复杂交互页面。
- 适合响应式布局。
- 适合 PWA。
- 后期可以被 Capacitor / Tauri 复用。
- 部署到 Vercel、Cloudflare Pages、Netlify 都比较直接。

### 4.3 后端

有两种选择：

#### 方案 A：Node.js 后端

适合：

- 前后端都使用 TypeScript。
- API 较轻。
- 文档解析不重。
- 想减少语言栈复杂度。

可用框架：

```text
Hono / Express / Fastify / Next.js API Routes
```

#### 方案 B：Python FastAPI 后端

适合：

- 日语 NLP。
- PDF / DOCX 解析。
- SudachiPy。
- AI 批处理。
- 后台 Worker。

推荐用于本项目的重型任务服务。

### 4.4 数据库

推荐：

```text
Postgres
```

可选服务：

- Supabase Postgres
- Neon Postgres
- Render Postgres
- Railway Postgres

不建议云端使用 SQLite 作为主数据库。SQLite 更适合本地桌面版或临时原型。

### 4.5 文件存储

上传文档不应直接保存在部署平台的项目目录中，应使用对象存储：

```text
Supabase Storage
Cloudflare R2
Vercel Blob
AWS S3
```

第一版如果使用 Supabase，推荐直接用 Supabase Storage，减少系统复杂度。

### 4.6 本地缓存

移动端 PWA 建议使用：

```text
IndexedDB
```

用于缓存：

- 最近复习卡片
- 学习进度临时状态
- 最近打开的文档片段
- 离线复习数据

---

## 5. 推荐部署架构

## 5.1 最推荐架构

```text
Cloudflare Pages：前端 / PWA / 公网访问
Supabase：Auth / Postgres / Storage
Render：Python FastAPI Worker / 文档解析 / AI 批处理
```

适合原因：

- Cloudflare Pages 适合前端和 PWA。
- Supabase 提供数据库、登录、文件存储。
- Render 适合跑 Python、SudachiPy、PDF 解析和后台任务。
- 三者职责清晰，扩展性好。

整体结构：

```text
用户浏览器 / 手机 PWA
        ↓
Cloudflare Pages 前端
        ↓
Supabase Auth / Postgres / Storage
        ↓
Render Worker 处理文档解析、分词、AI 生成
```

## 5.2 简化架构

如果不想一开始拆太多平台，可以选择：

```text
Render 全家桶
```

包括：

- Render Static Site：前端
- Render Web Service：API
- Render Background Worker：解析任务
- Render Postgres：数据库

优点：

- 平台集中。
- 后端能力强。
- 适合 Python/FastAPI。
- 易于理解。

缺点：

- 前端全球边缘分发体验不如 Cloudflare / Vercel。
- 免费层或低配服务可能有冷启动问题。

## 5.3 快速原型架构

```text
Railway：前端 + 后端 + Postgres + Worker
```

适合快速把项目跑到公网，验证核心功能。

优点：

- 上手快。
- 适合全栈项目。
- Postgres 配置简单。
- Worker 和 API 可以放一起。

缺点：

- 成本需要关注。
- 长期扩展时可能需要重新拆分服务。

## 5.4 Vercel 架构

如果继续使用 Vercel：

```text
Vercel：React/Vite 前端 + 轻量 API
Supabase / Neon：数据库
Supabase Storage / R2 / Vercel Blob：文件存储
Render / Railway：重型解析 Worker
```

注意：

- Vercel 适合前端和轻量 API。
- 不建议把 PDF 解析、OCR、SudachiPy、批量 AI 任务全部放进 Vercel Functions。
- 长任务应交给独立 Worker。

---

## 6. 第一版 MVP 范围

第一版应先打通最核心闭环：

```text
文本导入
→ 句子切分
→ 词汇提取
→ 候选词筛选
→ 卡片生成
→ 移动端复习
→ 原文例句回看
```

### 6.1 第一版必须做

- 响应式 Web 布局
- PWA 基础配置
- 用户登录，若只自己用可先用简单登录或临时关闭注册
- 文本粘贴导入
- TXT / Markdown 导入
- 日语句子切分
- 日语词汇提取
- 词汇候选列表
- 候选词加入卡片
- 卡片库
- 移动端复习页面
- 原文句子回看
- 学习状态保存
- 云端数据库保存
- IndexedDB 缓存近期卡片

### 6.2 第一版可以延后

- PDF 上传
- DOCX 上传
- EPUB 上传
- OCR
- AI 批量释义
- Anki 导出
- 推送通知
- 高级 SRS 算法
- 桌面端 Tauri 打包
- 移动端 Capacitor 打包

---

## 7. 页面结构

## 7.1 桌面端页面

### 7.1.1 Document Library / 文档库

功能：

- 查看所有导入文档
- 显示文档名、类型、导入时间
- 显示词汇数量、卡片数量
- 进入阅读器

字段：

```text
文档名
文件类型
导入时间
句子数量
候选词数量
已生成卡片数量
```

### 7.1.2 Import / 导入

第一版支持：

- 粘贴文本
- TXT 上传
- Markdown 上传

后期支持：

- PDF
- DOCX
- EPUB
- 网页正文抓取

### 7.1.3 Reader / 原文阅读器

桌面端核心页面。

推荐布局：

```text
┌──────────────────────────────┬────────────────────────┐
│ 原文阅读区                     │ 词汇候选 / 卡片操作区    │
│                              │                        │
│ 句子分段显示                   │ 候选词列表              │
│ 当前句子高亮                   │ 加入卡片                │
│ 点击词汇查看信息               │ 忽略                    │
└──────────────────────────────┴────────────────────────┘
```

核心要求：

- 原文按句子或段落结构保存。
- 点击候选词可以定位对应句子。
- 点击卡片来源可以回到原文。

### 7.1.4 Vocabulary Candidates / 词汇候选

功能：

- 查看自动提取出的词汇
- 按出现频率排序
- 按词性筛选
- 按是否已加入卡片筛选
- 批量加入卡片
- 忽略已认识词

建议字段：

```text
词汇
原形
读音
词性
出现次数
例句
状态
```

### 7.1.5 Cards / 卡片库

功能：

- 查看已生成卡片
- 编辑读音、释义、例句
- 查看来源文档
- 查看学习状态
- 删除卡片

### 7.1.6 Review / 复习

桌面端也可以复习，但移动端是主场景。

卡片正面：

```text
単語帳
たんごちょう
```

卡片背面：

```text
释义：单词本；词汇表
例句：新しい単語帳を作りました。
来源：文档 A / 第 3 段 / 第 12 句
```

### 7.1.7 Settings / 设置

第一版需要：

- 语言设置
- 词汇提取规则
- 是否自动生成释义
- AI API 配置，若需要
- 数据导出

---

## 7.2 移动端页面

### 7.2.1 Home / 首页

显示：

- 今日待复习
- 最近学习
- 最近文档
- 快速进入复习

### 7.2.2 Review / 复习

移动端核心页面。

正面：

```text
単語帳
たんごちょう

[显示答案]
```

背面：

```text
单词本；词汇表

例句：
新しい単語帳を作りました。

[查看原文]

不认识 / 认识 / 已掌握
```

### 7.2.3 Source Context / 原文上下文

移动端不建议第一版打开完整 PDF 或复杂文档视图，而是显示：

```text
文档名
第 3 段 / 第 12 句

上一句
目标句子，高亮目标词
下一句
```

这已经可以满足“回到原文语境”的学习需求。

### 7.2.4 Search / 搜索

功能：

- 搜索词汇
- 搜索卡片
- 查看出现过的例句
- 跳转卡片详情

### 7.2.5 Card Detail / 卡片详情

显示：

- 词汇
- 读音
- 释义
- 词性
- 例句
- 来源
- 学习记录

---

## 8. 原文定位设计

原文定位是本项目的关键。

不要只保存例句文本。必须保存例句和原始文档结构之间的关联。

### 8.1 最小定位粒度

第一版建议定位到：

```text
文档 ID
段落 ID
句子 ID
词汇在句子中的 startOffset / endOffset
```

### 8.2 后期定位粒度

后期如果支持 PDF，可以继续增加：

```text
页码
坐标
文本块 ID
字符偏移
```

### 8.3 卡片来源结构

建议每张卡片保存：

```ts
sourceDocumentId: string;
sourceSegmentId: string;
sourceSentenceId: string;
sourceOccurrenceId: string;
```

这样可以支持：

- 从卡片跳回原文
- 从原文查看相关卡片
- 查看某个词在所有文档中的出现位置

---

## 9. 数据模型设计

## 9.1 documents

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  file_type TEXT,
  storage_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 9.2 text_segments

段落级文本。

```sql
CREATE TABLE text_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page INTEGER,
  paragraph_index INTEGER NOT NULL,
  text TEXT NOT NULL,
  start_offset INTEGER,
  end_offset INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 9.3 text_sentences

句子级文本。

```sql
CREATE TABLE text_sentences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  segment_id UUID NOT NULL REFERENCES text_segments(id) ON DELETE CASCADE,
  sentence_index INTEGER NOT NULL,
  text TEXT NOT NULL,
  start_offset INTEGER,
  end_offset INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 9.4 vocabulary_items

词汇基础信息。

```sql
CREATE TABLE vocabulary_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  surface TEXT NOT NULL,
  lemma TEXT,
  reading TEXT,
  part_of_speech TEXT,
  meaning TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 9.5 vocabulary_occurrences

词汇在原文中的出现位置。

```sql
CREATE TABLE vocabulary_occurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vocabulary_id UUID REFERENCES vocabulary_items(id) ON DELETE SET NULL,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  segment_id UUID NOT NULL REFERENCES text_segments(id) ON DELETE CASCADE,
  sentence_id UUID NOT NULL REFERENCES text_sentences(id) ON DELETE CASCADE,
  surface_text TEXT NOT NULL,
  start_offset INTEGER,
  end_offset INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 9.6 cards

```sql
CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  vocabulary_id UUID NOT NULL REFERENCES vocabulary_items(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  segment_id UUID NOT NULL REFERENCES text_segments(id) ON DELETE CASCADE,
  sentence_id UUID NOT NULL REFERENCES text_sentences(id) ON DELETE CASCADE,
  occurrence_id UUID REFERENCES vocabulary_occurrences(id) ON DELETE SET NULL,
  front_text TEXT NOT NULL,
  reading TEXT,
  meaning TEXT,
  example_sentence TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 9.7 review_logs

```sql
CREATE TABLE review_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  result TEXT NOT NULL,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 9.8 review_states

后期加入间隔重复时使用。

```sql
CREATE TABLE review_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  ease_factor NUMERIC DEFAULT 2.5,
  interval_days INTEGER DEFAULT 0,
  due_at TIMESTAMPTZ,
  last_reviewed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 10. 文本处理流程

## 10.1 第一版流程

```text
文本输入
→ 清洗空白符
→ 段落切分
→ 句子切分
→ 保存 text_segments / text_sentences
→ 日语分词
→ 提取候选词
→ 去重
→ 过滤常见词
→ 生成 vocabulary_items / vocabulary_occurrences
→ 用户选择候选词
→ 生成 cards
```

## 10.2 候选词过滤规则

第一版建议过滤：

- 助词
- 助动词
- 标点
- 纯数字
- 过短假名词
- 高频功能词
- 用户已标记忽略的词

优先保留：

- 名词
- 动词
- 形容词
- サ変接続名词
- 固有名词
- 外来语

## 10.3 日语分词选择

### 方案 A：kuromoji.js

优点：

- 可以在 Node / 浏览器侧使用。
- 易于集成 Web 项目。
- 第一版够用。

缺点：

- 质量不如 Sudachi。
- 词典能力有限。

### 方案 B：SudachiPy

优点：

- 分词质量更好。
- 适合 Python 后端。
- 更适合严肃日语文本处理。

缺点：

- 依赖较重。
- 不适合直接放进轻量 serverless function。
- 更适合放到 Render / Railway Worker。

推荐：

```text
MVP：kuromoji.js 或轻量后端分词
正式版：SudachiPy Worker
```

---

## 11. 卡片生成策略

## 11.1 不要默认生成所有卡片

系统自动提取出的词汇中会有大量噪音。推荐流程：

```text
自动提取候选词
→ 用户筛选
→ 用户确认加入
→ 生成卡片
```

## 11.2 卡片字段

每张卡片建议包含：

```text
词汇
原形
读音
词性
中文释义
原文例句
来源文档
来源句子 ID
学习状态
复习记录
```

## 11.3 释义生成方案

### 阶段 1：手动 / 简单词典

第一版可以先允许用户手动编辑释义。

### 阶段 2：词典生成

接入本地或开源词典，自动填充基础释义和读音。

### 阶段 3：AI 上下文释义

AI 根据原文例句判断该词在当前上下文中的含义。

推荐使用混合策略：

```text
词典：负责基础读音、词性、常见释义
AI：负责上下文义项和自然中文解释
```

---

## 12. API 设计

## 12.1 文档相关

```http
POST /api/documents
GET /api/documents
GET /api/documents/:id
DELETE /api/documents/:id
```

## 12.2 文本解析相关

```http
POST /api/documents/:id/parse
GET /api/documents/:id/segments
GET /api/documents/:id/sentences
```

## 12.3 词汇相关

```http
POST /api/documents/:id/extract-vocabulary
GET /api/documents/:id/vocabulary-candidates
POST /api/vocabulary/:id/ignore
```

## 12.4 卡片相关

```http
POST /api/cards
GET /api/cards
GET /api/cards/:id
PATCH /api/cards/:id
DELETE /api/cards/:id
```

## 12.5 复习相关

```http
GET /api/review/today
POST /api/review/:cardId
GET /api/review/stats
```

## 12.6 原文定位相关

```http
GET /api/cards/:id/source
GET /api/sentences/:id/context
```

返回示例：

```json
{
  "documentTitle": "sample.txt",
  "sentence": "新しい単語帳を作りました。",
  "previousSentence": "昨日、日本語の勉強をしました。",
  "nextSentence": "明日も復習する予定です。",
  "highlight": {
    "startOffset": 4,
    "endOffset": 7
  }
}
```

---

## 13. 前端目录结构建议

```text
src/
  app/
    App.tsx
    router.tsx
    providers.tsx

  pages/
    HomePage.tsx
    DocumentsPage.tsx
    ImportPage.tsx
    ReaderPage.tsx
    CandidatesPage.tsx
    CardsPage.tsx
    ReviewPage.tsx
    SourceContextPage.tsx
    SettingsPage.tsx

  features/
    documents/
      api.ts
      types.ts
      components/
    reader/
      api.ts
      types.ts
      components/
    vocabulary/
      api.ts
      types.ts
      components/
    cards/
      api.ts
      types.ts
      components/
    review/
      api.ts
      types.ts
      components/

  shared/
    ui/
    api/
    db/
    hooks/
    utils/
    styles/
```

---

## 14. UI 设计原则

结合你的项目偏好，建议采用：

```text
Vercel / Linear 风格
灰白基调
低饱和度
强信息可读性
轻按钮
少装饰
少状态 chip
清晰留白
移动端优先保证复习体验
```

### 14.1 桌面端布局原则

- 文档阅读类页面：居中或双栏。
- 工具/数据类页面：全宽。
- 不要堆叠过多卡片。
- 避免卡片内部滚动条。
- 词汇候选和原文应保持强关联。

### 14.2 移动端布局原则

- Review 页面优先。
- 单屏只做一个任务。
- 不要把桌面三栏布局强行缩小。
- 原文定位只显示上下文句子。
- 操作按钮固定在底部。

### 14.3 推荐导航

桌面端：

```text
Documents
Import
Review
Cards
Settings
```

移动端底部导航：

```text
Home
Review
Cards
Search
Settings
```

---

## 15. PWA 设计

### 15.1 必须配置

- manifest.json
- service worker
- app icon
- theme_color
- background_color
- display: standalone
- offline fallback

### 15.2 缓存策略

推荐：

```text
App Shell：缓存
静态资源：缓存优先
API 数据：网络优先，失败时读 IndexedDB
复习卡片：提前缓存
文档大文件：不默认全量离线缓存
```

### 15.3 离线复习

移动端可离线使用：

- 今日复习卡片
- 最近复习记录
- 最近原文上下文

离线产生的复习记录在恢复网络后同步到数据库。

---

## 16. 后台任务设计

文档解析、AI 生成、PDF 处理不应阻塞前端请求。

推荐 Job 模型：

```text
用户上传文档
→ 创建 document
→ 创建 parse_job
→ Worker 拉取任务
→ Worker 解析文档
→ 写入 text_segments / text_sentences
→ 创建 vocabulary extraction job
→ 写入候选词
→ 前端轮询状态
```

### 16.1 jobs 表

```sql
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);
```

### 16.2 job 类型

```text
parse_document
extract_vocabulary
generate_meanings
generate_cards
export_anki
```

---

## 17. 开发阶段路线图

## 阶段 0：项目初始化

目标：建立工程骨架。

任务：

- 初始化 Vite + React + TypeScript
- 配置 ESLint / Prettier
- 配置基础路由
- 配置基础 UI 样式
- 配置环境变量
- 配置 GitHub 仓库
- 配置部署平台

交付物：

```text
能打开首页
能部署到公网
移动端能正常访问
```

## 阶段 1：MVP 文本导入与解析

目标：打通文本导入到句子结构。

任务：

- 文本粘贴导入
- TXT 上传
- 文档列表
- 段落切分
- 句子切分
- 保存 document / segment / sentence
- Reader 页面显示原文

交付物：

```text
用户可以导入文本，并在阅读器中查看结构化原文。
```

## 阶段 2：词汇提取

目标：从文本中提取词汇候选。

任务：

- 接入日语分词
- 提取候选词
- 过滤助词、助动词、标点
- 保存 vocabulary_items / vocabulary_occurrences
- 候选词列表页面
- 点击候选词定位原文句子

交付物：

```text
用户可以看到从文档中提取出的候选词，并定位到对应例句。
```

## 阶段 3：卡片生成

目标：从候选词生成暗记卡片。

任务：

- 候选词加入卡片
- 卡片字段编辑
- 卡片库页面
- 卡片与原文关联
- 来源跳转

交付物：

```text
用户可以从候选词生成带原文来源的卡片。
```

## 阶段 4：移动端复习

目标：完成移动端核心学习体验。

任务：

- 移动端 Review 页面
- 显示/隐藏答案
- 认识/不认识/已掌握
- 原文上下文页面
- 保存 review_logs
- 简单今日复习队列

交付物：

```text
用户可以在手机上复习卡片，并回看原文例句。
```

## 阶段 5：PWA

目标：让移动端像 App 一样使用。

任务：

- 配置 manifest
- 配置 service worker
- 配置 app icon
- 配置 offline fallback
- 缓存近期复习卡片
- 手机添加到主屏幕测试

交付物：

```text
用户可以把网站添加到手机主屏幕，并进行基础离线复习。
```

## 阶段 6：云端数据库与文件存储完善

目标：稳定保存数据。

任务：

- 接 Supabase / Neon Postgres
- 接 Supabase Storage / R2
- 文档上传保存到对象存储
- 用户数据隔离
- 数据备份策略

交付物：

```text
数据可以稳定云端保存，多设备访问一致。
```

## 阶段 7：文档格式增强

目标：支持更多文档格式。

任务：

- Markdown
- DOCX
- 简单 PDF 文本抽取
- EPUB
- 网页正文导入

交付物：

```text
用户可以从更多文档来源生成词汇卡片。
```

## 阶段 8：AI / 词典增强

目标：提升卡片质量。

任务：

- 接入词典数据
- 自动生成读音
- 自动生成中文释义
- AI 根据上下文生成解释
- 结果缓存
- 用户可编辑

交付物：

```text
卡片可以自动包含更准确的读音、释义和上下文解释。
```

## 阶段 9：封装 App

目标：在需要时提供更像原生 App 的形态。

任务：

- Capacitor 封装移动端
- Tauri 封装桌面端
- 本地缓存加强
- 文件系统权限适配

交付物：

```text
移动端和桌面端都可以以 App 形态使用。
```

---

## 18. 部署方案细化

## 18.1 推荐方案 A：Cloudflare Pages + Supabase + Render

### 前端部署

平台：Cloudflare Pages

步骤：

1. GitHub 建仓库。
2. 推送前端项目。
3. Cloudflare Pages 连接 GitHub。
4. 设置构建命令：

```bash
npm run build
```

5. 设置输出目录：

```bash
dist
```

6. 配置环境变量：

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_API_BASE_URL
```

### 数据库和文件

平台：Supabase

使用：

- Auth：用户登录
- Postgres：保存业务数据
- Storage：保存上传文档

### Worker

平台：Render

服务：

- Python FastAPI
- SudachiPy
- PDF / DOCX parser
- AI card generator

环境变量：

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY 或其他模型 API KEY
```

---

## 18.2 推荐方案 B：Render 全家桶

适合想减少平台数量。

服务划分：

```text
Render Static Site：前端
Render Web Service：API
Render Background Worker：解析任务
Render Postgres：数据库
```

优点：

- 后端部署简单。
- Python 任务支持好。
- 统一管理。

缺点：

- 前端边缘分发不如 Cloudflare。
- 低配服务可能有冷启动。

---

## 18.3 推荐方案 C：Railway 快速原型

适合快速公网访问和全栈开发。

服务划分：

```text
Railway Web：API
Railway Postgres：数据库
Railway Worker：解析任务
前端可以部署到 Railway 或 Cloudflare Pages
```

优点：

- 原型速度快。
- Postgres 易配置。
- 全栈项目体验好。

缺点：

- 成本需持续关注。
- 后期可能需要迁移或拆分。

---

## 19. 环境变量设计

前端：

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_BASE_URL=
```

后端：

```text
DATABASE_URL=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
STORAGE_BUCKET=
OPENAI_API_KEY=
AI_BASE_URL=
JWT_SECRET=
```

注意：

- 前端只能放公开 key。
- service role key 只能放后端。
- AI API key 不能暴露到前端。

---

## 20. 安全和权限

### 20.1 用户数据隔离

每张业务表都建议包含：

```text
user_id
```

并在查询时始终按 user_id 过滤。

如果用 Supabase，应配置 Row Level Security。

### 20.2 文件权限

上传文件路径建议包含用户 ID：

```text
users/{userId}/documents/{documentId}/original.pdf
```

### 20.3 API Key 安全

禁止在前端暴露：

- Supabase service role key
- OpenAI API key
- 其他 AI 平台 secret key
- 数据库直连 URL

---

## 21. 复习算法

第一版不需要复杂 SRS。

可先使用简单状态：

```text
new
learning
known
mastered
ignored
```

复习按钮：

```text
不认识
认识
已掌握
```

后期再升级为间隔重复：

```text
SM-2
FSRS
自定义轻量间隔算法
```

第一版重点是：

```text
卡片质量 + 原文语境 + 移动端复习闭环
```

不是复杂算法。

---

## 22. 推荐开发顺序

最现实的顺序：

```text
1. 先做 React/Vite 前端骨架
2. 做文本导入和 Reader
3. 做句子切分和本地 mock 数据
4. 做词汇候选列表
5. 做卡片生成
6. 做移动端 Review
7. 加 Supabase
8. 部署到 Cloudflare Pages / Vercel
9. 加 PWA
10. 再做后端 Worker
11. 再做 PDF / DOCX
12. 再接 AI / 词典
```

不要一开始就同时做：

```text
PDF + OCR + AI + PWA + 原生封装 + 复杂复习
```

这样会失控。

---

## 23. 最小可交付版本定义

MVP 完成标准：

1. 可以公网访问。
2. 可以手机打开。
3. 可以添加到主屏幕。
4. 可以粘贴一段日语文本。
5. 可以自动切分句子。
6. 可以自动提取候选词。
7. 可以生成卡片。
8. 卡片包含词汇、读音、释义、例句。
9. 卡片能跳回原文例句。
10. 手机端可以复习卡片。
11. 学习状态可以保存。

---

## 24. 最终建议

本项目最合适的路线不是单纯桌面端，也不是一开始做原生移动端，而是：

```text
Web-first
PWA-first
Cloud-first
Desktop/Mobile shell later
```

推荐最终技术路线：

```text
前端：React + TypeScript + Vite
移动端：PWA
数据库：Supabase Postgres
文件存储：Supabase Storage 或 Cloudflare R2
解析服务：Render Python FastAPI Worker
部署入口：Cloudflare Pages 或 Vercel
后期移动端封装：Capacitor
后期桌面端封装：Tauri
```

第一版最关键的不是 UI，也不是部署平台，而是打通这条链路：

```text
原文结构
→ 句子结构
→ 词汇出现位置
→ 卡片
→ 原文回跳
→ 移动端复习
```

只要这个链路稳定，后续无论是部署到 Vercel、Cloudflare、Render，还是封装成桌面 App / 移动端 App，都可以自然扩展。
