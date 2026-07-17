"""
使用本地部署的 s2.cpp (Fish Speech S2 Pro) 为视频脚本生成配音，并输出 content.json

优势：纯 C++ 推理，无需 Python/PyTorch 环境；本地运行，数据不出本机；支持声音克隆

前置步骤 — 部署 s2.cpp 本地服务：
  1. git clone --recurse-submodules https://github.com/rodrigomatta/s2.cpp.git
  2. cd s2.cpp && cmake -B build && cmake --build build --config Release --parallel
  3. 从 https://huggingface.co/rodrigomt/s2-pro-gguf 下载模型和 tokenizer.json
  4. 启动服务：
     .\\build\\Release\\s2.exe --model s2-pro-q4_k_m.gguf --tokenizer tokenizer.json --server

使用前配置 .env：
  FISH_SPEECH_SERVER=http://127.0.0.1:3030   # s2.cpp 服务地址（默认端口 3030）
  FISH_REFERENCE_AUDIO=./my_voice.wav          # 可选，参考音频用于声音克隆
  FISH_REFERENCE_TEXT=参考音频中说的话           # 可选
"""

import sys
import json
import re
import os
from pathlib import Path

try:
    import jieba
except ImportError:
    print("[!] 请安装 jieba: pip install jieba")
    sys.exit(1)

# ---- 加载 .env ----
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent.parent.parent / ".env"
    if env_path.exists():
        load_dotenv(env_path)
except ImportError:
    pass


# ======================== 配置 ========================

FISH_SERVER = os.getenv("FISH_SPEECH_SERVER", "http://127.0.0.1:3030")
REFERENCE_AUDIO_PATH = os.getenv("FISH_REFERENCE_AUDIO", "")
REFERENCE_TEXT = os.getenv("FISH_REFERENCE_TEXT", "")

# 场景 ID 顺序
SCENE_IDS = [
    "01-intro",
    "01b-intro-projects",
    "02-project-1", "03-project-2", "04-project-3",
    "05-project-4", "06-project-5",
    "07-outro",
]

SUBTITLE_KEYS = [
    "intro",
    "intro-projects",
    "project-1", "project-2", "project-3",
    "project-4", "project-5",
    "outro",
]


# ======================== 本地 API 调用（s2.cpp） ========================

def health_check() -> bool:
    """检查 s2.cpp 服务是否在线（尝试连接即可）"""
    import requests
    try:
        r = requests.get(FISH_SERVER, timeout=5)
        return True
    except Exception:
        return False


def tts_request(text: str, ref_audio_path: str = "",
                ref_text: str = "") -> tuple[bytes, str]:
    """
    调用 s2.cpp 本地服务生成音频
    返回 (audio_bytes, content_type)
    
    参数:
      text: 要合成的文本
      ref_audio_path: 参考音频路径（可选，用于声音克隆）
      ref_text: 参考音频对应的文本（可选）
    """
    import requests

    files = {"text": (None, text)}

    if ref_audio_path and os.path.exists(ref_audio_path):
        files["prompt_audio"] = (os.path.basename(ref_audio_path),
                                 open(ref_audio_path, "rb"),
                                 "audio/wav")
        if ref_text:
            files["prompt_text"] = (None, ref_text)

    try:
        r = requests.post(
            f"{FISH_SERVER}/generate",
            files=files,
            timeout=300,
        )

        if r.status_code != 200:
            raise RuntimeError(f"TTS 请求失败 [{r.status_code}]: {r.text[:300]}")

        content_type = r.headers.get("Content-Type", "audio/wav")
        return r.content, content_type
    finally:
        # 确保文件句柄关闭
        if "prompt_audio" in files and hasattr(files["prompt_audio"][1], "close"):
            files["prompt_audio"][1].close()


# ======================== 时长估算 ========================

def estimate_audio_duration(audio_bytes: bytes) -> float:
    """从 WAV 头解析实际时长，兼容 s2.cpp 返回的单声道 16-bit WAV"""
    import struct
    try:
        # WAV header: byte 22-23=nch, 24-27=sample_rate, 34-35=bits_per_sample
        nch = struct.unpack_from('<H', audio_bytes, 22)[0]
        sr = struct.unpack_from('<I', audio_bytes, 24)[0]
        bps = struct.unpack_from('<H', audio_bytes, 34)[0]
        # 跳过 44 字节 WAV 头，剩下的就是 PCM 数据
        data_size = len(audio_bytes) - 44
        return max(data_size, 0) / (sr * nch * bps / 8)
    except Exception:
        # 回退：mono 16-bit 44100Hz = 88,200 bytes/sec
        return len(audio_bytes) / 88_200


