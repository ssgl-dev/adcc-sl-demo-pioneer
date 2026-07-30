import { useEffect } from "react";
import Head from "next/head";

export default function Login() {
  useEffect(() => {
    // 轮询等待 ADCC_Auth 脚本加载完成
    function waitForAuth(cb: () => void) {
      if ((window as any).ADCC_Auth) {
        cb();
      } else {
        setTimeout(() => waitForAuth(cb), 50);
      }
    }

    waitForAuth(() => {
      const usernameInput = document.getElementById(
        "usernameInput"
      ) as HTMLInputElement;
      const passwordInput = document.getElementById(
        "passwordInput"
      ) as HTMLInputElement;
      const toggle = document.getElementById("togglePw") as HTMLButtonElement;
      const btn = document.getElementById("btnLogin") as HTMLButtonElement;
      const error = document.getElementById("loginError") as HTMLDivElement;

      const ADCC_Auth = (window as any).ADCC_Auth;

      // 如果已登录，直接跳转
      if (ADCC_Auth.isLoggedIn()) {
        redirectToTarget();
        return;
      }

      // 显示/隐藏密码
      toggle.addEventListener("click", function () {
        const isPassword = passwordInput.type === "password";
        passwordInput.type = isPassword ? "text" : "password";
        toggle.textContent = isPassword ? "🙈" : "👁";
      });

      // 回车：用户名 -> 密码；密码 -> 登录
      usernameInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") passwordInput.focus();
      });
      passwordInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") doLogin();
      });

      // 按钮登录
      btn.addEventListener("click", doLogin);

      async function doLogin() {
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        if (!username) {
          showError("請輸入帳號");
          usernameInput.focus();
          return;
        }
        if (!password) {
          showError("請輸入密碼");
          passwordInput.focus();
          return;
        }

        btn.disabled = true;
        btn.textContent = "驗證中…";
        error.classList.remove("show");

        await new Promise((r) => setTimeout(r, 300));

        const ok = await ADCC_Auth.login(username, password);
        if (ok) {
          btn.textContent = "✓ 登入成功";
          btn.style.background = "#4caf50";
          setTimeout(redirectToTarget, 400);
        } else {
          showError("帳號或密碼錯誤，請重試");
          btn.disabled = false;
          btn.textContent = "登 入";
          passwordInput.value = "";
          passwordInput.focus();
        }
      }

      function showError(msg: string) {
        error.textContent = msg;
        error.classList.add("show");
        passwordInput.style.borderColor = "#990f29";
        setTimeout(function () {
          passwordInput.style.borderColor = "#e0e0e0";
          error.classList.remove("show");
        }, 2500);
      }

      function redirectToTarget() {
        const params = new URLSearchParams(window.location.search);
        const returnUrl = params.get("return");
        window.location.href = returnUrl || "/page_raw";
      }
    });
  }, []);

  return (
    <>
      <Head>
        <title>登入 | 反詐騙協調中心 (ADCC)</title>
        <meta name="robots" content="noindex, nofollow" />
        {/* 在 Head 中以传统方式加载 auth-check.js，确保它在 React 水合之前执行 */}
        <script src="/js/auth-check.js" />
      </Head>

      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: "PMingLiU", "MingLiU", "Microsoft JhengHei", -apple-system, BlinkMacSystemFont, sans-serif;
          background: #f2faff;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .login-wrapper { width: 100%; max-width: 400px; }
        .login-brand { text-align: center; margin-bottom: 32px; }
        .login-brand img { height: 72px; margin-bottom: 12px; }
        .login-brand h1 { font-size: 20px; color: #07776e; font-weight: 600; letter-spacing: 0.5px; }
        .login-brand p { font-size: 14px; color: #888; margin-top: 6px; }
        .login-card {
          background: #fff; border-radius: 12px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04);
          padding: 36px 32px; border: 1px solid #e8e8e8;
        }
        .login-card label { display: block; font-size: 14px; color: #555; margin-bottom: 8px; font-weight: 500; }
        .input-wrap { position: relative; margin-bottom: 20px; }
        .input-wrap input {
          width: 100%; height: 48px; padding: 0 44px 0 16px;
          border: 2px solid #e0e0e0; border-radius: 8px; font-size: 16px;
          font-family: inherit; color: #333; background: #fafafa;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s; outline: none;
        }
        .input-wrap input:focus {
          border-color: #07776e; background: #fff;
          box-shadow: 0 0 0 3px rgba(7,119,110,0.1);
        }
        .input-wrap .toggle-pw {
          position: absolute; right: 4px; top: 50%; transform: translateY(-50%);
          background: none; border: none; color: #999; cursor: pointer;
          font-size: 18px; padding: 8px; line-height: 1; border-radius: 4px; transition: color 0.2s;
        }
        .input-wrap .toggle-pw:hover { color: #555; }
        .login-card .btn-login {
          width: 100%; height: 48px; background: #07776e; color: #fff;
          border: none; border-radius: 8px; font-size: 16px; font-weight: 600;
          cursor: pointer; font-family: inherit; letter-spacing: 1px;
          transition: background 0.2s, transform 0.1s; margin-bottom: 12px;
        }
        .login-card .btn-login:hover { background: #06655d; }
        .login-card .btn-login:active { transform: scale(0.98); }
        .login-card .btn-login:disabled { background: #aaa; cursor: not-allowed; }
        .login-error {
          text-align: center; font-size: 13px; color: #990f29;
          min-height: 20px; margin-bottom: 4px; opacity: 0; transition: opacity 0.2s;
        }
        .login-error.show { opacity: 1; }
        .login-footer { text-align: center; margin-top: 24px; font-size: 12px; color: #aaa; }
        @media (max-width: 480px) {
          .login-card { padding: 28px 20px; border-radius: 10px; }
          .login-brand img { height: 56px; }
          .login-brand h1 { font-size: 18px; }
        }
      `}</style>

      <div className="login-wrapper">
        <div className="login-brand">
          <img src="/image/logo.png" alt="反詐騙協調中心" />
          <h1>反詐騙協調中心</h1>
          <p>Anti-Deception Coordination Centre</p>
        </div>

        <div className="login-card">
          <label htmlFor="usernameInput">請輸入帳號</label>
          <div className="input-wrap">
            <input type="text" id="usernameInput" placeholder="請輸入帳號" autoComplete="username" autoFocus />
          </div>

          <label htmlFor="passwordInput">請輸入密碼以繼續</label>
          <div className="input-wrap">
            <input type="password" id="passwordInput" placeholder="請輸入密碼" autoComplete="current-password" />
            <button className="toggle-pw" id="togglePw" type="button" title="顯示密碼">👁</button>
          </div>
          <div className="login-error" id="loginError">帳號或密碼錯誤，請重試</div>
          <button className="btn-login" id="btnLogin" type="button">登 入</button>
        </div>

        <div className="login-footer">
          &copy; 反詐騙協調中心 ADCC · 香港警務處
        </div>
      </div>
    </>
  );
}
