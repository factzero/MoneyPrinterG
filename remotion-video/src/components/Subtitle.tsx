import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import type { SubtitleSegment } from "../data";

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

  // 渐入渐出
  const fadeIn = interpolate(
    frame,
    [currentSeg.startFrame, currentSeg.startFrame + 8],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const fadeOut = interpolate(
    frame,
    [currentSeg.endFrame - 8, currentSeg.endFrame],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const opacity = Math.min(fadeIn, fadeOut);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 140,
        left: 24,
        right: 24,
        display: "flex",
        justifyContent: "center",
        zIndex: 100,
        opacity,
        pointerEvents: "none",
      }}
    >
      <span
        style={{
          display: "inline",
          color: "#000000",
          fontSize: 30,
          fontWeight: 600,
          lineHeight: 1.45,
          textAlign: "center",
          letterSpacing: "0.02em",
          maxWidth: "92%",
          textShadow: "0 1px 4px rgba(255,255,255,0.6), 0 1px 2px rgba(255,255,255,0.4)",
        }}
      >
        {currentSeg.text}
      </span>
    </div>
  );
};
