
/* V0.6.3y: draft shipping slip and independent final reviewer activation. */
(function(){
 const originalOpen=window.v55OpenSlip;
 window.v55OpenSlip=function(id){
   const result=originalOpen.apply(this,arguments);
   const checker=document.getElementById('v55checker');
   if(checker){
     const label=checker.closest('label');if(label)label.style.display='none';
     checker.value='';checker.disabled=true;
     const actions=document.querySelector('.v55actions');
     if(actions){
       actions.querySelectorAll('button').forEach(b=>{
         const t=b.textContent||'';
         if(t.includes('確認配貨完成')||t.includes('確認已交物流商'))b.style.display='none';
         if(t.includes('儲存出貨單'))b.textContent='儲存出貨單草稿';
       });
       const hint=document.createElement('p');hint.className='v053-muted';
       hint.textContent='此階段僅建立及儲存出貨單草稿；複核人員代號須至「複核出物流」填寫，複核通過後出貨單才正式生效。';
       actions.prepend(hint);
     }
   }
   return result;
 };
 const originalSave=window.v55Save;
 window.v55Save=function(id){
   const o=store.orders.find(x=>x.id===id);if(!o)return false;
   const ok=originalSave.apply(this,arguments);
   if(ok&&o.shipment&&!o.shipment.lxFinalCheckedAt){
     o.shipment.checker='';o.shipment.lxDraftSavedAt=new Date().toISOString();
     o.shipment.lxDraft=true;
     o.events=o.events||[];o.events.push({at:o.shipment.lxDraftSavedAt,text:'出貨單草稿已儲存，等待獨立複核生效'});
     persist();toast('出貨單草稿已儲存，請至複核出物流完成審核');
   }
   return ok;
 };
 window.v55Pick=function(){alert('出貨單草稿不需要在此核對。請至「複核出物流」完成複核後正式生效。')};
 const oldHandoff=window.v55Handoff;
 window.v55Handoff=function(id){
   const o=store.orders.find(x=>x.id===id);
   if(!o?.shipment?.lxFinalCheckedAt)return alert('請先由獨立複核人員在「複核出物流」完成複核，出貨單生效後才能交運。');
   return oldHandoff.apply(this,arguments);
 };
 window.lxShipFinalOpen=function(id){
   const o=store.orders.find(x=>x.id===id);if(!o?.shipment)return alert('請先建立並儲存出貨單草稿');
   const f=o.shipment,p=o.lxPickTicket||{};
   if(f.lxFinalCheckedAt)return alert('本張出貨單已完成複核並正式生效');
   if(!f.lxDraftSavedAt&&!f.number)return alert('請先儲存出貨單草稿');
   screen(`<button class="secondary tiny" onclick="lxShipStep('review')">← 返回複核出物流</button><div class="card"><h2>複核出物流</h2><p>訂單：${safe(o.id)}<br>出貨單：${safe(f.number||'待補')}</p><p class="muted">出貨單目前為草稿，複核通過才正式生效。請核對實際商品、出貨單及物流標籤。</p>${o.lines.map(x=>`<p>□ ${safe(x.sku)}｜${safe(x.name)}</p>`).join('')}<p>揀貨員：${safe(p.picker||f.picker||'未記錄')}</p><label>複核人員代號<input class="field" id="lxShipReviewer" placeholder="由複核人員輸入代號"></label><label><input type="checkbox" id="lxShipPhysical"> 已核對商品、件數及封袋</label><label><input type="checkbox" id="lxShipLabel"> 已核對出貨單及物流標籤</label><button class="primary wide" onclick="lxShipFinalSave('${safe(id)}')">確認複核並使出貨單正式生效</button></div>`,'複核出物流');
   document.getElementById('nav').innerHTML='';v60menu();
 };
 window.lxShipFinalSave=function(id){
   const o=store.orders.find(x=>x.id===id);if(!o?.shipment)return;
   const f=o.shipment,name=document.getElementById('lxShipReviewer')?.value.trim();
   if(f.lxFinalCheckedAt)return alert('出貨單已生效，請勿重複複核');
   if(!name)return alert('請輸入複核人員代號');
   if(name===(o.lxPickTicket?.picker||f.picker))return alert('複核人員不可與揀貨人員相同');
   if(!document.getElementById('lxShipPhysical')?.checked||!document.getElementById('lxShipLabel')?.checked)return alert('請完成商品、封袋及物流標籤核對');
   if(!f.recipient||!f.phone||!f.address||!f.carrier)return alert('出貨單收件與物流資料尚未填妥，請返回草稿補齊');
   f.checker=name;f.lxFinalChecker=name;f.lxFinalCheckedAt=new Date().toISOString();
   f.lxDraft=false;f.lxEffectiveAt=f.lxFinalCheckedAt;
   f.status='複核完成，待物流交寄';o.status='待物流交寄';
   o.events=o.events||[];o.events.push({at:f.lxFinalCheckedAt,text:'複核員 '+name+' 核准出貨單正式生效，待物流交寄'});
   persist();alert('複核完成！出貨單已正式生效，接下來可辦理物流交寄。');lxShipStep('tracking');
 };
})();
