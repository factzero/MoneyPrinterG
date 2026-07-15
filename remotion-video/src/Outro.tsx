import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, OUTRO_FRAMES, repos, SUBTITLES } from "./data";
import { BackgroundDots } from "./components/BackgroundDots";
import { Subtitle } from "./components/Subtitle";

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProgress = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 80 },
  });
  const titleOpacity = interpolate(titleProgress, [0, 1], [0, 1], { extrapolateRight: "clamp" });
  const listOpacity = interpolate(frame, [15, 40], [0, 1], { extrapolateRight: "clamp" });
  const ctaOpacity = interpolate(frame, [45, 75], [0, 1], { extrapolateRight: "clamp" });
  const brandOpacity = interpolate(frame, [OUTRO_FRAMES - 80, OUTRO_FRAMES - 30], [0, 0.7]);


  return (
    <AbsoluteFill
      style={{
        background: "#F8F9FC",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 36px",
      }}
    >
      <BackgroundDots />

      {/* 卡片区域遮罩 — 用毛玻璃效果遮盖背景杂点 */}
      <div
        style={{
          position: "absolute",
          top: "22%",
          left: "4%",
          right: "4%",
          bottom: "15%",
          borderRadius: 28,
          background: "rgba(255,255,255,0.75)",
          backdropFilter: "blur(12px)",
          opacity: listOpacity,
          zIndex: 1,
        }}
      />

      {/* ====== 标题 ====== */}
      <div style={{ textAlign: "center", marginBottom: 50, opacity: titleOpacity, zIndex: 2, position: "relative" }}>
        <h1
          style={{
            fontSize: 52,
            fontWeight: 900,
            color: COLORS.accent,
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          本周 Top 5 回顾
        </h1>
      </div>

      {/* ====== 项目回顾列表 ====== */}
      <div
        style={{
          opacity: listOpacity,
          display: "flex",
          flexDirection: "column",
          gap: 26,
          marginBottom: 60,
          width: "100%",
          zIndex: 2,
          position: "relative",
        }}
      >
        {repos.map((repo) => {
          const cardColors = [
            { bg: "#EEF2FF", border: "#2563EB", accent: "#1D4ED8" },
            { bg: "#FDF2F8", border: "#DB2777", accent: "#BE185D" },
            { bg: "#ECFDF5", border: "#059669", accent: "#047857" },
            { bg: "#FFF7ED", border: "#EA580C", accent: "#C2410C" },
            { bg: "#F5F3FF", border: "#7C3AED", accent: "#6D28D9" },
          ];
          const c = cardColors[(repo.rank - 1) % 5];
          return (
          <div
            key={repo.rank}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "22px 28px",
              background: c.bg,
              borderRadius: 16,
              border: `2px solid ${c.border}33`,
              borderLeft: `6px solid ${c.border}`,
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            }}
          >
            <span
              style={{
                color: c.border,
                fontWeight: 900,
                fontSize: 34,
                minWidth: 38,
                textAlign: "center",
              }}
            >
              {repo.rank}
            </span>
            <span
              style={{
                color: COLORS.text,
                fontWeight: 700,
                fontSize: 30,
                flex: 1,
              }}
            >
              {repo.repo}
            </span>
            <span style={{ color: COLORS.green, fontSize: 24, fontWeight: 600 }}>
              ↑{repo.weeklyStars.toLocaleString()}
            </span>
          </div>
        );
        })}
      </div>

      {/* ====== 抖音 CTA ====== */}
      <div style={{ textAlign: "center", opacity: ctaOpacity, zIndex: 2, position: "relative" }}>
        <p
          style={{
            fontSize: 30,
            fontWeight: 800,
            color: COLORS.text,
            marginBottom: 10,
            lineHeight: 1.4,
          }}
        >
          你最喜欢哪个项目？
        </p>
        <p style={{ fontSize: 22, color: COLORS.textDim, marginBottom: 36 }}>
          评论区告诉我 👇
        </p>

        {/* 抖音互动按钮 */}
        <div
          style={{
            display: "flex",
            gap: 16,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          {[
            { label: "点赞", icon: "❤️" },
            { label: "关注", icon: "➕" },
            { label: "评论", icon: "💬" },
            { label: "收藏", icon: "⭐" },
          ].map((btn, i) => (
            <div
              key={btn.label}
              style={{
                padding: "14px 30px",
                borderRadius: 30,
                border: i === 0 ? "none" : "1.5px solid rgba(0,0,0,0.18)",
                backgroundColor: i === 0 ? COLORS.accent : "#FFFFFF",
                color: i === 0 ? "#fff" : COLORS.text,
                boxShadow: "0 3px 16px rgba(0,0,0,0.08)",
                fontSize: 18,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {btn.icon} {btn.label}
            </div>
          ))}
        </div>
      </div>

      {/* ====== 底部品牌 ====== */}
      <div
        style={{
          position: "absolute",
          bottom: 50,
          fontSize: 18,
          color: COLORS.textMuted,
          opacity: brandOpacity,
          zIndex: 2,
        }}
      >
        @墨白 · 每周盘点 GitHub 开源项目
      </div>

      {/* 字幕 */}
      <Subtitle segments={SUBTITLES.outro} />
    </AbsoluteFill>
  );
};
