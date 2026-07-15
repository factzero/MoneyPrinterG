@echo off
chcp 65001 >nul
echo ========================================
echo   GitHub Trending 视频 - 全流程构建
echo ========================================
echo.

cd /d "%~dp0"

echo [1/4] 获取 GitHub Trending 数据...
python get_github_trending.py -n 5 -s weekly
if %ERRORLEVEL% NEQ 0 (
    echo [FAIL] 数据获取失败
    pause
    exit /b 1
)
echo.

echo [2/4] 自动截图（GitHub OG Image）...
python capture_screenshots.py
echo.

echo [3/4] AI 生成视频文案...
python generate_video_script.py
if %ERRORLEVEL% NEQ 0 (
    echo [FAIL] 文案生成失败
    pause
    exit /b 1
)
echo.

echo [4/4] Edge TTS 生成配音 + content.json...
cd remotion-video\scripts
python generate_audio_edge.py
cd ..\..
if %ERRORLEVEL% NEQ 0 (
    echo [FAIL] 配音生成失败
    pause
    exit /b 1
)
echo.

echo ========================================
echo   全部完成！
echo   - content.json 已自动生成
echo   - 直接启动 Remotion Studio 即可预览
echo ========================================
pause
