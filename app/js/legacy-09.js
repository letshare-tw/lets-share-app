
/* V0.6.3w — 總部出貨四階段；沿用既有資料及操作 */
(function(){
 let shipStep='picked';
 const tabs=[['picked','揀貨完成'],['slip','出貨單完成'],['review','複核出物流'],['tracking','物流狀態']];
 function stage(o){
   const p=o.lxPickTicket||{}, f=o.shipment||{}, t=f.deliveryTracking||{};
   const sent=!!(f.handoffAt||f.handedAt||f.shippedAt||o.status==='總部已出貨'||['物流已收件','配送中','已送達'].includes(t.stage));
   if(sent||f.logisticsAt)return 'tracking';
   if(f.lxFinalCheckedAt)return 'tracking';
   if(f.number||f.packedAt)return 'review';
   if(p.pickedAt)return 'picked';
   return null;
 }
 function relevant(o){return v60OrderPhase(o)!=='done' && (v60OrderPhase(o)==='ship'||stage(o)!==null)}
 function show(){
  if(v60role!=='總部')return;
  const all=store.orders.filter(relevant).slice().sort((a,b)=>(Date.parse(b.createdAt||'')||0)-(Date.parse(a.createdAt||'')||0));
  const buckets={picked:[],slip:[],review:[],tracking:[]};
  all.forEach(o=>{const p=o.lxPickTicket||{},f=o.shipment||{};const sent=stage(o)==='tracking';
   if(sent)buckets.tracking.push(o);
   else if(f.lxDraftSavedAt||f.number||f.packedAt||f.lxFinalCheckedAt||f.status==='待物流交寄')buckets.review.push(o);
   else if(f.number||f.packedAt)buckets.slip.push(o);
   else if(p.pickedAt)buckets.picked.push(o);
   else buckets.picked.push(o); // 舊資料：尚未完成出貨單，仍須處理
  });
  // 出貨單完成為流程節點；已建單但尚未完成最終複核者也可從此檢視
  buckets.slip=all.filter(o=>!!o.shipment?.number && stage(o)!=='tracking');
  const c=buckets[shipStep]||[];
  const buttons=tabs.map(([key,label])=>`<button class="${shipStep===key?'primary':'secondary'}" style="font-size:14px;min-height:55px;padding:9px 5px" onclick="lxShipStep('${key}')">${label}<small style="display:block">${buckets[key].length}</small></button>`).join('');
  const cards=c.map(o=>{
    const p=o.lxPickTicket||{},f=o.shipment||{},status=String(f.deliveryTracking?.stage||o.status||'待處理');
    const urgent=shipStep==='picked'&&!f.number;
    let action='',label='查看／處理';
    if(shipStep==='tracking'){action=`v56Open('${safe(o.id)}')`;label='查看／更新物流狀態'}
    else if(shipStep==='review'){action=`lxShipFinalOpen('${safe(o.id)}')`;label='複核並交付物流'}
    else if(shipStep==='slip'){action=`v55OpenSlip('${safe(o.id)}')`;label='查看出貨單'}
    else {action=p.pickedAt?`v55OpenSlip('${safe(o.id)}')`:`v053OpenOrder('${safe(o.id)}')`;label=p.pickedAt?'建立／填寫出貨單':'查看／處理待出貨訂單'}
    return `<div class="card" style="${urgent?'border:2px solid #d43b35;background:#fffafa;':''}"><b>${safe(o.id)}</b><p class="muted">${o.lines.length} 件｜NT$ ${o.total}</p>${urgent?'<div style="background:#fee8e7;color:#b42320;border-radius:10px;padding:10px;font-weight:800">🔴 待完成出貨作業｜優先處理</div>':`<p>狀態：${safe(status)}</p>`}<p class="muted">揀貨：${p.pickedAt?'已完成':'待確認'}｜出貨單：${f.number?'已建立':'未建立'}｜物流：${safe(f.deliveryTracking?.stage||'尚未交寄')}</p><button class="primary wide" onclick="${action}">${label}</button></div>`;
  }).join('')||'<div class="card muted">目前沒有此階段訂單。</div>';
  screen(`<button class="secondary tiny" onclick="v60dashboard()">← 總部工作台</button><h2>訂單與集中倉</h2><p class="muted">出貨作業分為四個進度；完成交付後可追蹤物流。</p><div class="card"><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px"><button class="secondary" onclick="v60SetOrderTab('receive')">收貨</button><button class="secondary" onclick="v60SetOrderTab('pick')">揀貨</button><button class="primary" onclick="v60SetOrderTab('ship')">出貨</button><button class="secondary" onclick="v60SetOrderTab('done')">已完成</button></div></div><div class="card"><b>出貨作業進度</b><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:12px">${buttons}</div></div>${cards}`,'總部出貨四階段');
  document.getElementById('nav').innerHTML='';v60menu();
 }
 window.lxShipStep=function(k){if(!tabs.some(x=>x[0]===k))return;shipStep=k;show()};
 window.lxShipFinalOpen=function(id){
  const o=store.orders.find(x=>x.id===id);if(!o||!o.shipment)return alert('請先建立出貨單');
  const p=o.lxPickTicket||{},f=o.shipment;
  if(f.lxFinalCheckedAt)return alert('已完成最終複核');
  screen(`<button class="secondary tiny" onclick="lxShipStep('review')">← 返回複核出物流</button><div class="card"><h2>複核出物流</h2><p>訂單：${safe(o.id)}<br>出貨單：${safe(f.number||'待補')}</p><p class="muted">核對已封裝的實物、出貨單與物流標籤。最終確認後才標記交付物流。</p>${o.lines.map(x=>`<p>✓ ${safe(x.sku)}｜${safe(x.name)}</p>`).join('')}<p>揀貨員：${safe(p.picker||f.picker||'未記錄')}</p><label>最終複核人員代號<input class="field" id="lxShipReviewer" placeholder="請填寫人員代號"></label><label><input type="checkbox" id="lxShipPhysical"> 已核對商品、件數及封袋</label><label><input type="checkbox" id="lxShipLabel"> 已核對出貨單及物流標籤</label><button class="primary wide" onclick="lxShipFinalSave('${safe(id)}')">完成複核，準備交付物流</button></div>`,'複核出物流');document.getElementById('nav').innerHTML='';v60menu();
 };
 window.lxShipFinalSave=function(id){const o=store.orders.find(x=>x.id===id);if(!o||!o.shipment)return;const name=document.getElementById('lxShipReviewer')?.value.trim();if(!name)return alert('請填寫複核人員代號');if(name===(o.lxPickTicket?.picker||o.shipment.picker))return alert('最終複核人員不可與揀貨員相同');if(!document.getElementById('lxShipPhysical')?.checked||!document.getElementById('lxShipLabel')?.checked)return alert('請完成實物與物流標籤核對');o.shipment.lxFinalCheckedAt=new Date().toISOString();o.shipment.lxFinalChecker=name;o.events=o.events||[];o.events.push({at:o.shipment.lxFinalCheckedAt,text:'出物流前最終複核完成｜'+name});persist();alert('最終複核已完成，請接續操作物流交寄及追蹤。');shipStep='tracking';show()};
 const prev=window.v60hqOrders;
 window.v60hqOrders=function(){if(v60role==='總部'&&v60OrderTab==='ship')return show();return prev()};
})();
