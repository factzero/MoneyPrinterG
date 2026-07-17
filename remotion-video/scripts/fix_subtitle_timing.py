"""
从已有 content.json 读取文案和音频时长，用修复后的智能分词逻辑重新生成 subtitleTiming。
无需重新调用 TTS，秒级完成。
"""
import json
import re
import sys
from pathlib import Path
from generate_audio_fish import estimate_word_timestamps, merge_word_timestamps_to_subtitles

SUBTITLE_KEYS = [
    "intro", "intro-projects",
    "project-1", "project-2", "project-3",
    "project-4", "project-5",
    "outro",
]


def get_audio_duration_sec(audio_path: Path) -> float:
    """读取 WAV 文件头获取时长（不依赖第三方库）"""
    import struct
    with open(audio_path, "rb") as f:
        # 检查 RIFF 头
        if f.read(4) != b"RIFF":
            raise ValueError("不是有效的 WAV 文件")
        f.read(4)  # 文件大小
        if f.read(4) != b"WAVE":
            raise ValueError("不是有效的 WAV 文件")

        # 查找 fmt 和 data chunk
        byte_rate = 0
        data_size = 0
        while True:
            chunk_id = f.read(4)
            if len(chunk_id) < 4:
                break
            chunk_size = struct.unpack("<I", f.read(4))[0]
            if chunk_id == b"fmt ":
                fmt_data = f.read(chunk_size)
                byte_rate = struct.unpack("<I", fmt_data[8:12])[0]
            elif chunk_id == b"data":
                data_size = chunk_size
                break
            else:
                f.seek(chunk_size, 1)

        if byte_rate > 0 and data_size > 0:
            return data_size / byte_rate
        return 0


def main():
    project_root = Path(__file__).parent.parent
    content_path = project_root / "public" / "content.json"
    audio_dir = project_root / "public" / "audio"

    if not content_path.exists():
        print(f"[!] 找不到 {content_path}")
        return

    with open(content_path, "r", encoding="utf-8") as f:
        content = json.load(f)

    audio_files_map = {
        "intro": audio_dir / "01-intro.mp3",
        "intro-projects": audio_dir / "01b-intro-projects.mp3",
        "project-1": audio_dir / "02-project-1.mp3",
        "project-2": audio_dir / "03-project-2.mp3",
        "project-3": audio_dir / "04-project-3.mp3",
        "project-4": audio_dir / "05-project-4.mp3",
        "project-5": audio_dir / "06-project-5.mp3",
        "outro": audio_dir / "07-outro.mp3",
    }

    subtitle_timing = {}

    for key in SUBTITLE_KEYS:
        text = content.get("subtitles", {}).get(key, "")
        if not text:
            print(f"  [跳过] {key}: 无文案")
            subtitle_timing[key] = []
            continue

        # 从音频文件获取真实时长
        audio_path = audio_files_map.get(key)
        duration_sec = 0
        if audio_path and audio_path.exists():
            try:
                duration_sec = get_audio_duration_sec(audio_path)
            except Exception:
                pass

        if duration_sec <= 0:
            print(f"  [!] {key}: 无法读取音频时长，跳过")
            subtitle_timing[key] = content.get("subtitleTiming", {}).get(key, [])
            continue

        # 用修复后的算法重算
        word_ts = estimate_word_timestamps(text, duration_sec)
        sub_lines = merge_word_timestamps_to_subtitles(word_ts)

        print(f"  {key}: {len(text)}字 / {duration_sec:.1f}s → {len(sub_lines)} 条字幕")
        for line in sub_lines:
            print(f"    [{line['start']:.1f}-{line['end']:.1f}s] {line['text']}")

        subtitle_timing[key] = sub_lines

    # 写回 content.json
    content["subtitleTiming"] = subtitle_timing
    with open(content_path, "w", encoding="utf-8") as f:
        json.dump(content, f, ensure_ascii=False, indent=2)

    print(f"\n[OK] 已更新 {content_path}")


if __name__ == "__main__":
    main()
