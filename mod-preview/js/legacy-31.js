/* C09-DEV-010A: mount headquarters incident queue inside actual logistics incident subpage. */
(function(){
'use strict';
let busy=false;
function mount(){
 if(busy)return;
 const existing=document.getElementById('lx-hq-incident-panel');
 const heading=[...document.querySelectorAll('h1,h2,h3')].find(n=>n.textContent.trim()==='異常處理');
 if(!heading||!heading.isConnected)return;
 // Only attach to the logistics incident subpage, not generic homepage headings.
 const root=heading.closest('.card')||heading.parentElement;
 if(!root)return;
 if(existing&&existing.isConnected){
  if(root.contains(existing)||existing.previousElementSibling===root)return;
  // Remove duplicated panel from another visible location before relocating.
  existing.remove();
 }
 const section=document.createElement('section');
 section.id='lx-hq-incident-panel';
 section.className='card';
 section.style.marginTop='16px';
 section.innerHTML='<h3 style="color:#08784c">騎手取件異常案件管理</h3><p class="muted">統一管理騎手現場通報。總部權限由伺服器驗證；處理過程會留下稽核紀錄。</p><div id="lx-hq-incident-list">讀取中…</div><p id="lx-hq-incident-notice" role="status" aria-live="polite"></p><button class="secondary" type="button" onclick="lxHqIncidentLoad()">重新整理案件</button>';
 root.insertAdjacentElement('afterend',section);
 busy=true;
 Promise.resolve().then(()=>window.lxHqIncidentLoad?.()).finally(()=>{busy=false});
}
const observer=new MutationObserver(()=>{if(!busy)mount()});
function start(){observer.observe(document.body,{childList:true,subtree:true});mount()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();