
/* V0.6.4b: Single source of truth for HQ stage badges; hide redundant job-role card. */
(function(){
  const labels={receive:'收貨',pick:'揀貨',ship:'出貨',done:'已完成'};
  function refresh(){
    try{
      if(typeof v60role==='undefined'||v60role!=='總部')return;
      const main=document.querySelector('main');if(!main)return;
      const heading=main.textContent||'';
      if(!heading.includes('訂單與集中倉'))return;
      // The old picking extension injects a duplicate role panel. Remove only that panel.
      main.querySelectorAll('.card').forEach(el=>{
        const b=el.querySelector('b');
        if(b&&b.textContent.trim()==='倉庫作業職位')el.remove();
      });
      if(typeof store==='undefined'||typeof v60OrderPhase!=='function')return;
      const counts={receive:0,pick:0,ship:0,done:0};
      store.orders.forEach(o=>{const phase=v60OrderPhase(o);if(Object.prototype.hasOwnProperty.call(counts,phase))counts[phase]++});
      main.querySelectorAll('button[onclick*="v60SetOrderTab"]').forEach(btn=>{
        const m=(btn.getAttribute('onclick')||'').match(/v60SetOrderTab\(['"](receive|pick|ship|done)['"]\)/);
        if(!m)return;
        const phase=m[1],number=String(counts[phase]);
        const badge=btn.querySelector('.lx-stage-count');
        if(badge){const value='（'+number+'）';if(badge.textContent!==value)badge.textContent=value;return;}
        const small=btn.querySelector('small');if(small){if(small.textContent!==number)small.textContent=number;return;}
      });
    }catch(e){console.warn('HQ badge sync',e)}
  }
  let busy=false;
  const observer=new MutationObserver(()=>{
    if(busy)return;
    busy=true;try{refresh()}finally{busy=false}
  });
  function boot(){observer.observe(document.body,{subtree:true,childList:true});refresh()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
