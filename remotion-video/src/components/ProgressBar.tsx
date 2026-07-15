import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { COLORS, TOTAL_FRAMES } from "../data";

export const ProgressBar: React.FC<{
  scenes: string[];
}> = ({ scenes }) => {
  const frame = useCurrentFrame();
  const progress = frame / TOTAL_FRAMES;

  const sceneDuration = TOTAL_FRAMES / scenes.length;
  const currentScene = Math.min(Math.floor(frame / sceneDuration), scenes.length - 1);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 88,
        left: 36,
        right: 36,
        zIndex: 100,
        pointerEvents: "none",
      }}
    >
      {/* 进度条 */}
      <div
        style={{
          width: "100%",
          height: 4,
          borderRadius: 2,
          backgroundColor: "rgba(0,0,0,0.08)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${progress * 100}%`,
            height: "100%",
            borderRadius: 2,
            background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.accent3})`,
          }}
        />
      </div>
    </div>
  );
};
