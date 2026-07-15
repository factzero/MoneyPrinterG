import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export const Title: React.FC<{
  text: string;
  delay?: number;
  fontSize?: number;
  color?: string;
}> = ({ text, delay = 0, fontSize = 48, color = "#16162A" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 15, stiffness: 80 },
  });

  const opacity = interpolate(progress, [0, 1], [0, 1], { extrapolateRight: "clamp" });
  const translateY = interpolate(progress, [0, 1], [30, 0], { extrapolateRight: "clamp" });

  return (
    <h1
      style={{
        fontSize,
        fontWeight: 800,
        color,
        opacity,
        transform: `translateY(${translateY}px)`,
        margin: 0,
        lineHeight: 1.3,
        letterSpacing: "-0.02em",
      }}
    >
      {text}
    </h1>
  );
};

export const Subtitle: React.FC<{
  text: string;
  delay?: number;
}> = ({ text, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 20, stiffness: 100 },
  });

  const opacity = interpolate(progress, [0, 1], [0, 1], { extrapolateRight: "clamp" });
  const translateY = interpolate(progress, [0, 1], [20, 0], { extrapolateRight: "clamp" });

  return (
    <p
      style={{
        fontSize: 26,
        fontWeight: 400,
        color: "rgba(0,0,0,0.55)",
        opacity,
        transform: `translateY(${translateY}px)`,
        margin: 0,
        lineHeight: 1.6,
      }}
    >
      {text}
    </p>
  );
};

export const AnimatedNumber: React.FC<{
  value: number;
  prefix?: string;
  suffix?: string;
  delay?: number;
  duration?: number;
  color?: string;
  fontSize?: number;
}> = ({
  value,
  prefix = "",
  suffix = "",
  delay = 0,
  duration = 30,
  color = "#16162A",
  fontSize = 48,
}) => {
  const frame = useCurrentFrame();

  const progress = interpolate(
    frame - delay,
    [0, duration],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const displayValue = Math.floor(value * progress);

  return (
    <span style={{ fontSize, fontWeight: 800, color, fontVariantNumeric: "tabular-nums" }}>
      {prefix}{displayValue.toLocaleString()}{suffix}
    </span>
  );
};
