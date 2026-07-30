import { GetServerSideProps } from "next";
import fs from "fs";
import path from "path";

/**
 * page_raw — 完整 HTML 直通模式
 *
 * 直接返回 page_raw.html 的完整内容，
 * 保持与原项目完全一致的页面结构、CSS/JS 加载顺序和手语视频功能。
 * React 组件不会被渲染，所有内容由原始 HTML 提供。
 */
export default function PageRaw() {
  // 始终返回 null — 实际内容由 getServerSideProps 直接写入响应
  return null;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  try {
    const filePath = path.join(process.cwd(), "page_raw.html");
    const html = fs.readFileSync(filePath, "utf-8");

    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    });
    res.write(html);
    res.end();
  } catch {
    res.writeHead(500);
    res.end("Internal Server Error: unable to load page_raw.html");
  }

  return { props: {} };
};
