#!/usr/bin/env python3
"""
ADCC 本地站点 HTTP 服务器
用法: python3 scripts/server.py [端口号，默认8080]
"""

import http.server
import socketserver
import sys
from pathlib import Path

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8888
DIRECTORY = str(Path(__file__).resolve().parent.parent)

Handler = http.server.SimpleHTTPRequestHandler

# 修正 MIME 类型
Handler.extensions_map.update({
    ".woff2": "font/woff2",
    ".woff": "font/woff",
    ".ttf": "font/ttf",
})

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    url = f"http://localhost:{PORT}/zh-hk/alerts-detail/alerts-2076535555384504322.html"
    print(f"""
╔══════════════════════════════════════════════╗
║       ADCC 本地站点镜像服务器                ║
╠══════════════════════════════════════════════╣
║  地址: {url:<36} ║
║  目录: {DIRECTORY:<36} ║
║  按 Ctrl+C 停止服务器                        ║
╚══════════════════════════════════════════════╝
""")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n服务器已停止")
