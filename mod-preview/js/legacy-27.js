/* C09-DEV-005: share service agreement status and explicit activation UI.
   No agreement has been published; formal submission remains disabled. */
(function(){
'use strict';
const previous=window.share;
if(typeof previous!=='function')return;
const API='https://wxvauoeykusmbxdtwgxo.supabase.co';
const KEY='sb_publishable_ZCqKEuqpTiZ46p9fx_JXvA_av4JwD3I';
const SESSION_KEY='lx_supabase_auth_v066g';
let serial=0;
function session(){
 let s;try{s=JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null')}catch{}
 const id=window.__lxRealAuth?.user?.id;
 if(!id||!s?.token)throw Error('請先登入會員');
 return {id,token:s.token};
}
async function api(path,opts={}){
 const {id,token}=session();
 const res=await fetch(API+'/rest/v1/'+path,{...opts,cache:'no-store',headers:{apikey:KEY,Authorization:'Bearer '+token,...opts.headers}});
 if(window.__lxRealAuth?.user?.id!==id)throw Error('會員身分已變更，請重新進入');
 if(!res.ok){let m='';try{const j=await res.json();m=j.message||j.error||''}catch{}throw Error(m||'伺服器回應 '+res.status)}
 if(res.status===204)return null;
 return res.json();
}
function node(id){return document.getElementById(id)}
function state(message,color='#456257'){const el=node('lx-service-status');if(el){el.textContent=message;el.style.color=color}}
function setActivationUI(active,version){
 const box=node('lx-service-activation');if(!box)return;
 box.dataset.active=active?'1':'0';
 const consent=node('lx-service-consent'),button=node('lx-service-activate');
 if(consent)consent.disabled=active;
 if(button){button.disabled=active||!consent?.checked;button.style.opacity=button.disabled?'.55':'1'}
 const versionLabel=node('lx-service-version');if(versionLabel)versionLabel.textContent=version?'協議版本：'+version:'';
}
window.lxServiceConsentChanged=function(){
 const c=node('lx-service-consent'),b=node('lx-service-activate');
 if(b)b.disabled=!c?.checked||node('lx-service-activation')?.dataset.active==='1';
};
window.lxServiceLoad=async function(){
 const seq=++serial;
 if(!node('lx-service-activation'))return;
 state('正在檢查分享服務啟用狀態…');
 try{
  const data=await api('rpc/lx_share_service_status',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  if(seq!==serial||!node('lx-service-activation'))return;
  if(!data?.published){
   setActivationUI(true,null);
   state('正式分享協議尚未發布，目前僅開放分享草稿與拍照測試。');
   return;
  }
  const version=data.version;
  const content=node('lx-service-agreement');
  if(content){content.textContent=data.content;content.hidden=false}
  const activated=!!data.activated;
  setActivationUI(activated,version);
  const versionLabel=node('lx-service-version');if(versionLabel)versionLabel.dataset.version=version;
  if(activated)state('✓ 已啟用分享服務，已記錄本版本同意。');
  else state('請閱讀協議並勾選同意，再按「啟用分享服務」。');
 }catch(err){setActivationUI(true,null);state('無法確認啟用狀態：'+err.message,'#b42318')}
};
window.lxServiceActivate=async function(){
 const btn=node('lx-service-activate'),check=node('lx-service-consent');
 if(!check?.checked||btn?.disabled)return;
 btn.disabled=true;
 try{
  const version=node('lx-service-version')?.dataset.version;
  if(!version)throw Error('協議版本尚未確認，請重新整理');
  const result=await api('rpc/lx_activate_share_service',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({p_agreement_version:version,p_explicit_agreement:true})});
  if(!result?.activated)throw Error('無法確認啟用結果');
  await window.lxServiceLoad();
 }catch(err){state('啟用失敗：'+err.message,'#b42318');btn.disabled=false}
};
window.share=function(){
 const html=previous();
 const panel='<section id="lx-service-activation" class="card" style="background:#fff;border:1px solid #b9d7c5;border-radius:16px;padding:16px;margin:16px 0"><h3 style="margin:0 0 8px;color:#08784c">分享服務啟用狀態</h3><p id="lx-service-status" role="status" aria-live="polite" style="font-size:14px">正在檢查…</p><p id="lx-service-version" style="font-size:12px;color:#60786b"></p><div id="lx-service-agreement" hidden style="white-space:pre-wrap;max-height:260px;overflow:auto;border:1px solid #d5e6dc;border-radius:10px;padding:12px;margin:10px 0;font-size:13px;line-height:1.7"></div><label style="display:flex;align-items:flex-start;gap:8px;margin:10px 0;font-size:13px"><input type="checkbox" id="lx-service-consent" onchange="lxServiceConsentChanged()" disabled>我已閱讀並同意目前版本的分享服務協議</label><button type="button" id="lx-service-activate" onclick="lxServiceActivate()" disabled style="width:100%;padding:12px;border:0;border-radius:999px;background:#078b58;color:white;font-weight:700;opacity:.55">啟用分享服務</button><p style="font-size:12px;color:#60786b">正式協議未發布前不可啟用；草稿測試與正式分享申請分開管理。</p></section>';
 const anchor='<main class="main">';
 const result=html.includes(anchor)?html.replace(anchor,anchor+panel):html;
 setTimeout(()=>{
  const v=node('lx-service-version');
  if(v){const observer=new MutationObserver(()=>{const m=v.textContent.match(/^協議版本：(.*)$/);if(m)v.dataset.version=m[1]});observer.observe(v,{childList:true})}
  window.lxServiceLoad();
 },0);
 return result;
};
})();