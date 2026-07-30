#!/usr/bin/env python3
"""
ADCC 骗案警示页面爬虫
爬取单个 alert 详情页：提取所有字段、下载图片、输出 JSON
用法: python3 scrape_adcc.py
"""

import json
import os
import re
import sys
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

# ============================================================
# 配置
# ============================================================
PAGE_URL = "https://www.adcc.gov.hk/zh-hk/alerts-detail/alerts-2076535555384504322.html"
BASE_URL = "https://www.adcc.gov.hk"
ALERT_JSON_URL = "https://www.adcc.gov.hk/data/alert.json"
OUTPUT_DIR = Path("adcc_scraped")
IMAGE_DIR = OUTPUT_DIR / "images"

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
    """统一请求封装"""
    print(f"  [GET] {url}")
    resp = requests.get(url, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    return resp


def safe_text(el, default=""):
    """安全获取元素的文本"""
    return el.get_text(strip=True) if el else default


def safe_attr(el, attr, default=""):
    """安全获取元素的属性"""
    return el.get(attr, default).strip() if el else default


def resolve_url(src: str) -> str:
    """将相对路径转为绝对 URL"""
    if not src:
        return ""
    # 已经是绝对 URL
    if src.startswith("http"):
        return src
    # 从页面 URL 解析
    return urljoin(PAGE_URL, src)


def download_file(url: str, save_path: Path) -> bool:
    """下载单个文件"""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=60)
        resp.raise_for_status()
        save_path.parent.mkdir(parents=True, exist_ok=True)
        save_path.write_bytes(resp.content)
        print(f"  [SAVED] {save_path.name} ({len(resp.content)} bytes)")
        return True
    except Exception as e:
        print(f"  [FAIL] {url}: {e}")
        return False


# ============================================================
# 1. 解析 HTML 页面
# ============================================================
def parse_page(html: str) -> dict:
    """从 HTML 中提取所有有意义的字段"""
    soup = BeautifulSoup(html, "lxml")
    result = {}

    # --- Meta 标签 ---
    meta_tags = {}
    for tag in soup.find_all("meta"):
        name = tag.get("name") or tag.get("property") or tag.get("itemprop")
        content = tag.get("content", "")
        if name:
            meta_tags[name] = content
    result["meta"] = meta_tags

    # --- 标题 ---
    result["title"] = safe_text(soup.select_one("h1._content-title span"))

    # --- 日期 ---
    result["date"] = safe_text(soup.select_one("._date")).replace("\n", "").strip()

    # --- 分类/面包屑 ---
    result["category"] = safe_text(soup.select_one("a._page-title._back-title"))

    # --- 正文 HTML ---
    content_div = soup.select_one("div.fr-view")
    if content_div:
        result["content_html"] = str(content_div)
        result["content_text"] = content_div.get_text(separator="\n", strip=True)
    else:
        result["content_html"] = ""
        result["content_text"] = ""

    # --- 正文中的图片 ---
    images = []
    if content_div:
        for img in content_div.find_all("img"):
            src = resolve_url(img.get("src", ""))
            alt = img.get("alt", "")
            images.append({"src": src, "alt": alt, "filename": Path(urlparse(src).path).name})
    result["images"] = images

    # --- 页面所有链接 ---
    links = []
    for a in soup.find_all("a", href=True):
        href = a.get("href", "")
        text = safe_text(a)
        # 过滤掉 javascript: 和 # 链接
        if href.startswith("javascript:") or href == "#":
            continue
        links.append({"text": text, "href": resolve_url(href)})
    result["links"] = links

    # --- 导航菜单结构 ---
    menus = []
    for li in soup.select("#main-menu ._content > ul > li"):
        menu_item = {
            "id": li.get("id", ""),
            "label": safe_text(li.select_one("a")),
        }
        submenu = li.select_one("ul")
        if submenu:
            menu_item["children"] = []
            for sub_li in submenu.find_all("li"):
                sub_a = sub_li.find("a")
                menu_item["children"].append({
                    "id": sub_li.get("id", ""),
                    "label": safe_text(sub_a),
                    "href": resolve_url(sub_a.get("href", "")) if sub_a else "",
                })
        menus.append(menu_item)
    result["navigation_menu"] = menus

    # --- Footer 链接 ---
    footer_links = []
    for a in soup.select("._footer ._links a"):
        footer_links.append({"text": safe_text(a), "href": safe_attr(a, "href")})
    result["footer_links"] = footer_links

    # --- 最后更新日期 ---
    result["last_revision"] = safe_text(soup.select_one("._last-update"))

    # --- 页面 <title> ---
    result["page_title"] = safe_text(soup.select_one("head title"))

    # --- 从页面 ID 提取 alert ID ---
    match = re.search(r"alerts-([^/]+)\.html", PAGE_URL)
    result["alert_id"] = match.group(1) if match else ""

    return result


