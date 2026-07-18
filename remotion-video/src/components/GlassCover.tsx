import React, { useMemo } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, SAFE_INSET_H, repos } from "../data";

// ---- 日期工具 ----
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

// ---- 碎片数据 ----
const COLS = 8;
const ROWS = 5;
const SHATTER_START = 18;

interface ShardData {
  x: number; y: number; w: number; h: number;
  angle: number;
  speed: number;
  rotationDeg: number;
  delay: number;
}

function generateShards(w: number, h: number): ShardData[] {
  let seed = 137;
  const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  const shards: ShardData[] = [];
  const cellW = w / COLS;
  const cellH = h / ROWS;
  const cxCenter = w / 2;
  const cyCenter = h / 2;

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const cx = (col + 0.5) * cellW;
      const cy = (row + 0.5) * cellH;
      const fromCenter = Math.atan2(cy - cyCenter, cx - cxCenter);
      const spread = (rand() - 0.5) * 0.55;

      shards.push({
        x: col * cellW,
        y: row * cellH,
        w: cellW + 2,
        h: cellH + 2,
        angle: fromCenter + spread,
        speed: 2.5 + rand() * 7.5,
        rotationDeg: (rand() - 0.5) * 540,
        delay: rand() * 4,
      });
    }
  }
  return shards;
}

