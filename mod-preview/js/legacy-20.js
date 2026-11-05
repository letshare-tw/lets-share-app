/* C09-UI-001: member-owned share draft and working navigation */
(function(){
'use strict';
const URL='https://wxvauoeykusmbxdtwgxo.supabase.co';
const KEY='sb_publishable_ZCqKEuqpTiZ46p9fx_JXvA_av4JwD3I';
const SESSION_KEY='lx_supabase_auth_v066g';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
window.lxMyShareBagsCard=()=>'<section class="card"><h3>我的分享衣物｜Supabase 草稿</h3><p class="muted">目前僅供測試會員建立自己的分享草稿。正式分享申請、取件及派單均未開放。</p><button id="lx-create-share-draft" class="secondary wide" type="button" onclick="lxCreateShareDraft()">建立／取得我的分享草稿（測試）</button><div id="lx-share-draft-result" style="margin:10px 0" aria-live="polite">尚未建立或取得草稿。</div><button class="secondary wide" type="button" onclick="lxLoadMyShareBags()">重新整理正式分享袋</button><div id="lx-my-share-bags-result" style="margin-top:12px" aria-live="polite">按下按鈕讀取資料。</div></section>';
window.lxCreateShareDraft=async function(){
 const target=document.getElementById('lx-share-draft-result');if(!target)return;
 const user=window.__lxRealAuth?.user;if(!user){target.textContent='請先登入會員帳號。';return;}
 let session;try{session=JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null')}catch{}
 if(!session?.token){target.textContent='登入憑證不存在，請重新登入。';return;}
 const btn=document.getElementById('lx-create-share-draft');if(btn)btn.disabled=true;
 target.textContent='正在安全建立分享草稿…';
 try{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  let response;
  try{response=await fetch(URL+'/rest/v1/rpc/lx_create_share_draft',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+session.token,'Content-Type':'application/json'},body:'{}',cache:'no-store',signal:controller.signal});}finally{clearTimeout(timer)}
  const raw=await response.text();let result;try{result=raw?JSON.parse(raw):null}catch{throw Error('伺服器回傳格式無法解析')}
  if(!response.ok)throw Error((result?.message||result?.hint||'建立失敗')+'（HTTP '+response.status+'）');
  if(typeof result!=='string'||!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(result))throw Error('伺服器未回傳有效草稿識別碼');
  if(window.__lxRealAuth?.user?.id!==user.id)throw Error('登入帳號已切換，請重新讀取');
  target.textContent='草稿已儲存至 Supabase。草稿 ID：'+result+'。這不是正式分享袋，也尚未提交分享申請。';
 }catch(e){target.textContent='建立草稿失敗：'+(e?.name==='AbortError'?'連線逾時':e?.message||String(e));}
 finally{if(btn)btn.disabled=false;}
};
window.lxLoadMyShareBags=async function(){
 const target=document.getElementById('lx-my-share-bags-result');if(!target)return;
 const user=window.__lxRealAuth?.user;if(!user){target.textContent='請先登入會員，再讀取自己的分享袋。';return;}
 let session;try{session=JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null')}catch{}
 if(!session?.token){target.textContent='登入憑證不存在，請重新登入。';return;}
 target.textContent='正在安全讀取分享袋…';
 try{
  const response=await fetch(URL+'/rest/v1/rpc/lx_get_my_share_bags',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+session.token,'Content-Type':'application/json'},body:'{}',cache:'no-store'});
  const raw=await response.text();let result;try{result=raw?JSON.parse(raw):null}catch{throw Error('伺服器回傳格式無法解析')}
  if(!response.ok)throw Error((result?.message||result?.hint||'讀取失敗')+'（HTTP '+response.status+'）');
  const rows=Array.isArray(result)?result:(result&&Array.isArray(result.data)?result.data:[]);
  if(!rows.length){target.textContent='目前沒有正式分享袋。草稿不會出現在此清單。';return;}
  target.innerHTML='<div class="muted">查詢成功：'+rows.length+' 筆</div>'+rows.map((r,i)=>'<div style="padding:10px 0;border-bottom:1px solid #e4e9e5"><b>袋號：'+esc(r.bag_code??r.share_bag_code??r.bag_id??r.id??'第 '+(i+1)+' 筆')+'</b><div class="muted">狀態：'+esc(r.status??r.stage??r.bag_status??'狀態未提供')+'</div></div>').join('');
 }catch(e){target.textContent='讀取失敗：'+(e?.message||String(e))+'。請確認 RPC 權限與登入狀態。';}
};
function showDraft(){
 if(typeof window.go!=='function'){alert('頁面功能尚未載入');return;}
 window.go('me');
 const target=document.getElementById('lx-ui-share');if(!target){alert('分享草稿區塊尚未載入，請重新整理');return;}
 ['profile','phone','consent','share'].forEach(n=>{const e=document.getElementById('lx-ui-'+n);if(e)e.style.display=n==='share'?'block':'none';});
 requestAnimationFrame(()=>target.scrollIntoView({behavior:'smooth',block:'start'}));
}
window.createBag=showDraft;
window.lxC09OpenDraft=showDraft;
if(typeof window.myshares==='function'){
 const old=window.myshares;
 window.myshares=function(){return old()+'<section class="card" style="padding:16px;margin:12px 18px"><h3>Supabase 分享草稿</h3><p class="muted">僅供測試，不提交正式分享申請、不派單。</p><button class="primary wide" type="button" onclick="lxC09OpenDraft()">建立／取得我的分享草稿</button></section>';};
}
})();
