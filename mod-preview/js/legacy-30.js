/* C09-DEV-010: headquarters pickup incident management */
(function(){
'use strict';
const old=window.hq;if(typeof old!=='function')return;
const endpoint='https://wxvauoeykusmbxdtwgxo.supabase.co/rest/v1/rpc/';
const key='sb_publishable_ZCqKEuqpTiZ46p9fx_JXvA_av4JwD3I';
const get=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function call(fn,params={}){
 let session;try{session=JSON.parse(sessionStorage.getItem('lx_supabase_auth_v066g')||'null')}catch{}
 if(!session?.token||!window.__lxRealAuth?.user?.id)throw Error('請先登入總部管理帳號');
 const uid=window.__lxRealAuth.user.id;
 const r=await fetch(endpoint+fn,{method:'POST',cache:'no-store',headers:{apikey:key,Authorization:'Bearer '+session.token,'Content-Type':'application/json'},body:JSON.stringify(params)});
 if(window.__lxRealAuth?.user?.id!==uid)throw Error('帳號已切換');
 if(!r.ok){let j={};try{j=await r.json()}catch{}throw Error(j.message||'讀取失敗 HTTP '+r.status)}
 return r.json();
}
const reason={bag_not_found:'分享地點找不到分享袋',bag_damaged:'分享袋已破損',bag_number_mismatch:'分享袋編號與系統顯示不符',other:'其他'};
const label={reported:'已通報',investigating:'調查中',resolved:'已處理',closed:'已結案'};
const next={reported:'investigating',investigating:'resolved',resolved:'closed'};
const nextLabel={investigating:'開始調查',resolved:'完成處理',closed:'確認結案'};
function notice(msg,err=false){const n=get('lx-hq-incident-notice');if(n){n.textContent=msg;n.style.color=err?'#b42318':'#08784c'}}
window.lxHqIncidentLoad=async function(){
 const list=get('lx-hq-incident-list');if(!list)return;
 notice('正在讀取總部異常案件…');
 try{
 const rows=await call('lx_hq_pickup_incident_list');
 if(!get('lx-hq-incident-list'))return;
 list.innerHTML=rows.length?rows.map(c=>{
 const id=esc(c.id),to=next[c.status];
 return '<article style="padding:12px;border:1px solid #dce9e0;border-radius:12px;margin:10px 0"><b>'+esc(label[c.status]||c.status)+'</b> · '+esc(reason[c.reason]||c.reason)+'<p class="muted" style="font-size:12px">案件 '+id.slice(0,8)+' · 任務 '+esc(c.delivery_task_id.slice(0,8))+' · '+esc(new Date(c.reported_at).toLocaleString('zh-TW'))+'</p>'+(c.note?'<p>'+esc(c.note)+'</p>':'')+(c.resolution_note?'<p>最近處理說明：'+esc(c.resolution_note)+'</p>':'')+(to?'<label for="lx-hq-note-'+id+'">處理說明（至少5字）</label><textarea class="field" id="lx-hq-note-'+id+'" rows="2" maxlength="2000" placeholder="請記錄調查事實與處理依據"></textarea><button class="primary wide" onclick="lxHqIncidentUpdate(\''+id+'\',\''+to+'\')">'+nextLabel[to]+'</button>':'<p class="muted">案件已結案</p>')+'</article>';
 }).join(''):'目前沒有騎手取件異常案件。';
 notice('已載入 '+rows.length+' 筆案件。');
 }catch(e){list.textContent='無法讀取案件';notice('讀取失敗：'+e.message,true)}
};
window.lxHqIncidentUpdate=async function(id,to){
 const note=get('lx-hq-note-'+id)?.value.trim()||'';
 if(note.length<5)return notice('處理說明至少需要5字',true);
 notice('正在更新案件…');
 try{await call('lx_hq_update_pickup_incident',{p_incident_id:id,p_new_status:to,p_note:note});await window.lxHqIncidentLoad();notice('✓ 案件狀態已更新並保留稽核紀錄')}
 catch(e){notice('更新失敗：'+e.message,true)}
};
window.hq=function(){
 const html=old();
 const panel='<section class="card" id="lx-hq-incident-panel"><h3 style="color:#08784c">騎手取件異常案件管理</h3><p class="muted">總部權限由伺服器驗證；案件依序調查、處理及結案。此處不執行補償撥款。</p><div id="lx-hq-incident-list">讀取中…</div><p id="lx-hq-incident-notice" role="status" aria-live="polite"></p><button class="secondary" type="button" onclick="lxHqIncidentLoad()">重新整理案件</button></section>';
 setTimeout(()=>window.lxHqIncidentLoad(),80);
 return html+panel;
};
})();