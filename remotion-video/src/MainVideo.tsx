import React from "react";
import { Audio, Sequence, staticFile } from "remotion";
import {
  PROJECT_FRAMES_LIST,
  repos,
  getProjectStart,
  getSceneStart,
  getSceneFrames,
  AUDIO_FILES,
} from "./data";
import { IntroTitle } from "./IntroTitle";
import { IntroProjects } from "./IntroProjects";
import { ProjectScene } from "./ProjectScene";
import { Outro } from "./Outro";
import { ProgressBar } from "./components/ProgressBar";

export const GitHubTrendingVideo: React.FC = () => {
  const sceneNames = [
    "片头",
    "项目概览",
    ...repos.map((r) => `项目${r.rank}`),
    "片尾",
  ];

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: "#F8F9FC",
        fontFamily: '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif',
      }}
    >
      {/* 片头 - 标题 + 开场白 */}
      <Sequence from={getSceneStart(0)} durationInFrames={getSceneFrames(0)}>
        <IntroTitle />
        <Audio src={staticFile(AUDIO_FILES[0])} />
      </Sequence>

      {/* 片头 - 项目概览 */}
      <Sequence from={getSceneStart(1)} durationInFrames={getSceneFrames(1)}>
        <IntroProjects />
        <Audio src={staticFile(AUDIO_FILES[1])} />
      </Sequence>

      {/* 5 个项目详情 + 音频 */}
      {repos.map((repo, i) => (
        <Sequence
          key={repo.rank}
          from={getProjectStart(i)}
          durationInFrames={PROJECT_FRAMES_LIST[i]}
        >
          <ProjectScene repo={repo} sceneIndex={i} />
          <Audio src={staticFile(AUDIO_FILES[2 + i])} />
        </Sequence>
      ))}

      {/* 片尾 + 音频 */}
      <Sequence from={getSceneStart(7)} durationInFrames={getSceneFrames(7)}>
        <Outro />
        <Audio src={staticFile(AUDIO_FILES[7])} />
      </Sequence>

      {/* 全局进度条 */}
      <ProgressBar scenes={sceneNames} />
    </div>
  );
};
