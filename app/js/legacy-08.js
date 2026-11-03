
(function(){
 const icons={
 receive:'<path d="M5 12h14l5 5v13H5z"/><path d="M19 12v5h5M5 12l7-5 7 5M12 7v12"/>',
 pick:'<rect x="7" y="7" width="18" height="24" rx="2"/><path d="M12 7V5h8v2M11 14h10M11 19h10M11 24h7"/>',
 ship:'<path d="M4 10h17v16H4zM21 15h6l5 7v4H21z"/><circle cx="10" cy="27" r="3"/><circle cx="26" cy="27" r="3"/>',
 done:'<circle cx="18" cy="18" r="14"/><path d="m11 18 5 5 10-11"/>'};
 const stages={receive:'收貨',pick:'揀貨',ship:'出貨',done:'已完成'};
 function update(){
  const main=document.querySelector('main');if(!main)return;
  const buttons=Array.from(main.querySelectorAll('button[onclick*="v60SetOrderTab"]'));
  if(buttons.length!==4)return;
  const parent=buttons[0].parentElement;if(!parent||!buttons.every(b=>b.parentElement===parent))return;
  parent.classList.add('lx-order-stages');
  buttons.forEach(b=>{
   const match=(b.getAttribute('onclick')||'').match(/v60SetOrderTab\(['"](receive|pick|ship|done)['"]\)/);if(!match)return;
   const stage=match[1],count=b.querySelector('small')?.textContent.trim()||'0';
   if(b.dataset.lxStageDone==='1')return;
   const selected=b.classList.contains('primary');
   b.dataset.lxStageDone='1';b.dataset.stage=stage;
   b.className='lx-stage-tile'+(selected?' lx-stage-selected':'');
   b.removeAttribute('style');
   b.innerHTML='<span class="lx-stage-icon"><svg viewBox="0 0 36 36" aria-hidden="true">'+icons[stage]+'</svg></span><span class="lx-stage-label">'+stages[stage]+'<span class="lx-stage-count">（'+count+'）</span></span>';
  });
 }
 const obs=new MutationObserver(update);
 function start(){obs.observe(document.body,{childList:true,subtree:true});update()}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
