#!/usr/bin/env python3
"""
ADCC 本地站点 — 一键初始化脚本
下载所有公共资源（CSS/JS/图片/JSON/字体），搭建本地可运行的站点镜像
用法: python3 scripts/setup.py
"""

import json
import os
import sys
from pathlib import Path

import requests

# ============================================================
# 配置
# ============================================================
BASE_URL = "https://www.adcc.gov.hk"
SITE_ROOT = Path(__file__).resolve().parent.parent  # adcc-site/

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
}

# ============================================================
# 资源清单
# ============================================================
RESOURCES = {
    "css": [
        "css/_vendor/bootstrap.min.css",
        "css/_vendor/fontawesome-all.min.css",
        "css/_vendor/jquery-ui.min.css",
        "css/_vendor/swiper.min.css",
        "css/_vendor/fullcalendar.min.css",
        "css/website.css",
    ],
    "js": [
        "js/_vendor/jquery-3.5.0.min.js",
        "js/_vendor/bootstrap.bundle.min.js",
        "js/_vendor/jquery-ui.min.js",
        "js/_vendor/jquery.rwdImageMaps.min.js",
        "js/_vendor/swiper.min.js",
        "js/_vendor/fullcalendar.min.js",
        "js/_vendor/moment-with-locales.min.js",
        "js/_vendor/vue.js",
        "js/_vendor/vue-router.js",
        "js/ax-function.js",
    ],
    "image": [
        "image/favicon.png",
        "image/logo.png",
        "image/font_s.png",
        "image/font_m.png",
        "image/font_l.png",
        "image/subscribe.png",
        "image/wcag2.1AA-v.png",
        "image/gold_logo.png",
        "image/adcc_logo.png",
    ],
    "data": [
        "data/alert.json",
        "data/homeImageIcon.json",
        "data/homeImageFooter.json",
    ],
    # Font Awesome 5 字体文件（CSS 引用路径为 ../../font/）
    "font": [
        "font/fa-brands-400.woff2",
        "font/fa-regular-400.woff2",
        "font/fa-solid-900.woff2",
    ],
}

# ============================================================
# 下载逻辑
# ============================================================
def download(url: str, dest: Path) -> bool:
    """下载单个文件"""
    if dest.exists():
        print(f"  [SKIP] {dest.relative_to(SITE_ROOT)} (已存在)")
        return True
    try:
        resp = requests.get(url, headers=HEADERS, timeout=30)
        resp.raise_for_status()
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(resp.content)
        size_kb = len(resp.content) / 1024
        print(f"  [OK] {dest.relative_to(SITE_ROOT)} ({size_kb:.1f} KB)")
        return True
    except Exception as e:
        print(f"  [FAIL] {url} -> {e}")
        return False


def download_all():
    """下载所有公共资源"""
    total = 0
    success = 0

    for category, paths in RESOURCES.items():
        print(f"\n📦 下载 {category}/ ({len(paths)} 个文件)...")
        for path in paths:
            total += 1
            url = f"{BASE_URL}/{path}"
            dest = SITE_ROOT / path
            if download(url, dest):
                success += 1

    print(f"\n{'='*50}")
    print(f"下载完成: {success}/{total} 成功")
    if success < total:
        print(f"  {total - success} 个文件失败（可能是远程不存在，不影响页面主要功能）")
    return success == total


# ============================================================
# 迁移已爬取的页面
# ============================================================
def migrate_scraped():
    """从 adcc_scraped/ 迁移页面和图片到正确位置"""
    scraped_dir = SITE_ROOT.parent / "adcc_scraped"
    if not scraped_dir.exists():
        print("\n⚠️  未找到 adcc_scraped/ 目录，跳过页面迁移")
        print("   请先运行 scrape.py 爬取页面")
        return False

    print("\n📄 迁移已爬取的页面...")

    # 迁移 HTML
    raw_html = scraped_dir / "page_raw.html"
    target_html = SITE_ROOT / "zh-hk/alerts-detail/alerts-2076535555384504322.html"
    if raw_html.exists():
        target_html.write_bytes(raw_html.read_bytes())
        print(f"  [OK] HTML -> {target_html.relative_to(SITE_ROOT)}")
    else:
        print("  [WARN] 未找到 page_raw.html")

    # 迁移内容图片
    images_dir = scraped_dir / "images"
    target_img_dir = SITE_ROOT / "zh-hk/alerts-detail/image/2026-07-14"
    if images_dir.exists():
        target_img_dir.mkdir(parents=True, exist_ok=True)
        for img in images_dir.iterdir():
            dest = target_img_dir / img.name
            dest.write_bytes(img.read_bytes())
            print(f"  [OK] 图片 -> {dest.relative_to(SITE_ROOT)}")
    else:
        print("  [WARN] 未找到 images/ 目录")

    # 复制 wcag + gold_logo 到 zh-hk/image/（处理 ../image/ 相对路径）
    zh_hk_image = SITE_ROOT / "zh-hk/image"
    zh_hk_image.mkdir(parents=True, exist_ok=True)
    for name in ["wcag2.1AA-v.png", "gold_logo.png"]:
        src = SITE_ROOT / "image" / name
        if src.exists():
            dest = zh_hk_image / name
            if not dest.exists():
                dest.write_bytes(src.read_bytes())
                print(f"  [OK] 复制 -> {dest.relative_to(SITE_ROOT)}")

    return True


# ============================================================
# 注入播放器
# ============================================================
def inject_players():
    """为所有 alert 页面注入音频播放器"""
    print("\n🔊 注入音频播放器...")
    alerts_dir = SITE_ROOT / "zh-hk/alerts-detail"
    if not alerts_dir.exists():
        print("  无页面需要注入")
        return

    html_files = list(alerts_dir.glob("alerts-*.html"))
    for html_path in html_files:
        try:
            from add_player import inject_player
            inject_player(html_path)
        except ImportError:
            # 内联注入逻辑
            html = html_path.read_text(encoding="utf-8")
            if "player/player.css" in html:
                print(f"  [SKIP] {html_path.name} (已有播放器)")
                continue
            css_tag = '<link rel="stylesheet" href="/player/player.css">'
            js_tag = '<script src="/player/player.js"></script>'
            html = html.replace("</head>", f"\n{css_tag}\n</head>", 1)
            html = html.replace("</body>", f"\n{js_tag}\n</body>", 1)
            html_path.write_text(html, encoding="utf-8")
            print(f"  [OK] {html_path.name}")


# ============================================================
# 主入口
# ============================================================
def main():
    print("=" * 50)
    print("ADCC 本地站点 — 一键初始化")
    print(f"目标目录: {SITE_ROOT}")
    print("=" * 50)

    # 1. 下载公共资源
    download_all()

    # 2. 迁移页面
    migrate_scraped()

    # 3. 注入播放器
    inject_players()

    # 4. 完成提示
    print(f"""
{'='*50}
✅ 初始化完成!

启动本地服务器:
  cd {SITE_ROOT}
  python3 scripts/server.py

然后在浏览器打开:
  http://localhost:8888/zh-hk/alerts-detail/alerts-2076535555384504322.html
{'='*50}
""")


if __name__ == "__main__":
    main()
