import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { COLORS, INTRO_PROJECTS_FRAMES, SAFE_INSET_H, repos, SUBTITLES } from "./data";
import { RepoPreview } from "./components/ProjectCard";
import { BackgroundDots } from "./components/BackgroundDots";
import { Subtitle } from "./components/Subtitle";

/** 计算本周一 ~ 周日的日期范围 */
function getWeekRange(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
  return `${fmt(monday)} ~ ${fmt(sunday)}`;
}

const WEEK_RANGE = getWeekRange();

export const IntroProjects: React.FC = () => {
  const frame = useCurrentFrame();
  const totalFrames = INTRO_PROJECTS_FRAMES;

  // 背景光晕动画
  const glowOpacity = interpolate(frame, [0, totalFrames / 2, totalFrames], [0, 0.15, 0]);
  const bgScale = interpolate(frame, [0, totalFrames], [1, 1.15]);

  // 标题淡入
  const titleOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const dateOpacity = interpolate(frame, [10, 30], [0, 0.7], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "#F8F9FC", overflow: "hidden" }}>
      <BackgroundDots />

      {/* 背景光晕 */}
      <div
        style={{
          position: "absolute", top: "50%", left: "50%",
          transform: `translate(-50%, -50%) scale(${bgScale})`,
          width: 800, height: 800, borderRadius: "50%",
          background: `radial-gradient(circle, rgba(37,99,235,0.08) 0%, rgba(99,102,241,0.04) 40%, transparent 70%)`,
          opacity: glowOpacity,
        }}
      />

      {/* 主标题 + 日期 + 项目卡片 - 整体居中 */}
      <div
        style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          paddingLeft: SAFE_INSET_H, paddingRight: SAFE_INSET_H,
          gap: 72,
        }}
      >
        {/* 标题 + 日期 */}
        <div
          style={{
            display: "flex", flexDirection: "column",
            alignItems: "center", gap: 8,
          }}
        >
          <h1
            style={{
              fontSize: 44,
              fontWeight: 900,
              color: COLORS.text,
              margin: 0,
              lineHeight: 1.3,
              letterSpacing: "-0.02em",
              opacity: titleOpacity,
            }}
          >
            <span style={{ color: COLORS.accent }}>GitHub</span>{" "}
            本周神仙项目盘点
          </h1>
          <div
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: COLORS.textDim,
              opacity: dateOpacity,
            }}
          >
            {WEEK_RANGE}
          </div>
        </div>

        {/* 项目卡片列表 */}
        <div
          style={{
            display: "flex", flexDirection: "column",
            alignItems: "stretch",
            gap: 12,
            width: "100%",
          }}
        >
          {repos.map((repo, i) => (
            <RepoPreview key={repo.rank} repo={repo} delay={10 + i * 8} />
          ))}
        </div>
      </div>

      {/* 底部装饰线 */}
      <div
        style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 4,
          background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.accent3}, ${COLORS.accent2})`,
          opacity: interpolate(frame, [5, 20], [0, 0.8]),
        }}
      />

      {/* 字幕 */}
      <Subtitle segments={SUBTITLES["intro-projects"]} />
    </AbsoluteFill>
  );
};
