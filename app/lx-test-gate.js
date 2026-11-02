
/*
 * 樂享家 DEV-03-04 v1.4
 * 穩定登入畫面、背景白名單驗證
 */
(() => {
  "use strict";

  const BASE = "https://wxvauoeykusmbxdtwgxo.supabase.co";
  const KEY = "sb_publishable_ZCqKEuqpTiZ46p9fx_JXvA_av4JwD3I";
  const STORE = "lx_supabase_auth_v066g";

  const INTERVAL = 3000;
  const VERIFY_INTERVAL = 60000;
  const AUTH_GRACE = 6000;

  let gate;
  let approvedUser = null;
  let approvedToken = null;
  let verifiedAt = 0;
  let checking = false;
  let authMissingSince = 0;
  let emailOpen = false;
  let failures = 0;
  let requestId = 0;

  const el = id => document.getElementById(id);

  function auth() {
    let saved = null;
    try {
      saved = JSON.parse(
        sessionStorage.getItem(STORE) || "null"
      );
    } catch (_) {}

    return {
      user: window.__lxRealAuth?.user || null,
      token: saved?.token || null
    };
  }

  function originalLogo() {
    return document.querySelector(".splash img")
      ?.getAttribute("src") || "";
  }

  function createGate() {
    const style = document.createElement("style");
    style.textContent = `
      #lx-gate-v14 {
        position:fixed; inset:0;
        z-index:2147483000;
        background:#078b50;
        display:flex;
        justify-content:center;
        align-items:center;
        padding:20px;
        overflow-y:auto;
        font-family:system-ui,"Noto Sans TC",sans-serif;
      }
      #lx-gate-v14 .wrap {
        width:100%;max-width:410px;
        text-align:center;
      }
      #lx-gate-v14 .brand-logo {
        width:190px;max-width:60vw;
        max-height:240px;object-fit:contain;
        margin:0 auto 15px;
      }
      #lx-gate-v14 .brand {
        color:white;font-size:27px;
        font-weight:800;margin:8px 0;
      }
      #lx-gate-v14 .slogan {
        color:white;margin-bottom:25px;
        font-size:15px;
      }
      #lx-gate-v14 .panel {
        background:white;border-radius:24px;
        padding:28px 23px;
        box-shadow:0 12px 30px #003b202b;
      }
      #lx-gate-v14 h2 {
        color:#203129;font-size:22px;
        margin:0 0 12px;
      }
      #lx-gate-v14 p {
        color:#69796f;font-size:14px;
        line-height:1.8;
      }
      #lx-gate-v14 button {
        width:100%;padding:15px;
        border-radius:28px;
        margin-top:13px;
        font-size:16px;font-weight:700;
        cursor:pointer;
      }
      #lx-v14-google {
        background:white;color:#254934;
        border:1px solid #cbdad0;
      }
      #lx-v14-email {
        background:#078b50;color:white;border:0;
      }
      #lx-v14-retry {
        background:#eef5f0;color:#078b50;border:0;
      }
      #lx-gate-v14 .note {
        font-size:12px;color:#819087;
        margin-top:18px;
      }
    `;
    document.head.appendChild(style);

    gate = document.createElement("div");
    gate.id = "lx-gate-v14";
    gate.innerHTML = `
      <div class="wrap">
        <img id="lx-v14-logo"
             class="brand-logo"
             alt="樂享家正式 LOGO"
             style="display:none">
        <div class="brand">樂享家</div>
        <div class="slogan">分享，讓美好開始傳遞</div>
        <div class="panel">
          <h2 id="lx-v14-title">歡迎來到樂享家</h2>
          <p id="lx-v14-msg">
            登入會員，開始分享美好生活
          </p>
          <button id="lx-v14-google" type="button">
            使用 Google 帳號繼續
          </button>
          <button id="lx-v14-email" type="button">
            使用 Email 登入
          </button>
          <button id="lx-v14-retry" type="button"
                  style="display:none">
            重新檢查
          </button>
          <div class="note">
            樂享家開發測試版 · 僅限授權帳號
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(gate);

    el("lx-v14-google").onclick = () => {
      if (typeof window.lxGoogleLogin === "function") {
        window.lxGoogleLogin();
      } else {
        display("登入服務尚未準備完成",
                "請重新整理頁面。", "retry");
      }
    };

    el("lx-v14-email").onclick = () => {
      if (typeof window.lxOpenRealLogin === "function") {
        emailOpen = true;
        hide();
        window.lxOpenRealLogin();
      }
    };

    el("lx-v14-retry").onclick = () => {
      failures = 0;
      verifiedAt = 0;
      check(true);
    };
  }

  function display(title, message, mode) {
    gate.style.display = "flex";
    el("lx-v14-title").textContent = title;
    el("lx-v14-msg").textContent = message;
    el("lx-v14-google").style.display =
      mode === "login" ? "block" : "none";
    el("lx-v14-email").style.display =
      mode === "login" ? "block" : "none";
    el("lx-v14-retry").style.display =
      mode === "retry" ? "block" : "none";
  }

  function hide() {
    gate.style.display = "none";
  }

  function emailPanelVisible() {
    const panel = el("lx-auth-panel");
    return !!panel &&
      getComputedStyle(panel).display !== "none";
  }

  function clearApproval() {
    approvedUser = null;
    approvedToken = null;
    verifiedAt = 0;
    failures = 0;
    requestId++;
  }

  async function allowed(token) {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(), 12000
    );

    try {
      const response = await fetch(
        BASE + "/rest/v1/rpc/lx_can_access_test_app",
        {
          method: "POST",
          headers: {
            apikey: KEY,
            Authorization: "Bearer " + token,
            "Content-Type": "application/json"
          },
          body: "{}",
          cache: "no-store",
          signal: controller.signal
        }
      );

      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }

      return (await response.json()) === true;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function check(force = false) {
    if (checking) return;

    const state = auth();
    const id = state.user?.id;
    const token = state.token;

    if (!id || !token) {
      // 避免 Auth 初始化或更新時瞬間變成空值。
      if (!authMissingSince) {
        authMissingSince = Date.now();
      }

      if (
        approvedUser &&
        Date.now() - authMissingSince < AUTH_GRACE
      ) {
        return;
      }

      clearApproval();

      if (emailOpen && emailPanelVisible()) {
        hide();
        return;
      }

      emailOpen = false;

      display(
        "歡迎來到樂享家",
        "請登入會員帳號，開始分享美好生活。",
        "login"
      );
      return;
    }

    authMissingSince = 0;
    emailOpen = false;

    const sameUser = approvedUser === id;
    const fresh =
      Date.now() - verifiedAt < VERIFY_INTERVAL;

    if (!force && sameUser && fresh) {
      // Token 更新不需要重新顯示審核畫面。
      approvedToken = token;
      hide();
      return;
    }

    const background = sameUser && verifiedAt > 0;

    checking = true;
    const thisRequest = ++requestId;

    if (!background) {
      display(
        "正在確認測試資格",
        "正在安全驗證會員帳號，請稍候。",
        "wait"
      );
    }

    try {
      const permitted = await allowed(token);
      const latest = auth();

      // 驗證期間換帳號或 Token 更新，
      // 舊請求結果不套用。
      if (
        thisRequest !== requestId ||
        latest.user?.id !== id ||
        latest.token !== token
      ) {
        return;
      }

      if (permitted) {
        approvedUser = id;
        approvedToken = token;
        verifiedAt = Date.now();
        failures = 0;
        hide();
      } else {
        clearApproval();
        display(
          "尚未取得測試權限",
          "此帳號不在樂享家測試白名單內。",
          "retry"
        );
      }
    } catch (error) {
      console.error("[樂享家白名單]", error);
      failures++;

      // 已通過的會員遇到一次短暫網路錯誤，
      // 不立即跳頁；下次再驗證。
      if (background && failures < 2) {
        verifiedAt = Date.now() - VERIFY_INTERVAL + 10000;
        return;
      }

      clearApproval();
      display(
        "暫時無法確認測試資格",
        "請檢查網路連線，再重新驗證。",
        "retry"
      );
    } finally {
      checking = false;
    }
  }

  function start() {
    createGate();

    display(
      "正在準備樂享家",
      "正在確認登入狀態，請稍候。",
      "wait"
    );

    setTimeout(() => {
      const logo = originalLogo();
      if (logo) {
        el("lx-v14-logo").src = logo;
        el("lx-v14-logo").style.display = "block";
      }
      check();
    }, 1200);

    setInterval(() => {
      if (checking) return;

      const state = auth();
      const id = state.user?.id;

      if (
        emailOpen &&
        emailPanelVisible() &&
        !id
      ) return;

      if (
        !id ||
        !state.token ||
        id !== approvedUser ||
        Date.now() - verifiedAt >= VERIFY_INTERVAL
      ) {
        check();
      }
    }, INTERVAL);
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      start,
      { once: true }
    );
  } else {
    start();
  }
})();
