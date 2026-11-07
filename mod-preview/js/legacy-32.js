/* C09-DEV-011 isolated cross-role test, never creates a delivery task or payment */
(function(){
'use strict';
const key='sb_publishable_ZCqKEuqpTiZ46p9fx_JXvA_av4JwD3I',api='https://wxvauoeykusmbxdtwgxo.supabase.co/rest/v1/rpc/';
const $=id=>document.getElementById(id);
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
async function rpc(fn,params={}){
 let s;try{s=JSON.parse(sessionStorage.getItem('lx_supabase_auth_v066g')||'null')}catch{}
 if(!s?.token||!window.__lxRealAuth?.user?.id)throw Error('請先登入已授權的測試管理帳號');
 const id=window.__lxRealAuth.user.id;
 const r=await fetch(api+fn,{method:'POST',cache:'no-store',headers:{apikey:key,Authorization:'Bearer '+s.token,'Content-Type':'application/json'},body:JSON.stringify(params)});
 if(window.__lxRealAuth?.user?.id!==id)throw Error('帳號已切換');
 if(!r.ok){let j={};try{j=await r.json()}catch{}throw Error(j.message||'HTTP '+r.status)}
 return r.json();
}
const reason={bag_not_found:'分享地點找不到分享袋',bag_damaged:'分享袋已破損',bag_number_mismatch:'分享袋編號與系統顯示不符',other:'其他'};
const status={reported:'已通報',investigating:'調查中',resolved:'已處理',closed:'已結案'};
const next={reported:'investigating',investigating:'resolved',resolved:'closed'};
const label={investigating:'開始調查',resolved:'完成處理',closed:'確認結案'};
function say(id,message,error=false){const n=$(id);if(n){n.textContent=message;n.style.color=error?'#b42318':'#08784c'}}
window.lxC09TestReasonChanged=function(){const n=$('lx-c09-test-other');if(n)n.hidden=$('lx-c09-test-reason')?.value!=='other'};
window.lxC09TestReport=async function(){
 const reason=$('lx-c09-test-reason')?.value,note=$('lx-c09-test-note')?.value.trim()||'',btn=$('lx-c09-test-send');
 if(reason==='other'&&note.length<5)return say('lx-c09-test-rider-status','其他異常請至少說明5字',true);
 btn.disabled=true;say('lx-c09-test-rider-status','正在建立獨立測試案件…');
 try{const id=await rpc('lx_c09_test_incident_report',{p_reason:reason,p_note:note});say('lx-c09-test-rider-status','✓ 測試案件建立：'+id+'。請切換總部端 → 分享袋物流 → 異常處理。')}
 catch(e){say('lx-c09-test-rider-status','建立失敗：'+e.message,true)}
 finally{btn.disabled=false}
};
window.lxC09TestList=async function(){
 const n=$('lx-c09-test-list');if(!n)return;
 say('lx-c09-test-hq-status','正在讀取測試案件…');
 try{
 const rows=await rpc('lx_c09_test_incident_list');
 if(!$('lx-c09-test-list'))return;
 n.innerHTML=rows.length?rows.map(c=>{
 const id=safe(c.id),to=next[c.status];
 return '<div style="border-top:1px solid #dce9e0;padding:12px 0"><b>'+safe(status[c.status])+'</b> · '+safe(reason[c.reason])+'<p class="muted" style="font-size:12px">測試案件 '+id.slice(0,8)+' · '+safe(new Date(c.created_at).toLocaleString('zh-TW'))+'</p>'+(c.note?'<p>'+safe(c.note)+'</p>':'')+(c.resolution_note?'<p>最近處理說明：'+safe(c.resolution_note)+'</p>':'')+(to?'<textarea id="lx-c09-test-note-'+id+'" class="field" rows="2" maxlength="2000" placeholder="處理說明至少5字"></textarea><button type="button" class="primary wide" onclick="lxC09TestUpdate(\''+id+'\',\''+to+'\')">'+label[to]+'</button>':'<p>✓ 測試案件已結案</p>')+'</div>';
 }).join(''):'目前沒有測試案件。';
 say('lx-c09-test-hq-status','已載入 '+rows.length+' 筆獨立測試案件。');
 }catch(e){n.textContent='讀取失敗';say('lx-c09-test-hq-status',e.message,true)}
};
window.lxC09TestUpdate=async function(id,to){
 const note=$('lx-c09-test-note-'+id)?.value.trim()||'';
 if(note.length<5)return say('lx-c09-test-hq-status','處理說明至少5字',true);
 try{await rpc('lx_c09_test_incident_update',{p_id:id,p_status:to,p_note:note});await window.lxC09TestList();say('lx-c09-test-hq-status','✓ 測試案件狀態更新，稽核紀錄已保存')}
 catch(e){say('lx-c09-test-hq-status',e.message,true)}
};
const rider=window.rider;
if(typeof rider==='function')window.rider=function(){
 const html=rider();
 const panel='<section class="card" id="lx-c09-test-rider"><h3 style="color:#08784c">C09 跨角色測試｜騎手通報</h3><p class="muted">僅限授權管理帳號。這是獨立測試案件，不會建立配送任務、取件紀錄或款項。</p><label>異常選項</label><select id="lx-c09-test-reason" class="field" onchange="lxC09TestReasonChanged()">'+Object.entries(reason).map(([v,t])=>'<option value="'+v+'">'+t+'</option>').join('')+'</select><div id="lx-c09-test-other" hidden><label>其他異常說明</label><textarea id="lx-c09-test-note" class="field" rows="2" placeholder="至少5字"></textarea></div><button id="lx-c09-test-send" class="primary wide" type="button" onclick="lxC09TestReport()">建立測試異常</button><p id="lx-c09-test-rider-status" role="status" aria-live="polite"></p></section>';
 return html+panel;
};
function mountTestHq(){
 const heading=[...document.querySelectorAll('h1,h2,h3')].find(n=>n.textContent.trim()==='異常處理');
 if(!heading)return;
 const root=heading.closest('.card')||heading.parentElement;
 if(!root||document.getElementById('lx-c09-test-hq'))return;
 const section=document.createElement('section');
 section.id='lx-c09-test-hq';section.className='card';section.style.marginTop='16px';
 section.innerHTML='<h3 style="color:#08784c">C09 跨角色測試｜總部案件</h3><p class="muted">獨立測試資料，不影響正式派單、簽收或賠償。</p><div id="lx-c09-test-list">讀取中…</div><p id="lx-c09-test-hq-status" role="status" aria-live="polite"></p><button class="secondary" type="button" onclick="lxC09TestList()">重新讀取測試案件</button>';
 root.insertAdjacentElement('afterend',section);
 setTimeout(()=>window.lxC09TestList(),100);
}
const observer=new MutationObserver(()=>mountTestHq());
function start(){observer.observe(document.body,{childList:true,subtree:true});mountTestHq()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();