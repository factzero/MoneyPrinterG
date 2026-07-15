"""
自动截图工具 — 拉取 GitHub 仓库的 OG Image 作为截图
无需浏览器、无需手动操作，读取 trending JSON 后自动下载
"""

import json
import os
import glob
import argparse
import requests
from pathlib import Path


def find_latest_trending_json(output_dir="output"):
    pattern = os.path.join(output_dir, "github_trending_*.json")
    files = glob.glob(pattern)
    if not files:
        return None
    return max(files, key=os.path.getmtime)


def download_og_image(owner, repo, save_path):
    """下载 GitHub 仓库的社交预览图"""
    url = f"https://opengraph.githubassets.com/1/{owner}/{repo}"
    headers = {
        "User-Agent": "MoneyPrinter/1.0",
    }
    try:
        resp = requests.get(url, headers=headers, timeout=30)
        resp.raise_for_status()
        with open(save_path, "wb") as f:
            f.write(resp.content)
        return True
    except requests.RequestException as e:
        print(f"    [!] 下载失败: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="自动下载 GitHub Trending 项目的 OG 截图")
    parser.add_argument("-f", "--file", default=None, help="指定 trending JSON 文件路径")
    parser.add_argument(
        "-o", "--output",
        default=None,
        help="截图输出目录 (默认: remotion-video/public/screenshots)",
    )
    args = parser.parse_args()

    # 确定数据文件
    json_path = args.file
    if not json_path:
        json_path = find_latest_trending_json("output")
        if not json_path:
            print("[!] 未找到 trending JSON，请先运行 get_github_trending.py")
            return

    # 确定输出目录
    project_root = Path(__file__).parent
    if args.output:
        out_dir = Path(args.output)
    else:
        out_dir = project_root / "remotion-video" / "public" / "screenshots"
    out_dir.mkdir(parents=True, exist_ok=True)

    # 加载数据
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    repos = data.get("repositories", [])
    if not repos:
        print("[!] 数据中没有仓库信息")
        return

    print(f"[*] 数据: {Path(json_path).name}")
    print(f"[*] 输出: {out_dir}")
    print(f"[*] 共 {len(repos)} 个项目\n")

    for r in repos:
        name = r["name"]
        parts = name.split(" / ")
        owner = parts[0].strip()
        repo = parts[1].strip() if len(parts) > 1 else name
        rank = r["rank"]

        # 文件名: {rank:02d}-{repo_name}.png
        filename = f"{rank:02d}-{repo.lower()}.png"
        save_path = out_dir / filename

        print(f"  [#{rank}] {owner}/{repo}")
        print(f"       URL: https://opengraph.githubassets.com/1/{owner}/{repo}")

        if save_path.exists():
            print(f"       [~] 已存在，跳过: {filename}")
        else:
            ok = download_og_image(owner, repo, str(save_path))
            if ok:
                size_kb = save_path.stat().st_size / 1024
                print(f"       [OK] {filename} ({size_kb:.1f} KB)")
            else:
                print(f"       [!] 失败: {filename}")
        print()

    print("[OK] 截图完成！")
    print(f"     文件位于: {out_dir}")


if __name__ == "__main__":
    main()