def estimate_word_timestamps(text: str, total_sec: float) -> list[dict]:
    """使用 jieba 分词估算时间戳。中文词语、英文单词均整体不拆分。"""
    if total_sec <= 0:
        return []

    # jieba 分词：中文词语整体保留，英文/数字也自动分离
    raw_tokens = jieba.lcut(text)

    # 后处理：确保标点、英文、数字与中文词语完全分离
    tokens = []
    for token in raw_tokens:
        parts = re.findall(
            r'[a-zA-Z]+|\d+|'
            r'[，。！？；：、""''（）《》）\u3000-\u303f]|'
            r'[^\x00-\x7F]+',
            token,
        )
        tokens.extend(parts if parts else [token])

    tokens = [t for t in tokens if t.strip()]
    if not tokens:
        return []

    # 按字符数分配时间权重
    total_weight = sum(len(t) for t in tokens)

    word_ts = []
    elapsed = 0.0
    for token in tokens:
        dur = (len(token) / total_weight) * total_sec
        word_ts.append({
            "start": round(elapsed, 3),
            "end": round(elapsed + dur, 3),
            "text": token,
        })
        elapsed += dur

    return word_ts


# ======================== 字幕合并 ========================

# 短句模式：可在这些标点处断行
_BREAK_PUNCTUATION_SHORT = set('，。！？；：、""''）")')

# 整句模式：只在句子结束标点处断行
_BREAK_PUNCTUATION_SENTENCE = set('。！？')


def merge_word_timestamps_to_subtitles(word_timestamps, target_chars=12,
                                        sentence_mode=False):
    """
    智能合并时间戳为字幕行。
    - sentence_mode=False: 短句分段（逗号/句号均断，12字目标）
    - sentence_mode=True:  整句分段（仅句号/问号/感叹号断，保留完整语义）
    """
    if not word_timestamps:
        return []

    if sentence_mode:
        _break_punct = _BREAK_PUNCTUATION_SENTENCE
        _min_chars = 8       # 整句模式：至少 8 字才允许断行
        _target = target_chars * 3  # 目标长度放大 3 倍（~36字）
    else:
        _break_punct = _BREAK_PUNCTUATION_SHORT
        _min_chars = 6
        _target = target_chars

    lines = []
    batch = []

    for i, wt in enumerate(word_timestamps):
        batch.append(wt)
        batch_text = "".join(w["text"] for w in batch)
        n_chars = len(batch_text)

        current_char = wt["text"]
        is_break_punct = len(current_char) == 1 and current_char in _break_punct

        should_break = False

        if is_break_punct and n_chars >= _min_chars:
            should_break = True
        elif n_chars >= _target:
            # 无标点达到目标长度 → 在下一处标点断，或强制断
            # 向前查找下一个标点
            found_punct = False
            for j in range(i + 1, len(word_timestamps)):
                cj = word_timestamps[j]["text"]
                if len(cj) == 1 and cj in _break_punct:
                    found_punct = True
                    break
            if not found_punct:
                should_break = True  # 找不到标点，强制断

        if should_break:
            lines.append({
                "start": batch[0]["start"],
                "end": batch[-1]["end"],
                "text": batch_text,
            })
            batch = []

    # 收尾
    if batch:
        lines.append({
            "start": batch[0]["start"],
            "end": batch[-1]["end"],
            "text": "".join(w["text"] for w in batch),
        })

    # 后处理：避免行首出现标点符号，挪到上一行末尾
    _leading_punct = '，。！？；：、""''）")'
    for i in range(1, len(lines)):
        t = lines[i]["text"]
        stripped = t.lstrip(_leading_punct)
        if stripped != t:
            leading = t[:len(t) - len(stripped)]
            lines[i - 1]["text"] += leading
            lines[i]["text"] = stripped

    # 归一化：使每行 start 从 0 开始
    if lines:
        offset = lines[0]["start"]
        for line in lines:
            line["start"] = round(line["start"] - offset, 3)
            line["end"] = round(line["end"] - offset, 3)
            line["text"] = re.sub(r'\s+', '', line["text"])

    return lines


# ======================== MD 解析 ========================

