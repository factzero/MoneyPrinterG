import React, { useMemo } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, INTRO_TITLE_FRAMES, SAFE_INSET_H, SUBTITLES } from "./data";
import { Subtitle } from "./components/Subtitle";
import { GlassCover } from "./components/GlassCover";

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

// ---- 粒子数据 ----
interface Particle {
  x: number; y: number; size: number; speed: number; phase: number;
}

// 确定性伪随机（mulberry32），确保每帧粒子位置一致，不会跳跃
function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = seededRandom(42);
const PARTICLES: Particle[] = Array.from({ length: 20 }, () => ({
  x: rand() * 100,
  y: rand() * 100,
  size: 2.5 + rand() * 6,
  speed: 0.3 + rand() * 1.2,
  phase: rand() * Math.PI * 2,
}));

// ---- 浮动几何光团 ----
interface Orb {
  cx: number; cy: number; r: number; color: string; speedX: number; speedY: number;
}

const ORBS: Orb[] = [
  { cx: 12, cy: 20, r: 100, color: "rgba(99,102,241,0.22)", speedX: 0.008, speedY: 0.006 },
  { cx: 85, cy: 16, r: 130, color: "rgba(37,99,235,0.18)", speedX: -0.006, speedY: 0.009 },
  { cx: 18, cy: 78, r: 90, color: "rgba(139,92,246,0.16)", speedX: 0.007, speedY: -0.005 },
  { cx: 80, cy: 82, r: 110, color: "rgba(6,182,212,0.14)", speedX: -0.009, speedY: -0.007 },
  { cx: 50, cy: 48, r: 180, color: "rgba(37,99,235,0.10)", speedX: 0.004, speedY: 0.003 },
];

// ---- 旋转光环 ----
const RINGS = [
  { r: 230, strokeWidth: 2, color: "rgba(37,99,235,0.22)", speed: 0.3, offsetAngle: 0 },
  { r: 300, strokeWidth: 1.5, color: "rgba(99,102,241,0.16)", speed: -0.22, offsetAngle: 45 },
  { r: 370, strokeWidth: 1, color: "rgba(139,92,246,0.11)", speed: 0.18, offsetAngle: 90 },
];

