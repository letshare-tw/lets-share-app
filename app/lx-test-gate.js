
/*
 * DEV-03-04
 * 樂享家測試白名單入口驗證
 *
 * 使用現有 Supabase Auth sessionStorage 登入資料。
 * 不修改 Google OAuth 登入流程。
 * 不包含 service_role 或任何管理金鑰。
 */
(() => {
  "use strict";

  const PROJECT_URL =
    "https://wxvauoeykusmbxdtwgxo.supabase.co";

  const PUBLIC_KEY =
    "sb_publishable_ZCqKEuqpTiZ46p9fx_JXvA_av4JwD3I";

  const AUTH_STORE = "lx_supabase_auth_v066g";

  const CHECK_INTERVAL = 1500;
  const MAX_WAIT = 12000;

  let lastUserId = null;
  let lastToken = null;
  let checking = false;
  let allowed = false;
  let overlay = null;

  function getSession() {
    try {
      return JSON.parse(
        sessionStorage.getItem(AUTH_STORE) || "null"
      );
    } catch {
      return null;
    }
  }

  function getUser() {
    return window.__lxRealAuth?.user || null;
  }

  function createOverlay() {
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "lx-test-access-gate";

    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      zIndex: "2147483647",
      background: "#f7f8f5",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      fontFamily: "system-ui, sans-serif"
    });

    overlay.innerHTML = `
      <div style="
        max-width:420px;
        width:100%;
        background:white;
        padding:30px 24px;
        border-radius:20px;
        text-align:center;
        box-shadow:0 8px 32px #00000012;
      ">
        <div style="
          font-size:26px;
          font-weight:900;
          color:#078b50;
          margin-bottom:14px;
        ">
          樂享家 Let's Share
        </div>

        <h2 id="lx-gate-title"
            style="font-size:21px;color:#202824">
          正在確認測試資格
        </h2>

        <p id="lx-gate-message"
           style="
             color:#68776d;
             line-height:1.8;
             font-size:14px;
           ">
          請稍候，正在連接 Supabase。
        </p>

        <button id="lx-gate-login"
          type="button"
          style="
            display:none;
            width:100%;
            border:0;
            border-radius:25px;
            background:#078b50;
            color:white;
            padding:14px;
            font-weight:700;
            cursor:pointer;
          ">
          前往會員登入
        </button>

        <button id="lx-gate-retry"
          type="button"
          style="
            display:none;
            margin-top:12px;
            background:transparent;
            color:#078b50;
            padding:10px;
            border:0;
            cursor:pointer;
          ">
          重新檢查
        </button>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector("#lx-gate-login")
      .addEventListener("click", () => {
        if (typeof window.lxOpenRealLogin === "function") {
          hideOverlay();
          window.lxOpenRealLogin();
        }
      });

    overlay.querySelector("#lx-gate-retry")
      .addEventListener("click", () => {
        checkAccess(true);
      });

    return overlay;
  }

  function showOverlay(title, message, login, retry) {
    const el = createOverlay();

    el.style.display = "flex";

    el.querySelector("#lx-gate-title").textContent =
      title;

    el.querySelector("#lx-gate-message").textContent =
      message;

    el.querySelector("#lx-gate-login").style.display =
      login ? "block" : "none";

    el.querySelector("#lx-gate-retry").style.display =
      retry ? "inline-block" : "none";
  }

  function hideOverlay() {
    if (overlay) overlay.style.display = "none";
  }

  async function verifyWithSupabase(token) {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      12000
    );

    try {
      const response = await fetch(
        PROJECT_URL +
          "/rest/v1/rpc/lx_can_access_test_app",
        {
          method: "POST",
          headers: {
            apikey: PUBLIC_KEY,
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
          "Supabase 驗證失敗 HTTP " + response.status
        );
      }

      const result = await response.json();

      return result === true;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function checkAccess(force = false) {
    if (checking) return;

    const user = getUser();
    const session = getSession();

    if (!user?.id || !session?.token) {
      allowed = false;
      lastUserId = null;
      lastToken = null;

      showOverlay(
        "測試環境需要登入",
        "樂享家目前僅開放授權測試人員使用。請先登入會員帳號。",
        true,
        false
      );

      return;
    }

    if (
      !force &&
      allowed &&
      lastUserId === user.id &&
      lastToken === session.token
    ) {
      hideOverlay();
      return;
    }

    checking = true;
    allowed = false;

    showOverlay(
      "正在驗證測試資格",
      "正在向 Supabase 確認你的帳號是否已獲得測試授權。",
      false,
      false
    );

    try {
      const approved = await verifyWithSupabase(
        session.token
      );

      // 避免驗證期間切換帳號造成錯誤放行。
      const currentUser = getUser();
      const currentSession = getSession();

      if (
        currentUser?.id !== user.id ||
        currentSession?.token !== session.token
      ) {
        return;
      }

      if (approved) {
        allowed = true;
        lastUserId = user.id;
        lastToken = session.token;
        hideOverlay();
      } else {
        showOverlay(
          "此帳號尚未取得測試權限",
          "你的帳號未列入樂享家測試白名單，請聯繫管理員授權。",
          false,
          true
        );
      }
    } catch (error) {
      console.error(
        "[DEV-03-04] Test access check failed:",
        error
      );

      showOverlay(
        "暫時無法確認測試資格",
        "請確認網路連線後重新檢查。為保護測試環境，目前不會直接放行。",
        false,
        true
      );
    } finally {
      checking = false;
    }
  }

  // 預設遮罩，避免在檢查前顯示 APP 畫面。
  function start() {
    showOverlay(
      "正在確認測試資格",
      "正在初始化樂享家測試環境。",
      false,
      false
    );

    let startedAt = Date.now();

    const timer = setInterval(() => {
      const user = getUser();
      const session = getSession();

      if (
        user?.id ||
        Date.now() - startedAt > MAX_WAIT
      ) {
        clearInterval(timer);
        checkAccess();
      }
    }, 250);

    // 監控登入帳號或 session 變化。
    setInterval(() => {
      if (checking) return;

      const user = getUser();
      const session = getSession();

      if (
        user?.id !== lastUserId ||
        session?.token !== lastToken
      ) {
        checkAccess();
      }
    }, CHECK_INTERVAL);
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
