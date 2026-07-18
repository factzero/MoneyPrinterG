import React from "react";
import { repos, COLORS, SAFE_INSET_H } from "./data";

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
const top5Repos = repos.slice(0, 5);

export const CoverImage: React.FC = () => {
  return (
    <div
      style={{
        width: 1080,
        height: 1440,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background: `
          radial-gradient(ellipse 75% 55% at 50% 32%, rgba(37,99,235,0.12) 0%, transparent 55%),
          radial-gradient(ellipse 50% 45% at 78% 48%, rgba(139,92,246,0.06) 0%, transparent 50%),
          linear-gradient(180deg, #F8F9FC 0%, #EEF2FF 45%, #F8F9FC 100%)
        `,
        position: "relative",
        overflow: "hidden",
        fontFamily: '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif',
      }}
    >
      {/* 底部渐变条 */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 4,
          background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.accent3}, ${COLORS.accent4}, #10B981)`,
        }}
      />

      {/* Star 徽标 */}
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "rgba(37,99,235,0.08)",
            border: "1px solid rgba(37,99,235,0.18)",
            borderRadius: 40,
            padding: "10px 30px",
          }}
        >
          <span style={{ fontSize: 28, lineHeight: 1 }}>⭐</span>
          <span
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: COLORS.accent,
              letterSpacing: "0.04em",
            }}
          >
            每周精选 · GitHub Trending
          </span>
        </div>
      </div>

      {/* 主标题 */}
      <h1
        style={{
          fontSize: 110,
          fontWeight: 900,
          margin: 0,
          lineHeight: 1.08,
          letterSpacing: "-0.04em",
          textAlign: "center",
          background:
            "linear-gradient(135deg, #1D4ED8 0%, #6366F1 35%, #8B5CF6 65%, #06B6D4 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          filter: "drop-shadow(0 2px 12px rgba(37,99,235,0.20))",
        }}
      >
        GitHub
      </h1>

      {/* 副标题 */}
      <p
        style={{
          fontSize: 52,
          fontWeight: 800,
          color: COLORS.text,
          margin: "10px 0 0 0",
          lineHeight: 1.35,
          letterSpacing: "0.05em",
          textAlign: "center",
        }}
      >
        本周神仙项目盘点
      </p>

      {/* 分割线 */}
      <div
        style={{
          width: 380,
          height: 3,
          borderRadius: 2,
          marginTop: 36,
          background: `linear-gradient(90deg, transparent, ${COLORS.accent}, ${COLORS.accent3}, ${COLORS.accent4}, transparent)`,
        }}
      />

      {/* 日期 */}
      <div style={{ marginTop: 28 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 30px",
            background: "rgba(37,99,235,0.06)",
            border: "1px solid rgba(37,99,235,0.12)",
            borderRadius: 30,
          }}
        >
          <span style={{ fontSize: 18 }}>📅</span>
          <span
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: COLORS.textDim,
              letterSpacing: "0.03em",
            }}
          >
            {WEEK_RANGE}
          </span>
        </div>
      </div>

      {/* 项目预览 - 卡片样式 */}
      <div
        style={{
          marginTop: 30,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          width: "88%",
          maxWidth: 860,
        }}
      >
        {top5Repos.map((repo) => {
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
                padding: "14px 24px",
                background: c.bg,
                borderRadius: 14,
                border: `2px solid ${c.border}33`,
                borderLeft: `7px solid ${c.border}`,
                boxShadow: "0 4px 18px rgba(0,0,0,0.07)",
              }}
            >
              <span
                style={{
                  color: c.border,
                  fontWeight: 900,
                  fontSize: 38,
                  minWidth: 44,
                  textAlign: "center",
                }}
              >
                {repo.rank}
              </span>
              <span
                style={{
                  color: COLORS.text,
                  fontWeight: 700,
                  fontSize: 24,
                  flex: 1,
                }}
              >
                {repo.owner}/{repo.repo}
              </span>
              <span
                style={{
                  color: COLORS.green,
                  fontSize: 18,
                  fontWeight: 700,
                }}
              >
                ↑{repo.weeklyStars.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>

      {/* 品牌 */}
      <div
        style={{
          position: "absolute",
          bottom: 18,
          right: SAFE_INSET_H,
          fontSize: 15,
          fontWeight: 500,
          color: COLORS.textMuted,
          letterSpacing: "0.05em",
        }}
      >
        @墨白
      </div>
    </div>
  );
};
