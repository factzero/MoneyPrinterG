import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

/**
 * 3D 立体浮点背景 — 三层视差 + 球体高光
 *
 * 远层（蓝调大点，慢速）：营造空间纵深
 * 中层（灰调中点，中速）：过渡层次
 * 近层（黑调细点，快速）：球体高光，立体感核心
 *
 * 动画基于时间（t = frame/fps），确保预览与渲染速度一致
 */
export const BackgroundDots: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 归一化时间（秒），无论 FPS 多少，运动速度恒定
  const t = frame / fps;

  // 三层视差浮动 — 慢速漂移
  const farX = Math.sin(t * 0.12) * 18;
  const farY = Math.cos(t * 0.10) * 14;
  const midX = Math.sin(t * 0.20) * 12;
  const midY = Math.cos(t * 0.16) * 10;
  const nearX = Math.sin(t * 0.32) * 7;
  const nearY = Math.cos(t * 0.28) * 5;

  return (
    <>
      {/* ======= 远层 — 蓝色大圆点，深处缓慢漂移 ======= */}
      <div
        style={{
          position: "absolute",
          inset: -60,
          transform: `translate(${farX}px, ${farY}px)`,
          backgroundImage: `
            radial-gradient(circle, rgba(37,99,235,0.12) 7px, transparent 7px)
          `,
          backgroundSize: "320px 320px",
        }}
      />

      {/* ======= 中层 — 灰白球体，中速浮动 ======= */}
      <div
        style={{
          position: "absolute",
          inset: -60,
          transform: `translate(${midX}px, ${midY}px)`,
          backgroundImage: `
            radial-gradient(circle at 38% 32%, rgba(255,255,255,0.7) 0px, rgba(0,0,0,0.18) 3.5px, transparent 5px)
          `,
          backgroundSize: "200px 200px",
        }}
      />

      {/* ======= 近层 — 黑球高光，快速浮动 ======= */}
      <div
        style={{
          position: "absolute",
          inset: -60,
          transform: `translate(${nearX}px, ${nearY}px)`,
          backgroundImage: `
            radial-gradient(circle at 38% 30%, rgba(255,255,255,0.75) 0px, rgba(0,0,0,0.22) 2.5px, transparent 4px)
          `,
          backgroundSize: "100px 100px",
        }}
      />
    </>
  );
};
