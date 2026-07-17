"""
GitHub 热点短视频解说文案生成器
调用大语言模型，将 GitHub Trending 数据转化为短视频解说文案
"""

import json
import os
import argparse
import glob
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()


# ────────────── LLM 配置 ──────────────

def get_llm_config():
    """从环境变量读取 LLM 配置，支持多种模型"""
    return {
        "api_key": os.getenv("LLM_API_KEY", ""),
        "base_url": os.getenv("LLM_BASE_URL", "https://api.deepseek.com/v1"),
        "model": os.getenv("LLM_MODEL", "deepseek-chat"),
    }


# ────────────── 数据加载 ──────────────

def find_latest_trending_json(output_dir="output"):
    """自动找到最新的 trending JSON 文件"""
    pattern = os.path.join(output_dir, "github_trending_*.json")
    files = glob.glob(pattern)
    if not files:
        return None
    return max(files, key=os.path.getmtime)


def load_trending_data(filepath):
    """加载 trending JSON 数据"""
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


# ────────────── Prompt 构建 ──────────────

def build_prompt(repos, since="weekly"):
    """构建发送给 LLM 的 prompt"""

    period_label = {"daily": "本日", "weekly": "本周", "monthly": "本月"}.get(since, "本周")

    # 将数据组装成易读的文本
    repos_text = ""
    for r in repos:
        repos_text += f"""
【第{r['rank']}名】{r['name']}
  语言: {r['language']}
  Stars: {r['stars']} | Forks: {r['forks']} | 本周新增: {r['weeklyStars']}
  简介: {r['description']}
  链接: {r['url']}
"""

    prompt = f"""你是「GitHub开源项目周更盘点」技术博主，面向程序员、AI开发者、自学编程者、技术爱好者。口语化讲解、节奏舒服、真实客观、不夸大效果，兼顾小白和进阶观众。

请根据以下 GitHub {period_label}热门项目数据，写一份中文短视频解说文案。

【基础人设】
- 口头禅："墨白带你盘一盘"
- 风格：热情接地气、懂技术但不装、偶尔幽默、善用类比让非技术人员也能听懂
- 原则：真实客观、不夸大效果、带录屏演示指引

【视频结构 & 精确时间轴】（总时长 5 分钟）

## 一、片头（0:00-0:30｜30秒）
- 强钩子开场：用提问/惊人数据/反差感一句话抓住观众
- 快速预告本期 5 个项目名称
- 栏目自我介绍（一句带过）

## 二、主体 5 个项目（0:30-4:30｜共4分钟）
每个项目严格控制在 60 秒左右，按以下模板：

```
[项目标题引入]（一句话，带编号和名称）
[核心介绍] 项目全称、核心用途、最大亮点
[数据速览] Stars/Forks/本周新增数据
[适配人群] 适合谁用，解决什么场景
[上手方法] 一行命令或最快上手路径
[避坑提示] 使用注意事项/局限性（如有）
[画面提示] 【打开GitHub主页 / 演示运行效果 / 终端录屏】
[自然停顿] 便于后期剪辑加字幕
```

## 三、片尾（4:30-5:00｜30秒）
- 5 个项目一句话回顾总结
- 三连/收藏/关注引导
- 固定互动提问："你{period_label}在用哪个 GitHub 开源项目？评论区告诉我。"

【输出格式要求】
1. 严格按时间轴分段，每段标注时间戳 [00:00]
2. 纯口播台词 + 画面提示（用【画面：xxx】标注）
3. 适合口播的自然停顿节奏，每句不超过 25 字
4. 禁止使用 markdown 语法（除了分段标题）

---（以下为元数据，不用于配音，请用 --- 隔开）---
1. 封面标题（3个备选，要求有冲击力）
2. 视频简介文案（50字左右，含项目链接）
3. 推荐标签（B站/短视频平台适用，8-10个）
4. 置顶评论文案（引导互动）

【项目数据】
{repos_text}

直接输出文案，不要多余解释。"""

    return prompt


# ────────────── LLM 调用 ──────────────

