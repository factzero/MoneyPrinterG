# MoneyPrinter 🎬

> GitHub Trending 短视频自动化生产流水线 —— 从数据抓取到视频渲染，一键出片。

## 项目简介

MoneyPrinter 将 GitHub 热门项目数据自动转化为竖屏解说短视频（1080p，适用于抖音/B站）。全流程包括：

**数据抓取** → **AI 文案生成** → **语音合成** → **视频渲染**

技术栈：Python（爬虫 + LLM + TTS）+ TypeScript（Remotion + React 视频渲染）

## 快速开始

### 环境准备

```bash
# Python 依赖
pip install -r requirements.txt

# Node.js 依赖
cd remotion-video
npm install
```

### 环境变量

复制 `.env.example` 为 `.env`，填入 LLM API 密钥：

```env
# DeepSeek（默认）
DEEPSEEK_API_KEY=sk-xxxxxxxx

# 或 OpenAI
OPENAI_API_KEY=sk-xxxxxxxx
```

### 一键构建

```bat
daily_build.bat
```

按顺序执行 4 个步骤：
1. 抓取 GitHub Trending Top5 数据
2. 下载项目 OG 截图
3. AI 生成解说文案
4. Edge TTS 合成配音 + 生成 content.json

### 预览与渲染

```bash
cd remotion-video

# 启动 Remotion Studio 预览
npm run dev

# 渲染最终 MP4 视频
npm run render
```

## 项目结构

```
MoneyPrinter/
├── get_github_trending.py      # GitHub Trending 数据抓取
├── generate_video_script.py    # AI 文案生成（DeepSeek / OpenAI）
├── capture_screenshots.py      # 项目 OG 截图下载
├── daily_build.bat             # 一键全流程构建
├── requirements.txt            # Python 依赖
├── output/                     # 中间产物（JSON + MD）
│   ├── github_trending_*.json
│   └── video_script_*.md
└── remotion-video/             # Remotion 视频项目
    ├── public/
    │   ├── content.json        # 视频数据入口
    │   ├── audio/              # Edge TTS 配音（MP3）
    │   └── screenshots/        # 项目截图（PNG）
    ├── scripts/
    │   └── generate_audio_edge.py  # TTS 配音 + content.json 生成
    └── src/
        ├── MainVideo.tsx       # 主视频编排（8 个 Sequence）
        ├── IntroTitle.tsx      # 片头：粒子背景 + 光环 + 玻璃破碎转场
        ├── IntroProjects.tsx   # 项目概览页（5 张缩略卡片）
        ├── ProjectScene.tsx    # 单个项目详情页
        ├── Outro.tsx           # 片尾回顾 + CTA
        ├── data.ts             # 类型定义、颜色常量、字幕
        └── components/
            ├── BackgroundDots.tsx  # 3D 视差浮点背景
            ├── GlassCover.tsx      # 玻璃破碎转场特效
            ├── ProjectCard.tsx     # 项目卡片
            ├── ProgressBar.tsx     # 进度条
            ├── Subtitle.tsx        # 字幕组件
            └── Title.tsx           # 通用标题/数字动画
```

## 视频结构

| 场景 | 组件 | 时长 | 说明 |
|------|------|------|------|
| 片头 | `IntroTitle` | ~3s | 动态渐变背景 + 粒子 + 光环 |
| 项目概览 | `IntroProjects` | ~8s | Top5 项目缩略卡片 |
| 项目详情 1-5 | `ProjectScene` | ~40s×5 | 单项目深度解说 |
| 片尾 | `Outro` | ~5s | Top5 回顾 + 关注引导 |

## 各脚本说明

### get_github_trending.py

```bash
# 抓取本周 Top5（默认）
python get_github_trending.py

# 每日 Top10
python get_github_trending.py -n 10 -s daily

# 指定语言
python get_github_trending.py -l python
```

### generate_video_script.py

```bash
# 自动加载最新数据文件
python generate_video_script.py

# 指定数据文件
python generate_video_script.py -f output/github_trending_weekly_20260714.json

# 切换模型
python generate_video_script.py -m openai
```

### capture_screenshots.py

```bash
# 下载所有项目截图
python capture_screenshots.py
```

## 技术栈

| 环节 | 技术 |
|------|------|
| 数据抓取 | Python + BeautifulSoup + requests |
| AI 文案 | DeepSeek / OpenAI API |
| 语音合成 | Microsoft Edge TTS（免费） |
| 视频渲染 | Remotion v4 + React 18 + TypeScript |
| 编码输出 | FFmpeg (H.264, CRF 18, yuv420p) |

## License

MIT
