/* C09-DEV-009: member share incident reporting, own-record listing. */
(function(){
'use strict';
const previous=window.share;
if(typeof previous!=='function')return;
const API='https://wxvauoeykusmbxdtwgxo.supabase.co';
const KEY='sb_publishable_ZCqKEuqpTiZ46p9fx_JXvA_av4JwD3I';
const SESSION='lx_supabase_auth_v066g';
let generation=0;
function el(id){return document.getElementById(id)}
function auth(){let s;try{s=JSON.parse(sessionStorage.getItem(SESSION)||'null')}catch{}const id=window.__lxRealAuth?.user?.id;if(!id||!s?.token)throw Error('請先登入會員');return{id,token:s.token}}
async function req(path,options={}){
 const a=auth();
 const r=await fetch(API+'/rest/v1/'+path,{...options,cache:'no-store',headers:{apikey:KEY,Authorization:'Bearer '+a.token,...options.headers}});
 if(window.__lxRealAuth?.user?.id!==a.id)throw Error('登入會員已變更，請重新進入');
 if(!r.ok){let message='';try{const data=await r.json();message=data.message||data.error||''}catch{}throw Error(message||'伺服器錯誤 HTTP '+r.status)}
 if(r.status===204)return null;
 return r.json();
}
function status(message,error=false){const n=el('lx-incident-status');if(n){n.textContent=message;n.style.color=error?'#b42318':'#08784c'}}
function escape(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
const labels={reported:'已通報',evidence_preservation:'證據保全',investigating:'調查中',compensation_review:'補償審核',resolved:'已處理',appealed:'申訴中',closed:'已結案'};
window.lxIncidentLoad=async function(){
 const seq=++generation;
 const select=el('lx-incident-request'),list=el('lx-incident-list');
 if(!select||!list)return;
 status('正在讀取您的分享紀錄與異常案件…');
 select.disabled=true;
 try{
  const a=auth();
  const [shares,claims]=await Promise.all([
   req('lx_share_requests?select=id,status,created_at,submitted_at&sharer_user_id=eq.'+encodeURIComponent(a.id)+'&order=created_at.desc&limit=100'),
   req('lx_share_loss_claims?select=id,request_id,incident_type,description,status,reported_at,decision_reason,compensation_amount&claimant_user_id=eq.'+encodeURIComponent(a.id)+'&order=reported_at.desc&limit=50')
  ]);
  if(seq!==generation||!el('lx-incident-request'))return;
  select.innerHTML='<option value="">請選擇自己的分享申請</option>'+shares.map(s=>'<option value="'+escape(s.id)+'">'+escape(s.status==='draft'?'測試草稿':'分享 '+s.status)+' · '+escape(new Date(s.created_at).toLocaleDateString('zh-TW'))+' · '+escape(s.id.slice(0,8))+'</option>').join('');
  select.disabled=!shares.length;
  el('lx-incident-send').disabled=!shares.length;
  list.innerHTML=claims.length?claims.map(c=>'<article style="padding:12px 0;border-bottom:1px solid #e1e9e3"><strong>'+escape(labels[c.status]||c.status)+'</strong> · '+escape(new Date(c.reported_at).toLocaleString('zh-TW'))+'<div style="font-size:12px;color:#60786b">案件 '+escape(c.id.slice(0,8))+' · 分享 '+escape(c.request_id.slice(0,8))+'</div><p style="white-space:pre-wrap;font-size:13px">'+escape(c.description)+'</p>'+(c.decision_reason?'<p style="font-size:13px">處理說明：'+escape(c.decision_reason)+'</p>':'')+(c.compensation_amount!==null?'<p>核定補償：NT$ '+escape(c.compensation_amount)+'</p>':'')+'</article>').join(''):'目前沒有異常通報紀錄。';
  status(shares.length?'已載入您的分享紀錄；請選擇案件並說明異常。':'目前沒有可選擇的分享申請。');
 }catch(err){status('載入失敗：'+err.message,true);list.textContent='無法讀取案件';select.disabled=true}
};
window.lxIncidentSend=async function(){
 const id=el('lx-incident-request')?.value,type=el('lx-incident-type')?.value,description=el('lx-incident-description')?.value.trim();
 if(!id)return status('請先選擇分享申請',true);
 if(!description||description.length<10||description.length>3000)return status('請填寫 10～3000 字的異常說明',true);
 const btn=el('lx-incident-send');btn.disabled=true;
 status('正在送出異常通報…');
 try{
  const result=await req('rpc/lx_report_share_loss',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({p_request_id:id,p_incident_type:type,p_description:description})});
  if(typeof result!=='string')throw Error('案件編號無效');
  el('lx-incident-description').value='';
  await window.lxIncidentLoad();
  status('✓ 異常通報已建立，案件編號：'+result);
 }catch(err){status('送出失敗：'+err.message,true)}
 finally{if(btn)btn.disabled=false}
};
window.share=function(){
 const html=previous();
 const panel='<section id="lx-incident-panel" style="margin:18px 0;padding:16px;background:#fff;border:1px solid #b9d7c5;border-radius:16px"><h3 style="color:#08784c;margin:0 0 8px">分享異常通報與處理進度</h3><p style="font-size:12px;color:#667a70">目前為測試環境。測試草稿可用於驗證通報流程，不代表已完成正式取件或取得賠償資格。</p><label for="lx-incident-request">我的分享紀錄</label><select class="field" id="lx-incident-request" disabled><option>讀取中…</option></select><label for="lx-incident-type">異常類型</label><select class="field" id="lx-incident-type"><option value="missing">袋件遺失／未找到</option><option value="stolen">疑似遭竊</option><option value="damaged">袋件損壞</option><option value="contaminated">污染</option><option value="seal_broken">封條破損</option><option value="wrong_handoff">交接異常</option><option value="other">其他</option></select><label for="lx-incident-description">異常情況說明</label><textarea id="lx-incident-description" class="field" maxlength="3000" rows="4" placeholder="請描述發現時間、地點、袋件情況及相關資訊（至少10字）"></textarea><button id="lx-incident-send" type="button" onclick="lxIncidentSend()" disabled style="width:100%;padding:12px;border:0;border-radius:999px;background:#078b58;color:#fff;font-weight:700">送出異常通報</button><p id="lx-incident-status" role="status" aria-live="polite" style="font-size:13px"></p><h4 style="margin:18px 0 6px">我的通報進度</h4><div id="lx-incident-list" style="font-size:13px">讀取中…</div><button type="button" onclick="lxIncidentLoad()" style="margin-top:12px;border:1px solid #078b58;background:#fff;color:#08784c;border-radius:999px;padding:9px 16px">重新整理案件</button></section>';
 setTimeout(()=>window.lxIncidentLoad(),80);
 return html+panel;
};
})();