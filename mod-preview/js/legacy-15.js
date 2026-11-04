
(()=>{
'use strict';
const $=id=>document.getElementById(id),panel=$('lx-auth-panel'),out=$('lx-auth-result');
let token=null,refreshToken=null,expiresAt=0,sessionUrl=null,sessionKey=null,busy=false;
const AUTH_STORE="lx_supabase_auth_v066g";
function saveSession(){if(token&&refreshToken)sessionStorage.setItem(AUTH_STORE,JSON.stringify({token,refreshToken,expiresAt}));}
function clearSession(){token=null;refreshToken=null;expiresAt=0;sessionStorage.removeItem(AUTH_STORE);
if(typeof lxClearPage==='function')lxClearPage();
window.__lxRealAuth.user=null;window.__lxProfile={id:null,display_name:null,full_name:null,phone:null,status:'idle',error:''};refreshMember();}
function applyTokens(data){token=data.access_token;refreshToken=data.refresh_token||refreshToken;expiresAt=Date.now()+((Number(data.expires_in)||3600)*1000);saveSession();}
async function restoreSession(){
 let saved;try{saved=JSON.parse(sessionStorage.getItem(AUTH_STORE)||"null");}catch{sessionStorage.removeItem(AUTH_STORE);return;}
 if(!saved?.token)return;
 try{
  const {url,key}=config();sessionUrl=url;sessionKey=key;token=saved.token;refreshToken=saved.refreshToken;expiresAt=saved.expiresAt||0;
  if(refreshToken&&Date.now()>expiresAt-60000){const data=await request(url,key,"token?grant_type=refresh_token",{refresh_token:refreshToken});applyTokens(data);}
  const user=await request(url,key,"user",undefined,token);if(!user.id)throw Error("無法確認身分");
  window.__lxRealAuth.user={id:user.id,email:user.email||"",user_metadata:user.user_metadata||{},phone:user.phone||null,phone_confirmed_at:user.phone_confirmed_at||null};refreshMember();say("✅ 已恢復登入："+(user.email||"會員"));
  // AUTH-UI-003: redirect only after verified session.
  if(typeof go === "function"){
  go(typeof lxRestorePage==="function"
    ? lxRestorePage(user.id) : "me");
}
 }catch(e){clearSession();say("登入狀態已失效，請重新登入。");}
}

window.__lxProfile={id:null,display_name:null,full_name:null,phone:null,status:'idle',error:''};
window.lxProfileName=()=>{const u=window.__lxRealAuth.user,p=window.__lxProfile;if(!u)return '<b>訪客</b><div class="muted">請登入以查看會員資料</div>';const name=p.id===u.id&&(p.display_name||p.full_name)?(p.display_name||p.full_name):'會員';const detail=p.status==='loading'?'正在讀取會員資料…':p.status==='ok'?'基本資料已載入':p.status==='missing'?'請填寫會員基本資料':p.status==='error'?'會員資料暫時無法讀取':'已登入會員';return '<b>'+escapeHTML(name)+'</b><div class="muted">'+escapeHTML(u.email||'')+'</div><div class="muted" style="font-size:12px">'+escapeHTML(detail)+'</div>';};
let profileLoadingId=null;
async function loadRealProfile(){const u=window.__lxRealAuth.user;if(!u){window.__lxProfile={id:null,display_name:null,full_name:null,phone:null,status:'idle',error:''};profileLoadingId=null;return;}if(profileLoadingId===u.id||window.__lxProfile.id===u.id&&['ok','missing'].includes(window.__lxProfile.status))return;profileLoadingId=u.id;window.__lxProfile={id:u.id,display_name:null,full_name:null,phone:null,status:'loading',error:''};refreshMemberView();try{const {url,key}=config();if(!token)throw Error('缺少登入憑證');const q=new URLSearchParams({id:'eq.'+u.id,select:'id,display_name,full_name,phone',limit:'1'});const r=await fetch(url+'/rest/v1/profiles?'+q,{headers:{apikey:key,Authorization:'Bearer '+token,Accept:'application/json'},cache:'no-store'});const rows=await r.json().catch(()=>null);if(!r.ok)throw Error('HTTP '+r.status+(rows?.message?'：'+rows.message:''));if(window.__lxRealAuth.user?.id!==u.id)return;window.__lxProfile={id:u.id,display_name:rows?.[0]?.display_name||null,full_name:rows?.[0]?.full_name||null,phone:rows?.[0]?.phone||null,status:rows?.length?'ok':'missing',error:''};}catch(e){if(window.__lxRealAuth.user?.id===u.id)window.__lxProfile={id:u.id,display_name:null,full_name:null,phone:null,status:'error',error:String(e.message||e)};}finally{profileLoadingId=null;refreshMemberView();}}
window.lxProfileEditor=()=>{const u=window.__lxRealAuth.user,p=window.__lxProfile;if(!u)return '';return `<section class="card" style="padding:16px;margin-bottom:12px;border:1px solid #c8dfd1"><b>📝 會員基本資料</b><p class="muted" style="font-size:12px">Google 顯示名稱作為暱稱；姓名請自行填寫確認。手機尚未完成簡訊驗證，儲存資料不代表完成正式註冊。</p><label for="lx-profile-nickname">會員暱稱（首次帶入 Google 顯示名稱）</label><input id="lx-profile-nickname" maxlength="80" value="${escapeHTML(p.display_name||((u.user_metadata?.full_name||u.user_metadata?.name||'').trim()))}" placeholder="請輸入暱稱" style="display:block;box-sizing:border-box;width:100%;padding:12px;margin:5px 0 12px;border:1px solid #b7c6bc;border-radius:9px;font-size:16px"><label for="lx-profile-fullname">姓名（請自行確認）</label><input id="lx-profile-fullname" autocomplete="name" maxlength="80" value="${escapeHTML(p.full_name||'')}" placeholder="請輸入姓名" style="display:block;box-sizing:border-box;width:100%;padding:12px;margin:5px 0 12px;border:1px solid #b7c6bc;border-radius:9px;font-size:16px"><label for="lx-profile-phone">手機號碼</label><input id="lx-profile-phone" type="tel" inputmode="numeric" autocomplete="tel-national" maxlength="10" value="${escapeHTML(p.phone||'')}" placeholder="09xxxxxxxx" style="display:block;box-sizing:border-box;width:100%;padding:12px;margin:5px 0 10px;border:1px solid #b7c6bc;border-radius:9px;font-size:16px"><div style="font-size:12px;color:#9a6b20;margin-bottom:10px">📱 手機驗證狀態請以 Supabase Auth 為準；下方可進行測試驗證</div><button type="button" id="lx-profile-save" onclick="lxSaveRealProfile()">儲存會員資料</button><p id="lx-profile-feedback" role="status" aria-live="polite" style="font-size:13px;overflow-wrap:anywhere"></p></section>`};
// V0.6.6i: bind phone to existing Google Auth user; no signInWithOtp / new account.
let otpBusy=false,otpPendingPhone=null;
const otpTaiwan=s=>/^09\d{8}$/.test(s)?'+886'+s.slice(1):null;
const otpStatus=u=>{const phone=String(u?.phone||'');const verified=!!(phone&&u?.phone_confirmed_at);if(!verified)return '尚未完成手機驗證';const digits=phone.replace(/\D/g,'');if(digits==='886900000001')return '⚠️ 測試號碼已確認，不能作為真實手機驗證';return '✅ 手機已驗證（Supabase Auth 已確認）';};
// Auth /user may omit phone_confirmed_at; read the current user's auth.users record via a narrowly scoped SECURITY DEFINER RPC.
async function otpTrustedStatus(url,key,expectedId,expectedPhone){
 const r=await fetch(url+'/rest/v1/rpc/lx_my_phone_confirmation',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:'{}',cache:'no-store'});
 const d=await r.json().catch(()=>null);
 if(!r.ok)throw Error('無法讀取可信任手機確認狀態（請先執行 V0.6.6i-1 SQL 設定；HTTP '+r.status+'）');
 const row=Array.isArray(d)?d[0]:d;
 if(!row||row.id!==expectedId||!row.phone||row.phone.replace(/^\+/,'')!==expectedPhone.replace(/^\+/,'')||!row.phone_confirmed_at)return null;
 return {phone:row.phone,phone_confirmed_at:row.phone_confirmed_at};
}
window.lxOtpRefresh=async()=>{try{const {url,key,u}=await otpAccess();const raw=$('lx-profile-phone')?.value.trim()||'';const expected=otpTaiwan(raw);if(!expected)throw Error('請先填寫正確手機號碼');const verified=await otpTrustedStatus(url,key,u.id,expected);if(!verified){otpFeedback('尚未查到這個會員及手機的確認紀錄');return;}window.__lxRealAuth.user={...window.__lxRealAuth.user,...verified};const status=$('lx-otp-status');if(status)status.textContent=otpStatus(window.__lxRealAuth.user);otpFeedback('✅ 已從 Supabase 後端核對手機確認紀錄');}catch(e){otpFeedback('❌ '+(e.message||e));}};
window.lxOtpCard=()=>{const u=window.__lxRealAuth.user;if(!u)return '';return `<section class="card" style="padding:16px;margin:12px 0;border:1px solid #b7d8c4"><b>📱 手機 OTP 驗證｜測試版 V0.6.6i-1</b><p id="lx-otp-status" style="font-size:13px">${otpStatus(u)}</p><p class="muted" style="font-size:12px">已完成手機驗證的會員無須重複發送驗證碼。尚未驗證者，請先確認會員基本資料中的手機號碼。測試號碼不代表真實門號持有證明；手機驗證與正式會員資格審核分別處理。</p><button type="button" class="secondary" id="lx-otp-send" onclick="lxOtpSend()">發送／啟動驗證</button> <button type="button" class="secondary" onclick="lxOtpRefresh()">重新檢查驗證狀態</button><div id="lx-otp-verify" style="display:${otpPendingPhone?'block':'none'};margin-top:12px"><label for="lx-otp-code">六位數驗證碼</label><input id="lx-otp-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="輸入 6 位數" style="display:block;width:100%;box-sizing:border-box;padding:12px;margin:7px 0;border:1px solid #b7c6bc;border-radius:9px;font-size:18px"><button type="button" class="primary" id="lx-otp-confirm" onclick="lxOtpConfirm()">確認手機驗證</button></div><p id="lx-otp-feedback" role="status" aria-live="polite" style="font-size:13px"></p></section>`;};
function otpFeedback(s){const el=$('lx-otp-feedback');if(el)el.textContent=s;}
async function otpAccess(){if(!token)throw Error('請先登入 Google 會員');const {url,key}=config();if(refreshToken&&Date.now()>expiresAt-60000){const data=await request(url,key,'token?grant_type=refresh_token',{refresh_token:refreshToken});applyTokens(data);}const u=await request(url,key,'user',undefined,token);if(!u?.id||u.id!==window.__lxRealAuth.user?.id)throw Error('登入會員身分不一致，請重新登入');return {url,key,u};}
async function otpCall(url,key,path,body,method='POST') {const r=await fetch(url+'/auth/v1/'+path,{method,headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store'});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error('HTTP '+r.status+'：'+(d.msg||d.error_description||d.message||d.error||'手機驗證遭拒絕'));return d;}
window.lxOtpSend=async()=>{if(otpBusy)return;const raw=$('lx-profile-phone')?.value.trim()||'';const phone=otpTaiwan(raw);if(!phone){otpFeedback('❌ 請先填寫 09 開頭的 10 碼台灣手機號碼');return;}if(window.__lxProfile.phone!==raw){otpFeedback('❌ 請先按上方「儲存會員資料」，再啟動手機驗證');return;}otpBusy=true;const btn=$('lx-otp-send');if(btn)btn.disabled=true;otpFeedback('正在向 Supabase 申請綁定手機…');try{const {url,key,u}=await otpAccess();const prior=await otpTrustedStatus(url,key,u.id,phone);if(prior){window.__lxRealAuth.user={...window.__lxRealAuth.user,...prior};const status=$('lx-otp-status');if(status)status.textContent=otpStatus(window.__lxRealAuth.user);otpFeedback('✅ 此測試手機已經由 Supabase 確認，不需重發 OTP');return;}await otpCall(url,key,'user',{phone},'PUT');otpPendingPhone=phone;const v=$('lx-otp-verify');if(v)v.style.display='block';otpFeedback('✅ 已啟動驗證。測試號碼不會收到簡訊，請輸入 Supabase 後台設定的固定六位數測試碼。');}catch(e){otpFeedback('❌ '+(e.message||e));}finally{otpBusy=false;if(btn)btn.disabled=false;}};
window.lxOtpConfirm=async()=>{if(otpBusy)return;const code=$('lx-otp-code')?.value.trim()||'';if(!otpPendingPhone){otpFeedback('❌ 請先啟動手機驗證');return;}if(!/^\d{6}$/.test(code)){otpFeedback('❌ 請輸入六位數字驗證碼');return;}otpBusy=true;const btn=$('lx-otp-confirm');if(btn)btn.disabled=true;otpFeedback('正在向 Supabase 驗證…');try{const {url,key,u}=await otpAccess();const d=await otpCall(url,key,'verify',{phone:otpPendingPhone,token:code,type:'phone_change'});if(d.access_token){applyTokens(d);}const current=await request(url,key,'user',undefined,token);if(current.id!==u.id)throw Error('驗證後會員身分不一致');const verified=await otpTrustedStatus(url,key,u.id,otpPendingPhone);if(!verified)throw Error('尚未取得同一會員的手機確認紀錄，不能標記為成功');window.__lxRealAuth.user={...window.__lxRealAuth.user,...verified};otpPendingPhone=null;otpFeedback('✅ Supabase 已確認此測試號碼綁定到原 Google 會員；注意這不是實際持有手機的證明。');const status=$('lx-otp-status');if(status)status.textContent=otpStatus(window.__lxRealAuth.user);const v=$('lx-otp-verify');if(v)v.style.display='none';}catch(e){otpFeedback('❌ '+(e.message||e));}finally{otpBusy=false;if(btn)btn.disabled=false;}};

// V0.6.6k: two separate consent documents, draft preview and test acknowledgements.
// Never treat draft acknowledgements as binding production consent or completed registration.
const lxConsentDocs={
 terms:{title:'會員服務條款',version:'DRAFT-2026-10-29-B',body:["【法律審閱前草案】本文件僅供開發及營運規劃，不構成正式服務條款；正式上線前須確認營運主體、客服管道及適用法令。", "一、服務內容：樂享家規劃提供二手衣物分享、商品展示、購買、訂單查詢與會員服務。各功能依實際開放範圍提供，測試階段資料不代表正式交易。", "二、會員帳號：會員應提供正確資料並妥善保護帳號，不得冒用身分、轉讓帳號、以不法方式操作或干擾平台。Google 登入僅證明該登入方式，並不等於完成實名驗證。", "三、交易資訊：正式營運前須公布商品狀態分級、價格與折扣、付款、配送、取消、退貨退款、瑕疵處理及客服申訴方式，並依消費者保護相關規範執行。", "四、權利義務：商品圖文、會員上傳資料、平台使用限制、帳號停權與終止、系統維護及爭議處理，應於正式條款中明確約定；不得以概括免責排除依法應負責任。", "五、分享衣物另行授權：衣物交付後所有權移轉、不退還、不合格衣物依法轉贈或回收、售出後提供者 10% 現金回饋，均於實際提出分享申請時，以獨立文件充分告知並取得明確同意，不因註冊會員而自動同意。", "六、版本變更：正式條款將提供生效日及版本編號；重大變更依法律要求通知，必要時重新取得會員同意。"]},
 privacy:{title:'個人資料蒐集告知',version:'DRAFT-2026-10-29-B',body:["【法律審閱前草案】本文件僅供開發測試，不構成正式個資告知。正式發布前須補齊蒐集者法定名稱、聯絡地址、客服信箱及權利行使管道。", "一、蒐集主體：〔待填：樂享家實際營運法人或商業登記名稱、聯絡資訊〕。不得以品牌名稱取代必要的法定主體資訊。", "二、蒐集目的：會員身分識別與帳號管理、登入與手機驗證、客服聯繫、平台交易與物流服務、帳務處理、資訊安全與依法履行義務；正式版須對應適當的特定目的。", "三、資料類別：Google 帳號識別資訊、電子郵件、暱稱、會員姓名、手機號碼與驗證紀錄；使用購物、分享、配送或提領服務時，依實際需要另行蒐集訂單、地址、交接及必要的身分與金融資料。", "四、利用期間、地區、對象及方式：〔待確認：保存期限及刪除規則、雲端服務地區、物流／金流／簡訊等委外服務商、必要的跨境傳輸與安全措施〕；僅在達成目的所必要範圍內處理。", "五、當事人權利：依適用法令可查詢、請求閱覽或複製、補充更正、停止蒐集處理利用及請求刪除；受法定保存義務或其他合法事由限制者，依法律辦理。申請方式及回覆流程正式發布前須補充。", "六、不提供資料之影響：若未提供必要帳號或驗證資料，可能無法使用部分服務；非必要資料應說明可否選擇不提供。", "七、文件版本與同意紀錄：服務條款及個資告知分開顯示、分開確認。正式發布後，後端依會員 UID 分別保存文件版本與伺服器時間，不以瀏覽器勾選狀態取代紀錄。", "八、分享衣物所有權移轉、轉贈回收及 10% 回饋另行取得授權，不包含在一般會員註冊的個資告知確認中。"]}
};
let lxConsentTestState={terms:false,privacy:false};
window.lxConsentCard=()=>{if(!window.__lxRealAuth?.user)return '';
 const section=(kind)=>{const d=lxConsentDocs[kind];return `<div style="border:1px solid #dce7de;border-radius:12px;padding:12px;margin:12px 0"><b>${escapeHTML(d.title)}</b><div class="muted" style="font-size:12px">文件版本：${escapeHTML(d.version)}｜草案，僅供測試</div><details style="margin:10px 0"><summary style="cursor:pointer;color:#157a4b;font-weight:700">展開閱讀文件草案</summary>${d.body.map(t=>`<p style="font-size:13px;line-height:1.75">${escapeHTML(t)}</p>`).join('')}</details><label style="display:flex;gap:10px;align-items:flex-start;line-height:1.6;font-size:13px"><input type="checkbox" id="lx-consent-${kind}" ${lxConsentTestState[kind]?'checked':''} onchange="lxConsentDraftCheck('${kind}',this.checked)" style="margin-top:5px;flex-shrink:0"><span>我已閱讀此份<b>草案</b>，僅確認測試介面；不代表正式法律同意</span></label><div id="lx-consent-${kind}-status" style="font-size:12px;color:#60746a;margin-top:7px">${lxConsentTestState[kind]?'☑ 本次畫面已勾選（未送出後端）':'尚未勾選'}</div></div>`;};
 return `<section class="card" style="padding:16px;margin:12px 0;border:1px solid #b7d8c4"><b>📑 會員文件閱讀與確認｜V0.6.6o</b><p class="muted" style="font-size:12px;line-height:1.8">依正式決策 A：服務條款、個資告知分開閱讀及確認。以下文件尚未定稿，因此本版僅驗收畫面與獨立勾選；不寫入同意紀錄、不更新註冊完成時間。</p>${section('terms')}${section('privacy')}<div style="border:1px solid #c8dcd0;border-radius:12px;background:#f6faf7;padding:13px;margin:12px 0"><b>🔐 文件版本與同意紀錄｜V0.6.6o</b><p style="font-size:12px;color:#60746a;line-height:1.8">以下為後端資料結構規劃預覽，非 Supabase 即時查詢。草案不得建立正式同意紀錄。</p><div style="display:grid;gap:8px"><div style="background:white;border-radius:9px;padding:10px"><b>會員服務條款</b><div style="font-size:12px">目前版本：${escapeHTML(lxConsentDocs.terms.version)}</div><div style="font-size:12px;color:#996a20">正式發布：尚未｜後端同意紀錄：尚未啟用</div></div><div style="background:white;border-radius:9px;padding:10px"><b>個人資料蒐集告知</b><div style="font-size:12px">目前版本：${escapeHTML(lxConsentDocs.privacy.version)}</div><div style="font-size:12px;color:#996a20">正式發布：尚未｜後端同意紀錄：尚未啟用</div></div></div><p style="font-size:12px;color:#60746a;line-height:1.8;margin-bottom:0">預定記錄：會員 UID、文件類型、正式版本 ID、文件內容雜湊值、伺服器同意時間。每份文件獨立記錄，保留歷史；會員不可直接修改。正式條款核准後再串接可信任後端。</p></div><p style="font-size:12px;color:#95691d">⚠️ 兩項皆勾選，也不等於正式會員註冊完成。正式版本發布後，須由可信任後端分別記錄文件版本、會員 UID 與同意時間。</p><button type="button" class="secondary" onclick="lxConsentDraftSummary()">檢查兩項閱讀狀態</button><p id="lx-consent-feedback" role="status" aria-live="polite" style="font-size:13px"></p></section>`;
};
window.lxConsentDraftCheck=(kind,checked)=>{if(!(kind in lxConsentTestState))return;lxConsentTestState[kind]=!!checked;const el=$('lx-consent-'+kind+'-status');if(el)el.textContent=checked?'☑ 本次畫面已勾選（未送出後端）':'尚未勾選';};
window.lxConsentDraftSummary=()=>{const el=$('lx-consent-feedback');if(el)el.textContent=lxConsentTestState.terms&&lxConsentTestState.privacy?'✅ 兩份草案已分別勾選。這是前端介面測試，尚未形成後端法律同意紀錄。':'請分別閱讀並勾選兩份草案，才能完成本階段介面測試。';};

// V0.6.6j: registration preflight. This UI never sets registration_completed_at.
// Test OTPs are excluded from production eligibility even when Auth confirmed_at is populated.
const lxTestPhones=new Set(['886900000001']);
window.lxRegistrationCard=()=>{
 const u=window.__lxRealAuth?.user,p=window.__lxProfile;
 if(!u)return '';
 const nick=!!(p?.id===u.id&&p.display_name?.trim());
 const name=!!(p?.id===u.id&&p.full_name?.trim());
 const raw=p?.id===u.id?p.phone||'':'';
 const e164=otpTaiwan(raw);
 const match=!!(e164&&u.phone&&u.phone.replace(/^\+/,'')===e164.replace(/^\+/,''));
 const authConfirmed=!!(match&&u.phone_confirmed_at);
 const test=!!(e164&&lxTestPhones.has(e164.replace(/^\+/,'')));
 const ready=nick&&name&&authConfirmed&&!test;
 const line=(ok,t)=>`<div style="margin:8px 0">${ok?'✅':'⬜'} ${t}</div>`;
 return `<section class="card" style="padding:16px;margin:12px 0;border:1px solid #b7d8c4"><b>🧾 會員註冊進度｜V0.6.6j</b><p class="muted" style="font-size:12px">以下是正式註冊前的條件檢查，不會自行變更會員權限或註冊完成時間。</p>
 ${line(true,'Google 會員已登入')}${line(nick,'會員暱稱已儲存')}${line(name,'姓名已填寫（尚非身分證實名驗證）')}${line(authConfirmed,'Supabase Auth 手機確認紀錄')}${line(authConfirmed&&!test,'正式手機驗證資格（不接受固定測試號碼）')}
 <p style="font-size:13px;color:${ready?'#14683d':'#91631e'}">${test?'🧪 目前為固定測試手機：後端確認成功，但不能作為正式註冊依據。':ready?'基本資料與手機確認條件已備齊；仍須完成條款同意與後端註冊審核。':'尚有條件待完成；正式註冊狀態保持未完成。'}</p>
 <div style="padding:10px 12px;border-radius:10px;background:#f3f7f4;font-size:12px;color:#456456">下一階段：提供正式服務條款、個資告知與分享衣物授權內容，記錄版本及同意時間，再由可信任後端核定註冊完成。此測試頁不會蒐集或假裝已取得法律同意。</div>
 <button type="button" class="secondary" onclick="lxRegistrationRefresh()" style="margin-top:12px">重新檢查註冊條件</button><p id="lx-reg-feedback" role="status" aria-live="polite" style="font-size:13px"></p></section>`;
};
window.lxRegistrationRefresh=async()=>{
 const feedback=$('lx-reg-feedback');
 try{
  const {url,key,u}=await otpAccess();
  const p=window.__lxProfile;
  if(p?.id!==u.id)throw Error('會員基本資料尚未載入，請稍後再試');
  const phone=otpTaiwan(p.phone||'');
  if(phone){const verified=await otpTrustedStatus(url,key,u.id,phone);window.__lxRealAuth.user={...window.__lxRealAuth.user,phone:verified?.phone||null,phone_confirmed_at:verified?.phone_confirmed_at||null};}
  else window.__lxRealAuth.user={...window.__lxRealAuth.user,phone:null,phone_confirmed_at:null};
  refreshMemberView();const el=$('lx-reg-feedback');if(el)el.textContent='✅ 已重新核對 Supabase Auth。測試號碼不會取得正式註冊資格。';
 }catch(e){if(feedback)feedback.textContent='❌ '+(e.message||e);}
};

let profileSaving=false;
window.lxSaveRealProfile=async()=>{
 if(profileSaving)return;
 const u=window.__lxRealAuth.user,display_name=$('lx-profile-nickname')?.value.trim(),full_name=$('lx-profile-fullname')?.value.trim(),phone=$('lx-profile-phone')?.value.trim(),feedback=$('lx-profile-feedback'),button=$('lx-profile-save');
 const tell=m=>{if(feedback)feedback.textContent=m;};
 if(!u||!token){tell('❌ 請先登入會員');return;}
 if(!display_name||display_name.length>80){tell('❌ 請填寫會員暱稱（最多 80 字）');return;}
 if(!full_name||full_name.length>80){tell('❌ 請填寫姓名（最多 80 字）');return;}
 if(!/^09\d{8}$/.test(phone)){tell('❌ 請輸入 09 開頭的 10 碼台灣手機號碼');return;}
 profileSaving=true;if(button)button.disabled=true;tell('正在安全儲存…');
 try{
  const {url,key}=config();
  const verified=await request(url,key,'user',undefined,token);
  if(!verified.id||verified.id!==u.id)throw Error('登入身分已變更，請重新登入');
  const headers={apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json',Prefer:'return=representation'};
  const payload={full_name,phone,display_name};
  let r;
  if(window.__lxProfile.status==='missing')r=await fetch(url+'/rest/v1/profiles',{method:'POST',headers,body:JSON.stringify({id:u.id,...payload})});
  else r=await fetch(url+'/rest/v1/profiles?id=eq.'+encodeURIComponent(u.id),{method:'PATCH',headers,body:JSON.stringify(payload)});
  const rows=await r.json().catch(()=>null);
  if(!r.ok)throw Error('HTTP '+r.status+'：'+(rows?.message||rows?.details||'儲存遭拒絕'));
  if(!Array.isArray(rows)||rows.length!==1)throw Error('未確認資料已寫入，請檢查 profiles 權限與會員資料列');
  if(window.__lxRealAuth.user?.id!==u.id)throw Error('登入身分已變更');
  window.__lxProfile={id:u.id,display_name:rows[0].display_name||null,full_name:rows[0].full_name||null,phone:rows[0].phone||null,status:'ok',error:''};
  refreshMemberView();const f=$('lx-profile-feedback');if(f)f.textContent='✅ 會員資料已儲存（手機尚未驗證）';
 }catch(e){tell('❌ 儲存失敗：'+String(e.message||e));}
 finally{profileSaving=false;const b=$('lx-profile-save');if(b)b.disabled=false;}
};
function refreshMemberView(){if(typeof page!=='undefined'&&page==='me'&&typeof render==='function')render();}
window.__lxRealAuth={user:null};
window.lxOpenRealLogin=()=>show(true);
window.lxGoogleLogin=()=>{
  try {
    const {url}=config();
    const origins=[
      'https://lets-share.com.tw',
      'https://www.lets-share.com.tw'
    ];
    const paths=[
      '/app/','/app/index.html',
      '/mod-preview/','/mod-preview/index.html'
    ];
    if(!origins.includes(location.origin) ||
       !paths.includes(location.pathname)){
      throw Error('請使用樂享家正式 HTTPS 網址登入');
    }
    const target=new URL(url+'/auth/v1/authorize');
    target.searchParams.set('provider','google');
    target.searchParams.set(
      'redirect_to',
      'https://lets-share.com.tw/mod-preview/'
    );
    location.assign(target.toString());
  } catch(e) {
    show(true);
    say('❌ '+e.message);
  }
};
window.lxOpenConnectionTest=()=>{document.getElementById("lx-connect-panel").style.display="block";};
window.lxMemberBanner=()=>{const u=window.__lxRealAuth.user;return `<section class="card" style="border:1px solid #c8dfd1;padding:15px;margin-bottom:12px"><b>💚 我的樂享家帳號</b><p class="muted" style="font-size:13px">${u?'已使用 Google／會員帳號登入：'+escapeHTML(u.email||'會員'):'登入後即可管理姓名、手機號碼與會員資料。'}</p><button type="button" onclick="lxOpenRealLogin()">${u?'帳號管理／登出':'登入／註冊'}</button>${u?'<p style="font-size:12px;color:#8b671d;margin-top:10px">手機驗證：請在會員基本資料下方查看 Supabase 驗證狀態</p>':''}<p style="font-size:12px;color:#667">提醒：訂單、錢包等部分功能仍為試營運示範資料。</p></section>`};
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function refreshMember(){refreshMemberView();loadRealProfile();}
function say(s){out.textContent=s;}
function show(v){panel.style.display=v?'block':'none';}
$('lx-auth-toggle').addEventListener('click',()=>show(panel.style.display!=='block'));
$('lx-auth-close').addEventListener('click',()=>show(false));
$('lx-auth-close-top').addEventListener('click',()=>show(false));
function config(){
 let u;try{u=new URL($('lx-auth-url').value.trim());}catch{throw Error('Project URL 格式錯誤');}
 if(u.protocol!=='https:'|| !/^[a-z0-9-]+\.supabase\.co$/i.test(u.hostname)||u.username||u.password||u.port||(u.pathname!=='/'&&u.pathname!==''))throw Error('請填入完整 Supabase 專案根網址，不要包含 /rest/v1');
 const key=$('lx-auth-key').value.trim();
 if(!key||/service_role|sb_secret_/i.test(key)||!(key.startsWith('sb_publishable_')||key.startsWith('eyJ')))throw Error('請使用公開 Publishable key 或舊版 anon key');
 return {url:u.origin,key};
}
async function request(url,key,path,body,accessToken){
 const ctrl=new AbortController(),t=setTimeout(()=>ctrl.abort(),15000);
 try{
  const headers={'apikey':key,'Content-Type':'application/json'};
  if(accessToken)headers.Authorization='Bearer '+accessToken;
  const r=await fetch(url+'/auth/v1/'+path,{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify(body),signal:ctrl.signal,cache:'no-store'});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw Error('HTTP '+r.status+'：'+(data.msg||data.error_description||data.message||data.error||'登入服務拒絕請求'));
  return data;
 }finally{clearTimeout(t);}
}
async function run(fn){if(busy)return;busy=true;['lx-auth-signin','lx-auth-check','lx-auth-signout'].forEach(id=>$(id).disabled=true);try{await fn();}catch(e){say('❌ '+(e.name==='AbortError'?'連線逾時':e.message||'網路或 CORS 錯誤'));}finally{busy=false;['lx-auth-signin','lx-auth-check','lx-auth-signout'].forEach(id=>$(id).disabled=false);}}
// Google OAuth: use Supabase-hosted authorization; Google Client Secret never reaches the browser.
const googleRedirect='https://lets-share.com.tw/mod-preview/';
$('lx-auth-google').addEventListener('click',()=>{
 try{
  const {url}=config();
  if(location.protocol!=='https:'||!['https://lets-share.com.tw','https://www.lets-share.com.tw'].includes(location.origin)||!['/app/','/app/index.html','/mod-preview/','/mod-preview/index.html'].includes(location.pathname))throw Error('請先在樂享家正式 HTTPS 網址開啟 APP，再使用 Google 登入');
  const target=new URL(url+'/auth/v1/authorize');
  target.searchParams.set('provider','google');
  target.searchParams.set('redirect_to',googleRedirect);
  say('即將前往 Google 帳號登入…');
  location.assign(target.toString());
 }catch(e){show(true);say('❌ '+e.message);}
});
async function handleOAuthReturn(){
 const raw=location.hash.startsWith('#')?location.hash.slice(1):'';
 const query=new URLSearchParams(location.search);
 if(!/(?:^|&)(access_token|error|error_description)=/.test(raw)&&!query.has('code')&&!query.has('error')){await restoreSession();return;}
 // Clear tokens from the address bar/history immediately, before any asynchronous request.
 const params=new URLSearchParams(raw);
 if(query.has('error')){params.set('error',query.get('error'));params.set('error_description',query.get('error_description')||'');}
 const authCode=query.get('code');
 query.delete('code');query.delete('error');query.delete('error_description');
 history.replaceState(null,'',location.pathname+(query.toString()?'?'+query.toString():''));
 show(false);
 if(params.has('error')){show(true);say('❌ Google 登入未完成：'+(params.get('error_description')||params.get('error')));return;}
 let access=params.get('access_token');
 try{
  const {url,key}=config();
  if(authCode&&!access){
   const verifier=sessionStorage.getItem('lx_oauth_pkce_verifier');
   if(!verifier)throw Error('收到授權碼，但缺少 PKCE 驗證碼，請重新登入');
   const data=await request(url,key,'token?grant_type=pkce',{auth_code:authCode,code_verifier:verifier});
   sessionStorage.removeItem('lx_oauth_pkce_verifier');applyTokens(data);access=token;
  }
  if(!access)throw Error('Google 登入未傳回憑證');
  const user=await request(url,key,'user',undefined,access);
  if(!user.id)throw Error('Supabase 無法確認會員身分');
  token=access;refreshToken=params.get("refresh_token")||refreshToken;expiresAt=Date.now()+((Number(params.get("expires_in"))||3600)*1000);sessionUrl=url;sessionKey=key;saveSession();
  window.__lxRealAuth.user={id:user.id,email:user.email||'',user_metadata:user.user_metadata||{},phone:user.phone||null,phone_confirmed_at:user.phone_confirmed_at||null};refreshMember();
  say('✅ Google 登入成功，Supabase 已確認會員身分！\nEmail：'+(user.email||'(未提供)')+'\n會員 ID：'+user.id+'\n\n此版本僅測試會員身分；其他資料仍為示範。');
  show(false);
  if(typeof go==='function')go('me');
 }catch(e){clearSession();show(true);say('❌ Google 回跳驗證失敗：'+e.message);}
}
handleOAuthReturn();
$('lx-auth-signin').addEventListener('click',()=>run(async()=>{
 const {url,key}=config(),email=$('lx-auth-email').value.trim(),password=$('lx-auth-password').value;
 if(!email||!password)throw Error('請輸入現有帳號 Email 與密碼');
 say('正在登入 Supabase Auth…');
 // Never persist password, token or key in localStorage/IndexedDB.
 const data=await request(url,key,'token?grant_type=password',{email,password});
 $('lx-auth-password').value='';
 if(!data.access_token||!data.user?.id)throw Error('回應缺少登入憑證或會員身分');
 applyTokens(data);sessionUrl=url;sessionKey=key;window.__lxRealAuth.user={id:data.user.id,email:data.user.email||'',user_metadata:data.user.user_metadata||{},phone:data.user.phone||null,phone_confirmed_at:data.user.phone_confirmed_at||null};refreshMember();
 say('✅ Supabase 真實登入成功！\n會員 ID：'+data.user.id+'\nEmail：'+(data.user.email||'(未提供)')+'\n\n請按「驗證目前身分」進行第二關驗收。');
}));
$('lx-auth-check').addEventListener('click',()=>run(async()=>{
 if(!token)throw Error('尚未登入，請先登入');
 say('正在向 Supabase 驗證登入憑證…');
 const user=await request(sessionUrl,sessionKey,'user',undefined,token);
 if(!user.id)throw Error('無法取得會員身分');window.__lxRealAuth.user={id:user.id,email:user.email||'',user_metadata:user.user_metadata||{},phone:user.phone||null,phone_confirmed_at:user.phone_confirmed_at||null};refreshMember();
 say('✅ 身分驗證成功！\n會員 ID：'+user.id+'\nEmail：'+(user.email||'(未提供)')+'\n\n這是 Supabase Auth 真實會員資料，非本地模擬資料。');
}));
$('lx-auth-signout').addEventListener('click',()=>run(async()=>{
 if(!token){clearSession();say('目前沒有登入狀態。');return;}
 const oldToken=token,url=sessionUrl,key=sessionKey;
 clearSession();sessionUrl=null;sessionKey=null;$('lx-auth-password').value='';
 try{await request(url,key,'logout',{},oldToken);say('✅ 已向 Supabase 發出登出請求，並清除本頁登入憑證。');}
 catch(e){say('⚠️ 本頁憑證已清除，但伺服器登出未確認：'+e.message);}
}));
})();
