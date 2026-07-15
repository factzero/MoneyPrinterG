"""
GitHub 每周热点 Top5 获取工具
支持两种方式获取 GitHub Trending：
1. 抓取 GitHub Trending 页面（默认）
2. 使用 GitHub Search API（备用）
"""

import requests
from bs4 import BeautifulSoup
import argparse
import json
import os
from datetime import datetime


def fetch_trending_from_page(since="weekly", top_n=5, language=None):
    """
    从 GitHub Trending 页面抓取热门项目
    
    Args:
        since: 时间范围，可选 daily/weekly/monthly
        top_n: 获取前 N 个项目
        language: 编程语言过滤，None 表示不限
    
    Returns:
        list[dict]: 热门项目列表
    """
    base_url = "https://github.com/trending"
    if language:
        base_url += f"/{language}"
    url = f"{base_url}?since={since}"

    print(f"[*] 正在请求: {url}")

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }
    
    try:
        resp = requests.get(url, headers=headers, timeout=15)
        resp.raise_for_status()
    except requests.RequestException as e:
        print(f"[!] 请求失败: {e}")
        return []

    soup = BeautifulSoup(resp.text, "html.parser")
    repos = soup.select("article.Box-row")
    
    if not repos:
        print("[!] 未找到仓库数据，可能页面结构已变化")
        return []

    results = []
    for repo in repos[:top_n]:
        # 提取仓库名
        h2 = repo.select_one("h2 a")
        if not h2:
            continue
        # 直接从 href 提取仓库路径，避免 stripped_strings 解析问题
        repo_path = h2.get("href", "").strip("/")
        name_parts = repo_path.split("/")
        full_name = " / ".join(name_parts)

        # 提取描述
        desc_el = repo.select_one("p")
        description = desc_el.text.strip() if desc_el else ""

        # 提取语言
        lang_el = repo.select_one("span[itemprop='programmingLanguage']")
        lang = lang_el.text.strip() if lang_el else "N/A"

        # 提取 stars 数和 forks 数
        stars_el = repo.select_one("a[href*='/stargazers']")
        forks_el = repo.select_one("a[href*='/forks']")
        stars = stars_el.text.strip() if stars_el else "0"
        forks = forks_el.text.strip() if forks_el else "0"

        # 提取本周新增 star 数
        weekly_stars = 0
        spans = repo.select("span.d-inline-block.float-sm-right")
        for span in spans:
            text = span.get_text(strip=True)
            if "star" in text.lower():
                # 从文本中提取数字部分，如 "1,678 stars this week" -> 1678
                num_str = text.split()[0].replace(",", "")
                try:
                    weekly_stars = int(num_str)
                except ValueError:
                    weekly_stars = 0
                break

        results.append({
            "rank": len(results) + 1,
            "name": full_name,
            "url": f"https://github.com/{repo_path}",
            "description": description,
            "language": lang,
            "stars": stars,
            "forks": forks,
            "weeklyStars": weekly_stars,
        })

    return results


def fetch_trending_via_api(top_n=5, language=None):
    """
    使用 GitHub Search API 获取本周热门项目（按 stars 排序）
    
    Args:
        top_n: 获取前 N 个项目
        language: 编程语言过滤，None 表示不限
    
    Returns:
        list[dict]: 热门项目列表
    """
    # 搜索最近一周创建/更新的高 star 项目
    query_parts = ["stars:>500", "created:>=" + _get_date_days_ago(7)]
    if language:
        query_parts.append(f"language:{language}")

    query = " ".join(query_parts)
    url = "https://api.github.com/search/repositories"
    params = {
        "q": query,
        "sort": "stars",
        "order": "desc",
        "per_page": top_n,
    }

    print(f"[*] 搜索 Query: {query}")

    headers = {
        "User-Agent": "MoneyPrinter-Trending-Bot",
        "Accept": "application/vnd.github+json",
    }

    try:
        resp = requests.get(url, params=params, headers=headers, timeout=15)
        resp.raise_for_status()
        data = resp.json()
    except requests.RequestException as e:
        print(f"[!] API 请求失败: {e}")
        return []
    except ValueError:
        print("[!] JSON 解析失败")
        return []

    results = []
    for item in data.get("items", []):
        results.append({
            "rank": len(results) + 1,
            "name": item.get("full_name", "N/A"),
            "url": item.get("html_url", ""),
            "description": (item.get("description") or "").strip(),
            "language": item.get("language") or "N/A",
            "stars": str(item.get("stargazers_count", 0)),
            "forks": str(item.get("forks_count", 0)),
            "weeklyStars": item.get("stargazers_count", 0),
        })

    return results