# ============================================================
# 2. 从 JSON 接口获取结构化数据
# ============================================================
def find_alert_in_json(alert_id: str) -> dict | None:
    """从 alert.json 中找到对应的 alert 条目"""
    resp = fetch(ALERT_JSON_URL)
    # 处理可能的编码问题
    resp.encoding = "utf-8"
    data = resp.json()
    alerts = data.get("Alerts", [])

    for alert in alerts:
        if alert.get("id") == alert_id:
            return alert
    return None


# ============================================================
# 3. 下载图片
# ============================================================
def download_images(images: list[dict]) -> list[dict]:
    """下载所有图片到本地，记录本地路径"""
    IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    for img in images:
        if img["src"]:
            # 处理相对路径（如 image/2026-07-14/FROALA_xxx.jpg）
            if not img["src"].startswith("http"):
                img["src"] = urljoin(BASE_URL, img["src"])
                # 也尝试相对于页面所在目录
            save_name = img["filename"] or Path(urlparse(img["src"]).path).name
            if not save_name:
                save_name = f"image_{hash(img['src'])}.jpg"
            save_path = IMAGE_DIR / save_name
            success = download_file(img["src"], save_path)
            img["downloaded"] = success
            img["local_path"] = str(save_path) if success else None
    return images


# ============================================================
# 主流程
# ============================================================
def main():
    print("=" * 60)
    print("ADCC 骗案警示页面爬虫")
    print(f"目标: {PAGE_URL}")
    print("=" * 60)

    # 创建输出目录
    OUTPUT_DIR.mkdir(exist_ok=True)

    # Step 1: 抓取 HTML
    print("\n[1/4] 抓取页面 HTML...")
    resp = fetch(PAGE_URL)
    resp.encoding = "utf-8"
    html = resp.text
    # 保存原始 HTML
    raw_html_path = OUTPUT_DIR / "page_raw.html"
    raw_html_path.write_text(html, encoding="utf-8")
    print(f"  [SAVED] 原始 HTML -> {raw_html_path}")

    # Step 2: 解析 HTML
    print("\n[2/4] 解析页面字段...")
    page_data = parse_page(html)

    alert_id = page_data["alert_id"]
    print(f"  Alert ID: {alert_id}")
    print(f"  标题: {page_data['title'][:50]}...")
    print(f"  日期: {page_data['date']}")
    print(f"  分类: {page_data['category']}")
    print(f"  图片数量: {len(page_data['images'])}")
    print(f"  链接数量: {len(page_data['links'])}")

    # Step 3: 获取 JSON 结构化数据
    print("\n[3/4] 获取 JSON 接口数据...")
    alert_json = find_alert_in_json(alert_id)
    if alert_json:
        print(f"  找到匹配条目: {alert_json['title'].get('zhHk', '')[:50]}...")
    else:
        print("  未在 alert.json 中找到匹配条目")

    # Step 4: 下载图片
    print("\n[4/4] 下载图片...")
    if page_data["images"]:
        page_data["images"] = download_images(page_data["images"])
    else:
        print("  无图片需要下载")

    # --- 汇总输出 ---
    output = {
        "source_url": PAGE_URL,
        "alert_id": alert_id,
        "scraped_fields": page_data,
        "alert_json_data": alert_json,
    }

    # 保存 JSON
    json_path = OUTPUT_DIR / "data.json"
    json_path.write_text(
        json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(f"\n  [SAVED] 结构化数据 -> {json_path}")

    # 保存纯文本内容
    txt_path = OUTPUT_DIR / "content.txt"
    txt_path.write_text(page_data["content_text"], encoding="utf-8")
    print(f"  [SAVED] 纯文本内容 -> {txt_path}")

    # 总结
    print("\n" + "=" * 60)
    print(f"爬取完成! 所有文件保存在: {OUTPUT_DIR.resolve()}/")
    print(f"  ├── data.json        # 完整结构化数据")
    print(f"  ├── page_raw.html    # 原始 HTML")
    print(f"  ├── content.txt      # 正文纯文本")
    print(f"  └── images/          # 下载的图片")
    print("=" * 60)


if __name__ == "__main__":
    main()
