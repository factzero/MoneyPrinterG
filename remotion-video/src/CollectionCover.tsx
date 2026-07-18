import React from "react";
import { COLORS, SAFE_INSET_H } from "./data";

export const CollectionCover: React.FC = () => {
  return (
    <div
      style={{
        width: 1080,
        height: 1080,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background: `
          radial-gradient(ellipse 60% 50% at 50% 40%, rgba(37,99,235,0.10) 0%, transparent 55%),
          radial-gradient(ellipse 45% 40% at 80% 45%, rgba(139,92,246,0.07) 0%, transparent 50%),
          radial-gradient(ellipse 40% 35% at 22% 55%, rgba(6,182,212,0.05) 0%, transparent 50%),
          linear-gradient(180deg, #F8F9FC 0%, #EEF2FF 48%, #F8F9FC 100%)
        `,
        position: "relative",
        overflow: "hidden",
        fontFamily: '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif',
      }}
    >
      {/* 底部渐变条 */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 5,
          background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.accent3}, ${COLORS.accent4}, #10B981)`,
        }}
      />

      {/* 右上角装饰圆 */}
      <div
        style={{
          position: "absolute",
          top: -60,
          right: -60,
          width: 280,
          height: 280,
          borderRadius: "50%",
          background: "rgba(37,99,235,0.04)",
          border: "2px solid rgba(37,99,235,0.08)",
        }}
      />

      {/* 左下角装饰圆 */}
      <div
        style={{
          position: "absolute",
          bottom: -40,
          left: -40,
          width: 200,
          height: 200,
          borderRadius: "50%",
          background: "rgba(139,92,246,0.04)",
          border: "2px solid rgba(139,92,246,0.07)",
        }}
      />

      {/* GitHub 猫图标 */}
      <div style={{ marginBottom: 40, position: "relative" }}>
        {/* 外圈光晕 */}
        <div
          style={{
            position: "absolute",
            inset: -20,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%)",
          }}
        />
        {/* 图标容器 */}
        <div
          style={{
            width: 170,
            height: 170,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${COLORS.accent} 0%, ${COLORS.accent3} 100%)`,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            boxShadow:
              "0 8px 40px rgba(37,99,235,0.30), 0 2px 8px rgba(37,99,235,0.15)",
            position: "relative",
          }}
        >
          {/* GitHub 猫 SVG */}
          <svg
            width="88"
            height="88"
            viewBox="0 0 98 96"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.362 19.412-6.518 33.405-24.934 33.405-46.69C97.707 22 75.788 0 48.854 0z"
              fill="white"
            />
          </svg>
        </div>
      </div>

      {/* 主标题 */}
      <h1
        style={{
          fontSize: 130,
          fontWeight: 900,
          margin: 0,
          lineHeight: 1.05,
          letterSpacing: "-0.04em",
          textAlign: "center",
          background:
            "linear-gradient(135deg, #1D4ED8 0%, #6366F1 35%, #8B5CF6 65%, #06B6D4 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          filter: "drop-shadow(0 2px 12px rgba(37,99,235,0.20))",
        }}
      >
        GitHub Trending
      </h1>

      {/* 副标题 */}
      <p
        style={{
          fontSize: 52,
          fontWeight: 800,
          color: COLORS.text,
          margin: "16px 0 0 0",
          lineHeight: 1.3,
          letterSpacing: "0.06em",
          textAlign: "center",
        }}
      >
        每周精选
      </p>

      {/* 第三行 */}
      <p
        style={{
          fontSize: 34,
          fontWeight: 600,
          color: COLORS.textDim,
          margin: "10px 0 0 0",
          letterSpacing: "0.08em",
          textAlign: "center",
        }}
      >
        神仙项目盘点
      </p>

      {/* 分割线 */}
      <div
        style={{
          width: 400,
          height: 3,
          borderRadius: 2,
          marginTop: 44,
          background: `linear-gradient(90deg, transparent, ${COLORS.accent}, ${COLORS.accent3}, ${COLORS.accent4}, transparent)`,
        }}
      />

      {/* 底部说明 */}
      <p
        style={{
          fontSize: 26,
          fontWeight: 500,
          color: COLORS.textMuted,
          margin: "32px 0 0 0",
          letterSpacing: "0.04em",
          textAlign: "center",
          lineHeight: 1.5,
        }}
      >
        汇聚全球 GitHub 热门开源项目
        <br />
        每周一更新 · 持续关注
      </p>

      {/* 品牌 */}
      <div
        style={{
          position: "absolute",
          bottom: 28,
          right: SAFE_INSET_H,
          fontSize: 18,
          fontWeight: 500,
          color: COLORS.textMuted,
          letterSpacing: "0.06em",
        }}
      >
        @墨白
      </div>
    </div>
  );
};
