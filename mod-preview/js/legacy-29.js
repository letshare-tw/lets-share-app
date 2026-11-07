/* C09-DEV-009A rider-only pickup exception UI */
(function(){
'use strict';
const previous=window.rider;
if(typeof previous!=='function')return;
const API='https://wxvauoeykusmbxdtwgxo.supabase.co/rest/v1/';
const KEY='sb_publishable_ZCqKEuqpTiZ46p9fx_JXvA_av4JwD3I';
const reasons=[['bag_not_found','分享地點找不到分享袋'],['bag_damaged','分享袋已破損'],['bag_number_mismatch','分享袋編號與系統顯示不符'],['other','其他']];
const $=id=>document.getElementById(id);
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function session(){let s;try{s=JSON.parse(sessionStorage.getItem('lx_supabase_auth_v066g')||'null')}catch{}if(!s?.token||!window.__lxRealAuth?.user?.id)throw Error('請先登入騎手帳號');return s.token}
async function rpc(name,data){const token=session();const r=await fetch(API+'rpc/'+name,{method:'POST',cache:'no-store',headers:{apikey:KEY,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(data)});if(!r.ok){let j={};try{j=await r.json()}catch{}throw Error(j.message||'伺服器錯誤 '+r.status)}return r.json()}
function message(s,error=false){const n=$('lx-rider-incident-message');if(n){n.textContent=s;n.style.color=error?'#b42318':'#08784c'}}
window.lxRiderIncidentOther=function(){const n=$('lx-rider-incident-note-wrap');if(n)n.hidden=$('lx-rider-incident-reason')?.value!=='other'};
window.lxRiderIncidentLoad=async function(){
 const select=$('lx-rider-incident-task');if(!select)return;
 message('正在讀取指派給您的取件任務…');
 try{
 const tasks=await rpc('lx_rider_pickup_tasks',{});
 if(!$('lx-rider-incident-task'))return;
 const rows=Array.isArray(tasks)?tasks:[];
 select.innerHTML='<option value="">請選擇正式指派的任務</option>'+rows.map(t=>'<option value="'+safe(t.id)+'">'+safe(t.pickup_location||'取件任務')+' · '+safe(t.id.slice(0,8))+'</option>').join('');
 select.disabled=!rows.length;
 $('lx-rider-incident-send').disabled=!rows.length;
 message(rows.length?'已載入指派任務，遇到異常才需通報。':'目前沒有正式指派的取件任務；測試袋件不能當作正式派單。');
 }catch(e){message('讀取失敗：'+e.message,true)}
};
window.lxRiderIncidentSend=async function(){
 const task=$('lx-rider-incident-task')?.value,reason=$('lx-rider-incident-reason')?.value,note=$('lx-rider-incident-note')?.value.trim()||'';
 if(!task)return message('請先選擇取件任務',true);
 if(reason==='other'&&note.length<5)return message('其他異常請至少說明 5 字',true);
 const btn=$('lx-rider-incident-send');btn.disabled=true;
 try{const id=await rpc('lx_rider_report_pickup_incident',{p_task_id:task,p_reason:reason,p_note:note});message('✓ 已通知總部，異常案件編號：'+id);$('lx-rider-incident-note').value='';}
 catch(e){message('通報失敗：'+e.message,true)}
 finally{btn.disabled=false}
};
window.rider=function(){
 let html=previous();
 // Old incident() demo uses local bags and must not be mistaken for an authenticated rider report.
 html=html.replace(/<button class="secondary wide" style="margin-top:8px" onclick="incident\('[^']+'\)">回報異常<\/button>/g,'<p class="muted" style="font-size:12px">正式取件異常請使用下方「騎手取件異常通報」。</p>');
 const panel='<section class="card" id="lx-rider-incident-panel"><h3 style="color:#08784c">騎手取件異常通報</h3><p class="muted">僅限實際指派的取件任務。騎手不開袋、不逐件檢查衣物。</p><label for="lx-rider-incident-task">我的正式取件任務</label><select id="lx-rider-incident-task" class="field" disabled><option>讀取中…</option></select><label for="lx-rider-incident-reason">異常原因</label><select id="lx-rider-incident-reason" class="field" onchange="lxRiderIncidentOther()">'+reasons.map(([v,l])=>'<option value="'+v+'">'+l+'</option>').join('')+'</select><div id="lx-rider-incident-note-wrap" hidden><label for="lx-rider-incident-note">其他異常說明</label><textarea id="lx-rider-incident-note" class="field" rows="3" maxlength="1000" placeholder="請至少輸入5字"></textarea></div><button id="lx-rider-incident-send" class="primary wide" type="button" onclick="lxRiderIncidentSend()" disabled>送出異常通報</button><p id="lx-rider-incident-message" role="status" aria-live="polite"></p><button class="secondary" type="button" onclick="lxRiderIncidentLoad()">重新讀取任務</button></section>';
 setTimeout(()=>window.lxRiderIncidentLoad(),80);
 return html+panel;
};
})();