export const GlassCover: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const shards = useMemo(() => generateShards(width, height), [width, height]);

  // ---- 冲击闪白 ----
  const flashOpacity = interpolate(
    frame,
    [SHATTER_START - 1, SHATTER_START, SHATTER_START + 4, SHATTER_START + 10],
    [0, 1, 0.6, 0],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" },
  );

  // ---- 裂纹可见 ----
  const crackOpacity = interpolate(
    frame,
    [SHATTER_START - 6, SHATTER_START - 1],
    [0, 0.7],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" },
  );

  // ---- 冲击波缩放 ----
  const shockwaveScale = interpolate(
    frame,
    [SHATTER_START - 1, SHATTER_START + 8],
    [1, 2.5],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" },
  );
  const shockwaveOpacity = interpolate(
    frame,
    [SHATTER_START - 1, SHATTER_START + 1, SHATTER_START + 8],
    [0, 0.4, 0],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" },
  );

  // 顶部项目名称
  const top5Repos = repos.slice(0, 5);

  // 封面内容
  const coverContent = (
    <div
      style={{
        width, height,
        display: "flex", flexDirection: "column",
        justifyContent: "center", alignItems: "center",
        background: `
          radial-gradient(ellipse 75% 55% at 50% 32%, rgba(37,99,235,0.12) 0%, transparent 55%),
          radial-gradient(ellipse 50% 45% at 78% 48%, rgba(139,92,246,0.06) 0%, transparent 50%),
          linear-gradient(180deg, #F8F9FC 0%, #EEF2FF 45%, #F8F9FC 100%)
        `,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* 底部渐变条 */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 4,
        background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.accent3}, ${COLORS.accent4}, #10B981)`,
      }} />

      {/* Star 徽标 */}
      <div style={{ marginBottom: 44 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "rgba(37,99,235,0.08)",
          border: "1px solid rgba(37,99,235,0.18)",
          borderRadius: 40,
          padding: "10px 30px",
        }}>
          <span style={{ fontSize: 30, lineHeight: 1 }}>⭐</span>
          <span style={{ fontSize: 26, fontWeight: 700, color: COLORS.accent, letterSpacing: "0.04em" }}>
            每周精选 · GitHub Trending
          </span>
        </div>
      </div>

      {/* 主标题 */}
      <h1 style={{
        fontSize: 120, fontWeight: 900, margin: 0,
        lineHeight: 1.08, letterSpacing: "-0.04em", textAlign: "center",
        background: "linear-gradient(135deg, #1D4ED8 0%, #6366F1 35%, #8B5CF6 65%, #06B6D4 100%)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        backgroundClip: "text",
        filter: "drop-shadow(0 2px 12px rgba(37,99,235,0.20))",
      }}>
        GitHub
      </h1>

      {/* 副标题 */}
      <p style={{
        fontSize: 58, fontWeight: 800, color: COLORS.text,
        margin: "14px 0 0 0", lineHeight: 1.35,
        letterSpacing: "0.05em", textAlign: "center",
      }}>
        本周神仙项目盘点
      </p>

      {/* 分割线 */}
      <div style={{
        width: 420, height: 3, borderRadius: 2, marginTop: 44,
        background: `linear-gradient(90deg, transparent, ${COLORS.accent}, ${COLORS.accent3}, ${COLORS.accent4}, transparent)`,
      }} />

      {/* 日期 */}
      <div style={{ marginTop: 36 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "12px 34px",
          background: "rgba(37,99,235,0.06)",
          border: "1px solid rgba(37,99,235,0.12)",
          borderRadius: 30,
        }}>
          <span style={{ fontSize: 20 }}>📅</span>
          <span style={{ fontSize: 24, fontWeight: 600, color: COLORS.textDim, letterSpacing: "0.03em" }}>
            {WEEK_RANGE}
          </span>
        </div>
      </div>

      {/* 项目预览 - 卡片样式 */}
      <div style={{
        marginTop: 36,
        display: "flex", flexDirection: "column", gap: 14,
        width: "88%", maxWidth: 860,
      }}>
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
                display: "flex", alignItems: "center", gap: 18,
                padding: "18px 28px",
                background: c.bg,
                borderRadius: 16,
                border: `2px solid ${c.border}33`,
                borderLeft: `8px solid ${c.border}`,
                boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
              }}
            >
              <span style={{
                color: c.border, fontWeight: 900, fontSize: 42,
                minWidth: 48, textAlign: "center",
              }}>
                {repo.rank}
              </span>
              <span style={{
                color: COLORS.text, fontWeight: 700, fontSize: 26,
                flex: 1,
              }}>
                {repo.owner}/{repo.repo}
              </span>
              <span style={{ color: COLORS.green, fontSize: 20, fontWeight: 700 }}>
                ↑{repo.weeklyStars.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>

      {/* 品牌 */}
      <div style={{
        position: "absolute", bottom: 20, right: SAFE_INSET_H,
        fontSize: 16, fontWeight: 500, color: COLORS.textMuted,
        letterSpacing: "0.05em",
      }}>
        @墨白
      </div>
    </div>
  );

  return (
    <div
      style={{
        position: "absolute", inset: 0, zIndex: 100,
        pointerEvents: "none",
      }}
    >
      {/* ====== 碎片层 ====== */}
      <div
        style={{
          position: "absolute", inset: 0,
          opacity: frame >= SHATTER_START + 28 ? 0 : 1,
        }}
      >
        {shards.map((shard, i) => {
          const t = frame - SHATTER_START - shard.delay;
          const isFlying = t > 0;
          const dist = isFlying ? shard.speed * t * 4 : 0;
          const rot = isFlying ? shard.rotationDeg * (1 - Math.exp(-t * 0.08)) : 0;
          const shardOpacity = isFlying
            ? interpolate(t, [0, 22], [1, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" })
            : 1;
          const shardScale = isFlying
            ? interpolate(t, [0, 22], [1, 0.7], { extrapolateRight: "clamp", extrapolateLeft: "clamp" })
            : 1;

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: isFlying ? shard.x + Math.cos(shard.angle) * dist : shard.x,
                top: isFlying ? shard.y + Math.sin(shard.angle) * dist + (isFlying ? t * t * 0.8 : 0) : shard.y,
                width: shard.w,
                height: shard.h,
                overflow: "hidden",
                opacity: shardOpacity,
                transform: `rotate(${rot}deg) scale(${shardScale})`,
                transformOrigin: `${shard.w / 2}px ${shard.h / 2}px`,
                boxShadow: isFlying && t < 10
                  ? `0 0 ${8 + t * 2}px rgba(37,99,235,0.3)`
                  : "none",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: -shard.x,
                  top: -shard.y,
                  width,
                  height,
                }}
              >
                {coverContent}
              </div>
            </div>
          );
        })}
      </div>

      {/* ====== 裂纹 SVG ====== */}
      {frame >= SHATTER_START - 6 && frame < SHATTER_START && (
        <svg
          style={{
            position: "absolute", inset: 0,
            opacity: crackOpacity,
            pointerEvents: "none",
          }}
          viewBox={`0 0 ${width} ${height}`}
        >
          <g stroke="rgba(37,99,235,0.35)" strokeWidth="1.5" fill="none" strokeLinecap="round">
            <path d={`M ${width * 0.42} ${height * 0.3} L ${width * 0.48} ${height * 0.22} L ${width * 0.55} ${height * 0.15} L ${width * 0.7} ${height * 0.08}`} />
            <path d={`M ${width * 0.48} ${height * 0.22} L ${width * 0.38} ${height * 0.12}`} />
            <path d={`M ${width * 0.55} ${height * 0.15} L ${width * 0.52} ${height * 0.04}`} />
            <path d={`M ${width * 0.48} ${height * 0.22} L ${width * 0.2} ${height * 0.3} L ${width * 0.08} ${height * 0.38}`} />
            <path d={`M ${width * 0.2} ${height * 0.3} L ${width * 0.15} ${height * 0.18}`} />
            <path d={`M ${width * 0.55} ${height * 0.4} L ${width * 0.65} ${height * 0.5} L ${width * 0.85} ${height * 0.55}`} />
            <path d={`M ${width * 0.65} ${height * 0.5} L ${width * 0.78} ${height * 0.62}`} />
            <path d={`M ${width * 0.55} ${height * 0.4} L ${width * 0.5} ${height * 0.55}`} />
          </g>
        </svg>
      )}

      {/* ====== 闪白 ====== */}
      {flashOpacity > 0 && (
        <div
          style={{
            position: "absolute", inset: 0,
            background: "rgba(255,255,255,0.9)",
            opacity: flashOpacity,
            pointerEvents: "none",
          }}
        />
      )}

      {/* ====== 冲击波 ====== */}
      {shockwaveOpacity > 0 && (
        <div
          style={{
            position: "absolute",
            left: "50%", top: "50%",
            width: 2, height: 2,
            borderRadius: "50%",
            background: "transparent",
            boxShadow: `0 0 0 ${10 * shockwaveScale}px rgba(37,99,235,0.15)`,
            transform: "translate(-50%, -50%)",
            opacity: shockwaveOpacity,
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
};
