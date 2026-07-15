"""
使用 Edge TTS 为视频脚本生成配音，并输出 content.json
读取 output 目录下最新的 video_script_*.md，按时间戳分段生成音频
"""
import sys
import json
import asyncio
import subprocess
import re
from pathlib import Path

# 安装 edge-tts
try:
    import edge_tts
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "edge-tts", "-q"])
    import edge_tts

VOICE = "zh-CN-YunyangNeural"  # 专业男声播报

# 场景 ID 顺序（音频文件命名 + content.json sceneFrames 索引）
SCENE_IDS = [
    "01-intro",
    "01b-intro-projects",
    "02-project-1", "03-project-2", "04-project-3",
    "05-project-4", "06-project-5",
    "07-outro",
]

# content.json 字幕 key 映射
SUBTITLE_KEYS = [
    "intro",
    "intro-projects",
    "project-1", "project-2", "project-3",
    "project-4", "project-5",
    "outro",
]

async def generate_audio(text, output_path, voice=VOICE):
    """使用 Edge TTS 生成音频文件，同时返回逐词时间戳用于精准字幕"""
    communicate = edge_tts.Communicate(text, voice, rate="+5%")

    # 流式合成，收集 WordBoundary 事件的时间戳
    word_timestamps = []  # [(start_sec, end_sec, word_text), ...]
    audio_data = bytearray()

    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_data.extend(chunk["data"])
        elif chunk["type"] == "WordBoundary":
            offset = chunk.get("offset", 0)
            duration = chunk.get("duration", 0)
            start_sec = offset / 1e7  # 100ns ticks → seconds
            end_sec = (offset + duration) / 1e7
            word_timestamps.append({
                "start": round(start_sec, 3),
                "end": round(end_sec, 3),
                "text": chunk.get("text", ""),
            })

    # 写入音频文件
    with open(output_path, "wb") as f:
        f.write(bytes(audio_data))

    # 用最后一个词的时间戳作为音频时长（无需 ffmpeg/pydub）
    if word_timestamps:
        duration_sec = word_timestamps[-1]["end"]
    else:
        duration_sec = 0.0

    return duration_sec, word_timestamps


def parse_scenes_from_md(md_path):
    """
    解析 MD 脚本，按时间戳顺序分配场景
    返回 {subtitle_key: text} 和有序的文本列表
    """
    with open(md_path, "r", encoding="utf-8") as f:
        content = f.read()

    parts = re.split(r'\n(?=\[\d{2}:\d{2}\])', content)
    blocks = []

    for part in parts:
        match = re.match(r'\[(\d{2}:\d{2})\]\s*(.*)', part.strip(), re.DOTALL)
        if not match:
            continue
        text = match.group(2)
        clean_lines = []
        for line in text.split('\n'):
            line = line.strip()
            if line.startswith('【') or line.startswith('<!--') or line.startswith('---'):
                continue
            if not line:
                continue
            clean_lines.append(line)
        clean_text = ' '.join(clean_lines).strip()
        if clean_text:
            h, m = map(int, match.group(1).split(':'))
            blocks.append((h * 60 + m, clean_text))

    # 按顺序分配：block 0=intro(开场), block 1=intro-projects(项目概览),
    # block 2~6=project-1~5(项目详情), block 7+=outro(片尾)
    scenes = {}
    texts_in_order = []
    for total_sec, text in blocks:
        n = len(texts_in_order)
        if n == 0:
            sid = "intro"
        elif n == 1:
            sid = "intro-projects"
        elif n <= 6:
            sid = f"project-{n - 1}"
        else:
            sid = "outro"
        if sid not in scenes:
            scenes[sid] = []
        scenes[sid].append(text)
        texts_in_order.append(text)

    return {k: " ".join(v) for k, v in scenes.items()}, texts_in_order


def merge_word_timestamps_to_subtitles(word_timestamps, words_per_line=10):
    """将逐词时间戳合并为字幕行，每行约 words_per_line 个词"""
    if not word_timestamps:
        return []
    lines = []
    batch = []
    for wt in word_timestamps:
        batch.append(wt)
        if len(batch) >= words_per_line:
            lines.append({
                "start": batch[0]["start"],
                "end": batch[-1]["end"],
                "text": "".join(w["text"] for w in batch),
            })
            batch = []
    if batch:
        lines.append({
            "start": batch[0]["start"],
            "end": batch[-1]["end"],
            "text": "".join(w["text"] for w in batch),
        })
    # 让每条字幕在场景内的起始时间为 0（相对于场景开头）
    if lines:
        offset = lines[0]["start"]
        for line in lines:
            line["start"] = round(line["start"] - offset, 3)
            line["end"] = round(line["end"] - offset, 3)
            # 删除标点空格
            line["text"] = re.sub(r'\s+', '', line["text"])
    return lines


