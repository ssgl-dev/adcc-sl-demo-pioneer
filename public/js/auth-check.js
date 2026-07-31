/* ============================================================
   ADCC 前端简易认证 — 账号 + 密码锁
   - 存储: sessionStorage（关闭浏览器后需重新登录）
   - 密码: SHA-256 哈希校验
   - 用法: 在需要保护的页面引入此脚本
   ============================================================ */

(function () {
  "use strict";

  // ==========================================================
  // 默认账号和密码
  //   修改账号: 改 DEFAULT_USERNAME
  //   修改密码: 在浏览器控制台运行 ADCC_Auth.setPassword('新密码')
  //            或在下方 DEFAULT_HASH 填入新密码的 SHA-256 值
  // ==========================================================
  const DEFAULT_USERNAME = "ADCCtech2026";
  const DEFAULT_HASH =
    "b1be92cec6c10e2b962b7001e08e9ce23f73de568dc0b89299bca26be3b8dd30";
  // 默认密码: "ImpactAI2026"

  const STORAGE_KEY = "adcc_auth_token";

  // ==========================================================
  // 工具: SHA-256
  // ==========================================================
  async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // ==========================================================
  // 获取保存的账号和密码哈希
  // ==========================================================
  function getSavedUsername() {
    const custom = localStorage.getItem("adcc_username");
    return custom || DEFAULT_USERNAME;
  }

  function getSavedHash() {
    const custom = localStorage.getItem("adcc_password_hash");
    return custom || DEFAULT_HASH;
  }

  // ==========================================================
  // 校验账号和密码
  // ==========================================================
  async function verifyCredentials(username, password) {
    const savedUsername = getSavedUsername();
    if (username !== savedUsername) return false;
    const hash = await sha256(password);
    const savedHash = getSavedHash();
    return hash === savedHash;
  }

  // ==========================================================
  // 公开方法
  // ==========================================================
  window.ADCC_Auth = {
    /**
     * 尝试登录
     * @param {string} username - 用户名
     * @param {string} password - 密码
     * @returns {Promise<boolean>}
     */
    async login(username, password) {
      const ok = await verifyCredentials(username, password);
      if (ok) {
        sessionStorage.setItem(STORAGE_KEY, "1");
      }
      return ok;
    },

    /**
     * 登出
     */
    logout() {
      sessionStorage.removeItem(STORAGE_KEY);
      window.location.href = "/login";
    },

    /**
     * 检查是否已登录
     * @returns {boolean}
     */
    isLoggedIn() {
      return sessionStorage.getItem(STORAGE_KEY) === "1";
    },

    /**
     * 要求登录：未登录则跳转到登录页
     * @param {string} [returnUrl] - 登录后返回的页面
     */
    requireLogin(returnUrl) {
      if (!this.isLoggedIn()) {
        const url = returnUrl || window.location.pathname;
        window.location.href =
          "/login?return=" + encodeURIComponent(url);
      }
    },

    /**
     * 设置新账号和密码（仅在已登录状态下可用）
     * @param {string} newUsername
     * @param {string} newPassword
     */
    async setCredentials(newUsername, newPassword) {
      if (!this.isLoggedIn()) {
        console.warn("ADCC Auth: 请先登录再修改账号密码");
        return false;
      }
      if (newUsername) {
        localStorage.setItem("adcc_username", newUsername);
      }
      if (newPassword) {
        const hash = await sha256(newPassword);
        localStorage.setItem("adcc_password_hash", hash);
      }
      console.log("ADCC Auth: 账号密码已更新");
      return true;
    },

    /**
     * 设置新密码（兼容旧 API，仅在已登录状态下可用）
     * @param {string} newPassword
     */
    async setPassword(newPassword) {
      return this.setCredentials(null, newPassword);
    },
  };
})();
