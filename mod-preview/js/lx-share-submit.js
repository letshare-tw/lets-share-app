/* DEV-01B candidate. Safe by default: no submission while backend gate is closed.
   This module never creates a draft, changes settings, or assigns a rider. */
(function(){
'use strict';
const API='https://wxvauoeykusmbxdtwgxo.supabase.co';
const KEY='sb_publishable_ZCqKEuqpTiZ46p9fx_JXvA_av4JwD3I';
const SESSION_KEY='lx_supabase_auth_v066g';
const previous=window.share;
if(typeof previous!=='function')return;
let generation=0,submitting=false,verifiedRequestId=null;
function currentPanel(panel){return panel&&node('lx-submit-panel')===panel}
function invalidate(message){const panel=node('lx-submit-panel');if(!panel)return;panel.dataset.ready='0';setEnabled(false);if(message)status(message)}
function node(id){return document.getElementById(id)}
function credentials(){
 let session;try{session=JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null')}catch{}
 const id=window.__lxRealAuth?.user?.id;
 if(!id||!session?.token)throw Error('請先登入會員');
 return {id,token:session.token};
}
async function api(path,opts={}){
 const {id,token}=credentials();
 const response=await fetch(API+'/rest/v1/'+path,{...opts,cache:'no-store',headers:{apikey:KEY,Authorization:'Bearer '+token,...(opts.headers||{})}});
 if(window.__lxRealAuth?.user?.id!==id)throw Error('登入帳號已切換，請重新進入分享頁');
 if(!response.ok){let message='';try{const j=await response.json();message=j.message||j.error||''}catch{}
  throw Error(message||'伺服器處理失敗（HTTP '+response.status+'）')}
 if(response.status===204)return null;
 const raw=await response.text();return raw?JSON.parse(raw):null;
}
function status(message,error=false){const el=node('lx-submit-status');if(el){el.textContent=message;el.style.color=error?'#b42318':'#08784c'}}
function setEnabled(enabled){const button=node('lx-submit-button');if(button)button.disabled=!enabled||submitting}
function agreed(){return ['lx-submit-transfer','lx-submit-no-return','lx-submit-recycling'].every(id=>node(id)?.checked)}
window.lxSubmitConsentChanged=function(){setEnabled(node('lx-submit-panel')?.dataset.ready==='1'&&agreed())};
window.lxSubmitLoad=async function(){
 const seq=++generation,panel=node('lx-submit-panel');
 if(!panel)return;
 panel.dataset.ready='0';panel.dataset.requestId='';panel.dataset.version='';
 setEnabled(false);
 status('正在檢查分享草稿與正式提交資格…');
 try{
  const {id}=credentials();
  const service=await api('rpc/lx_share_service_status',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  if(seq!==generation||!node('lx-submit-panel'))return;
  if(!service?.published||!service?.activated||!service?.version){status('正式分享協議尚未發布或尚未啟用，僅可儲存草稿。');return}
  // Read only: never call lx_create_share_draft here.
  const rows=await api('lx_share_requests?select=id,status&sharer_user_id=eq.'+encodeURIComponent(id)+'&status=eq.draft&limit=1');
  if(seq!==generation||!node('lx-submit-panel'))return;
  if(!rows?.length){status('目前沒有可提交的草稿，請先儲存草稿。');return}
  const requestId=rows[0].id;
  const preflight=await api('rpc/lx_share_submission_preflight',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({p_request_id:requestId})});
  if(seq!==generation||!node('lx-submit-panel'))return;
  if(!preflight?.ready){status('尚未符合提交條件：'+(preflight?.reason||'請檢查草稿與分享協議'));return}
  if(preflight.agreement_version!==service.version){status('分享協議版本已變更，請重新閱讀並啟用。',true);return}
  if(!currentPanel(panel))return;
  panel.dataset.requestId=requestId;panel.dataset.version=service.version;panel.dataset.ready='1';
  verifiedRequestId=requestId;
  status('草稿檢查通過。請確認三項同意事項後正式提交。');
  window.lxSubmitConsentChanged();
 }catch(err){if(seq===generation)status('提交資格檢查失敗：'+err.message,true)}
};
window.lxSubmitNow=async function(){
 const panel=node('lx-submit-panel');
 if(submitting||panel?.dataset.ready!=='1'||!agreed())return;
 submitting=true;setEnabled(false);
 const requestId=panel.dataset.requestId,version=panel.dataset.version;
 try{
  if(!requestId||!version)throw Error('提交資格已失效，請重新檢查');
  status('正在重新確認草稿資格…');
  const preflight=await api('rpc/lx_share_submission_preflight',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({p_request_id:requestId})});
  if(!preflight?.ready||preflight.agreement_version!==version)throw Error('草稿或協議已變更，請重新檢查');
  status('正在正式提交，請勿重複點擊…');
  const result=await api('rpc/lx_submit_share_request',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
   p_request_id:requestId,p_agreement_version:version,p_transfer_agreed:true,p_no_return_agreed:true,p_recycling_agreed:true
  })});
  if(result!==requestId)throw Error('提交結果無法核對，請到會員中心查詢');
  const bag=await findBag(requestId);
  if(!bag)throw Error('申請已提交，但尚未查到分享袋。請聯絡客服，不要重複提交');
  const deadline=new Date(bag.pickup_deadline_at);
  showBag(bag);
  panel.dataset.ready='0';panel.dataset.requestId='';
 }catch(err){
  panel.dataset.ready='0';
  try{const bag=await findBag(requestId);if(bag){showBag(bag);return}}catch(_){}
  status('提交結果尚未確認：'+err.message+'。請點「查詢提交結果」，不要再次送出。',true);
 }finally{submitting=false;setEnabled(false)}
};
async function findBag(requestId){
 if(!requestId)return null;
 const bags=await api('rpc/lx_get_my_share_bags',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
 return Array.isArray(bags)?bags.find(item=>item.share_request_id===requestId)||null:null;
}
function showBag(bag){
 const deadline=new Date(bag.pickup_deadline_at);
 status('✓ 分享成功！袋號：'+bag.bag_code+'。取件截止：'+(Number.isNaN(deadline.getTime())?'請洽客服':deadline.toLocaleString('zh-TW',{timeZone:'Asia/Taipei'}))+'（台灣時間）。等待總部安排騎手。');
 invalidate();verifiedRequestId=null;
}
window.lxSubmitRecover=async function(){
 try{
  const id=verifiedRequestId||node('lx-submit-panel')?.dataset.requestId;
  const bag=await findBag(id);
  if(bag)showBag(bag);
  else status('尚未查到分享袋。請先確認會員中心的分享紀錄，勿直接重複提交。',true);
 }catch(err){status('查詢失敗：'+err.message,true)}
};
// A saved draft invalidates the old preflight, even if its request ID remains unchanged.
document.addEventListener('click',event=>{
 if(event.target?.closest?.('#lx-c09-save-draft'))invalidate('草稿正在更新，儲存完成後請重新檢查提交資格。');
});
window.share=function(){
 const html=previous();
 const panel='<section id="lx-submit-panel" data-ready="0" class="card" style="background:#fff;border:1px solid #b9d7c5;border-radius:16px;padding:16px;margin:16px 0">'+
 '<h3 style="margin:0 0 8px;color:#08784c">正式提交分享</h3>'+
 '<p id="lx-submit-status" role="status" aria-live="polite" style="font-size:13px;color:#587363">正在檢查正式提交資格…</p>'+
 '<label style="display:block;margin:10px 0;font-size:13px"><input id="lx-submit-transfer" type="checkbox" onchange="lxSubmitConsentChanged()"> 我確認衣物交付後依協議移轉所有權</label>'+
 '<label style="display:block;margin:10px 0;font-size:13px"><input id="lx-submit-no-return" type="checkbox" onchange="lxSubmitConsentChanged()"> 我同意完成交付後衣物原則上不退還</label>'+
 '<label style="display:block;margin:10px 0;font-size:13px"><input id="lx-submit-recycling" type="checkbox" onchange="lxSubmitConsentChanged()"> 我授權不合格及未售衣物依法轉贈或回收</label>'+
 '<button id="lx-submit-button" type="button" onclick="lxSubmitNow()" disabled style="width:100%;padding:12px;border:0;border-radius:999px;background:#078b58;color:white;font-weight:700">確認正式提交分享</button>'+
 '<button type="button" onclick="lxSubmitRecover()" style="margin-top:8px;border:0;background:transparent;color:#08784c">查詢提交結果</button>'+ 
 '<button type="button" onclick="lxSubmitLoad()" style="margin-top:8px;border:0;background:transparent;color:#08784c">重新檢查提交資格（儲存草稿後請點此）</button>'+
 '<p style="font-size:12px;color:#60786b">正式協議與後端提交開關未啟用前無法提交。提交後不會自動派單。</p></section>';
 const anchor='<main class="main">';
 const result=html.includes(anchor)?html.replace(anchor,anchor+panel):html;
 // Initialize after the share view is inserted, without a fixed timing assumption.
 queueMicrotask(()=>{
  const panel=node('lx-submit-panel');
  if(panel)window.lxSubmitLoad?.();
  else{
   const observer=new MutationObserver(()=>{if(node('lx-submit-panel')){observer.disconnect();window.lxSubmitLoad?.()}});
   observer.observe(document.body,{childList:true,subtree:true});
   setTimeout(()=>observer.disconnect(),10000);
  }
 });
 return result;
};
})();
