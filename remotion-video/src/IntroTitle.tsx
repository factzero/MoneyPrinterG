import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, INTRO_TITLE_FRAMES, SUBTITLES } from "./data";
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

export const IntroTitle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const totalFrames = INTRO_TITLE_FRAMES;

  // 背景光晕动画
  const glowOpacity = interpolate(frame, [0, totalFrames / 2, totalFrames], [0, 0.18, 0]);
  const bgScale = interpolate(frame, [0, totalFrames], [1, 1.2]);

  // 标题弹入动画
  const hook3s = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });
  const hookOpacity = interpolate(hook3s, [0, 1], [0, 1], { extrapolateRight: "clamp" });
  const hookScale = interpolate(hook3s, [0, 1], [1.3, 1], { extrapolateRight: "clamp" });

  // 日期淡入
  const brandOpacity = interpolate(frame, [40, 70], [0, 0.8], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "#F8F9FC", overflow: "hidden" }}>
      {/* 网格线背景 */}
      <div
        style={{
          position: "absolute", inset: 0,
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.06) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />
      <div
        style={{
          position: "absolute", inset: 0,
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.035) 1px, transparent 1px)
          `,
          backgroundSize: "192px 192px",
        }}
      />

      {/* 背景光晕 */}
      <div
        style={{
          position: "absolute", top: "35%", left: "50%",
          transform: `translate(-50%, -50%) scale(${bgScale})`,
          width: 1000, height: 1000, borderRadius: "50%",
          background: `radial-gradient(circle, rgba(37,99,235,0.12) 0%, rgba(99,102,241,0.06) 40%, transparent 70%)`,
          opacity: glowOpacity,
        }}
      />

      {/* 装饰光点 */}
      <div style={{ position: "absolute", top: "15%", left: "20%", width: 6, height: 6, borderRadius: "50%", backgroundColor: COLORS.accent3, opacity: interpolate(frame, [20, 60, totalFrames], [0, 0.7, 0]) }} />
      <div style={{ position: "absolute", top: "70%", right: "25%", width: 4, height: 4, borderRadius: "50%", backgroundColor: COLORS.accent2, opacity: interpolate(frame, [30, 70, totalFrames], [0, 0.6, 0]) }} />

      {/* 标题 - 居中 */}
      <div
        style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          justifyContent: "center", alignItems: "center",
          gap: 60, paddingBottom: 40,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h1
            style={{
              fontSize: 72,
              fontWeight: 900,
              color: COLORS.text,
              margin: 0,
              lineHeight: 1.3,
              letterSpacing: "-0.02em",
              opacity: hookOpacity,
              transform: `scale(${hookScale})`,
            }}
          >
            <span style={{ color: COLORS.accent }}>GitHub</span>{" "}
            本周<br />神仙项目盘点
          </h1>
        </div>

        <div
          style={{
            textAlign: "center",
            fontSize: 28,
            fontWeight: 600,
            color: COLORS.textDim,
            opacity: brandOpacity,
          }}
        >
          {WEEK_RANGE}
        </div>
      </div>

      {/* 底部装饰线 */}
      <div
        style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 4,
          background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.accent3}, ${COLORS.accent2})`,
          opacity: interpolate(frame, [20, 60], [0, 1]),
        }}
      />

      {/* 字幕 */}
      <Subtitle segments={SUBTITLES.intro} />
    </AbsoluteFill>
  );
};