def call_llm(prompt, config):
    """调用 LLM API 生成文案"""
    import requests

    url = f"{config['base_url'].rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {config['api_key']}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": config["model"],
        "messages": [
            {"role": "system", "content": "你是「墨白」，一个 GitHub 开源项目周更盘点技术博主。面向程序员和 AI 开发者，口语化讲解，节奏舒服，真实客观不夸大。你的每期视频都是 5 分钟，精确到秒的时间轴，适配录屏制作。"},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.7,
        "max_tokens": 4096,
    }

    print(f"[*] 正在调用 {config['model']} ...")
    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=60)
        resp.raise_for_status()
        result = resp.json()
        content = result["choices"][0]["message"]["content"]
        return content
    except requests.RequestException as e:
        print(f"[!] API 请求失败: {e}")
        if hasattr(e, "response") and e.response is not None:
            print(f"    响应内容: {e.response.text[:500]}")
        return None
    except (KeyError, IndexError) as e:
        print(f"[!] 响应解析失败: {e}")
        print(f"    原始响应: {resp.text[:500]}")
        return None


# ────────────── 结果保存 ──────────────

def save_script(script_text, output_dir="output", since="weekly"):
    """保存生成的文案到 output 文件夹"""
    os.makedirs(output_dir, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filepath = os.path.join(output_dir, f"video_script_{since}_{timestamp}.md")

    header = f"<!-- 自动生成于 {datetime.now().isoformat()} -->\n<!-- 模型: {get_llm_config()['model']} -->\n\n"
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(header + script_text)

    return filepath


# ────────────── 主入口 ──────────────

def main():
    parser = argparse.ArgumentParser(
        description="基于 GitHub 热点数据，调用 LLM 生成短视频解说文案",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
环境变量配置（在 .env 文件中设置）:
  LLM_API_KEY     API 密钥（必填）
  LLM_BASE_URL    API 地址（默认: https://api.deepseek.com/v1）
  LLM_MODEL       模型名称（默认: deepseek-chat）

示例:
  python generate_video_script.py                           # 自动读取最新 JSON 并生成
  python generate_video_script.py -f output/trending.json   # 指定数据文件
  python generate_video_script.py -m openai                 # 切换预设模型
  python generate_video_script.py --model gpt-4o --base-url https://api.openai.com/v1
        """,
    )
    parser.add_argument("-f", "--file", default=None, help="指定 trending JSON 文件路径")
    parser.add_argument(
        "-m", "--mode",
        choices=["deepseek", "openai", "custom"],
        default=None,
        help="预设模型快捷切换: deepseek / openai / custom",
    )
    parser.add_argument("--model", default=None, help="自定义模型名称")
    parser.add_argument("--api-key", default=None, help="API Key（优先于环境变量）")
    parser.add_argument("--base-url", default=None, help="自定义 API 地址")

    args = parser.parse_args()

    # 确定输入文件
    json_file = args.file
    if not json_file:
        json_file = find_latest_trending_json("output")
        if not json_file:
            print("[!] 未找到 trending JSON 文件，请先运行 get_github_trending.py")
            return
    print(f"[*] 读取数据: {json_file}")

    data = load_trending_data(json_file)
    repos = data.get("repositories", [])
    since = data.get("meta", {}).get("since", "weekly")

    if not repos:
        print("[!] 数据中没有仓库信息")
        return

    # 确定 LLM 配置
    config = get_llm_config()

    # 快捷切换预设
    presets = {
        "deepseek": {
            "api_key": os.getenv("DEEPSEEK_API_KEY", ""),
            "base_url": "https://api.deepseek.com/v1",
            "model": "deepseek-chat",
        },
        "openai": {
            "api_key": os.getenv("OPENAI_API_KEY", ""),
            "base_url": "https://api.openai.com/v1",
            "model": "gpt-4o",
        },
    }
    if args.mode and args.mode != "custom":
        config.update(presets.get(args.mode, {}))

    # 命令行参数覆盖
    if args.api_key:
        config["api_key"] = args.api_key
    if args.base_url:
        config["base_url"] = args.base_url
    if args.model:
        config["model"] = args.model

    if not config["api_key"]:
        print("[!] 未设置 API Key！")
        print("    方式1: 创建 .env 文件，写入 LLM_API_KEY=你的密钥")
        print("    方式2: 命令行参数 --api-key YOUR_KEY")
        print("    方式3: 设置环境变量 LLM_API_KEY")
        return

    # 生成文案
    prompt = build_prompt(repos, since)
    script = call_llm(prompt, config)
    if not script:
        return

    # 保存
    output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output")
    saved_path = save_script(script, output_dir, since)
    print(f"[OK] 文案已保存: {saved_path}")
    print(f"\n{'='*60}")
    print(script)
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
