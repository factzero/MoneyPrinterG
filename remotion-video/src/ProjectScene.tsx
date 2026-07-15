import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, PROJECT_FRAMES_LIST, SUBTITLES, type RepoData } from "./data";
import { ProjectCard } from "./components/ProjectCard";
import { BackgroundDots } from "./components/BackgroundDots";
import { Subtitle } from "./components/Subtitle";

export const ProjectScene: React.FC<{
  repo: RepoData;
  sceneIndex: number;
}> = ({ repo, sceneIndex }) => {
  const frame = useCurrentFrame();
  const sceneDuration = PROJECT_FRAMES_LIST[sceneIndex];

  // 顶部进度指示器
  const progressWidth = interpolate(
    frame,
    [0, sceneDuration],
    [0, 100],
    { extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        background: "#F8F9FC",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        paddingTop: 60,
        paddingBottom: 50,
      }}
    >
      <BackgroundDots />
      {/* 顶部进度条 */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          padding: "24px 28px",
          zIndex: 10,
        }}
      >
        <div
          style={{
            height: 4,
            borderRadius: 2,
            backgroundColor: "rgba(0,0,0,0.08)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progressWidth}%`,
              height: "100%",
              borderRadius: 2,
              background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.accent3})`,
            }}
          />
        </div>
      </div>

      {/* 项目卡片 */}
      <ProjectCard repo={repo} delay={3} />

      {/* 底部导航点 */}
      <div
        style={{
          position: "absolute",
          bottom: 24,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 12,
        }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              width: i === sceneIndex ? 28 : 8,
              height: 8,
              borderRadius: 4,
              backgroundColor:
                i === sceneIndex ? COLORS.accent : "rgba(0,0,0,0.18)",
            }}
          />
        ))}
      </div>

      {/* 字幕 */}
      <Subtitle segments={SUBTITLES[`project-${repo.rank}`]} />
    </AbsoluteFill>
  );
};
