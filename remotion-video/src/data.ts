// ============================================================
// 固定配置（颜色、算法）— 永远不需要手动修改
// ============================================================

import { staticFile } from "remotion";
import { getAudioDuration } from "@remotion/media-utils";

export interface RepoData {
  rank: number;
  name: string;
  owner: string;
  repo: string;
  url: string;
  description: string;
  language: string;
  stars: string;
  forks: string;
  weeklyStars: number;
  screenshot: string;
}

export const COLORS = {
  bg: "#FFFFFF",
  bgCard: "#EEF1FF",
  accent: "#2563EB",
  accent2: "#3B82F6",
  accent3: "#6366F1",
  accent4: "#06B6D4",
  text: "#16162A",
  textDim: "rgba(0,0,0,0.62)",
  textMuted: "rgba(0,0,0,0.4)",
  green: "#059669",
  red: "#DC2626",
};

export const FPS = 30;

// ====== 字幕工具函数 ======

export interface SubtitleSegment {
  text: string;
  startFrame: number;
  endFrame: number;
}

const CHAR_PER_SEC = 3.15;

export function distributeSegments(
  rawText: string,
  totalFrames: number,
): SubtitleSegment[] {
  const sentences = rawText
    .split(/(?<=[。！？；：])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const totalChars = sentences.reduce((sum, s) => sum + s.length, 0);
  if (totalChars === 0) return [];

  const segments: SubtitleSegment[] = [];
  let currentFrame = 0;
  for (const sentence of sentences) {
    const duration = (sentence.length / totalChars) * totalFrames;
    segments.push({
      text: sentence,
      startFrame: Math.round(currentFrame),
      endFrame: Math.round(currentFrame + duration),
    });
    currentFrame += duration;
  }
  return segments;
}

// ============================================================
// 动态数据 — 从 public/content.json 加载
// ============================================================

// 默认占位值，initContent() 调用后会被替换
export let repos: RepoData[] = [];
export let SCENE_FRAMES: number[] = [];
export let INTRO_TITLE_FRAMES = 0;
export let INTRO_PROJECTS_FRAMES = 0;
export let PROJECT_FRAMES_LIST: number[] = [];
export let OUTRO_FRAMES = 0;
export let TOTAL_FRAMES = 0;
export let SUBTITLES: Record<string, SubtitleSegment[]> = {};
export const AUDIO_FILES = [
  "audio/01-intro.mp3",
  "audio/01b-intro-projects.mp3",
  "audio/02-project-1.mp3",
  "audio/03-project-2.mp3",
  "audio/04-project-3.mp3",
  "audio/05-project-4.mp3",
  "audio/06-project-5.mp3",
  "audio/07-outro.mp3",
];

let _starts: number[] = [];
let _acc = 0;

export function getSceneStart(index: number): number {
  return _starts[index];
}

export function getProjectStart(index: number): number {
  return _starts[2 + index];
}

export function getSceneFrames(index: number): number {
  return SCENE_FRAMES[index];
}

/** 在 Root.tsx 中调用一次，从 content.json 加载所有数据 */
export async function initContent(): Promise<void> {
  const resp = await fetch(staticFile("/content.json"));
  const content = await resp.json();

  repos = content.repos;

  // 用实际音频文件时长校准帧数，避免估算偏差导致音画不同步
  const calibratedFrames: number[] = [];
  for (const audioFile of AUDIO_FILES) {
    const durationSec = await getAudioDuration(staticFile(audioFile));
    calibratedFrames.push(Math.ceil(durationSec * FPS));
  }
  SCENE_FRAMES = calibratedFrames;
  INTRO_TITLE_FRAMES = SCENE_FRAMES[0];
  INTRO_PROJECTS_FRAMES = SCENE_FRAMES[1];
  PROJECT_FRAMES_LIST = SCENE_FRAMES.slice(2, 7);
  OUTRO_FRAMES = SCENE_FRAMES[7];

  // 计算累计起始帧
  _starts = [];
  _acc = 0;
  for (const f of SCENE_FRAMES) {
    _starts.push(_acc);
    _acc += f;
  }
  TOTAL_FRAMES = _acc;

  // 预计算字幕 — 优先使用 TTS 精准时间戳
  const sceneKeys = [
    "intro", "intro-projects",
    "project-1", "project-2", "project-3",
    "project-4", "project-5",
    "outro",
  ];
  SUBTITLES = {};
  for (let i = 0; i < sceneKeys.length; i++) {
    const key = sceneKeys[i];
    const timing = content.subtitleTiming?.[key];
    if (timing && timing.length > 0) {
      // 使用 TTS 精准时间戳
      SUBTITLES[key] = timing.map(
        (line: { start: number; end: number; text: string }) => ({
          text: line.text,
          startFrame: Math.round(line.start * FPS),
          endFrame: Math.round(line.end * FPS),
        }),
      );
    } else {
      // 兜底：按字数等分
      const text = content.subtitles[key] || "";
      SUBTITLES[key] = distributeSegments(text, SCENE_FRAMES[i]);
    }
  }
}
