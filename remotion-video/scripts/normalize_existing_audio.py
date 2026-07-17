"""
对已生成的音频文件做「门控 RMS」响度归一化。
处理 32-bit IEEE float WAV，只计算说话部分（排除静音），精准对齐主观感知响度。
用法: python normalize_existing_audio.py [--dry-run]
"""
import math
import struct
import sys
from pathlib import Path

import numpy as np

AUDIO_DIR = Path(__file__).parent.parent / "public" / "audio"

SCENE_IDS = [
    "01-intro",
    "01b-intro-projects",
    "02-project-1", "03-project-2", "04-project-3",
    "05-project-4", "06-project-5",
    "07-outro",
]

# 目标响度（0~1 浮点）
TARGET_LOUDNESS = 0.10   # ≈ -20 dBFS
GATE_THRESHOLD_DB = -30.0


def read_wav_raw(filepath: Path):
    """
    直接解析 WAV 头，兼容 32-bit IEEE float（格式码 3）。
    返回 (samples: np.ndarray(shape=(nch, nframes) 或 (nframes,)), sample_rate, fmt_params)
    """
    with open(filepath, "rb") as f:
        data = f.read()
    
    if data[:4] != b'RIFF' or data[8:12] != b'WAVE':
        raise ValueError("不是有效的 WAV 文件")
    
    # 扫描 chunk
    pos = 12
    fmt_info = {}
    raw_samples = None
    
    while pos < 60:
        cid = data[pos:pos+4]
        csize = struct.unpack_from('<I', data, pos+4)[0]
        if cid == b'fmt ':
            fdata = data[pos+8:pos+8+csize]
            fmt_info['format'] = struct.unpack_from('<H', fdata, 0)[0]
            fmt_info['nch'] = struct.unpack_from('<H', fdata, 2)[0]
            fmt_info['sr'] = struct.unpack_from('<I', fdata, 4)[0]
            fmt_info['br'] = struct.unpack_from('<I', fdata, 8)[0]
            fmt_info['ba'] = struct.unpack_from('<H', fdata, 12)[0]
            fmt_info['bps'] = struct.unpack_from('<H', fdata, 14)[0]
        elif cid == b'data':
            raw_samples = data[pos+8:pos+8+csize]
            break
        pos += 8 + csize
    
    if raw_samples is None:
        raise ValueError("未找到 data chunk")
    
    nch = fmt_info['nch']
    fmt_code = fmt_info['format']
    bps = fmt_info['bps']
    
    if fmt_code == 3:  # IEEE float
        if bps == 32:
            samples = np.frombuffer(raw_samples, dtype=np.float32)
        elif bps == 64:
            samples = np.frombuffer(raw_samples, dtype=np.float64)
        else:
            raise ValueError(f"不支持的浮点位深: {bps}")
    elif fmt_code == 1:  # PCM
        max_val = 2 ** (bps - 1)
        if bps == 16:
            samples = np.frombuffer(raw_samples, dtype=np.int16).astype(np.float64) / max_val
        elif bps == 24:
            # 24-bit PCM: 3 bytes per sample, need to unpack manually
            arr = np.frombuffer(raw_samples, dtype=np.uint8).reshape(-1, 3)
            samples = np.zeros(len(arr), dtype=np.float64)
            for i in range(len(arr)):
                val = int(arr[i, 0]) | (int(arr[i, 1]) << 8) | (int(arr[i, 2]) << 16)
                if val >= 0x800000:
                    val -= 0x1000000
                samples[i] = val / max_val
        elif bps == 32:
            samples = np.frombuffer(raw_samples, dtype=np.int32).astype(np.float64) / max_val
        else:
            raise ValueError(f"不支持的 PCM 位深: {bps}")
    else:
        raise ValueError(f"不支持的格式码: {fmt_code}")
    
    if nch > 1:
        samples = samples.reshape(-1, nch)
    
    # 统一转为 float64
    return samples.astype(np.float64), fmt_info['sr'], fmt_info, data