def _get_date_days_ago(n_days):
    from datetime import timedelta
    return (datetime.now() - timedelta(days=n_days)).strftime("%Y-%m-%d")


def print_results(results):
    """格式化打印结果"""
    if not results:
        print("\n[!] 没有获取到数据")
        return

    print(f"\n{'='*70}")
    print(f"  GitHub 每周热点 Top {len(results)}  ({datetime.now().strftime('%Y-%m-%d %H:%M')})")
    print(f"{'='*70}\n")

    for r in results:
        print(f"  #{r['rank']}  {r['name']}")
        print(f"      URL:         {r['url']}")
        print(f"      描述:        {r['description'][:90]}{'...' if len(r['description']) > 90 else ''}")
        print(f"      语言:        {r['language']}")
        print(f"      Stars:       {r['stars']}  |  Forks: {r['forks']}  |  weeklyStars: {r['weeklyStars']}")
        print()


def main():
    parser = argparse.ArgumentParser(
        description="获取 GitHub 每周热点 Top5 项目",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例用法:
  python get_github_trending.py                        # 默认：本周 Top5
  python get_github_trending.py -n 10                  # 本周 Top10
  python get_github_trending.py -l python              # Python 项目本周 Top5
  python get_github_trending.py -s daily               # 本日热门
  python get_github_trending.py -m api                 # 使用 Search API 方式
        """
    )
    parser.add_argument("-n", "--num", type=int, default=5, help="获取前 N 个项目 (默认: 5)")
    parser.add_argument("-s", "--since", choices=["daily", "weekly", "monthly"], 
                        default="weekly", help="时间范围 (默认: weekly)")
    parser.add_argument("-l", "--language", default=None, help="过滤编程语言 (如: python, javascript, go)")
    parser.add_argument("-m", "--mode", choices=["page", "api"], default="page",
                        help="获取方式: page=抓取Trending页面, api=用Search API (默认: page)")

    args = parser.parse_args()

    if args.mode == "page":
        results = fetch_trending_from_page(
            since=args.since, top_n=args.num, language=args.language
        )
    else:
        results = fetch_trending_via_api(
            top_n=args.num, language=args.language
        )

    print_results(results)

    # 保存 JSON 到 output 文件夹
    output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output")
    saved_path = save_to_json(results, output_dir, since=args.since, language=args.language)
    if saved_path:
        print(f"[OK] JSON 已保存: {saved_path}")


def save_to_json(results, output_dir="output", since="weekly", language=None):
    """
    将结果保存为 JSON 文件到指定目录
    
    Args:
        results: 热门项目列表
        output_dir: 输出目录
        since: 时间范围
        language: 语言过滤
    
    Returns:
        str: 保存的文件路径，失败返回 None
    """
    if not results:
        print("[!] 无数据可保存")
        return None

    os.makedirs(output_dir, exist_ok=True)

    lang_suffix = f"_{language}" if language else ""
    date_str = datetime.now().strftime("%Y%m%d")
    filename = f"github_trending_{since}{lang_suffix}_{date_str}.json"
    filepath = os.path.join(output_dir, filename)

    data = {
        "meta": {
            "source": "GitHub Trending",
            "since": since,
            "language": language or "all",
            "fetched_at": datetime.now().isoformat(),
            "count": len(results),
        },
        "repositories": results,
    }

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    return filepath


if __name__ == "__main__":
    main()
