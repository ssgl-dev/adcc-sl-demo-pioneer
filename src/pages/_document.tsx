import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="zh-hk">
      <Head>
        {/* Favicon */}
        <link rel="shortcut icon" type="image/png" href="/image/favicon.png" />
        <link rel="apple-touch-icon" href="/image/favicon.png" />

        {/* Vendor CSS */}
        <link rel="stylesheet" href="/css/_vendor/fontawesome-all.min.css" />
        <link rel="stylesheet" href="/css/_vendor/bootstrap.min.css" />
        <link rel="stylesheet" href="/css/_vendor/jquery-ui.min.css" />
        <link rel="stylesheet" href="/css/_vendor/swiper.min.css" />
        <link rel="stylesheet" href="/css/_vendor/fullcalendar.min.css" />

        {/* Site CSS */}
        <link rel="stylesheet" href="/css/website.css" />

        {/* Player CSS */}
        <link rel="stylesheet" href="/player/player.css" />

        {/* Auth script — 在所有页面预加载，确保登录页和受保护页面可用 */}
        <script src="/js/auth-check.js" />
      </Head>
      <body className="zh-hk main-body">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
