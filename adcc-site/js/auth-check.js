/* ============================================================
   ADCC 前端简易认证 — 密码锁
   - 存储: sessionStorage（关闭浏览器后需重新登录）
   - 密码: SHA-256 哈希校验
   - 用法: 在需要保护的页面引入此脚本
   ============================================================ */

(function () {
  "use strict";

  // 修改密码：在浏览器控制台运行 ADCC_setPassword('你的新密码')
  // 默认密码的 SHA-256 哈希值
  const DEFAULT_HASH =
    "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8";
  // 默认密码: "password"
  // 修改密码后，将上面 DEFAULT_HASH 替换为新密码的 SHA-256 值

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
  // 获取存储的密码哈希
  // ==========================================================
  function getSavedHash() {
    // 先检查 localStorage 是否有自定义密码哈希
    const custom = localStorage.getItem("adcc_password_hash");
    return custom || DEFAULT_HASH;
  }

  // ==========================================================
  // 校验密码
  // ==========================================================
  async function verifyPassword(input) {
    const hash = await sha256(input);
    const savedHash = getSavedHash();
    return hash === savedHash;
  }

  // ==========================================================
  // 公开方法
  // ==========================================================
  window.ADCC_Auth = {
    /**
     * 尝试登录
     * @param {string} password - 用户输入的密码
     * @returns {Promise<boolean>}
     */
    async login(password) {
      const ok = await verifyPassword(password);
      if (ok) {
        // 存储登录凭证（有效期: 当前会话）
        sessionStorage.setItem(STORAGE_KEY, "1");
      }
      return ok;
    },

    /**
     * 登出
     */
    logout() {
      sessionStorage.removeItem(STORAGE_KEY);
      window.location.href = "/login.html";
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
          "/login.html?return=" + encodeURIComponent(url);
      }
    },

    /**
     * 设置新密码（仅在已登录状态下可用）
     * @param {string} newPassword
     */
    async setPassword(newPassword) {
      if (!this.isLoggedIn()) {
        console.warn("ADCC Auth: 请先登录再修改密码");
        return false;
      }
      const hash = await sha256(newPassword);
      localStorage.setItem("adcc_password_hash", hash);
      console.log("ADCC Auth: 密码已更新");
      return true;
    },
  };
})();
