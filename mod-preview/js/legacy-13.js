
/* V0.6.5b — 逐件複核已完成 → 儲存出貨單正式生效 → 物流作業
   不再要求重複「複核出物流」；物流商/託運號可在物流階段補登。
   此為離線模擬，並非真實物流商 API。 */
(function(){
 'use strict';
 const getOrder=id=>store.orders.find(o=>o.id===id);
 const oldOpen=window.v55OpenSlip;
 const oldTrack=window.v56Open;
 const oldAdvance=window.v56Advance;
 const oldHandoff=window.v55Handoff;
 const eligible=o=>!!(o?.lxPickTicket?.pickedAt&&o?.lxPickTicket?.checkedAt&&
  o.lxPickTicket.picker&&o.lxPickTicket.checker&&
  o.lxPickTicket.picker!==o.lxPickTicket.checker);
 const saved=o=>!!o?.shipment?.lxEffectiveAt;
 function showLogistics(id){
   window.lxV065ShipTab='tracking';
   window.v56Open(id);
 }
 window.v55OpenSlip=function(id){
   const o=getOrder(id);
   if(!o)return;
   if(!eligible(o)&&!o.shipment?.lxEffectiveAt&&!o.shipment?.handedAt)
     return alert('請先完成揀貨與不同人員的逐件複核');
   const r=oldOpen(id);
   const f=o.shipment,p=o.lxPickTicket||{};
   if(!f)return r;
   f.picker=p.picker||f.picker;
   f.checker=p.checker||f.checker;
   f.checked=(o.lines||[]).map(x=>x.sku);
   const picker=document.getElementById('v55picker'),checker=document.getElementById('v55checker');
   if(picker){picker.value=f.picker||'';picker.readOnly=true;}
   if(checker){checker.value=f.checker||'';checker.readOnly=true;checker.disabled=false;
     const label=checker.closest('label');if(label)label.style.display='';}
   const card=document.querySelector('.v55slip');
   if(card){
     card.querySelectorAll('.v55check').forEach(x=>{x.checked=true;x.disabled=true;});
     card.querySelectorAll('.v55actions p').forEach(x=>{
       if(x.textContent.includes('草稿')||x.textContent.includes('複核出物流'))x.remove();
     });
     const actions=card.querySelector('.v55actions');
     if(actions){
       actions.querySelectorAll('button').forEach(b=>{
         const t=b.textContent||'';
         if(t.includes('儲存出貨單')){b.textContent=saved(o)?'更新出貨單資料':'確認儲存出貨單，進入物流';b.onclick=()=>lxV065SaveToLogistics(id);b.style.display='';}
         if(t.includes('確認配貨完成')||t.includes('確認已交物流商'))b.style.display='none';
       });
       if(saved(o)){
         const b=document.createElement('button');
         b.className='primary wide';b.textContent='進入物流作業';
         b.onclick=()=>showLogistics(id);actions.prepend(b);
       }
     }
     const note=document.createElement('p');note.className='muted';
     note.textContent='揀貨及逐件複核已完成；出貨單儲存後立即進入物流。物流商與託運號可在物流階段登錄。';
     actions?.prepend(note);
   }
   return r;
 };
 window.lxV065SaveToLogistics=function(id){
   const o=getOrder(id);
   if(!o||!eligible(o))return alert('揀貨或逐件複核紀錄不完整');
   if(!((o.lines||[]).length>0 && o.lines.every(x=>x.sku) && typeof v54init==='function' && v54init(o).length===o.lines.length && v54init(o).every(t=>t.stage==='總部已簽收')))return alert('尚未完成商品入倉簽收');
   const f=o.shipment,p=o.lxPickTicket;
   if(!f)return alert('出貨單尚未建立，請重新開啟出貨單');
   const val=x=>(document.getElementById(x)?.value||'').trim();
   const recipient=val('v55name'),phone=val('v55phone'),address=val('v55addr');
   if(!recipient||!phone||!address)return alert('請先填妥收件人、電話及寄送地址／門市');
   f.recipient=recipient;f.phone=phone;f.address=address;
   f.method=val('v55method')||f.method||'宅配';
   f.carrier=val('v55carrier')||f.carrier||'';f.tracking=val('v55track')||f.tracking||'';
   f.picker=p.picker;f.checker=p.checker;f.checked=o.lines.map(x=>x.sku);
   const at=new Date().toISOString();
   if(!f.lxEffectiveAt){
     f.lxEffectiveAt=at;
     f.lxFinalCheckedAt=p.checkedAt;
     f.lxFinalChecker=p.checker;
     f.lxDraft=false;
     o.events=o.events||[];
     o.events.push({at,text:'揀貨員 '+p.picker+'、複核員 '+p.checker+' 完成核對；電子出貨單正式儲存，進入物流'});
   }else{
     o.events=o.events||[];
     o.events.push({at,text:'總部更新電子出貨單收件與物流資料'});
   }
   if(!f.handedAt&&!f.shippedAt){
     f.status='待物流交寄';
     o.status='待物流交寄';
   }
   persist();
   toast('出貨單已儲存，進入物流作業');
   showLogistics(id);
   return true;
 };
 // 舊按鈕或其他頁面呼叫也走同一流程。
 window.v55Save=window.lxV065SaveToLogistics;
 window.v55Pick=function(id){return window.lxV065SaveToLogistics(id)};
 window.lxShipFinalOpen=function(id){
   const o=getOrder(id);
   if(!o)return;
   if(!eligible(o))return alert('請先完成逐件複核');
   if(!saved(o))return window.v55OpenSlip(id);
   showLogistics(id);
 };
 window.lxShipFinalSave=function(id){
   const o=getOrder(id);
   if(!o)return;
   if(!saved(o))return alert('請先儲存出貨單');
   showLogistics(id);
 };
 window.v56Open=function(id){
   const o=getOrder(id);
   if(!o||!saved(o))return alert('請先儲存出貨單，再進入物流程序');
   const r=oldTrack(id);
   const main=document.querySelector('main');
   if(main&&!document.getElementById('lxV065Logistics')){
     const f=o.shipment;
     const div=document.createElement('div');
     div.id='lxV065Logistics';div.className='card';
     div.innerHTML=`<h3>物流交寄資料</h3>
       <p class="muted">出貨單已生效，以下為物流作業資料；尚未交寄不代表物流已收件。</p>
       <label>物流商<input class="v053-field" id="lxV065Carrier" value="${safe(f.carrier||'')}" placeholder="例如：7-Eleven"></label>
       <label>託運單號<input class="v053-field" id="lxV065Tracking" value="${safe(f.tracking||'')}" placeholder="請輸入實際託運單號"></label>
       <button class="primary wide" onclick="lxV065SaveLogistics('${safe(id)}')">儲存物流資料</button>`;
     main.insertBefore(div,main.children[1]||null);
   }
   return r;
 };
 window.lxV065SaveLogistics=function(id){
   const o=getOrder(id);
   if(!o||!saved(o))return alert('出貨單尚未生效');
   const carrier=(document.getElementById('lxV065Carrier')?.value||'').trim();
   const tracking=(document.getElementById('lxV065Tracking')?.value||'').trim();
   if(!carrier||!tracking)return alert('請填寫物流商與託運單號');
   o.shipment.carrier=carrier;o.shipment.tracking=tracking;
   o.events=o.events||[];
   o.events.push({at:new Date().toISOString(),text:'總部登錄物流商與託運單號（尚未確認實際交寄）'});
   persist();toast('物流資料已儲存');window.v56Open(id);
 };
 window.v56Advance=function(id){
   const o=getOrder(id);
   if(!o||!saved(o))return alert('請先完成出貨單');
   const stage=o.shipment?.deliveryTracking?.stage||'待物流交寄';
   if(stage==='待物流交寄'&&(!o.shipment.carrier||!o.shipment.tracking))
     return alert('請先儲存物流商與託運單號，才能更新為物流已收件');
   return oldAdvance(id);
 };
 window.v55Handoff=function(id){
   const o=getOrder(id);
   if(!o||!saved(o))return alert('請先儲存出貨單');
   if(!o.shipment.carrier||!o.shipment.tracking)return alert('請先完成物流資料');
   return oldHandoff(id);
 };
 // 修正出貨分頁：已儲存出貨單即列入「物流」，不再等待第二次複核。
 const oldList=window.v60hqOrders;
 window.v60hqOrders=function(){
   if(v60role!=='總部'||v60OrderTab!=='ship')return oldList();
   const orders=store.orders.filter(o=>v60OrderPhase(o)!=='done'&&
     (v60OrderPhase(o)==='ship'||o.lxPickTicket?.pickedAt||o.shipment))
     .sort((a,b)=>(Date.parse(b.createdAt||'')||0)-(Date.parse(a.createdAt||'')||0));
   const buckets={picked:[],review:[],slip:[],tracking:[]};
   orders.forEach(o=>{
     if(saved(o)||o.shipment?.handedAt)buckets.tracking.push(o);
     else if(eligible(o))buckets.slip.push(o);
     else if(o.lxPickTicket?.pickedAt)buckets.review.push(o);
     else buckets.picked.push(o);
   });
   const tabs=[['picked','揀貨完成'],['review','複核揀貨'],['slip','出貨單'],['tracking','物流']];
   let active=window.lxV065ShipTab;
   if(!active||!buckets[active]?.length)active=['review','slip','tracking','picked'].find(x=>buckets[x].length)||'picked';
   window.lxV065ShipTab=active;
   const tabsHTML=tabs.map(([k,label])=>`<button class="${active===k?'primary':'secondary'}" style="min-height:58px;padding:8px 4px" onclick="lxV065ShipTabSet('${k}')">${label}<small style="display:block">${buckets[k].length}</small></button>`).join('');
   const cards=buckets[active].map(o=>{
     const p=o.lxPickTicket||{},f=o.shipment||{};
     const action=active==='review'?`lxV065Review('${safe(o.id)}')`:active==='slip'?`v55OpenSlip('${safe(o.id)}')`:active==='tracking'?`v56Open('${safe(o.id)}')`:`v60SetOrderTab('pick')`;
     const label=active==='review'?'進行逐件複核':active==='slip'?'確認並儲存出貨單':active==='tracking'?'進入物流作業':'返回揀貨';
     return `<div class="card"><b>${safe(o.id)}</b><p class="muted">${o.lines.length} 件｜NT$ ${o.total}</p>
       <p>揀貨員：${safe(p.picker||'未登錄')}｜複核員：${safe(p.checker||'待複核')}</p>
       <p class="muted">出貨單：${f.lxEffectiveAt?'已儲存':'待儲存'}｜物流：${safe(f.deliveryTracking?.stage||'尚未交寄')}</p>
       <button class="primary wide" onclick="${action}">${label}</button></div>`;
   }).join('')||'<div class="card muted">此階段目前沒有訂單。</div>';
   screen(`<button class="secondary tiny" onclick="v60dashboard()">← 總部工作台</button>
     <h2>訂單與集中倉</h2><p class="muted">揀貨完成 → 複核揀貨 → 出貨單儲存 → 物流。</p>
     <div class="card"><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">
     <button class="secondary" onclick="v60SetOrderTab('receive')">收貨</button>
     <button class="secondary" onclick="v60SetOrderTab('pick')">揀貨</button>
     <button class="primary" onclick="v60SetOrderTab('ship')">出貨</button>
     <button class="secondary" onclick="v60SetOrderTab('done')">已完成</button>
     </div></div><div class="card"><b>出貨流程</b><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px">${tabsHTML}</div></div>${cards}`,
     '總部出貨作業');
   document.getElementById('nav').innerHTML='';v60menu();
 };
 window.lxV065ShipTabSet=function(k){
   if(!['picked','review','slip','tracking'].includes(k))return;
   window.lxV065ShipTab=k;
   window.v60hqOrders();
 };
})();
