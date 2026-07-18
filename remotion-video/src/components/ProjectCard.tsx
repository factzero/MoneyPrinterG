import React from "react";
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, SAFE_INSET_H, type RepoData } from "../data";
import { AnimatedNumber } from "./Title";

export const ProjectCard: React.FC<{
  repo: RepoData;
  delay?: number;
}> = ({ repo, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 整体入场
  const cardProgress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 20, stiffness: 90 },
  });
  const cardOpacity = interpolate(cardProgress, [0, 1], [0, 1], { extrapolateRight: "clamp" });
  const cardY = interpolate(cardProgress, [0, 1], [80, 0], { extrapolateRight: "clamp" });

  // 截图入场延迟
  const imgProgress = spring({
    frame: frame - delay - 15,
    fps,
    config: { damping: 18, stiffness: 80 },
  });
  const imgOpacity = interpolate(imgProgress, [0, 1], [0, 1], { extrapolateRight: "clamp" });
  const imgScale = interpolate(imgProgress, [0, 1], [0.92, 1], { extrapolateRight: "clamp" });

  // 语言标签颜色
  const langColors: Record<string, string> = {
    TypeScript: "#2F74C0",
    "C++": "#D94F7A",
    Rust: "#D28C5E",
    JavaScript: "#E8C339",
    Python: "#3572A5",
    Go: "#00ADD8",
    Java: "#B07219",
  };

  return (
    <div
      style={{
        opacity: cardOpacity,
        transform: `translateY(${cardY}px)`,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        padding: `0 ${SAFE_INSET_H}px`,
        boxSizing: "border-box",
      }}
    >
      {/* ====== 标题栏 ====== */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          marginBottom: 20,
        }}
      >
        {/* 排名徽章 */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 18,
            background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accent3})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 34,
            fontWeight: 900,
            color: "#fff",
            flexShrink: 0,
            boxShadow: `0 4px 24px rgba(37,99,235,0.3)`,
          }}
        >
          {repo.rank}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 26, color: COLORS.textMuted, marginBottom: 4 }}>
            {repo.owner}
          </div>
          <div
            style={{
              fontSize: 50,
              fontWeight: 800,
              color: COLORS.text,
              lineHeight: 1.1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {repo.repo}
          </div>
        </div>

        {/* 语言标签 */}
        <div
          style={{
            padding: "12px 26px",
            borderRadius: 28,
            fontSize: 26,
            fontWeight: 700,
            backgroundColor: langColors[repo.language] || COLORS.accent,
            color: repo.language === "JavaScript" ? "#000" : "#fff",
            flexShrink: 0,
          }}
        >
          {repo.language}
        </div>
      </div>

      {/* ====== 描述 ====== */}
      <p
        style={{
          fontSize: 34,
          color: COLORS.textDim,
          lineHeight: 1.4,
          margin: "0 0 20px 0",
          padding: "0 2px",
        }}
      >
        {repo.description}
      </p>

      {/* ====== 数据面板 ====== */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          padding: "28px 8px",
          marginBottom: 16,
          background: COLORS.bgCard,
          borderRadius: 16,
          border: "1px solid rgba(37,99,235,0.12)",
          boxShadow: "0 2px 12px rgba(37,99,235,0.06)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 26, color: COLORS.textMuted, marginBottom: 8 }}>Stars</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, justifyContent: "center" }}>
            <span style={{ fontSize: 28, color: COLORS.accent3 }}>★</span>
            <span style={{ fontSize: 52, fontWeight: 800, color: COLORS.text }}>
              {repo.stars}
            </span>
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 26, color: COLORS.textMuted, marginBottom: 8 }}>Forks</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, justifyContent: "center" }}>
            <span style={{ fontSize: 28, color: COLORS.accent4 }}>⑂</span>
            <span style={{ fontSize: 52, fontWeight: 800, color: COLORS.text }}>
              {repo.forks}
            </span>
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 26, color: COLORS.textMuted, marginBottom: 8 }}>本周新增</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, justifyContent: "center" }}>
            <span style={{ fontSize: 28, color: COLORS.green }}>↑</span>
            <AnimatedNumber
              value={repo.weeklyStars}
              delay={delay + 25}
              duration={30}
              color={COLORS.green}
              fontSize={52}
            />
          </div>
        </div>
      </div>

      {/* ====== GitHub 截图（核心视觉） ====== */}
      <div
        style={{
          opacity: imgOpacity,
          transform: `scale(${imgScale})`,
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid rgba(0,0,0,0.1)",
          boxShadow: "0 6px 32px rgba(0,0,0,0.12)",
          flex: 1,
        }}
      >
        <Img
          src={staticFile(repo.screenshot)}
          style={{
            width: "100%",
            display: "block",
          }}
        />
      </div>
    </div>
  );
};

/** 片头中的项目缩略预览 - 抖音竖屏版 */
export const RepoPreview: React.FC<{
  repo: RepoData;
  delay?: number;
}> = ({ repo, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const opacity = interpolate(progress, [0, 1], [0, 1], { extrapolateRight: "clamp" });
  const scale = interpolate(progress, [0, 1], [0.85, 1], { extrapolateRight: "clamp" });

  // 每个卡片用不同的底色 + 左边框颜色，转视频后分界线清晰
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
      style={{
        opacity,
        transform: `scale(${scale})`,
        background: c.bg,
        borderRadius: 16,
        padding: "22px 26px",
        display: "flex",
        alignItems: "center",
        gap: 20,
        border: `2px solid ${c.border}33`,
        borderLeft: `6px solid ${c.border}`,
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
      }}
    >
      <span
        style={{
          fontSize: 54,
          fontWeight: 800,
          color: c.border,
          minWidth: 54,
          textAlign: "center",
        }}
      >
        {repo.rank}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 38, fontWeight: 700, color: COLORS.text }}>
          {repo.repo}
        </div>
        <div style={{ fontSize: 26, color: COLORS.textMuted, marginTop: 5 }}>
          ↑{repo.weeklyStars.toLocaleString()} stars this week
        </div>
      </div>
    </div>
  );
};
