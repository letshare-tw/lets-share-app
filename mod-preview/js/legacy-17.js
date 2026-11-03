
(function(){
 const esc=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 window.lxOnboardCard=function(){
  const u=window.__lxRealAuth?.user;
  if(!u)return '';
  const p=window.__lxProfile||{};
  const own=p.id===u.id;
  const nickname=!!(own&&String(p.display_name||'').trim());
  const fullname=!!(own&&String(p.full_name||'').trim());
  const authPhone=String(u.phone||'').replace(/^\+/, '');
  const profilePhone=String(p.phone||'').replace(/\D/g,'');
  const phoneMatch=own&&profilePhone&&authPhone===('886'+profilePhone.slice(1));
  const confirmed=!!(phoneMatch&&u.phone_confirmed_at);
  const isTest=authPhone==='886900000001';
  const verified=confirmed&&!isTest;
  const row=(n,title,done,sub,target)=>`<div style="display:flex;gap:10px;align-items:center;padding:12px 0;border-bottom:1px solid #e6eee8"><div style="width:30px;height:30px;border-radius:50%;background:${done?'#dff4e8':'#eef2ef'};display:grid;place-items:center;flex-shrink:0">${done?'✓':n}</div><div style="flex:1;min-width:0"><b style="font-size:14px">${title}</b><div style="font-size:12px;color:#66776d;margin-top:3px">${sub}</div></div>${target?`<button type="button" onclick="lxOnboardJump('${target}')" style="width:auto;padding:8px 11px;border:1px solid #278a5b;border-radius:18px;background:white;color:#187349;font-size:12px">前往</button>`:''}</div>`;
  return `<section class="card" style="padding:16px;margin:12px 0;border:1px solid #afd7bf;background:#f8fcf9"><b>🧭 一般會員註冊｜V0.6.6q</b><p class="muted" style="font-size:12px;line-height:1.8">一般買家也必須完成手機 OTP。先完成簡易會員註冊；分享衣物、職人與騎手的額外資格，等需要時才申請。以下僅供開發測試，不代表正式註冊完成。</p>
  ${row(1,'建立會員帳號',true,'已使用 Google 登入同一個 Supabase 帳號','')}
  ${row(2,'填寫基本資料',nickname&&fullname,nickname&&fullname?'暱稱及姓名已填寫（不代表實名驗證）':'請填寫暱稱及姓名','profile')}
  ${row(3,'手機 OTP 驗證（所有會員必須）',verified,confirmed&&isTest?'固定測試號碼已確認，但不能作為正式會員驗證':verified?'非固定測試號碼有確認紀錄，仍須正式後端審核':'尚未取得符合正式資格的手機確認紀錄','otp')}
  ${row(4,'會員條款與個資告知分別確認',false,'正式文件尚未發布；目前草案勾選不構成正式同意','consent')}
  <div style="margin-top:14px;padding:12px;border-radius:12px;background:#eef5f0;font-size:12px;line-height:1.9"><b>🔐 正式註冊狀態：尚未開放</b><br>上述必要條件須由可信任後端核定，並記錄兩份正式文件的個別版本及同意時間；前端不會自行標記完成。</div>
  <div style="margin-top:14px;padding:12px;border:1px solid #d7e5db;border-radius:12px;font-size:12px;line-height:1.9"><b>🌱 其他身分，依需求再開通</b><br>📦 分享衣物：首次分享時確認衣物交付、不退回、轉贈回收授權及售出回饋規則。<br>🧵 樂享職人：提出工作資格申請，完成必要審核與合作契約。<br>🛵 樂享騎手：提出配送資格申請，完成駕照、車輛、必要授權及合作審核。<br><span style="color:#697b70">本區為流程說明，不會直接核發任何角色權限。</span></div>
  <p style="font-size:12px;color:#8b6427;margin-top:14px">⚠️ 目前 Supabase 固定測試手機不能通過正式註冊；正式條款、個資告知與後端核定功能尚未啟用。</p></section>`;
 };

 window.lxOnboardJump=function(target){
   const ids={
     profile:'lx-profile-save',
     otp:'lx-otp-send',
     consent:'lx-consent-terms-status'
   };
   const id=ids[target];
   const anchor=id
     ?document.getElementById(id)
     :null;
   if(!anchor){
     alert('此區塊尚未載入，請稍候再試。');
     return;
   }
   const card=
     anchor.closest('section.card')||anchor;
   card.scrollIntoView({
     behavior:'smooth',
     block:'center'
   });
 };
})();
