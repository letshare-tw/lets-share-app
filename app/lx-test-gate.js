
/*
 * 樂享家 Let's Share
 * DEV-03-04 v1.3
 *
 * Google OAuth + Supabase 測試白名單
 *
 * v1.3 修正：
 * 1. 已授權會員背景重新驗證，不閃爍。
 * 2. 權限撤銷時立即顯示阻擋畫面。
 * 3. 切換帳號、登出時重新檢查。
 * 4. 保留品牌登入頁及原有 Google OAuth。
 *
 * 注意：
 * 前端白名單不能取代資料庫 RLS。
 */

(() => {
  "use strict";

  const URL =
    "https://wxvauoeykusmbxdtwgxo.supabase.co";

  const KEY =
    "sb_publishable_ZCqKEuqpTiZ46p9fx_JXvA_av4JwD3I";

  const STORE = "lx_supabase_auth_v066g";
  const RPC = "lx_can_access_test_app";

  const CHECK_EVERY = 3000;
  const REVERIFY_AFTER = 60000;

  let gate = null;
  let busy = false;
  let approvedId = null;
  let approvedToken = null;
  let lastVerified = 0;
  let loginToolOpen = false;
  let currentMode = "";
  let generation = 0;

  const $ = id => document.getElementById(id);

  function session() {
    try {
      return JSON.parse(
        sessionStorage.getItem(STORE) || "null"
      );
    } catch {
      return null;
    }
  }

  function user() {
    return window.__lxRealAuth?.user || null;
  }

  function logoSource() {
    const img = document.querySelector(".splash img");
    return img?.getAttribute("src") || "";
  }

  function ensureGate() {
    if (gate) return gate;

    const style = document.createElement("style");

    style.textContent = `
      #lx-access-v13 {
        position: fixed;
        inset: 0;
        z-index: 2147483000;
        background: #078b50;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow-y: auto;
        padding: 24px 18px;
        font-family: system-ui, "Noto Sans TC",
          sans-serif;
      }

      #lx-access-v13 .lx-box {
        width: 100%;
        max-width: 420px;
        text-align: center;
      }

      #lx-access-v13 .lx-logo {
        display: block;
        width: min(52vw, 210px);
        max-height: 260px;
        object-fit: contain;
        margin: 0 auto 16px;
      }

      #lx-access-v13 .lx-brand {
        color: white;
        font-size: 26px;
        font-weight: 800;
        margin-bottom: 8px;
      }

      #lx-access-v13 .lx-slogan {
        color: white;
        font-size: 15px;
        margin-bottom: 28px;
      }

      #lx-access-v13 .lx-panel {
        background: white;
        border-radius: 22px;
        padding: 28px 22px;
        box-shadow: 0 12px 32px #003b202b;
      }

      #lx-access-v13 h2 {
        color: #203129;
        font-size: 22px;
        margin: 0 0 10px;
      }

      #lx-access-v13 p {
        color: #69796f;
        font-size: 14px;
        line-height: 1.8;
      }

      #lx-access-v13 button {
        display: block;
        width: 100%;
        border: 0;
        border-radius: 28px;
        padding: 15px;
        margin-top: 14px;
        font-size: 16px;
        font-weight: 700;
        cursor: pointer;
      }

      #lx-access-v13 .lx-google {
        background: white;
        border: 1px solid #cbdad0;
        color: #254934;
      }

      #lx-access-v13 .lx-email {
        background: #078b50;
        color: white;
      }

      #lx-access-v13 .lx-retry {
        background: #eef5f0;
        color: #078b50;
      }

      #lx-access-v13 .lx-g {
        color: #4285f4;
        font-size: 21px;
        font-weight: 900;
        margin-right: 9px;
      }

      #lx-access-v13 .lx-note {
        font-size: 12px;
        color: #819087;
        margin-top: 18px;
      }
    `;

    document.head.appendChild(style);

    gate = document.createElement("div");
    gate.id = "lx-access-v13";

    gate.innerHTML = `
      <div class="lx-box">
        <img
          class="lx-logo"
          id="lx-gate-logo"
          alt="樂享家 Let's share LOGO"
          style="display:none"
        >

        <div class="lx-brand">樂享家</div>

        <div class="lx-slogan">
          分享，讓美好開始傳遞
        </div>

        <div class="lx-panel">
          <h2 id="lx-gate-heading">
            歡迎來到樂享家
          </h2>

          <p id="lx-gate-description">
            登入會員，開始分享美好生活
          </p>

          <button
            type="button"
            class="lx-google"
            id="lx-gate-google"
          >
            <span class="lx-g">G</span>
            使用 Google 帳號繼續
          </button>

          <button
            type="button"
            class="lx-email"
            id="lx-gate-email"
          >
            使用 Email 登入
          </button>

          <button
            type="button"
            class="lx-retry"
            id="lx-gate-retry"
            style="display:none"
          >
            重新檢查
          </button>

          <div class="lx-note">
            樂享家開發測試版 · 僅限授權帳號
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(gate);

    $("lx-gate-google").addEventListener(
      "click",
      () => {
        if (
          typeof window.lxGoogleLogin === "function"
        ) {
          window.lxGoogleLogin();
        } else {
          show(
            "登入服務準備中",
            "請稍後重新整理頁面再試。",
            "retry"
          );
        }
      }
    );

    $("lx-gate-email").addEventListener(
      "click",
      () => {
        if (
          typeof window.lxOpenRealLogin === "function"
        ) {
          loginToolOpen = true;
          hide();
          window.lxOpenRealLogin();
        }
      }
    );

    $("lx-gate-retry").addEventListener(
      "click",
      () => {
        lastVerified = 0;
        verify(true);
      }
    );

    return gate;
  }

  function show(title, message, mode) {
    ensureGate();

    // 相同畫面不重複改寫，避免閃爍。
    if (
      currentMode === mode &&
      gate.style.display !== "none" &&
      $("lx-gate-heading").textContent === title &&
      $("lx-gate-description").textContent === message
    ) {
      return;
    }

    currentMode = mode;
    gate.style.display = "flex";

    $("lx-gate-heading").textContent = title;
    $("lx-gate-description").textContent = message;

    $("lx-gate-google").style.display =
      mode === "login" ? "block" : "none";

    $("lx-gate-email").style.display =
      mode === "login" ? "block" : "none";

    $("lx-gate-retry").style.display =
      mode === "retry" ? "block" : "none";
  }

  function hide() {
    if (gate) {
      gate.style.display = "none";
    }
    currentMode = "";
  }

  function updateLogo() {
    const src = logoSource();
    const img = $("lx-gate-logo");

    if (src && img) {
      img.src = src;
      img.style.display = "block";
    }
  }

  function legacyLoginVisible() {
    const panel = $("lx-auth-panel");

    return !!panel &&
      getComputedStyle(panel).display !== "none";
  }

  async function checkRPC(token) {
    const controller = new AbortController();

    const timer = setTimeout(
      () => controller.abort(),
      12000
    );

    try {
      const response = await fetch(
        URL + "/rest/v1/rpc/" + RPC,
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
        throw new Error(
          "驗證服務 HTTP " + response.status
        );
      }

      return (await response.json()) === true;
    } finally {
      clearTimeout(timer);
    }
  }

  async function verify(force = false) {
    if (busy) return;

    const u = user();
    const s = session();

    if (!u?.id || !s?.token) {
      generation++;

      approvedId = null;
      approvedToken = null;
      lastVerified = 0;

      if (
        loginToolOpen &&
        legacyLoginVisible()
      ) {
        hide();
        return;
      }

      loginToolOpen = false;

      show(
        "歡迎來到樂享家",
        "請先登入會員帳號，開始分享美好生活。",
        "login"
      );

      return;
    }

    loginToolOpen = false;

    const sameAccount =
      approvedId === u.id;

    const sameToken =
      approvedToken === s.token;

    const stillFresh =
      Date.now() - lastVerified < REVERIFY_AFTER;

    if (
      !force &&
      sameAccount &&
      sameToken &&
      stillFresh
    ) {
      hide();
      return;
    }

    /*
     * 已授權帳號：
     * 背景重新驗證，不顯示審核遮罩。
     *
     * 新帳號或尚未授權：
     * 必須先完成檢查才能使用 APP。
     */
    const backgroundCheck =
      sameAccount && lastVerified > 0;

    busy = true;
    const thisGeneration = ++generation;

    if (!backgroundCheck) {
      show(
        "正在確認測試資格",
        "請稍候，正在安全驗證你的會員帳號。",
        "wait"
      );
    }

    try {
      const permitted =
        await checkRPC(s.token);

      const nowUser = user();
      const nowSession = session();

      if (
        thisGeneration !== generation ||
        nowUser?.id !== u.id ||
        nowSession?.token !== s.token
      ) {
        return;
      }

      if (permitted) {
        approvedId = u.id;
        approvedToken = s.token;
        lastVerified = Date.now();

        // 背景驗證成功不重新顯示畫面。
        hide();
      } else {
        approvedId = null;
        approvedToken = null;
        lastVerified = 0;

        show(
          "尚未取得測試權限",
          "此帳號未列入樂享家測試白名單，請聯繫管理員。",
          "retry"
        );
      }
    } catch (error) {
      console.error(
        "[DEV-03-04] 白名單驗證失敗",
        error
      );

      approvedId = null;
      approvedToken = null;
      lastVerified = 0;

      show(
        "暫時無法確認測試資格",
        "請確認網路連線後重新檢查。",
        "retry"
      );
    } finally {
      busy = false;
    }
  }

  function start() {
    ensureGate();

    show(
      "正在準備樂享家",
      "請稍候，正在確認登入狀態。",
      "wait"
    );

    setTimeout(() => {
      updateLogo();
      verify();
    }, 1200);

    setInterval(() => {
      if (busy) return;

      const u = user();
      const s = session();

      if (
        loginToolOpen &&
        legacyLoginVisible() &&
        !u?.id
      ) {
        return;
      }

      if (!u?.id || !s?.token) {
        verify();
        return;
      }

      const accountChanged =
        u.id !== approvedId;

      const tokenChanged =
        s.token !== approvedToken;

      const expired =
        Date.now() - lastVerified >=
        REVERIFY_AFTER;

      if (
        accountChanged ||
        tokenChanged ||
        expired
      ) {
        verify();
      }
    }, CHECK_EVERY);
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