export const IntroTitle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const totalFrames = INTRO_TITLE_FRAMES;

  // ---- 归一化时间（秒），保证预览与渲染运动速度一致 ----
  const t = frame / fps;

  // ---- 整体淡入（玻璃破碎之后） ----
  const globalOpacity = interpolate(frame, [38, 48], [0, 1], { extrapolateRight: "clamp" });

  // ---- 背景呼吸 ----
  const bgBreath = 1 + Math.sin(t * 0.12) * 0.04;

  // ---- 中心光晕 ----
  const glowOpacity = interpolate(
    frame, [35, totalFrames * 0.35, totalFrames * 0.7, totalFrames],
    [0, 0.50, 0.35, 0.06]
  );
  const glowScale = 0.82 + Math.sin(t * 0.10) * 0.18;

  // ---- 光环旋转 ----
  const ringGroupRotate = interpolate(frame, [35, totalFrames], [0, 55]);

  // ---- 主标题弹入 ----
  const titleSpring = spring({ frame, fps, config: { damping: 10, stiffness: 70 }, delay: 40 });
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(titleSpring, [0, 1], [60, 0], { extrapolateRight: "clamp" });
  const titleScale = interpolate(titleSpring, [0, 1], [1.5, 1], { extrapolateRight: "clamp" });

  // ---- 副标题 ----
  const subSpring = spring({ frame, fps, config: { damping: 12, stiffness: 80 }, delay: 50 });
  const subOpacity = interpolate(subSpring, [0, 1], [0, 1], { extrapolateRight: "clamp" });
  const subY = interpolate(subSpring, [0, 1], [40, 0], { extrapolateRight: "clamp" });

  // ---- 分割线伸展 ----
  const dividerSpring = spring({ frame, fps, config: { damping: 14, stiffness: 60 }, delay: 55 });
  const dividerW = interpolate(dividerSpring, [0, 1], [0, 55], { extrapolateRight: "clamp" });

  // ---- 日期区域 ----
  const dateOpacity = interpolate(frame, [65, 90], [0, 0.9], { extrapolateRight: "clamp" });
  const dateY = interpolate(frame, [65, 90], [20, 0], { extrapolateRight: "clamp" });

  // ---- 底部装饰条 ----
  const bottomBarSpring = spring({ frame, fps, config: { damping: 15, stiffness: 50 }, delay: 60 });
  const bottomBarWidth = interpolate(bottomBarSpring, [0, 1], [0, 100], { extrapolateRight: "clamp" });

  // ---- 代码括号 ----
  const bracketOpacity = interpolate(frame, [45, 65], [0, 0.12], { extrapolateRight: "clamp" });
  const bracketSpring = spring({ frame, fps, config: { damping: 14, stiffness: 60 }, delay: 43 });
  const bracketOffset = interpolate(bracketSpring, [0, 1], [120, 0], { extrapolateRight: "clamp" });

  // ---- Star 徽标 ----
  const starSpringVal = spring({ frame, fps, config: { damping: 8, stiffness: 120 }, delay: 53 });
  const starScale = interpolate(starSpringVal, [0, 1], [0, 1], { extrapolateRight: "clamp" });
  const starRotate = interpolate(starSpringVal, [0, 1], [-30, 0], { extrapolateRight: "clamp" });

  // ---- 中心坐标 ----
  const cx = width / 2;
  const cy = height * 0.40;

  // ---- SVG 弧线路径 ----
  const ringPaths = useMemo(() => {
    return RINGS.map((ring) => {
      const angle = (ring.offsetAngle * Math.PI) / 180;
      const startAngle = angle;
      const endAngle = angle + Math.PI * 1.55;
      const sx = cx + ring.r * Math.cos(startAngle);
      const sy = cy + ring.r * Math.sin(startAngle);
      const ex = cx + ring.r * Math.cos(endAngle);
      const ey = cy + ring.r * Math.sin(endAngle);
      const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
      return `M ${sx} ${sy} A ${ring.r} ${ring.r} 0 ${largeArc} 1 ${ex} ${ey}`;
    });
  }, [cx, cy]);

  return (
    <AbsoluteFill style={{ background: COLORS.bg, overflow: "hidden" }}>
      {/* ============ 动态渐变背景 ============ */}
      <div
        style={{
          position: "absolute", inset: 0,
          background: `
            radial-gradient(ellipse 75% 55% at 50% 32%, rgba(37,99,235,0.15) 0%, transparent 55%),
            radial-gradient(ellipse 55% 50% at 22% 58%, rgba(99,102,241,0.10) 0%, transparent 50%),
            radial-gradient(ellipse 50% 45% at 78% 48%, rgba(139,92,246,0.08) 0%, transparent 50%),
            radial-gradient(ellipse 85% 65% at 50% 78%, rgba(6,182,212,0.05) 0%, transparent 55%),
            linear-gradient(180deg, #F8F9FC 0%, #EEF2FF 50%, #F8F9FC 100%)
          `,
          transform: `scale(${bgBreath})`,
        }}
      />

      {/* ============ 浮动光团 ============ */}
      {ORBS.map((orb, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${orb.cx}%`,
            top: `${orb.cy}%`,
            width: orb.r * 2,
            height: orb.r * 2,
            borderRadius: "50%",
            transform: `translate(-50%, -50%) translate(${Math.sin(t * orb.speedX * 5) * 18}px, ${Math.cos(t * orb.speedY * 5) * 14}px)`,
            background: `radial-gradient(circle, ${orb.color} 0%, transparent 65%)`,
            opacity: globalOpacity,
          }}
        />
      ))}

      {/* ============ 中心脉动光晕 ============ */}
      <div
        style={{
          position: "absolute", left: `${cx}px`, top: `${cy}px`,
          width: 640, height: 640,
          borderRadius: "50%",
          transform: `translate(-50%, -50%) scale(${glowScale})`,
          background: `
            radial-gradient(circle,
              rgba(37,99,235,0.22) 0%,
              rgba(99,102,241,0.10) 30%,
              rgba(139,92,246,0.04) 55%,
              transparent 72%
            )
          `,
          opacity: glowOpacity,
        }}
      />

      {/* ============ 旋转光环 SVG ============ */}
      <svg
        style={{
          position: "absolute", top: 0, left: 0,
          width: "100%", height: "100%",
          opacity: globalOpacity,
        }}
        viewBox={`0 0 ${width} ${height}`}
      >
        <g transform={`rotate(${ringGroupRotate}, ${cx}, ${cy})`}>
          {ringPaths.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="none"
              stroke={RINGS[i].color}
              strokeWidth={RINGS[i].strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${7 + i * 4}, ${7 + i * 4}`}
            />
          ))}
        </g>
      </svg>

      {/* ============ 粒子星点 ============ */}
      {PARTICLES.map((p, i) => {
        // 粒子闪烁 + 漂移
        const flicker = 0.35 + 0.65 * Math.abs(Math.sin(t * p.speed * 0.18 + p.phase));
        const pY = p.y + Math.sin(t * 0.14 + p.phase) * 5;
        const color = i % 4 === 0
          ? COLORS.accent3
          : i % 4 === 1
            ? COLORS.accent
            : i % 4 === 2
              ? COLORS.accent2
              : COLORS.accent4;
        const hasGlow = i % 7 === 0;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${p.x}%`,
              top: `${pY}%`,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              backgroundColor: color,
              opacity: flicker * 0.55 * globalOpacity,
              boxShadow: hasGlow
                ? `0 0 ${p.size * 2.5}px ${color}66`
                : "none",
            }}
          />
        );
      })}

      {/* ============ 代码括号 < ============ */}
      <div
        style={{
          position: "absolute",
          left: `${SAFE_INSET_H - bracketOffset}px`,
          top: `${cy}px`,
          transform: "translateY(-50%)",
          fontSize: 210,
          fontWeight: 100,
          color: COLORS.accent,
          opacity: bracketOpacity,
          fontFamily: "monospace",
          lineHeight: 1,
        }}
      >
        {"<"}
      </div>

      {/* ============ 代码括号 /> ============ */}
      <div
        style={{
          position: "absolute",
          right: `${SAFE_INSET_H - bracketOffset}px`,
          top: `${cy}px`,
          transform: "translateY(-50%)",
          fontSize: 210,
          fontWeight: 100,
          color: COLORS.accent3,
          opacity: bracketOpacity,
          fontFamily: "monospace",
          lineHeight: 1,
        }}
      >
        {"/>"}
      </div>

      {/* ============ 主内容 ============ */}
      <div
        style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          justifyContent: "center", alignItems: "center",
          paddingTop: 40,
        }}
      >
        {/* ---- Star 徽标 ---- */}
        <div
          style={{
            marginBottom: 40,
            transform: `scale(${starScale}) rotate(${starRotate}deg)`,
          }}
        >
          <div
            style={{
              display: "flex", alignItems: "center", gap: 10,
              background: "rgba(37,99,235,0.08)",
              border: "1px solid rgba(37,99,235,0.18)",
              borderRadius: 40,
              padding: "10px 30px",
            }}
          >
            <span style={{ fontSize: 30, lineHeight: 1 }}>⭐</span>
            <span style={{
              fontSize: 26, fontWeight: 700,
              color: COLORS.accent,
              letterSpacing: "0.04em",
            }}>
              每周精选 · GitHub Trending
            </span>
          </div>
        </div>

        {/* ---- 主标题 "GitHub" ---- */}
        <div
          style={{
            opacity: titleOpacity,
            transform: `translateY(${titleY}px) scale(${titleScale})`,
          }}
        >
          <h1
            style={{
              fontSize: 120,
              fontWeight: 900,
              margin: 0,
              lineHeight: 1.08,
              letterSpacing: "-0.04em",
              textAlign: "center",
              background: "linear-gradient(135deg, #1D4ED8 0%, #6366F1 35%, #8B5CF6 65%, #06B6D4 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 2px 12px rgba(37,99,235,0.20))",
            }}
          >
            GitHub
          </h1>
        </div>

        {/* ---- 副标题 ---- */}
        <div
          style={{
            opacity: subOpacity,
            transform: `translateY(${subY}px)`,
            marginTop: 10,
          }}
        >
          <p
            style={{
              fontSize: 58,
              fontWeight: 800,
              color: COLORS.text,
              margin: 0,
              lineHeight: 1.35,
              letterSpacing: "0.05em",
              textAlign: "center",
            }}
          >
            本周神仙项目盘点
          </p>
        </div>

        {/* ---- 渐变分割线 ---- */}
        <div
          style={{
            width: `${dividerW}%`,
            maxWidth: 420,
            height: 3,
            borderRadius: 2,
            marginTop: 40,
            background: `linear-gradient(90deg, transparent, ${COLORS.accent}, ${COLORS.accent3}, ${COLORS.accent4}, transparent)`,
            opacity: subOpacity,
          }}
        />

        {/* ---- 日期 ---- */}
        <div
          style={{
            opacity: dateOpacity,
            transform: `translateY(${dateY}px)`,
            marginTop: 32,
          }}
        >
          <div
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 34px",
              background: "rgba(37,99,235,0.06)",
              border: "1px solid rgba(37,99,235,0.12)",
              borderRadius: 30,
            }}
          >
            <span style={{ fontSize: 18 }}>📅</span>
            <span
              style={{
                fontSize: 24, fontWeight: 600,
                color: COLORS.textDim,
                letterSpacing: "0.03em",
              }}
            >
              {WEEK_RANGE}
            </span>
          </div>
        </div>
      </div>

      {/* ============ 底部渐变装饰条 ============ */}
      <div
        style={{
          position: "absolute", bottom: 0, left: 0,
          width: `${bottomBarWidth}%`,
          height: 4,
          background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.accent3}, ${COLORS.accent4}, #10B981)`,
          opacity: globalOpacity,
        }}
      />

      {/* ============ 底部品牌 ============ */}
      <div
        style={{
          position: "absolute", bottom: 24, right: SAFE_INSET_H,
          fontSize: 16, fontWeight: 500,
          color: COLORS.textMuted,
          opacity: dateOpacity,
          letterSpacing: "0.05em",
        }}
      >
        @墨白
      </div>

      {/* ============ 字幕 ============ */}
      <Subtitle segments={SUBTITLES.intro} />

      {/* ============ 玻璃封面（第一帧静态封面 → 破碎消散） ============ */}
      <GlassCover />
    </AbsoluteFill>
  );
};