def find_screenshot(rank, screenshots_dir):
    """在 screenshots 目录中匹配对应排名的截图文件"""
    if not screenshots_dir.exists():
        return f"screenshots/{rank:02d}-placeholder.png"
    prefix = f"{rank:02d}-"
    for f in screenshots_dir.iterdir():
        if f.is_file() and f.name.startswith(prefix):
            return f"screenshots/{f.name}"
    return f"screenshots/{rank:02d}-placeholder.png"


def parse_repos_from_json(json_path, project_root=None):
    """从 trending JSON 提取 repo 数据"""
    if project_root is None:
        project_root = Path(__file__).parent.parent
    screenshots_dir = project_root / "public" / "screenshots"

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    repos = []
    for r in data["repositories"]:
        name = r["name"]
        parts = name.split(" / ")
        owner = parts[0].strip()
        repo_name = parts[1].strip() if len(parts) > 1 else name
        ws = r.get("weeklyStars", 0)
        if isinstance(ws, str):
            ws = int(re.sub(r"[^\d]", "", ws) or 0)
        repos.append({
            "rank": r["rank"],
            "name": name,
            "owner": owner,
            "repo": repo_name,
            "url": r["url"],
            "description": (r.get("description") or ""),
            "language": r.get("language", "N/A"),
            "stars": r.get("stars", "0"),
            "forks": r.get("forks", "0"),
            "weeklyStars": ws,
            "screenshot": find_screenshot(r["rank"], screenshots_dir),
        })
    return repos


async def main():
    project_root = Path(__file__).parent.parent
    moneyprinter_root = project_root.parent
    output_dir = moneyprinter_root / "output"
    audio_dir = project_root / "public" / "audio"
    content_path = project_root / "public" / "content.json"

    # ---- 查找最新的文件 ----
    md_files = sorted(output_dir.glob("video_script_*.md"), reverse=True)
    json_files = sorted(output_dir.glob("github_trending_*.json"), reverse=True)

    if not md_files:
        print("[!] 未找到 video_script MD，请先运行 generate_video_script.py")
        return

    md_path = md_files[0]
    print(f"[i] 脚本: {md_path.name}")

    json_path = json_files[0] if json_files else None
    if json_path:
        print(f"[i] 数据: {json_path.name}")

    # ---- 解析文案 ----
    scenes, _ = parse_scenes_from_md(str(md_path))
    print(f"[i] 解析到 {len(scenes)} 个场景")

    # ---- 解析项目数据 ----
    repos = parse_repos_from_json(str(json_path), project_root) if json_path else []

    # ---- 生成音频 + 输出 content.json ----
    audio_dir.mkdir(parents=True, exist_ok=True)
    scene_frames = []
    subtitles = {}        # 纯文本（兼容旧格式）
    subtitle_timing = {}  # 精准时间戳字幕 [{start, end, text}, ...]
    file_count = 0

    for sid, subtitle_key in zip(SCENE_IDS, SUBTITLE_KEYS):
        text = scenes.get(subtitle_key, "")
        if not text:
            print(f"[!] 场景 {subtitle_key} 没有文案，跳过")
            scene_frames.append(0)
            subtitles[subtitle_key] = ""
            subtitle_timing[subtitle_key] = []
            continue

        output_file = audio_dir / f"{sid}.mp3"
        print(f"\n[=] {subtitle_key} ({sid})")
        print(f"    文案: {text[:50]}... ({len(text)} 字)")

        duration, word_ts = await generate_audio(text, str(output_file))
        frames = int(duration * 30)
        print(f"    时长: {duration:.1f}s ({frames} 帧)")

        # 生成精准字幕分段
        sub_lines = merge_word_timestamps_to_subtitles(word_ts)
        print(f"    字幕条数: {len(sub_lines)}")

        scene_frames.append(frames)
        subtitles[subtitle_key] = text
        subtitle_timing[subtitle_key] = sub_lines
        file_count += 1

    # ---- 输出 content.json（remotion-video 的唯一数据入口） ----
    content = {
        "repos": repos,
        "sceneFrames": scene_frames,
        "subtitles": subtitles,
        "subtitleTiming": subtitle_timing,
    }
    with open(content_path, "w", encoding="utf-8") as f:
        json.dump(content, f, ensure_ascii=False, indent=2)

    total_frames = sum(scene_frames)
    print(f"\n[OK] 全部完成！")
    print(f"    总帧数: {total_frames} (约 {total_frames/30/60:.1f} 分钟 @ 30fps)")
    print(f"    音频文件: {file_count} 个")
    print(f"    content.json: {content_path}")
    print(f"    直接启动 Remotion Studio 即可预览")


if __name__ == "__main__":
    asyncio.run(main())
