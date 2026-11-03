
/* V0.6.5a — 揀貨→逐件複核→出貨單→物流；僅本機互動原型修補。 */
(function(){
 'use strict';
 const oldOrders=window.v60hqOrders;
 const oldSlip=window.v55OpenSlip;
 const oldSave=window.v55Save;
 const oldPick=window.v55Pick;
 const oldHandoff=window.v55Handoff;
 const oldFinal=window.lxShipFinalSave;
 const order=id=>store.orders.find(o=>o.id===id);
 const ticket=o=>o&&o.lxPickTicket||{};
 const delivered=o=>!!(o.shipment?.handedAt||o.shipment?.handoffAt||o.shipment?.shippedAt||
   o.status==='總部已出貨'||['物流已收件','配送中','已送達'].includes(o.shipment?.deliveryTracking?.stage));
 function syncPeople(o){
   const p=ticket(o),f=o.shipment;
   if(!f||!p.checkedAt)return;
   f.picker=p.picker;
   f.checker=p.checker;
   f.checked=(o.lines||[]).map(x=>x.sku);
 }
 function canSlip(o){
   const p=ticket(o);
   return !!(p.pickedAt&&p.checkedAt&&p.picker&&p.checker&&p.picker!==p.checker);
 }
 window.lxV065Review=function(id){
   const o=order(id);
   if(!o||!ticket(o).pickedAt)return alert('請先完成揀貨');
   if(ticket(o).checkedAt)return alert('此訂單已完成揀貨複核');
   // 舊有逐件複核流程會檢查 duty，沿用其原始檢核與紀錄。
   if(typeof lxDutySet==='function')lxDutySet('複核出貨');
   window.lxReviewOpen(id);
 };
 window.v55OpenSlip=function(id){
   const o=order(id);
   if(!o)return;
   if(!canSlip(o)&&!delivered(o))return alert('請先完成揀貨與不同人員的逐件複核，才能開啟出貨單');
   syncPeople(o);
   const result=oldSlip(id);
   // 揀貨／複核編號來自已核對的內部揀貨單，不讓出貨單另行改寫。
   const picker=document.getElementById('v55picker');
   const checker=document.getElementById('v55checker');
   if(picker&&ticket(o).picker){picker.value=ticket(o).picker;picker.readOnly=true;}
   if(checker&&ticket(o).checker){checker.value=ticket(o).checker;checker.readOnly=true;}
   return result;
 };
 window.v55Save=function(id){
   const o=order(id);
   if(!o||(!canSlip(o)&&!delivered(o)))return alert('未完成揀貨複核，不得儲存出貨單');
   syncPeople(o);
   const picker=document.getElementById('v55picker'),checker=document.getElementById('v55checker');
   if(picker)picker.value=ticket(o).picker||picker.value;
   if(checker)checker.value=ticket(o).checker||checker.value;
   const result=oldSave(id);
   syncPeople(o);
   persist();
   return result;
 };
 window.v55Pick=function(id){
   const o=order(id);
   if(!o||!canSlip(o))return alert('須先完成不同人員的逐件複核');
   return oldPick(id);
 };
 window.v55Handoff=function(id){
   const o=order(id);
   if(!o||!canSlip(o))return alert('尚未完成揀貨複核');
   if(!o.shipment?.lxFinalCheckedAt)return alert('請先完成出貨單複核並正式生效，再交付物流');
   return oldHandoff(id);
 };
 window.lxShipFinalSave=function(id){
   const o=order(id);
   if(!o||!canSlip(o))return alert('揀貨逐件複核尚未完成，不得核准出貨單');
   syncPeople(o);
   return oldFinal(id);
 };
 window.lxV065ShipOpen=function(id){
   const o=order(id);
   if(!o)return;
   if(!canSlip(o))return window.lxV065Review(id);
   window.v55OpenSlip(id);
 };
 window.lxV065Tracking=function(id){
   const o=order(id);
   if(!o)return;
   if(!o.shipment?.lxFinalCheckedAt&&!delivered(o))return alert('出貨單尚未正式生效，不能進入物流交寄');
   window.v56Open(id);
 };
 window.v60hqOrders=function(){
   if(v60role!=='總部'||v60OrderTab!=='ship')return oldOrders();
   const all=store.orders.slice().filter(o=>{
     const p=ticket(o);
     return v60OrderPhase(o)==='ship'||!!p.pickedAt||!!o.shipment;
   }).filter(o=>v60OrderPhase(o)!=='done')
     .sort((a,b)=>(Date.parse(b.createdAt||'')||0)-(Date.parse(a.createdAt||'')||0));
   const steps=[
     ['picked','揀貨完成'],
     ['review','複核揀貨'],
     ['slip','出貨單'],
     ['tracking','物流']
   ];
   let active=window.lxV065ShipTab||'picked';
   const groups={picked:[],review:[],slip:[],tracking:[]};
   all.forEach(o=>{
     const p=ticket(o),f=o.shipment||{};
     if(delivered(o)||f.lxFinalCheckedAt)groups.tracking.push(o);
     else if(p.checkedAt)groups.slip.push(o);
     else if(p.pickedAt)groups.review.push(o);
     else groups.picked.push(o);
   });
   // 切換到出貨頁時，優先顯示有待辦的下一階段。
   if(!window.lxV065ShipTab){
     active=['review','slip','picked','tracking'].find(k=>groups[k].length)||'picked';
   }
   const buttons=steps.map(([k,label])=>`<button class="${active===k?'primary':'secondary'}" style="min-height:56px;padding:8px 3px;font-size:13px" onclick="lxV065ShipTabSet('${k}')">${label}<small style="display:block">${groups[k].length}</small></button>`).join('');
   const cards=groups[active].map(o=>{
     const p=ticket(o),f=o.shipment||{};
     let action,label;
     if(active==='review'){action=`lxV065Review('${safe(o.id)}')`;label='逐件複核揀貨';}
     else if(active==='slip'){action=`lxV065ShipOpen('${safe(o.id)}')`;label='填寫／查看出貨單';}
     else if(active==='tracking'){action=`lxV065Tracking('${safe(o.id)}')`;label='物流交寄／追蹤';}
     else {action=`v60SetOrderTab('pick')`;label='返回揀貨處理';}
     return `<div class="card"><b>${safe(o.id)}</b><p class="muted">${(o.lines||[]).length} 件｜NT$ ${safe(o.total||0)}</p>
       <p>揀貨員：<b>${safe(p.picker||'尚未登錄')}</b></p>
       <p>揀貨：${p.pickedAt?'已完成':'未完成'}｜複核：${p.checkedAt?'已完成':'待逐件複核'}｜出貨單：${f.number?safe(f.number):'尚未建立'}</p>
       <button class="primary wide" onclick="${action}">${label}</button></div>`;
   }).join('')||'<div class="card muted">此階段目前沒有訂單。</div>';
   screen(`<button class="secondary tiny" onclick="v60dashboard()">← 總部工作台</button>
     <h2>訂單與集中倉</h2>
     <p class="muted">正確流程：揀貨完成 → 不同人員逐件複核 → 出貨單 → 物流交寄。</p>
     <div class="card"><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">
       <button class="secondary" onclick="v60SetOrderTab('receive')">收貨</button>
       <button class="secondary" onclick="v60SetOrderTab('pick')">揀貨</button>
       <button class="primary" onclick="v60SetOrderTab('ship')">出貨</button>
       <button class="secondary" onclick="v60SetOrderTab('done')">已完成</button>
     </div></div>
     <div class="card"><b>出貨作業進度</b><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px">${buttons}</div></div>${cards}`,
     '總部出貨作業');
   document.getElementById('nav').innerHTML='';
   v60menu();
 };
 window.lxV065ShipTabSet=function(k){
   if(!['picked','review','slip','tracking'].includes(k))return;
   window.lxV065ShipTab=k;
   window.v60hqOrders();
 };
})();
