import React, { useEffect, useState } from "react";
import { Composition, continueRender, delayRender } from "remotion";
import { GitHubTrendingVideo } from "./MainVideo";
import { CoverImage } from "./CoverImage";
import { CollectionCover } from "./CollectionCover";
import { FPS, TOTAL_FRAMES, initContent } from "./data";

export const RemotionRoot: React.FC = () => {
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender("加载 content.json"));

  useEffect(() => {
    initContent().then(() => {
      setReady(true);
      continueRender(handle);
    });
  }, [handle]);

  if (!ready) return null;

  return (
    <>
      <Composition
        id="GitHubTrending"
        component={GitHubTrendingVideo}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="Cover"
        component={CoverImage}
        durationInFrames={1}
        fps={1}
        width={1080}
        height={1440}
      />
      <Composition
        id="CollectionCover"
        component={CollectionCover}
        durationInFrames={1}
        fps={1}
        width={1080}
        height={1080}
      />
    </>
  );
};