def parse_scenes_from_md(md_path: Path) -> tuple[dict, list]:
    """解析 MD 脚本，返回 {subtitle_key: text} 和有序文本列表
    
    场景自适应映射：
      7 个时间块 → intro + project-1~5 + outro
      8 个时间块 → intro + intro-projects + project-1~5 + outro
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

        # 裁剪元数据：截断 "封面标题" / "推荐标签" / "---" 之后的内容
        for marker in ["---", "封面标题", "视频简介文案", "推荐标签", "置顶评论"]:
            idx = text.find(marker)
            if idx >= 0:
                text = text[:idx]
                break

        clean_lines = []
        for line in text.split('\n'):
            line = line.strip()
            # 跳过画面提示和注释
            if re.match(r'^(【[^】]*】|<!--)', line):
                continue
            if not line:
                continue
            clean_lines.append(line)
        clean_text = ' '.join(clean_lines).strip()
        if clean_text:
            h, m = map(int, match.group(1).split(':'))
            blocks.append((h * 60 + m, clean_text))

    # 自适应场景映射
    n_blocks = len(blocks)
    if n_blocks == 7:
        mapping = ["intro", "project-1", "project-2", "project-3", "project-4", "project-5", "outro"]
    elif n_blocks == 8:
        mapping = ["intro", "intro-projects", "project-1", "project-2", "project-3", "project-4", "project-5", "outro"]
    else:
        # 兜底：intro + N 项目 + outro
        mapping = ["intro"] + [f"project-{i}" for i in range(1, n_blocks)] + ["outro"]
        mapping = mapping[:n_blocks]  # 确保长度一致
        if len(mapping) > n_blocks:
            mapping[-1] = "outro"

    scenes = {}
    texts_in_order = []
    for (total_sec, text), sid in zip(blocks, mapping):
        if sid not in scenes:
            scenes[sid] = []
        scenes[sid].append(text)
        texts_in_order.append(text)

    return {k: " ".join(v) for k, v in scenes.items()}, texts_in_order


# ======================== JSON 解析 ========================

def find_screenshot(rank, screenshots_dir):
    if not screenshots_dir.exists():
        return f"screenshots/{rank:02d}-placeholder.png"
    prefix = f"{rank:02d}-"
    for f in screenshots_dir.iterdir():
        if f.is_file() and f.name.startswith(prefix):
            return f"screenshots/{f.name}"
    return f"screenshots/{rank:02d}-placeholder.png"


def parse_repos_from_json(json_path: Path, project_root=None):
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


# ======================== 响度归一化 ========================

def compute_gated_rms(samples):
    """
    门控 RMS：排除静音段落，只计算有声音的样本。
    - 低于峰值 30 dB 的样本视为静音/底噪
    - 只对语音部分求均方根，匹配主观感知响度
    """
    import numpy as np
    abs_s = np.abs(samples)
    peak = np.max(abs_s)
    if peak < 1e-6:
        return 0.0
    threshold = peak * (10 ** (-30.0 / 20.0))  # -30 dB
    voice = abs_s[abs_s >= threshold]
    if len(voice) < 10:
        return float(np.sqrt(np.mean(samples.astype(np.float64) ** 2)))
    return float(np.sqrt(np.mean(voice.astype(np.float64) ** 2)))


def normalize_audio_loudness(audio_dir: Path, scene_ids: list,
                              target_level: float = 0.10):
    """
    门控 RMS 感知响度归一化（纯 Python + numpy）。
    兼容 PCM 和 IEEE float WAV。
    只计算说话部分，排除停顿/静音，精准匹配人耳听感。
    """
    import math
    import struct
    import numpy as np

    files = [audio_dir / f"{sid}.mp3" for sid in scene_ids]
    files = [f for f in files if f.exists()]
    if not files:
        return

    target_db = 20 * math.log10(target_level)
    print(f"\n[i] 门控 RMS 响度归一化，目标 {target_db:.1f} dBFS ...")

    def _read_wav_raw(fp):
        """读取 WAV，返回 (float64_samples, fmt_info, raw_header)"""
        with open(fp, "rb") as fh:
            data = fh.read()
        if data[:4] != b'RIFF' or data[8:12] != b'WAVE':
            raise ValueError("不是有效 WAV")
        pos, fmt_info, raw_samples = 12, {}, None
        while pos < 60:
            cid = data[pos:pos+4]
            csize = struct.unpack_from('<I', data, pos+4)[0]
            if cid == b'fmt ':
                fd = data[pos+8:pos+8+csize]
                fmt_info['format'] = struct.unpack_from('<H', fd, 0)[0]
                fmt_info['nch'] = struct.unpack_from('<H', fd, 2)[0]
                fmt_info['sr'] = struct.unpack_from('<I', fd, 4)[0]
                fmt_info['bps'] = struct.unpack_from('<H', fd, 14)[0]
            elif cid == b'data':
                raw_samples = data[pos+8:pos+8+csize]
                break
            pos += 8 + csize
        if raw_samples is None:
            raise ValueError("未找到 data chunk")
        fmt_code = fmt_info['format']
        if fmt_code == 3:
            samples = np.frombuffer(raw_samples, dtype=np.float32).astype(np.float64)
        elif fmt_code == 1:
            bps = fmt_info['bps']
            maxv = 2**(bps-1)
            if bps == 16:
                samples = np.frombuffer(raw_samples, dtype=np.int16).astype(np.float64) / maxv
            elif bps == 32:
                samples = np.frombuffer(raw_samples, dtype=np.int32).astype(np.float64) / maxv
            else:
                raise ValueError(f"不支持的 PCM 位深: {bps}")
        else:
            raise ValueError(f"不支持的格式码: {fmt_code}")
        if fmt_info['nch'] > 1:
            samples = samples.reshape(-1, fmt_info['nch'])
        return samples, fmt_info, data

    ok = 0
    for f in files:
        try:
            samples, fmt_info, header = _read_wav_raw(f)
            nch = fmt_info['nch']

            if nch > 1:
                before_rms = np.mean([compute_gated_rms(samples[:, c]) for c in range(nch)])
            else:
                before_rms = compute_gated_rms(samples)

            if before_rms < 1e-8:
                print(f"    {f.name} 近乎静音，跳过")
                continue

            before_db = 20 * math.log10(before_rms)
            gain = min(target_level / before_rms, 4.0)
            norm = np.clip(samples * gain, -1.0, 1.0)

            # 写回 (保持原格式)
            fmt_code = fmt_info['format']
            if fmt_code == 3:
                raw = norm.astype(np.float32).tobytes()
            else:
                maxv = 2**(fmt_info['bps']-1)
                raw = (norm * maxv).astype(np.int16 if fmt_info['bps']==16 else np.int32).tobytes()

            new_header = bytearray(header)
            struct.pack_into('<I', new_header, 4, len(raw)+36)
            struct.pack_into('<I', new_header, 40, len(raw))
            with open(str(f), "wb") as fh:
                fh.write(bytes(new_header[:44]))
                fh.write(raw)

            after_db = before_db + 20 * math.log10(gain)
            print(f"    {f.name}: {before_db:+.1f} → {after_db:+.1f} dBFS  ✓")
            ok += 1
        except Exception as e:
            print(f"    {f.name} ✗ 读取失败: {e}")

    if ok:
        print(f"[OK] 已归一化 {ok}/{len(files)} 个音频 → {target_db:.1f} dBFS")
    else:
        print("[i] 未执行归一化")


# ======================== 主流程 ========================

def main():
    import requests

    # ---- 测试模式 ----
    if "--test" in sys.argv or "-t" in sys.argv:
        print("[test] s2.cpp 本地服务测试模式")
        print(f"      服务地址: {FISH_SERVER}")

        if not health_check():
            print(f"[!] 无法连接 s2.cpp 服务: {FISH_SERVER}")
            print("    请确保已启动本地服务:")
            print("    .\\build\\Release\\s2.exe --model s2-pro-q4_k_m.gguf --tokenizer tokenizer.json --server")
            return

        print("[OK] 服务连接成功")

        test_text = "你好，我是AI语音助手。今天我们来聊聊GitHub本周最热门的开源项目。"
        print(f"[test] 合成: {test_text}")

        try:
            audio_bytes, ct = tts_request(test_text,
                                          ref_audio_path=REFERENCE_AUDIO_PATH,
                                          ref_text=REFERENCE_TEXT)
            output_file = "_test_fish.wav"
            with open(output_file, "wb") as f:
                f.write(audio_bytes)
            duration = estimate_audio_duration(audio_bytes)
            print(f"[test] 完成! 文件: {output_file} (约 {duration:.1f}s)")
            print(f"       格式: {ct}")
        except Exception as e:
            print(f"[!] 合成失败: {e}")
        return

    # ======================== 正式生成 ========================

    # 检查服务在线
    if not health_check():
        print("=" * 60)
        print(f"[!] 无法连接 s2.cpp 服务: {FISH_SERVER}")
        print()
        print("  s2.cpp 部署步骤：")
        print("  1. git clone --recurse-submodules https://github.com/rodrigomatta/s2.cpp.git")
        print("  2. cd s2.cpp && cmake -B build && cmake --build build --config Release --parallel")
        print("  3. 下载模型: https://huggingface.co/rodrigomt/s2-pro-gguf")
        print("  4. 启动服务:")
        print("     .\\build\\Release\\s2.exe --model s2-pro-q4_k_m.gguf --tokenizer tokenizer.json --server")
        print()
        print("  或在 .env 中配置: FISH_SPEECH_SERVER=http://你的IP:端口")
        print("=" * 60)
        return

    print(f"[i] s2.cpp 服务: {FISH_SERVER} 在线")

    project_root = Path(__file__).parent.parent
    moneyprinter_root = project_root.parent
    output_dir = moneyprinter_root / "output"
    audio_dir = project_root / "public" / "audio"
    content_path = project_root / "public" / "content.json"

    # ---- 查找最新文件 ----
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

    # ---- 参考声音 ----
    if REFERENCE_AUDIO_PATH and os.path.exists(REFERENCE_AUDIO_PATH):
        print(f"\n[i] 声音克隆模式 - 参考音频: {REFERENCE_AUDIO_PATH}")
    else:
        print(f"\n[i] 未配置参考音频，使用默认音色")

    # ---- 解析文案和数据 ----
    scenes, _ = parse_scenes_from_md(md_path)
    print(f"[i] 解析到 {len(scenes)} 个场景")

    # ---- 预览模式 ----
    if "--show" in sys.argv or "-s" in sys.argv:
        print("\n" + "=" * 60)
        print("  文案分段预览")
        print("=" * 60)
        for sid, subtitle_key in zip(SCENE_IDS, SUBTITLE_KEYS):
            text = scenes.get(subtitle_key, "")
            print(f"\n--- {sid} ({subtitle_key}) ---")
            if text:
                print(text)
            else:
                print("  (空)")
        return

    # ---- 字幕模式 ----
    use_sentence_mode = "--sentence" in sys.argv
    if use_sentence_mode:
        print("[i] 字幕模式: 整句 (仅句号/问号/感叹号断行)")
    else:
        print("[i] 字幕模式: 短句 (默认)")

    repos = parse_repos_from_json(json_path, project_root) if json_path else []

    # ---- 生成音频 ----
    audio_dir.mkdir(parents=True, exist_ok=True)
    scene_frames = []
    subtitles = {}
    subtitle_timing = {}
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

        try:
            audio_bytes, _ = tts_request(text,
                                         ref_audio_path=REFERENCE_AUDIO_PATH,
                                         ref_text=REFERENCE_TEXT)
        except Exception as e:
            print(f"    [!] 合成失败: {e}")
            scene_frames.append(0)
            subtitles[subtitle_key] = text
            subtitle_timing[subtitle_key] = []
            continue

        # 写入音频文件
        with open(output_file, "wb") as f:
            f.write(audio_bytes)

        duration = estimate_audio_duration(audio_bytes)
        frames = int(duration * 30)
        word_ts = estimate_word_timestamps(text, duration)
        sub_lines = merge_word_timestamps_to_subtitles(word_ts,
                                                       sentence_mode=use_sentence_mode)

        print(f"    时长: {duration:.1f}s ({frames} 帧)")
        print(f"    字幕条数: {len(sub_lines)} (均分估算)")

        scene_frames.append(frames)
        subtitles[subtitle_key] = text
        subtitle_timing[subtitle_key] = sub_lines
        file_count += 1

    # ---- 响度归一化 ----
    if "--no-normalize" not in sys.argv:
        normalize_audio_loudness(audio_dir, SCENE_IDS)
    else:
        print("\n[i] 已跳过响度归一化 (--no-normalize)")

    # ---- 输出 content.json ----
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
    print(f"    引擎: s2.cpp (Fish Speech S2 Pro)")
    print(f"    模式: {'声音克隆' if REFERENCE_AUDIO_PATH else '默认音色'}")
    print(f"    总帧数: {total_frames} (约 {total_frames/30/60:.1f} 分钟 @ 30fps)")
    print(f"    音频文件: {file_count} 个")
    print(f"    content.json: {content_path}")


if __name__ == "__main__":
    main()
