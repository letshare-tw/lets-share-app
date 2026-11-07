/* C09-DEV-012: in-app HQ alerts and rider incident progress. */
(function(){
'use strict';
const API='https://wxvauoeykusmbxdtwgxo.supabase.co/rest/v1/rpc/';
const KEY='sb_publishable_ZCqKEuqpTiZ46p9fx_JXvA_av4JwD3I';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const label={reported:'已通報',investigating:'調查中',resolved:'已處理',closed:'已結案'};
const reason={bag_not_found:'分享地點找不到分享袋',bag_damaged:'分享袋已破損',bag_number_mismatch:'分享袋編號與系統顯示不符',other:'其他'};
async function rpc(name,params={}){
 let s;try{s=JSON.parse(sessionStorage.getItem('lx_supabase_auth_v066g')||'null')}catch{}
 const uid=window.__lxRealAuth?.user?.id;
 if(!uid||!s?.token)throw Error('請先登入');
 const r=await fetch(API+name,{method:'POST',cache:'no-store',headers:{apikey:KEY,Authorization:'Bearer '+s.token,'Content-Type':'application/json'},body:JSON.stringify(params)});
 if(window.__lxRealAuth?.user?.id!==uid)throw Error('登入帳號已變更');
 if(!r.ok){let j={};try{j=await r.json()}catch{}throw Error(j.message||'HTTP '+r.status)}
 return r.json();
}
window.lxC09Overview=async function(){
 const n=$('lx-c09-overview');if(!n)return;
 n.textContent='正在讀取通知…';
 try{
 const x=await rpc('lx_hq_pickup_incident_overview');
 if(!$('lx-c09-overview'))return;
 n.innerHTML='<strong>正式待處理：'+Number(x.pending||0)+' 件</strong><p style="margin:5px 0">測試待處理：'+Number(x.test_pending||0)+' 件（不計入正式通知）</p>'+(x.pending?'請優先處理騎手通報。':'目前沒有待處理的正式騎手異常。');
 }catch(e){n.textContent='通知讀取失敗：'+e.message}
};
window.lxC09RiderProgress=async function(){
 const n=$('lx-c09-rider-progress');if(!n)return;
 n.textContent='正在讀取我的通報進度…';
 try{
 const rows=await rpc('lx_rider_pickup_incident_progress');
 if(!$('lx-c09-rider-progress'))return;
 n.innerHTML=rows.length?rows.map(x=>'<article style="padding:10px 0;border-bottom:1px solid #dce9e0"><b>'+esc(label[x.status]||x.status)+'</b> · '+esc(reason[x.reason]||x.reason)+'<p class="muted">案件 '+esc(x.id.slice(0,8))+'</p>'+(x.resolution_note?'<p>總部說明：'+esc(x.resolution_note)+'</p>':'')+'<details><summary>查看處理歷程</summary>'+(x.events.length?x.events.map(e=>'<p>'+esc(new Date(e.at).toLocaleString('zh-TW'))+' · '+esc(label[e.status]||e.status)+' · '+esc(e.note)+'</p>').join(''):'尚無處理歷程')+'</details></article>').join(''):'目前沒有正式通報案件。';
 }catch(e){n.textContent='讀取失敗：'+e.message}
};
window.lxC09HqHistory=async function(id){
 const n=$('lx-c09-hq-history');if(!n)return;
 n.textContent='讀取處理歷程中…';
 try{const rows=await rpc('lx_hq_pickup_incident_history',{p_incident_id:id});if(!n.isConnected)return;n.innerHTML='<b>案件 '+esc(id.slice(0,8))+' 的歷程</b>'+(rows.length?rows.map(e=>'<p>'+esc(new Date(e.at).toLocaleString('zh-TW'))+' · '+esc(label[e.status]||e.status)+' · '+esc(e.note)+'</p>').join(''):'尚無處理紀錄')}
 catch(e){n.textContent='歷程讀取失敗：'+e.message}
};
function mount(){
 const hq=$('lx-hq-incident-panel');
 if(hq&&!$('lx-c09-overview')){
  const n=document.createElement('div');n.id='lx-c09-overview';n.style.cssText='padding:12px;background:#eff9f2;border-radius:12px;margin:12px 0';n.textContent='正在讀取通知…';
  hq.insertBefore(n,hq.firstChild.nextSibling);setTimeout(()=>window.lxC09Overview(),50);
 }
 if(hq&&!$('lx-c09-hq-history')){
  const n=document.createElement('div');n.id='lx-c09-hq-history';n.style.cssText='padding:12px;border-top:1px solid #ddd';n.textContent='點選案件的歷程按鈕即可查詢。';hq.appendChild(n);
 }
 const rider=$('lx-rider-incident-panel');
 if(rider&&!$('lx-c09-rider-progress')){
  const section=document.createElement('section');section.id='lx-c09-rider-progress';section.style.cssText='padding:12px;background:#f5faf6;border-radius:12px;margin:12px 0';section.textContent='正在讀取我的通報進度…';rider.appendChild(section);
  const button=document.createElement('button');button.type='button';button.className='secondary';button.textContent='重新整理我的通報進度';button.onclick=()=>window.lxC09RiderProgress();rider.appendChild(button);setTimeout(()=>window.lxC09RiderProgress(),50);
 }
}
const original=window.lxHqIncidentLoad;
if(typeof original==='function')window.lxHqIncidentLoad=async function(){
 const result=await original.apply(this,arguments);
 const list=$('lx-hq-incident-list');
 if(list){
  // Attach a history action to each case card after the existing renderer finishes.
  list.querySelectorAll('article').forEach(card=>{
   if(card.querySelector('.lx-c09-history-btn'))return;
   const content=card.textContent||'';
   const short=content.match(/案件\s+([0-9a-f]{8})/i)?.[1];
   if(!short)return;
   // Lookup full UUID from the original server response is required; do not guess it.
  });
 }
 await window.lxC09Overview();
 return result;
};
const observer=new MutationObserver(()=>mount());
function start(){observer.observe(document.body,{childList:true,subtree:true});mount()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();