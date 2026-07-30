#!/usr/bin/env python3
"""
ADCC 骗案警示页面爬虫
- 单页模式: python3 scripts/scrape.py <alert-url>
- 批量模式: python3 scripts/scrape.py --all  (爬取 alert.json 中全部 alert)
- ID 模式:   python3 scripts/scrape.py --id 2076535555384504322
用法示例:
  python3 scripts/scrape.py https://www.adcc.gov.hk/zh-hk/alerts-detail/alerts-2076535555384504322.html
  python3 scripts/scrape.py --id 2076535555384504322
  python3 scripts/scrape.py --all --limit 5    # 只爬前5条
"""

import argparse
import json
import re
import sys
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

# ============================================================
# 配置
# ============================================================
BASE_URL = "https://www.adcc.gov.hk"
ALERT_JSON_URL = f"{BASE_URL}/data/alert.json"
SITE_ROOT = Path(__file__).resolve().parent.parent  # adcc-site/

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-HK,zh;q=0.9,en;q=0.8",
}


# ============================================================
# 工具函数
# ============================================================
def fetch(url: str) -> requests.Response:
    print(f"  [GET] {url}")
    resp = requests.get(url, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    return resp


def safe_text(el, default=""):
    return el.get_text(strip=True) if el else default


def resolve_url(page_url: str, src: str) -> str:
    if not src:
        return ""
    if src.startswith("http"):
        return src
    return urljoin(page_url, src)


# ============================================================
# 解析页面
# ============================================================
def parse_page(html: str, page_url: str) -> dict:
    soup = BeautifulSoup(html, "lxml")
    result = {}

    # Meta 标签
    meta_tags = {}
    for tag in soup.find_all("meta"):
        name = tag.get("name") or tag.get("property") or tag.get("itemprop")
        content = tag.get("content", "")
        if name:
            meta_tags[name] = content
    result["meta"] = meta_tags

    # 标题 / 日期 / 分类
    result["title"] = safe_text(soup.select_one("h1._content-title span"))
    result["date"] = safe_text(soup.select_one("._date")).replace("\n", "").strip()
    result["category"] = safe_text(soup.select_one("a._page-title._back-title"))

    # 正文
    content_div = soup.select_one("div.fr-view")
    if content_div:
        result["content_html"] = str(content_div)
        result["content_text"] = content_div.get_text(separator="\n", strip=True)
    else:
        result["content_html"] = ""
        result["content_text"] = ""

    # 内容图片
    images = []
    if content_div:
        for img in content_div.find_all("img"):
            src = img.get("src", "")
            alt = img.get("alt", "")
            full_url = resolve_url(page_url, src)
            images.append({
                "src": full_url,
                "alt": alt,
                "filename": Path(urlparse(full_url).path).name,
            })
    result["images"] = images

    # 提取 alert ID
    match = re.search(r"alerts-([^/]+)\.html", page_url)
    result["alert_id"] = match.group(1) if match else ""

    return result


# ============================================================
# 保存到站点目录
# ============================================================
def save_to_site(html: str, page_data: dict, page_url: str):
    """将页面 HTML 和图片保存到 adcc-site 目录结构中"""
    alert_id = page_data["alert_id"]
    if not alert_id:
        print("  [ERROR] 无法提取 alert_id")
        return

    # 保存 HTML
    html_dir = SITE_ROOT / "zh-hk/alerts-detail"
    html_dir.mkdir(parents=True, exist_ok=True)
    html_path = html_dir / f"alerts-{alert_id}.html"
    html_path.write_text(html, encoding="utf-8")
    print(f"  [SAVED] HTML -> {html_path.relative_to(SITE_ROOT)}")

    # 保存内容图片
    for img in page_data["images"]:
        if not img["src"]:
            continue
        try:
            resp = requests.get(img["src"], headers=HEADERS, timeout=60)
            resp.raise_for_status()
            # 图片放在页面同级的 image/ 子目录下
            # 根据原始 URL 路径确定子目录结构
            parsed = urlparse(img["src"])
            path_parts = Path(parsed.path).parts
            # 找到 image/ 之后的路径
            img_subpath = ""
            for i, part in enumerate(path_parts):
                if part == "image" and i + 1 < len(path_parts):
                    img_subpath = str(Path(*path_parts[i + 1:]))
                    break
            img_dest = html_dir / "image" / img_subpath
            img_dest.parent.mkdir(parents=True, exist_ok=True)
            img_dest.write_bytes(resp.content)
            print(f"  [SAVED] 图片 -> {img_dest.relative_to(SITE_ROOT)} ({len(resp.content)} bytes)")
        except Exception as e:
            print(f"  [FAIL] 图片 {img['src']}: {e}")

    # 保存结构化数据
    data_dir = SITE_ROOT / "data/scraped"
    data_dir.mkdir(parents=True, exist_ok=True)
    json_path = data_dir / f"alerts-{alert_id}.json"
    json_path.write_text(json.dumps(page_data, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"  [SAVED] JSON -> {json_path.relative_to(SITE_ROOT)}")


# ============================================================
# 单页爬取
# ============================================================
def scrape_page(page_url: str):
    print(f"\n{'='*50}")
    print(f"爬取: {page_url}")

    resp = fetch(page_url)
    resp.encoding = "utf-8"
    html = resp.text

    page_data = parse_page(html, page_url)
    print(f"  Alert ID: {page_data['alert_id']}")
    print(f"  标题: {page_data['title'][:60]}...")
    print(f"  日期: {page_data['date']}")
    print(f"  图片: {len(page_data['images'])} 张")

    save_to_site(html, page_data, page_url)
    return page_data


# ============================================================
# 批量爬取
# ============================================================
def get_all_alert_ids() -> list[dict]:
    """从 alert.json 获取所有 alert 条目"""
    print(f"\n获取 alert 列表: {ALERT_JSON_URL}")
    resp = fetch(ALERT_JSON_URL)
    resp.encoding = "utf-8"
    data = resp.json()
    return data.get("Alerts", [])


def scrape_all(limit: int | None = None):
    """批量爬取所有 alert 页面"""
    alerts = get_all_alert_ids()
    print(f"共 {len(alerts)} 条 alert")

    if limit:
        alerts = alerts[:limit]
        print(f"限制: 只爬前 {limit} 条")

    success = 0
    for i, alert in enumerate(alerts):
        alert_id = alert["id"]
        # 检查是否已爬取
        existing = SITE_ROOT / f"zh-hk/alerts-detail/alerts-{alert_id}.html"
        if existing.exists():
            print(f"\n[{i+1}/{len(alerts)}] alerts-{alert_id} (已存在，跳过)")
            success += 1
            continue

        print(f"\n[{i+1}/{len(alerts)}] alerts-{alert_id}")
        url = f"{BASE_URL}/zh-hk/alerts-detail/alerts-{alert_id}.html"
        try:
            scrape_page(url)
            success += 1
        except Exception as e:
            print(f"  [ERROR] {e}")

    print(f"\n{'='*50}")
    print(f"批量爬取完成: {success}/{len(alerts)} 成功")


# ============================================================
# 命令行入口
# ============================================================
def main():
    parser = argparse.ArgumentParser(
        description="ADCC 骗案警示爬虫",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  %(prog)s https://www.adcc.gov.hk/zh-hk/alerts-detail/alerts-2076535555384504322.html
  %(prog)s --id 2076535555384504322
  %(prog)s --all
  %(prog)s --all --limit 5
        """,
    )
    parser.add_argument("url", nargs="?", help="页面完整 URL")
    parser.add_argument("--id", help="Alert ID（如 2076535555384504322）")
    parser.add_argument("--all", action="store_true", help="批量爬取所有 alert")
    parser.add_argument("--limit", type=int, help="批量模式下限制数量")
    parser.add_argument("--player", action="store_true", help="爬取后自动注入音频播放器")

    args = parser.parse_args()

    if args.all:
        scrape_all(limit=args.limit)
    elif args.id:
        url = f"{BASE_URL}/zh-hk/alerts-detail/alerts-{args.id}.html"
        scrape_page(url)
    elif args.url:
        scrape_page(args.url)
    else:
        parser.print_help()
        return

    # 注入播放器
    if args.player:
        print("\n🔊 注入音频播放器...")
        alert_id = None
        if args.id:
            alert_id = args.id
        elif args.url:
            m = re.search(r"alerts-([^/]+)\.html", args.url)
            if m:
                alert_id = m.group(1)

        if alert_id:
            html_path = SITE_ROOT / f"zh-hk/alerts-detail/alerts-{alert_id}.html"
            if html_path.exists():
                from add_player import inject_player
                inject_player(html_path)
        elif args.all:
            # 批量模式下注入所有
            for html_path in (SITE_ROOT / "zh-hk/alerts-detail").glob("alerts-*.html"):
                from add_player import inject_player
                inject_player(html_path)


if __name__ == "__main__":
    main()
