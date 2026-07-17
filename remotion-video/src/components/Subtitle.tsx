import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import type { SubtitleSegment } from "../data";

// 字幕淡入淡出帧数（更长 → 更平滑）
const FADE_FRAMES = 12;

export const Subtitle: React.FC<{
  segments: SubtitleSegment[];
}> = ({ segments }) => {
  const frame = useCurrentFrame();

  // 找到当前帧对应的字幕
  const currentSeg = segments.find(
    (s) => frame >= s.startFrame && frame < s.endFrame,
  );

  if (!currentSeg) {
    return null;
  }

  // 检测文本长度 → 自适应字体大小
  const textLen = currentSeg.text.length;
  const fontSize = textLen > 25 ? 26 : textLen > 18 ? 28 : 30;

  // 渐入渐出
  const fadeIn = interpolate(
    frame,
    [currentSeg.startFrame, currentSeg.startFrame + FADE_FRAMES],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const fadeOut = interpolate(
    frame,
    [currentSeg.endFrame - FADE_FRAMES, currentSeg.endFrame],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const opacity = Math.min(fadeIn, fadeOut);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 140,
        left: 30,
        right: 30,
        display: "flex",
        justifyContent: "center",
        zIndex: 100,
        opacity,
        pointerEvents: "none",
      }}
    >
      <span
        style={{
          display: "block",
          color: "#000000",
          fontSize,
          fontWeight: 600,
          lineHeight: 1.55,
          textAlign: "center",
          letterSpacing: "0.02em",
          maxWidth: "88%",
          wordBreak: "keep-all",
          overflowWrap: "break-word",
          textShadow: [
            "0 1px 4px rgba(255,255,255,0.7)",
            "0 1px 2px rgba(255,255,255,0.5)",
            "0 0 8px rgba(255,255,255,0.4)",
          ].join(", "),
        }}
      >
        {currentSeg.text}
      </span>
    </div>
  );
};
