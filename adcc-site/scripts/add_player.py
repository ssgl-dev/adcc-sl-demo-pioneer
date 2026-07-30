#!/usr/bin/env python3
"""
将视频播放器注入到 alert 页面中
用法: python3 scripts/add_player.py [页面路径或alert-id]
默认: 处理 zh-hk/alerts-detail/alerts-2076535555384504322.html
"""

import sys
from pathlib import Path

SITE_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_HTML = SITE_ROOT / "zh-hk/alerts-detail/alerts-2076535555384504322.html"

# 额外 CSS（确保播放按钮不被裁剪）
EXTRA_CSS = """
<style>
.fr-view p, .fr-view li {
  position: relative;
}
._content-container, ._content, ._content-view, .fr-view {
  overflow: visible !important;
}
</style>
"""

# 注入到 </head> 前的 CSS
PLAYER_CSS = """
<!-- ADCC Video Player Styles -->
<link rel="stylesheet" href="/player/player.css">
"""

# 注入到 </body> 前的 JS
PLAYER_JS = """
<!-- ADCC Video Player -->
<script src="/player/player.js"></script>
"""


def inject_player(html_path: Path):
    """往 HTML 文件中注入播放器的 CSS 和 JS 引用"""
    if not html_path.exists():
        print(f"❌ 文件不存在: {html_path}")
        return None

    html = html_path.read_text(encoding="utf-8")

    # 检查是否已经注入过
    if "player/player.css" in html:
        print(f"⚠️  页面已包含播放器，跳过注入: {html_path.name}")
        return html_path

    # 注入 CSS（只在第一个 </head> 前）
    # 正文中可能包含内嵌的 <html><head></head>... 所以只用 count=1
    html = html.replace("</head>", f"{EXTRA_CSS}{PLAYER_CSS}</head>", 1)

    # 注入 JS（只在第一个 </body> 前）
    if "</body>" in html:
        html = html.replace("</body>", f"{PLAYER_JS}</body>", 1)
    else:
        html += f"\n{PLAYER_JS}\n"

    # 保存
    html_path.write_text(html, encoding="utf-8")
    print(f"✅ 播放器已注入: {html_path.relative_to(SITE_ROOT)}")
    return html_path


def main():
    if len(sys.argv) > 1:
        arg = sys.argv[1]
        # 如果参数是 alert ID
        if arg.isdigit():
            html_path = SITE_ROOT / f"zh-hk/alerts-detail/alerts-{arg}.html"
        else:
            html_path = Path(arg)
    else:
        html_path = DEFAULT_HTML

    result = inject_player(html_path)
    if result:
        print(f"   访问: http://localhost:8888/{result.relative_to(SITE_ROOT)}")


if __name__ == "__main__":
    main()