def write_wav_raw(filepath: Path, samples: np.ndarray, header: bytes, fmt_info: dict):
    """写入 WAV，复刻原始头部，更新 data 大小"""
    fmt_code = fmt_info['format']
    
    if fmt_code == 3:  # IEEE float 32-bit
        raw = samples.astype(np.float32).tobytes()
    elif fmt_code == 1:  # PCM
        bps = fmt_info['bps']
        max_val = 2 ** (bps - 1)
        clipped = np.clip(samples, -1.0, 1.0)
        if bps == 16:
            raw = (clipped * (max_val - 1)).astype(np.int16).tobytes()
        elif bps == 32:
            raw = (clipped * (max_val - 1)).astype(np.int32).tobytes()
        else:
            raise ValueError(f"不支持的 PCM 位深: {bps}")
    else:
        raise ValueError(f"不支持的格式码: {fmt_code}")
    
    data_size = len(raw)
    # 修改 RIFF 总大小 (文件总长 - 8) 和 data chunk 大小
    new_header = bytearray(header)
    struct.pack_into('<I', new_header, 4, data_size + 36)  # RIFF size = data + 36 (header without RIFF id/size)
    struct.pack_into('<I', new_header, 40, data_size)       # data chunk size
    
    with open(filepath, "wb") as f:
        f.write(bytes(new_header[:44]))   # 只写标准 44 字节头
        f.write(raw)


def compute_gated_rms(samples_1d: np.ndarray) -> float:
    """门控 RMS：排除静音样本，只计算语音部分"""
    abs_s = np.abs(samples_1d)
    peak = np.max(abs_s)
    if peak < 1e-8:
        return 0.0
    threshold = peak * (10 ** (GATE_THRESHOLD_DB / 20.0))
    voice = abs_s[abs_s >= threshold]
    if len(voice) < 10:
        return float(np.sqrt(np.mean(samples_1d ** 2)))
    return float(np.sqrt(np.mean(voice ** 2)))


def normalize_file(filepath: Path):
    """对单个文件执行门控 RMS 归一化"""
    samples, sr, fmt_info, header = read_wav_raw(filepath)
    
    if fmt_info['nch'] > 1:
        rms = np.mean([compute_gated_rms(samples[:, c]) for c in range(fmt_info['nch'])])
    else:
        rms = compute_gated_rms(samples)

    if rms < 1e-8:
        return 0.0, 0.0

    before_db = 20 * math.log10(rms)
    gain = min(TARGET_LOUDNESS / rms, 4.0)

    normalized = np.clip(samples * gain, -1.0, 1.0)
    write_wav_raw(filepath, normalized, header, fmt_info)

    if fmt_info['nch'] > 1:
        after_rms = np.mean([compute_gated_rms(normalized[:, c]) for c in range(fmt_info['nch'])])
    else:
        after_rms = compute_gated_rms(normalized)
    after_db = 20 * math.log10(after_rms) if after_rms > 1e-8 else -100

    return before_db, after_db


def main():
    dry_run = "--dry-run" in sys.argv

    files = [AUDIO_DIR / f"{sid}.mp3" for sid in SCENE_IDS]
    existing = [f for f in files if f.exists()]
    if not existing:
        print("[!] 未找到音频文件")
        return

    label = "DRY RUN" if dry_run else "处理"
    target_db = 20 * math.log10(TARGET_LOUDNESS)
    print(f"找到 {len(existing)} 个文件 ({label})")
    print(f"目标 {target_db:.1f} dBFS  |  门控阈值 {GATE_THRESHOLD_DB} dB")
    print()

    ok = fail = 0
    for f in existing:
        try:
            if dry_run:
                samples, sr, fmt_info, header = read_wav_raw(f)
                if fmt_info['nch'] > 1:
                    rms = np.mean([compute_gated_rms(samples[:, c]) for c in range(fmt_info['nch'])])
                else:
                    rms = compute_gated_rms(samples)
                if rms < 1e-8:
                    print(f"  ⊘ {f.name}: 近乎静音")
                    continue
                before_db = 20 * math.log10(rms)
                gain = min(TARGET_LOUDNESS / rms, 4.0)
                after_db = before_db + 20 * math.log10(gain)
                print(f"  {f.name}: {before_db:+.1f} → {after_db:+.1f} dBFS (gain {gain:.2f}x)")
            else:
                before_db, after_db = normalize_file(f)
                print(f"  ✓ {f.name}: {before_db:+.1f} → {after_db:+.1f} dBFS")
            ok += 1
        except Exception as e:
            print(f"  ✗ {f.name}: {e}")
            fail += 1

    print(f"\n完成: {ok} 成功, {fail} 失败 → 全部 {target_db:.1f} dBFS")
    if dry_run:
        print("[注] 仅预览，未修改文件。去掉 --dry-run 执行实际归一化。")


if __name__ == "__main__":
    main()
