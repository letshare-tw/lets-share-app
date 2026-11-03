
// V0.5.3: standalone local demo orders, no external payment, shipment, or server lock.
(function(){
'use strict';
const inventoryBridge=window.v05InventoryBridge;
if(!inventoryBridge)throw new Error('V0.5 庫存模組尚未載入');
const inventory=inventoryBridge.inventory;
const saveInv=inventoryBridge.save;
const priceNow=inventoryBridge.price;
const K='lexiangjia-v053-orders';let store={orders:[],buyer:{name:'',phone:'',address:''}};
try{const t=JSON.parse(localStorage.getItem(K));if(t&&Array.isArray(t.orders))store=t}catch(e){}
function persist(){try{localStorage.setItem(K,JSON.stringify(store))}catch(e){alert('訂單資料無法保存，請檢查儲存空間')}}
function safe(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
// V0.6.1z: an order is the authority for one-of-one inventory, even if an old
// version did not persist its inventory status correctly. Cancelled orders release it.
function v053ActiveOrders(){return store.orders.filter(o=>o.status!=='已取消'&&o.status!=='取消'&&!o.cancelledAt)}
function v053OccupiedSkus(){return new Set(v053ActiveOrders().flatMap(o=>(o.lines||[]).map(l=>l.sku).filter(Boolean)))}
function v053OccupiedIds(){return new Set(v053ActiveOrders().flatMap(o=>(o.lines||[]).map(l=>Number(l.id)).filter(Number.isFinite)))}
window.v053OccupiedSkus=v053OccupiedSkus;
function v053IsOccupied(id){const r=real(id);return v053OccupiedIds().has(Number(id))||(r?.sku&&v053OccupiedSkus().has(r.sku))}
function v053ReconcileInventory(){let changed=false;const occupied=v053OccupiedSkus();Object.values(inventory).forEach(r=>{if(occupied.has(r.sku)&&r.status==='在架'){r.status='訂單鎖定';changed=true}});if(changed)saveInv()}
function real(id){return Object.values(inventory).find(x=>x.id===Number(id))}
function lookup(id){return products.find(x=>x.id===Number(id))}
function price(id){const r=real(id);return r?priceNow(r):Number(lookup(id)?.price||0)}
function orderLines(order){return order.lines.map(x=>`<div class="v053-orderline v053-summary"><div><b>${safe(x.name)}</b><div class="v053-muted">${safe(x.sku||'示範商品')}｜NT$ ${x.price}</div></div><span class="v053-tag">1 件</span></div>`).join('')}
function screen(body,title){document.getElementById('app').innerHTML=headerMarkup(title)+`<main class="main">${body}</main>`;nav()}
function pruneCart(){const old=data.cart.length;data.cart=data.cart.filter(id=>{const r=real(id),p=lookup(id);return !!p&&!v053IsOccupied(id)&&(!r||r.status==='在架')&&Number.isFinite(price(id))&&price(id)>0});if(data.cart.length!==old){save();toast('已清除舊版本失效的購物車項目，請重新加入商品')}}
window.addcart=function(id){const r=real(id);if(v053IsOccupied(id)||(r&&r.status!=='在架')){toast('此件衣物已有有效訂單，不能重複購買');return false}if(data.cart.includes(id)){toast('這件衣物已在購物車');return true}data.cart.push(id);save();toast('已加入購物車（尚未鎖定庫存）');return true};
window.v053BuyNow=function(id){if(addcart(id))go('checkout')};
window.v053Remove=function(id){data.cart=data.cart.filter(x=>x!==id);save();render()};
window.cart=function(){pruneCart();let ids=[...new Set(data.cart)],total=ids.reduce((n,id)=>n+price(id),0);return headerMarkup('購物車')+`<main class="main"><h2 class="title">我的購物車 (${ids.length})</h2>${ids.length?ids.map(id=>{let p=lookup(id),r=real(id);return `<div class="card v053-summary"><div><b>${safe(p?.name||r?.name||'商品')}</b><p class="v053-muted">${safe(r?.sku||'示範商品')}｜NT$ ${price(id)}</p></div><button class="secondary tiny" onclick="v053Remove(${id})">移除</button></div>`}).join('')+`<div class="card"><div class="v053-summary"><b>商品小計</b><span class="v053-total">NT$ ${total}</span></div><p class="v053-muted">加入購物車不保留商品。確認建立訂單時才會鎖定真實上架衣物；其他裝置尚未同步。</p><button class="primary wide" onclick="go('checkout')">前往模擬結帳</button></div>`:'<div class="card"><p>購物車是空的。</p><button class="primary wide" onclick="go(\'categories\')">繼續逛逛</button></div>'}</main>`};
function checkout(){pruneCart();let ids=[...new Set(data.cart)];if(!ids.length){screen('<div class="card">購物車沒有可結帳商品。<button class="primary wide" onclick="go(\'categories\')">返回商城</button></div>','結帳');return}let total=ids.reduce((n,id)=>n+price(id),0);screen(`<button class="secondary tiny" onclick="go('cart')">← 返回購物車</button><div class="card"><h2>確認模擬訂單</h2>${ids.map(id=>`<div class="v053-orderline v053-summary"><span>${safe(lookup(id)?.name||real(id)?.name||'商品')}</span><b>NT$ ${price(id)}</b></div>`).join('')}<div class="v053-summary" style="margin-top:16px"><b>商品總計</b><span class="v053-total">NT$ ${total}</span></div><p class="v053-muted">運費與免運門檻尚未定案，本次不收取、不計算運費。請勿輸入真實個資，僅使用測試資料。</p></div><div class="card"><h3>模擬收件資料</h3><label>收件人（測試名稱）</label><input id="v053name" class="v053-field" value="${safe(store.buyer.name)}" placeholder="測試會員"><label>電話（測試號碼）</label><input id="v053phone" class="v053-field" value="${safe(store.buyer.phone)}" placeholder="例如 0900000000"><label>配送資訊（測試用）</label><input id="v053address" class="v053-field" value="${safe(store.buyer.address)}" placeholder="例如 台南測試集貨站"><p class="v053-muted">點選確認後立即建立本機模擬訂單並鎖定庫存；不會真正付款或配送。</p><button class="primary wide" onclick="v053Place()">確認建立模擬訂單</button></div>`,'模擬結帳')}
window.v053Place=function(){const name=document.getElementById('v053name')?.value.trim(),phone=document.getElementById('v053phone')?.value.trim(),address=document.getElementById('v053address')?.value.trim();if(!name||!phone||!address){alert('請先填寫三項測試收件資料');return}pruneCart();const ids=[...new Set(data.cart)];if(!ids.length){alert('沒有可結帳商品');go('cart');return}for(const id of ids){const r=real(id);if(v053IsOccupied(id)||(r&&r.status!=='在架')){alert('此件衣物已被其他訂單購買，無法重複結帳');go('cart');return}}
const lines=ids.map(id=>{const p=lookup(id),r=real(id);return {id,sku:r?.sku||null,name:p?.name||r?.name||'商品',price:price(id),bag:r?.bag||null,keeper:(r?.bag&&(v03[r.bag]?.keeperId||getbag(r.bag)?.receivedBy))||null}});
const number='LX-ORD-'+new Date().toISOString().replace(/\D/g,'').slice(0,14)+'-'+String(store.orders.length+1).padStart(3,'0');const order={id:number,createdAt:new Date().toISOString(),status:'待職人包裝',payment:'模擬付款成功（無真實交易）',buyer:{name,phone,address},lines,total:lines.reduce((s,x)=>s+x.price,0),events:[{at:new Date().toISOString(),text:'本機模擬訂單成立，商品已鎖定'}]};
lines.forEach(x=>{if(x.sku){const r=inventory[x.sku];if(r){r.status='訂單鎖定';r.orderId=number}}});saveInv();store.buyer={name,phone,address};store.orders.unshift(order);persist();data.cart=data.cart.filter(id=>!ids.includes(id));save();toast('模擬訂單成立，商品已鎖定');go('orders')};
function orders(){screen(`<div class="v053-summary"><h2 class="title">我的模擬訂單</h2><span class="v053-tag">${store.orders.length} 筆</span></div><p class="v053-muted">所有訂單與庫存鎖定僅在目前瀏覽器本機有效；無真實付款、物流派遣或跨裝置防超賣。</p>${store.orders.length?store.orders.map(o=>`<div class="card"><b>${safe(o.id)}</b><p class="v053-muted">${new Date(o.createdAt).toLocaleString('zh-TW')}｜${safe(o.payment)}</p><span class="v053-tag">${safe(o.status)}</span>${orderLines(o)}${o.lines.some(l=>v053ActiveOrders().some(other=>other.id!==o.id&&other.lines?.some(z=>l.sku?z.sku===l.sku:Number(z.id)===Number(l.id))))?'<p class="v053-muted" style="color:#b45309">⚠ 此訂單與其他有效訂單有重複商品，請總部確認庫存</p>':''}<div class="v053-summary" style="margin-top:12px"><b>總額 NT$ ${o.total}</b><button class="secondary tiny" onclick="v053OpenOrder('${safe(o.id)}')">查看／處理</button></div></div>`).join(''):'<div class="card">尚無模擬訂單。</div>'}`,'我的訂單')}
window.v053OpenOrder=function(id){const o=store.orders.find(x=>x.id===id);if(!o)return;const status=o.status;screen(`<button class="secondary tiny" onclick="go('orders')">← 返回訂單清單</button><div class="card"><h2>訂單 ${safe(o.id)}</h2><span class="v053-tag">${safe(status)}</span><p class="v053-muted">${safe(o.payment)}</p>${orderLines(o)}<p><b>總額 NT$ ${o.total}</b></p><p class="v053-muted">保管職人：${o.lines.some(x=>x.sku)?'原樂享職人（示範）':'示範商品無實際保管職人'}<br>收件資訊：${safe(o.buyer.name)}｜${safe(o.buyer.address)}</p></div><div class="card"><h3>模擬履約進度</h3>${o.events.map(e=>`<div class="v053-orderline v053-muted">${new Date(e.at).toLocaleString('zh-TW')}｜${safe(e.text)}</div>`).join('')}<p class="v053-muted">成交後：原職人包裝 → 騎手送總部集中倉 → 總部出貨。此處只模擬狀態，不建立真實騎手任務。</p>${status==='待職人包裝'?'<button class="primary wide" onclick="v053Advance(\''+safe(id)+'\',\'職人已包裝，待騎手集貨\')">模擬職人完成包裝</button>':''}${status==='職人已包裝，待騎手集貨'?'<button class="primary wide" onclick="v053Advance(\''+safe(id)+'\',\'已送達總部集中倉\')">模擬騎手送達總部</button>':''}${status==='已送達總部集中倉'?'<button class="primary wide" onclick="v053Advance(\''+safe(id)+'\',\'總部已出貨\')">模擬總部出貨</button>':''}${!['已取消','總部已出貨'].includes(status)?'<button class="secondary wide" style="margin-top:10px" onclick="v053Cancel(\''+safe(id)+'\')">取消模擬訂單並釋放庫存</button>':''}</div>`,'訂單詳情')};
window.v053Advance=function(id,next){const o=store.orders.find(x=>x.id===id);if(!o||o.status==='已取消')return;const allowed={'待職人包裝':'職人已包裝，待騎手集貨','職人已包裝，待騎手集貨':'已送達總部集中倉','已送達總部集中倉':'總部已出貨'};if(allowed[o.status]!==next)return;o.status=next;o.events.push({at:new Date().toISOString(),text:next});if(next==='總部已出貨'){o.lines.forEach(x=>{const r=inventory[x.sku];if(r&&r.orderId===id){r.status='已售出';saveInv()}})}persist();v053OpenOrder(id)};
window.v053Cancel=function(id){const o=store.orders.find(x=>x.id===id);if(!o||['已取消','總部已出貨'].includes(o.status))return;if(!confirm('取消這筆模擬訂單並釋放商品庫存？'))return;o.status='已取消';o.events.push({at:new Date().toISOString(),text:'訂單已取消，釋放庫存'});o.lines.forEach(x=>{const r=inventory[x.sku];if(r&&r.orderId===id&&r.status==='訂單鎖定'){r.status='在架';delete r.orderId}});saveInv();persist();v053OpenOrder(id)};
v053ReconcileInventory();
const previousRender=render;render=function(){v053ReconcileInventory();if(page==='checkout'){checkout();return}if(page==='orders'){orders();return}previousRender();if(page==='product'){const p=lookup(selected),r=real(selected);const bar=document.querySelector('#app .bar');if(bar&&p){const btns=bar.querySelectorAll('button');if(btns[0])btns[0].setAttribute('onclick',`addcart(${p.id})`);if(btns[1])btns[1].setAttribute('onclick',`v053BuyNow(${p.id})`);if(v053IsOccupied(selected)||(r&&r.status!=='在架')){bar.querySelectorAll('button').forEach(b=>{b.disabled=true;b.textContent='已售出或已保留'})}}}if(page==='work'&&data.role==='總部'){const main=document.querySelector('#app main');if(main){const b=document.createElement('div');b.className='card';b.innerHTML='<b>📦 V0.5.3 訂單與履約</b><p class="v053-muted">查看模擬成交、職人包裝、騎手集貨與總部出貨狀態。</p><button class="primary wide" onclick="go(\'orders\')">查看模擬訂單</button>';main.insertBefore(b,main.children[2]||null)}}};

/* V0.5.4 local fulfillment tasks: per SKU, custodian assignment, scan handoffs */
const V54STAGES=['待確認保管職人','待職人包裝','待騎手取件','運送總部中','總部已簽收'];
function v54Keeper(line){
 const bag=line.bag||String(line.sku||'').replace(/-\d{3}$/,'');
 const keeper=v03[bag]?.keeperId||getbag(bag)?.receivedBy||'';
 return String(keeper||'').trim();
}
function v54init(o){
 let changed=false;
 if(!o.tasks){o.tasks=o.lines.filter(x=>x.sku).map(x=>({sku:x.sku,name:x.name,keeper:v54Keeper(x),stage:v54Keeper(x)?'待職人包裝':'待確認保管職人',events:[]}));changed=true}
 o.tasks.forEach(t=>{if(t.stage!=='待確認保管職人')return;const line=o.lines.find(x=>x.sku===t.sku);const keeper=line&&v54Keeper(line);if(keeper){t.keeper=keeper;t.stage='待職人包裝';const event={at:new Date().toISOString(),text:'依分享袋 IN 箱簽收紀錄自動建立職人包裝任務（'+keeper+'）'};t.events.push(event);o.events.push(event);changed=true}});
 if(changed)persist();return o.tasks;
}
function v54event(o,t,msg){let e={at:new Date().toISOString(),text:msg};t.events.push(e);o.events.push(e)}
function v54status(o){let ts=v54init(o);if(['已取消','總部已出貨','待物流交寄'].includes(o.status))return o.status;if(!ts.length)return '含示範商品，需人工處理';if(ts.every(t=>t.stage==='總部已簽收'))return '全部到倉，待總部出貨';if(ts.some(t=>t.stage==='運送總部中'))return '部分運送中';if(ts.some(t=>t.stage==='總部已簽收'))return '部分已到倉';if(ts.some(t=>t.stage==='待OUT箱確認'))return '待職人 OUT 箱確認';if(ts.some(t=>t.stage==='待騎手取件'))return '待騎手取件';if(ts.some(t=>t.stage==='待職人包裝'))return '待職人包裝';return '待確認保管職人'}
function v54task(t,o){let idx=o.tasks.indexOf(t),tag=`<span class="v053-tag">${safe(t.stage)}</span>`,ev=t.events.slice(-3).map(e=>`<div class="v053-muted" style="padding:4px 0">${new Date(e.at).toLocaleString('zh-TW')}｜${safe(e.text)}</div>`).join('');let controls='';if(o.status!=='已取消'&&o.status!=='總部已出貨'){
 if(t.stage==='待確認保管職人')controls=`<p style="color:#9b4a00;font-weight:700">⚠️ 保管資料異常：缺少分享袋職人簽收紀錄，已暫停建立包裝任務。請總部查核原始 IN 箱簽收紀錄；不得人工填入職人代號。</p>`;
 if(t.stage==='待職人包裝'&&typeof v60role!=='undefined'&&v60role==='職人')controls=`<button class="primary wide" onclick="v54Step('${safe(o.id)}',${idx},'pack')">職人確認已完成包裝</button>`;
 if(t.stage==='待OUT箱確認'&&typeof v60role!=='undefined'&&v60role==='職人')controls=`<label>OUT 箱放入前掃描商品 SKU（${safe(t.sku)}）</label><input class="v053-field" id="v54outscan_${safe(o.id)}_${idx}" placeholder="掃描或輸入商品 SKU"><button class="primary wide" onclick="v54Step('${safe(o.id)}',${idx},'out')">掃碼確認放入 OUT 箱</button>`;
 if(t.stage==='待騎手取件'&&typeof v60role!=='undefined'&&v60role==='騎手')controls=`<label>騎手掃描商品編號（測試請輸入 ${safe(t.sku)}）</label><input class="v053-field" id="v54scan${idx}" placeholder="掃描或輸入商品編號"><button class="primary wide" onclick="v54Step('${safe(o.id)}',${idx},'pickup')">確認掃碼取件</button>`;
 if(t.stage==='運送總部中'&&typeof v60role!=='undefined'&&v60role==='總部')controls=`<label>總部集中倉簽收掃碼</label><input class="v053-field" id="v54scan${idx}" placeholder="掃描或輸入商品編號"><button class="primary wide" onclick="v54Step('${safe(o.id)}',${idx},'receive')">總部核對並簽收</button>`;
 }
 return `<div class="card"><div class="v053-summary"><b>${safe(t.sku)}</b>${tag}</div><p class="v053-muted">${safe(t.name)}｜保管職人：${safe(t.keeper||'尚未確認')}</p>${controls||'<p class="v053-muted">此階段由對應角色操作；總部可查看交接紀錄，無須審核 OUT 箱放行。</p>'}${ev?`<details style="margin-top:12px"><summary>查看本件交接紀錄</summary>${ev}</details>`:''}</div>`}
window.v54Assign=function(id,i){return alert('已取消人工指定保管職人，請依 IN 箱簽收紀錄自動辨識；資料缺漏須查核來源。')};
window.v54AssignLegacyUnused=function(id,i){let o=store.orders.find(x=>x.id===id);if(!o||['已取消','總部已出貨'].includes(o.status))return;let t=v54init(o)[i],val=document.getElementById('v54keeper'+i)?.value.trim();if(!t||t.stage!=='待確認保管職人'||!val)return alert('請先填寫保管職人測試代號');t.keeper=val;t.stage='待職人包裝';v54event(o,t,t.sku+' 已由總部確認保管職人 '+val);persist();v053OpenOrder(id)};
window.v54Step=function(id,i,action){let o=store.orders.find(x=>x.id===id);if(!o||['已取消','總部已出貨'].includes(o.status))return;let t=v54init(o)[i];if(!t)return;const flow={pack:['待職人包裝','待OUT箱確認','職人已完成包裝，待 OUT 箱確認'],out:['待OUT箱確認','待騎手取件','職人已完成 OUT 箱封箱確認，開放騎手取件'],pickup:['待騎手取件','運送總部中','騎手掃碼取件，運送至總部'],receive:['運送總部中','總部已簽收','總部集中倉掃碼簽收']};let f=flow[action];if(!f||t.stage!==f[0])return alert('目前狀態不能執行此操作');if(action==='out'&&document.getElementById('v54outscan_'+id+'_'+i)?.value.trim()!==t.sku)return alert('OUT 箱掃碼不符，請核對商品 SKU，未確認前不得放行騎手');if(['pickup','receive'].includes(action)&&document.getElementById('v54scan'+i)?.value.trim()!==t.sku)return alert('掃碼商品編號不符，請核對實體衣物與任務');if(!confirm(`${t.sku}\n${f[2]}？（本機模擬）`))return;t.stage=f[1];v54event(o,t,t.sku+'｜'+f[2]);o.status=v54status(o);persist();v053OpenOrder(id)};
window.v54Ship=function(id){let o=store.orders.find(x=>x.id===id);if(!o||['已取消','總部已出貨'].includes(o.status))return;let ts=v54init(o);if(!ts.length||!ts.every(t=>t.stage==='總部已簽收'))return alert('所有實際商品必須先由總部完成簽收');if(o.lines.some(x=>!x.sku))return alert('訂單包含示範商品，尚未建立其實體物流流程，不能直接標示全部出貨');if(!confirm('確認所有商品已完成總部配貨，模擬出貨給買家？'))return;o.status='總部已出貨';o.events.push({at:new Date().toISOString(),text:'總部完成合單配貨並模擬出貨'});o.lines.forEach(x=>{let r=inventory[x.sku];if(r&&r.orderId===id)r.status='已售出'});saveInv();persist();v053OpenOrder(id)};
window.v053OpenOrder=function(id){let o=store.orders.find(x=>x.id===id);if(!o)return;let tasks=v54init(o),status=v54status(o);let groups={};tasks.forEach(t=>{let k=t.keeper||'尚未確認職人';(groups[k]??=[]).push(t)});screen(`<button class="secondary tiny" onclick="go('orders')">← 返回訂單清單</button><div class="card"><h2>訂單 ${safe(o.id)}</h2><span class="v053-tag">${safe(status)}</span><p class="v053-muted">${safe(o.payment)}</p>${orderLines(o)}<p><b>總額 NT$ ${o.total}</b></p><p class="v053-muted">${tasks.length} 件實際商品｜${tasks.filter(t=>t.stage==='總部已簽收').length} 件總部已簽收｜測試收件人：${safe(o.buyer.name)}</p></div>${Object.entries(groups).map(([keeper,ts])=>`<h3 style="margin:18px 0 8px">📦 ${safe(keeper)}｜${ts.length} 件</h3>${ts.map(t=>v54task(t,o)).join('')}`).join('')}${o.lines.some(x=>!x.sku)?'<div class="card">⚠️ 本訂單含示範商品，沒有真實 SKU，需後續另建實體履約資料。</div>':''}${(v55ready(o)||o.shipment||o.status==='總部已出貨')?`<div class="card"><button class="primary wide" onclick="v55OpenSlip('${safe(o.id)}')">${o.status==='總部已出貨'&&!o.shipment?'補建歷史電子出貨單':o.shipment?'查看電子出貨單／A4 列印':'建立／開啟電子出貨單'}</button></div>`:''}<div class="card"><h3>訂單交接紀錄</h3>${o.events.slice().reverse().map(e=>`<div class="v053-orderline v053-muted">${new Date(e.at).toLocaleString('zh-TW')}｜${safe(e.text)}</div>`).join('')}${!['已取消','總部已出貨'].includes(o.status)&&!tasks.some(t=>['運送總部中','總部已簽收'].includes(t.stage))?`<button class="secondary wide" onclick="v053Cancel('${safe(o.id)}')">取消測試訂單並釋放庫存</button>`:''}</div>`,'訂單履約')};

/* V0.5.5 HQ shipment slip (local-only). B: electronic + A4 print. */
function v55ready(o){return o.lines.length>0&&o.lines.every(x=>x.sku)&&v54init(o).length===o.lines.length&&v54init(o).every(t=>t.stage==='總部已簽收')}
function v55slip(o){if(!o.shipment){o.shipment={number:'LX-SHP-'+o.id.replace('LX-ORD-',''),createdAt:new Date().toISOString(),recipient:o.buyer?.name||'',phone:o.buyer?.phone||'',address:o.buyer?.address||'',method:'宅配',carrier:'',tracking:'',picker:'',checker:'',checked:[],status:o.status==='總部已出貨'?'歷史訂單補建（未驗證交寄）':'待配貨核對',legacy:o.status==='總部已出貨',handedAt:null};o.events.push({at:new Date().toISOString(),text:'總部電子出貨單草稿已建立'});persist()}return o.shipment}
window.v55OpenSlip=function(id){let o=store.orders.find(x=>x.id===id);if(!o)return;if(!v55ready(o)&&!o.shipment&&o.status!=='總部已出貨')return alert('須全部實際商品簽收入倉後，才能建立出貨單');let f=v55slip(o);let shipped=o.status==='總部已出貨';let legacy=shipped&&f.legacy;let readonly=shipped&&!legacy?'disabled':'';let rows=o.lines.map(x=>`<div class="v053-orderline v053-summary"><div><b>${safe(x.name)}</b><div class="v053-muted">${safe(x.sku)}｜NT$ ${x.price}</div></div>${shipped&&!legacy?'✓':`<label style="display:flex;align-items:center;gap:5px"><input type="checkbox" class="v55check" value="${safe(x.sku)}" ${f.checked.includes(x.sku)?'checked':''}>核對</label>`}</div>`).join('');screen(`<button class="secondary tiny" onclick="v053OpenOrder('${safe(id)}')">← 返回訂單履約</button><div class="card v55slip"><div style="display:flex;justify-content:space-between;align-items:center"><div><h2>樂享家｜電子出貨單</h2><div class="v053-muted">B 方案・A4 可列印｜本機模擬</div></div><b>${safe(f.status)}</b></div>${legacy?'<p style="color:#a35b08;font-weight:700">⚠️ 舊版已出貨訂單：此單為事後補建，未驗證原出貨掃碼、託運及交寄證明。請依實際資料補登，不可視為當時完成複核。</p>':''}<p>出貨單號：<b>${safe(f.number)}</b></p><p>訂單編號：${safe(o.id)}</p><div class="v55grid"><label>收件人姓名<input class="v053-field" id="v55name" value="${safe(f.recipient)}" ${readonly}></label><label>收件電話<input class="v053-field" id="v55phone" type="tel" value="${safe(f.phone)}" ${readonly}></label></div><label>寄送地址／超商門市<input class="v053-field" id="v55addr" value="${safe(f.address)}" ${readonly}></label><label>配送方式<select class="v053-field" id="v55method" ${readonly}><option ${f.method==='宅配'?'selected':''}>宅配</option><option ${f.method==='超商取貨'?'selected':''}>超商取貨</option></select></label><h3>出貨商品（${o.lines.length} 件）</h3>${rows}<p style="text-align:right"><b>商品總額 NT$ ${o.total}</b></p><div class="v55grid"><label>物流商<input class="v053-field" id="v55carrier" value="${safe(f.carrier)}" ${readonly}></label><label>物流託運單號<input class="v053-field" id="v55track" value="${safe(f.tracking)}" ${readonly}></label><label>揀貨人員代號<input class="v053-field" id="v55picker" value="${safe(f.picker)}" ${readonly}></label><label>複核人員代號<input class="v053-field" id="v55checker" value="${safe(f.checker)}" ${readonly}></label></div><p class="v053-muted">先儲存電子出貨單，再確認全部商品已核對；配貨完成不等於物流已交寄。</p><div class="v55actions"><button class="secondary wide" onclick="v55Save('${safe(id)}')" ${shipped&&!legacy?'disabled':''}>儲存出貨單／核對紀錄</button>${!shipped?`<button class="primary wide" onclick="v55Pick('${safe(id)}')">確認配貨完成（待交寄）</button><button class="secondary wide" onclick="v55Handoff('${safe(id)}')">確認已交物流商（模擬出貨）</button>`:''}<button class="secondary wide" onclick="v55Print('${safe(id)}')">A4 列印／另存 PDF</button></div>${f.handedAt?`<p class="v053-muted">模擬交寄時間：${new Date(f.handedAt).toLocaleString('zh-TW')}</p>`:''}</div>`,'總部電子出貨單')};
window.v55Save=function(id){let o=store.orders.find(x=>x.id===id);if(!o||(o.status==='總部已出貨'&&!o.shipment?.legacy))return false;let f=v55slip(o);const get=x=>document.getElementById(x)?.value.trim()||'';f.recipient=get('v55name');f.phone=get('v55phone');f.address=get('v55addr');f.method=get('v55method');f.carrier=get('v55carrier');f.tracking=get('v55track');f.picker=get('v55picker');f.checker=get('v55checker');f.checked=Array.from(document.querySelectorAll('.v55check:checked')).map(x=>x.value);persist();toast('電子出貨單已儲存');return true};
window.v55Pick=function(id){let o=store.orders.find(x=>x.id===id);if(!o||o.status==='總部已出貨')return;if(!v55ready(o))return alert('全部商品必須先到倉');v55Save(id);let f=o.shipment;if(!f.recipient||!f.phone||!f.address)return alert('收件姓名、電話、寄送地址／門市不可留空');if(f.checked.length!==o.lines.length||!o.lines.every(x=>f.checked.includes(x.sku)))return alert('請逐件勾選核對所有商品');if(!f.picker||!f.checker)return alert('請填寫揀貨及複核人員代號');f.status='待物流交寄';o.status='待物流交寄';o.events.push({at:new Date().toISOString(),text:'電子出貨單完成配貨複核，待物流交寄'});persist();v55OpenSlip(id)};
window.v55Handoff=function(id){let o=store.orders.find(x=>x.id===id);if(!o||o.status!=='待物流交寄')return alert('請先完成出貨單配貨核對');v55Save(id);let f=o.shipment;if(!f.carrier||!f.tracking)return alert('請先填寫物流商與託運單號');if(!confirm('確認包裹已實際交給物流商？（本機模擬，不會真的寄送）'))return;f.status='模擬已交寄';f.handedAt=new Date().toISOString();o.status='總部已出貨';o.events.push({at:f.handedAt,text:'總部模擬交寄物流商：'+f.carrier+'｜託運單號：'+f.tracking});o.lines.forEach(x=>{let r=inventory[x.sku];if(r&&r.orderId===id)r.status='已售出'});saveInv();persist();v55OpenSlip(id)};
window.v55Print=function(id){let o=store.orders.find(x=>x.id===id);if(!o)return;if(o.status!=='總部已出貨'||o.shipment?.legacy)v55Save(id);let f=v55slip(o);let html=`<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${safe(f.number)}</title><style>@page{size:A4;margin:15mm}body{font:14px/1.65 system-ui,sans-serif;color:#17251e}h1{color:#07844d}table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #ccc;padding:8px;text-align:left}.sum{text-align:right;font-weight:bold}.small{font-size:12px;color:#555}.actions{margin:20px 0}@media print{.actions{display:none}}</style></head><body><div class="actions"><button onclick="window.print()">列印／另存 PDF</button></div><h1>樂享家 LET'S SHARE</h1><h2>總部電子出貨單</h2><p>出貨單號：${safe(f.number)}<br>訂單編號：${safe(o.id)}<br>狀態：${safe(f.status)}</p><hr><p>收件人：${safe(f.recipient)}<br>電話：${safe(f.phone)}<br>配送方式：${safe(f.method)}<br>寄送地址／門市：${safe(f.address)}</p><table><thead><tr><th>商品編號</th><th>商品</th><th>數量</th><th>售價</th><th>核對</th></tr></thead><tbody>${o.lines.map(x=>`<tr><td>${safe(x.sku)}</td><td>${safe(x.name)}</td><td>1</td><td>NT$ ${x.price}</td><td>${f.checked.includes(x.sku)?'✓':''}</td></tr>`).join('')}</tbody></table><p class="sum">共 ${o.lines.length} 件｜商品總額 NT$ ${o.total}</p><hr><p>物流商：${safe(f.carrier||'未指定')}<br>託運單號：${safe(f.tracking||'未建立')}<br>揀貨人員：${safe(f.picker||'未指定')}　複核人員：${safe(f.checker||'未指定')}<br>交寄時間：${f.handedAt?new Date(f.handedAt).toLocaleString('zh-TW'):'尚未交寄'}</p><p class="small">${f.legacy?'⚠️ 歷史訂單事後補建；不代表原出貨時已完成核對或交寄。':''}本機模擬出貨單，非統一發票或實際託運證明。含個人資料，請妥善保管。</p>

</body></html>`;let w=window.open('','_blank');if(!w){alert('瀏覽器阻擋新視窗，請允許彈出式視窗後重試');return}w.document.open();w.document.write(html);w.document.close()};


/* V0.5.6 — B: HQ manual shipment tracking, API-ready event model */
const v56states=['待物流交寄','物流已收件','配送中','已送達'];
function v56eligible(o){return !!(o&&o.shipment&&(o.status==='待物流交寄'||o.status==='總部已出貨'||v56states.includes(o.status)));}
function v56ensure(o){let f=o.shipment;if(!f)return null;if(!f.deliveryTracking)f.deliveryTracking={mode:'manual',stage:o.status==='待物流交寄'?'待物流交寄':o.status==='總部已出貨'?(f.handedAt?'物流已收件':'待物流交寄'):(v56states.includes(o.status)?o.status:'待物流交寄'),events:[],externalEvents:[],lastUpdatedAt:null};return f.deliveryTracking}
function v56time(iso){return iso?new Date(iso).toLocaleString('zh-TW'):'尚無紀錄'}
window.v56Open=function(id){const o=store.orders.find(x=>x.id===id);if(!v56eligible(o))return alert('請先建立電子出貨單並完成總部配貨');const f=o.shipment,t=v56ensure(o);persist();let current=t.stage;let next=current==='待物流交寄'?'物流已收件':current==='物流已收件'?'配送中':current==='配送中'?'已送達':null;let legacy=f.legacy;screen(`<button class="secondary tiny" onclick="v053OpenOrder('${safe(id)}')">← 返回訂單履約</button><div class="card"><h2>🚚 V0.5.6｜物流配送追蹤</h2><p class="v053-muted">B 方案｜總部人工更新（預留未來物流 API）｜本機測試</p><p>訂單：<b>${safe(o.id)}</b><br>出貨單：${safe(f.number)}<br>物流商：${safe(f.carrier||'尚未填寫')}<br>託運單號：${safe(f.tracking||'尚未填寫')}</p>${legacy?'<p style="color:#a35b08">⚠️ 此單為歷史補建，尚無可驗證的物流收件證明。請勿僅憑原「已出貨」狀態補認物流已收件。</p>':''}<h3>目前狀態：<span style="color:#07844d">${safe(current)}</span></h3><div style="display:flex;gap:5px;flex-wrap:wrap">${v56states.map((x,i)=>`<span style="padding:7px 9px;border-radius:18px;background:${i<=v56states.indexOf(current)?'#dff2e8':'#f1f1f1'};font-size:12px">${i+1}. ${x}</span>`).join('')}</div><p class="v053-muted">最近更新：${v56time(t.lastUpdatedAt)}｜更新來源：人工操作</p></div><div class="card"><h3>更新配送進度</h3>${next?`<p>下一階段：<b>${safe(next)}</b></p><label>佐證／備註（建議填寫物流查詢結果或交寄憑證）<textarea class="v053-field" id="v56note" rows="3" placeholder="例如：查詢物流官網，顯示已收件；可填寫查詢時間或證明編號"></textarea></label><button class="primary wide" onclick="v56Advance('${safe(id)}')">確認更新為「${safe(next)}」</button>`:'<p class="v053-muted">商品已標記送達；若有退貨或配送異常，需另走異常處理，不可覆蓋既有紀錄。</p>'}<p class="v053-muted">每次狀態更新都會保存時間、來源與備註；不會連線物流商，也不會自動推播買家。</p></div><div class="card"><h3>物流追蹤紀錄</h3>${t.events.length?t.events.slice().reverse().map(e=>`<div class="v053-orderline"><b>${safe(e.stage)}</b><div class="v053-muted">${v56time(e.at)}｜${safe(e.source||'總部人工')}</div><div>${safe(e.note||'未填備註')}</div></div>`).join(''):'<p class="v053-muted">尚未記錄 V0.5.6 配送事件。舊版出貨資料不會自動視為物流簽收證明。</p>'}</div>`,'物流配送追蹤')};
window.v56Advance=function(id){let o=store.orders.find(x=>x.id===id);if(!v56eligible(o))return;let t=v56ensure(o);let idx=v56states.indexOf(t.stage);if(idx<0||idx>=v56states.length-1)return;let next=v56states[idx+1];let note=document.getElementById('v56note')?.value.trim()||'';if(!note&&!confirm('尚未填寫佐證或備註。確定仍要更新模擬配送狀態？'))return;if(!confirm('確認人工更新配送狀態為「'+next+'」？\n這不代表已取得物流商系統驗證。'))return;let at=new Date().toISOString();t.stage=next;t.lastUpdatedAt=at;t.events.push({stage:next,at,source:'總部人工',note});o.status=next;o.events.push({at,text:'總部人工更新配送：'+next+(note?'｜'+note:'')});if(next==='物流已收件'&&!o.shipment.handedAt)o.shipment.handedAt=at;o.shipment.status=next;persist();v56Open(id)};
const v56previousOrder=window.v053OpenOrder;
window.v053OpenOrder=function(id){v56previousOrder(id);let o=store.orders.find(x=>x.id===id);if(v56eligible(o)){let main=document.querySelector('main');if(main){let b=document.createElement('div');b.className='card';b.innerHTML=`<h3>🚚 V0.5.6 物流配送追蹤</h3><p class="v053-muted">目前狀態：${safe(v56ensure(o).stage)}｜初期由總部人工更新，預留物流 API</p><button class="primary wide" onclick="v56Open('${safe(id)}')">開啟物流追蹤／更新狀態</button>`;main.insertBefore(b,main.querySelector('.card')||main.firstChild)}}};
const v56previousSlip=window.v55OpenSlip;
window.v55OpenSlip=function(id){v56previousSlip(id);let o=store.orders.find(x=>x.id===id);if(v56eligible(o)){let main=document.querySelector('main');if(main){let b=document.createElement('div');b.className='card';b.innerHTML=`<button class="primary wide" onclick="v56Open('${safe(id)}')">🚚 查看物流交寄與配送追蹤</button>`;main.appendChild(b)}}};

const v54prevCancel=window.v053Cancel;window.v053Cancel=function(id){let o=store.orders.find(x=>x.id===id);if(o&&v54init(o).some(t=>['運送總部中','總部已簽收'].includes(t.stage)))return alert('商品已取件或入倉，需由總部啟動退貨／逆物流流程，不能直接釋放庫存');v54prevCancel(id)};
const v54prevOrders=orders;orders=function(){store.orders.forEach(o=>{if(o.tasks&&o.status!=='已取消'&&!['總部已出貨','物流已收件','配送中','已送達'].includes(o.status))o.status=v54status(o)});v54prevOrders()};

/* V0.5.6.3: visible tracking shortcut on order list, no scrolling required. */
const v563prevOrders=orders;
orders=function(){v563prevOrders();const main=document.querySelector('#app main');if(!main)return;const cards=Array.from(main.querySelectorAll('.card'));store.orders.forEach((o,i)=>{if(!v56eligible(o)||!cards[i])return;const area=document.createElement('div');area.style.marginTop='12px';area.innerHTML=`<button class="primary wide" onclick="v56Open('${safe(o.id)}')">🚚 物流追蹤／更新狀態</button>`;cards[i].appendChild(area)});};

/* V0.6.0 四端操作入口：本機權限流程測試；非伺服器身分驗證。 */
let v60role=sessionStorage.getItem('lx-v60-role')||'會員';
const v60roles=['會員','職人','騎手','總部'];
const v60goOriginal=go;
function v60switch(role){if(!v60roles.includes(role))return;v60role=role;sessionStorage.setItem('lx-v60-role',role);if(role!=='會員'){data.role=role;save()}v60home()}
function v60menu(){document.body.classList.toggle('lx-staff-role',v60role!=='會員');let bar=document.getElementById('v60switchbar');if(!bar){bar=document.createElement('div');bar.id='v60switchbar';bar.style.cssText='position:fixed;z-index:100;top:5px;left:50%;transform:translateX(-50%);max-width:450px;width:calc(100% - 14px);display:flex;gap:3px;background:#fff;border:1px solid #b8ddc8;border-radius:22px;padding:3px;box-shadow:0 3px 15px #0002';document.body.appendChild(bar)}bar.innerHTML=v60roles.map(r=>`<button onclick="v60switch('${r}')" style="flex:1;padding:8px 2px;border-radius:18px;font-size:12px;font-weight:700;background:${v60role===r?'#078b50':'#f2f7f3'};color:${v60role===r?'white':'#276344'}">${r}端</button>`).join('');document.querySelector('.shell')?.style.setProperty('padding-top','40px')}
function v60home(){document.body.classList.toggle('lx-staff-role',v60role!=='會員');if(v60role==='會員'){page='home';render()}else v60dashboard();v60menu()}
function v60dashboard(){let body=`<div class="card"><h2>樂享家｜${v60role}工作台</h2><p class="muted">V0.6.0 四端拆分測試｜本機共用測試資料，不代表正式登入權限</p></div>`;
if(v60role==='職人')body+=`<div class="card"><h3>衣物驗收與保管</h3><button class="primary wide" onclick="v60legacyWork('職人')">分享袋收件／IN 箱確認</button><p class="muted">逐件拍照與驗收仍沿用原職人模組。</p></div><div class="card"><h3>成交商品包裝</h3><button class="secondary wide" onclick="v60tasks()">查看我的包裝任務</button></div>`;
if(v60role==='騎手')body+=`<div class="card"><h3>衣物分享袋配送</h3><button class="primary wide" onclick="v60legacyWork('騎手')">取件／交件掃碼</button></div><div class="card"><h3>成交衣物送總部</h3><button class="secondary wide" onclick="v60tasks()">查看配送交接任務</button></div>`;
if(v60role==='總部')body+=`<div class="card"><h3>分享袋物流分派</h3><button class="secondary wide" onclick="v60legacyWork('總部')">分派與異常管理</button></div><div class="card"><h3>商品核價</h3><button class="secondary wide" onclick="v04Home()">總部逐件核價</button></div><div class="card"><h3>訂單與集中倉</h3><button class="primary wide" onclick="v60hqOrders()">訂單配貨／電子出貨單</button></div><div class="card"><h3>物流配送管理</h3><button class="primary wide" onclick="v60logistics()">物流狀態更新／紀錄</button></div>`;
screen(body,`${v60role}工作台`);document.getElementById('nav').innerHTML='';v60menu()}
function v60legacyWork(role){if(v60role!==role)return;data.role=role;save();page='work';render();document.getElementById('nav').innerHTML='';let rolebar=document.querySelector('.rolebar');if(rolebar)rolebar.remove();v60menu()}
let v60OrderTab='receive';
function v60SetOrderTab(tab){v60OrderTab=['receive','pick','ship','done'].includes(tab)?tab:'receive';v60hqOrders()}
function v60OrderPhase(o){
 if(o.shipment?.deliveryTracking?.stage==='已送達'||o.shipment?.status==='已送達'||o.status==='已送達')return 'done';
 if(o.shipment&&!o.shipment.legacy)return 'ship';
 if(o.status==='總部已出貨'||['待物流交寄','物流已收件','配送中'].includes(o.shipment?.deliveryTracking?.stage)||['待物流交寄','物流已收件','配送中'].includes(o.status))return 'ship';
 const tasks=Array.isArray(o.tasks)?o.tasks:[];
 // Orders without verifiable complete warehouse receipt stay in 收貨; do not infer arrival.
 const hasAllSku=o.lines?.length>0&&o.lines.every(x=>!!x.sku);
 if(hasAllSku&&tasks.length===o.lines.length&&tasks.every(t=>t.stage==='總部已簽收'))return 'pick';
 return 'receive';
}
function v60hqOrders(){
 if(v60role!=='總部')return;
 const sorted=store.orders.slice().sort((a,b)=>{const da=Date.parse(a.createdAt||'')||0,db=Date.parse(b.createdAt||'')||0;return db-da||String(b.id).localeCompare(String(a.id),'zh-TW',{numeric:true})});
 const groups={receive:[],pick:[],ship:[],done:[]};sorted.forEach(o=>groups[v60OrderPhase(o)].push(o));
 const tabs=[['receive','收貨'],['pick','揀貨'],['ship','出貨'],['done','已完成']];
 // V0.6.3v: 已全數到倉但尚未完成出貨的訂單，在出貨列表優先處理。
 const lxAwaitingShipment=o=>{
  const stage=String(o.shipment?.deliveryTracking?.stage||o.status||'');
  return v60OrderPhase(o)==='ship' && (stage.includes('全部到倉')&&stage.includes('待總部出貨') || (o.shipment&&!o.shipment.handoffAt&&!o.shipment.shippedAt&&stage==='待總部出貨'));
 };
 if(v60OrderTab==='ship')groups.ship.sort((a,b)=>Number(lxAwaitingShipment(b))-Number(lxAwaitingShipment(a)));
 let body=`<button class="secondary tiny" onclick="v60dashboard()">← 總部工作台</button><h2 class="title">訂單與集中倉</h2><p class="muted">收貨：待全部商品入倉；揀貨：全數到倉待合單；出貨：待交寄或配送中；已完成：已送達。</p><div class="card"><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">${tabs.map(([key,label])=>`<button class="${v60OrderTab===key?'primary':'secondary'}" onclick="v60SetOrderTab('${key}')">${label}（${groups[key].length}）</button>`).join('')}</div></div>`;
 body+=groups[v60OrderTab].map(o=>{const stage=o.shipment?.deliveryTracking?.stage||o.status||'待處理';const done=v60OrderTab==='done';const lxUrgent=v60OrderTab==='ship'&&lxAwaitingShipment(o);return `<div class="card" ${lxUrgent?'style="border:2px solid #d63b35;background:#fffafa"':''}><b>${safe(o.id)}</b><p class="v053-muted">${o.createdAt?new Date(o.createdAt).toLocaleString('zh-TW'):''}｜${safe(o.payment||'')}</p>${lxUrgent?`<div style="margin:12px 0 8px;padding:11px 12px;border-radius:12px;background:#fee8e7;color:#b42320;font-weight:800">🔴 全部到倉，待總部出貨｜優先處理</div>`:`<span class="v053-tag">${safe(stage)}</span>`}${orderLines(o)}<div class="v053-summary" style="margin-top:12px"><b>總額 NT$ ${o.total}</b><button class="${done?'secondary':'primary'} tiny" onclick="v053OpenOrder('${safe(o.id)}')">${done?'查看紀錄':'查看／處理'}</button></div></div>`}).join('')||'<div class="card">此分類目前沒有訂單。</div>';
 screen(body,'訂單與集中倉');document.getElementById('nav').innerHTML='';v60menu();
}
let v60LogTab='pending';
function v60SetLogTab(tab){v60LogTab=tab==='done'?'done':'pending';v60logistics()}
function v60logistics(){if(v60role!=='總部')return;let eligible=store.orders.filter(v56eligible).slice().reverse();let done=eligible.filter(o=>v56ensure(o).stage==='已送達'),pending=eligible.filter(o=>v56ensure(o).stage!=='已送達');let rows=v60LogTab==='done'?done:pending;
 screen(`<button class="secondary tiny" onclick="v60dashboard()">← 總部工作台</button><h2>🚚 物流配送管理</h2><p class="muted">僅總部可操作人工物流更新；資料僅保存在本機。</p><div class="card"><div style="display:flex;gap:8px"><button style="flex:1" class="${v60LogTab==='pending'?'primary':'secondary'}" onclick="v60SetLogTab('pending')">待處理（${pending.length}）</button><button style="flex:1" class="${v60LogTab==='done'?'primary':'secondary'}" onclick="v60SetLogTab('done')">已處理（${done.length}）</button></div></div>${rows.map(o=>`<div class="card"><b>${safe(o.id)}</b><p class="muted">${safe(v56ensure(o).stage)}｜${safe(o.shipment?.carrier||'未設定物流商')}</p><button class="${v60LogTab==='done'?'secondary':'primary'} wide" onclick="v56Open('${safe(o.id)}')">${v60LogTab==='done'?'查看物流紀錄':'查看／更新物流'}</button></div>`).join('')||'<div class="card">此分類目前沒有單據。</div>'}`,'總部物流管理');document.getElementById('nav').innerHTML='';v60menu()}
let v60TaskTab='pending';
function v60SetTaskTab(tab){v60TaskTab=['pending','picked','done'].includes(tab)?tab:'pending';v60tasks()}
function v60tasks(){
 if(!['職人','騎手'].includes(v60role))return;
 let pending=[],picked=[],done=[];
 [...store.orders].reverse().forEach(o=>{if(o.status==='已取消')return;v54init(o).forEach((t,i)=>{
  let isPending=v60role==='職人'?['待職人包裝','待OUT箱確認'].includes(t.stage):t.stage==='待騎手取件';
  let isPicked=v60role==='騎手'&&t.stage==='運送總部中';
  let isDone=v60role==='職人'?['待騎手取件','運送總部中','總部已簽收'].includes(t.stage):t.stage==='總部已簽收';
  if(!isPending&&!isPicked&&!isDone)return;
  let action='';
  if(isPending||isPicked){if(v60role==='職人')action=t.stage==='待職人包裝'?`<button class="primary wide" onclick="v54Step('${safe(o.id)}',${i},'pack')">確認完成包裝</button>`:`<label>放入 OUT 箱前掃描商品 SKU（${safe(t.sku)}）</label><input class="field" id="v54outscan_${safe(o.id)}_${i}" placeholder="掃描或輸入商品 SKU"><button class="primary wide" onclick="v54Step('${safe(o.id)}',${i},'out')">掃碼確認放入 OUT 箱</button>`;
   else if(t.stage==='待騎手取件')action=`<input class="field" id="v54scan${i}" placeholder="輸入／掃描商品 SKU"><button class="primary wide" onclick="v54Step('${safe(o.id)}',${i},'pickup')">掃碼確認取件</button>`;
   else {let handed=(t.events||[]).some(e=>String(e.text||'').includes('騎手已掃碼交至總部'));action=handed?`<p class="muted">已掃碼交至總部，等待總部 IN 箱簽收。</p>`:`<label>交至總部前掃描商品 SKU（${safe(t.sku)}）</label><input class="field" id="v60hqdrop_${safe(o.id)}_${i}" placeholder="掃描或輸入商品 SKU"><button class="primary wide" onclick="v60RiderDrop('${safe(o.id)}',${i})">掃碼確認交至總部</button>`;}}
  let history=(t.events||[]).slice(-5).map(e=>`<div class="muted">${safe(new Date(e.at).toLocaleString('zh-TW'))}｜${safe(e.text)}</div>`).join('');
  let card=`<div class="card"><b>${safe(t.name||t.sku)}</b><p class="muted">狀態：${safe(t.stage)}</p><p>訂單：${safe(o.id)}<br>商品：${safe(t.sku)}<br>保管職人：${safe(t.keeper||'尚未指派')}</p>${action}${history?`<details><summary>查看交接紀錄</summary>${history}</details>`:''}</div>`;
  (isPending?pending:isPicked?picked:done).push(card);
 })});
 let missing=store.orders.filter(o=>o.status!=='已取消').flatMap(o=>v54init(o).filter(t=>t.stage==='待確認保管職人').map(t=>({id:o.id,sku:t.sku})));
 let rider=v60role==='騎手';
 let tabButton=(key,label,count)=>`<button style="flex:1;min-width:0;padding:12px 4px;font-size:14px" class="${v60TaskTab===key?'primary':'secondary'}" onclick="v60SetTaskTab('${key}')">${label}（${count}）</button>`;
 let tabs=rider?tabButton('pending','待處理',pending.length)+tabButton('picked','已取件',picked.length)+tabButton('done','已送達總部',done.length):tabButton('pending','待處理',pending.length)+tabButton('done','已處理',done.length);
 let note=rider?'待處理：尚未取件；已取件：運送中或已交總部等待簽收；已送達總部：總部 IN 箱已簽收。':'職人完成包裝與 OUT 箱交接後，可查看已處理紀錄。';
 let html=`<button class="secondary tiny" onclick="v60dashboard()">← 工作台</button><h2>${v60role}｜成交衣物任務</h2><p class="muted">${note}</p><div class="card"><div style="display:flex;gap:6px">${tabs}</div></div>`;
 if(v60role==='職人'&&missing.length)html+=`<div class="card" style="border:1px solid #d6a449"><b>⚠️ 保管資料異常（${missing.length} 件）</b><p class="muted">這些舊訂單缺少可驗證的職人 IN 箱簽收紀錄，暫不會產生包裝任務；請總部查核。</p>${missing.map(t=>`<p class="muted">${safe(t.id)}｜${safe(t.sku)}</p>`).join('')}</div>`;
 let rows=v60TaskTab==='done'?done:v60TaskTab==='picked'&&rider?picked:pending;html+=rows.join('')||'<div class="card muted">此分類目前沒有任務。</div>';
 screen(html,`${v60role}任務`);document.getElementById('nav').innerHTML='';v60menu();
}
function v60RiderDrop(id,i){
 if(v60role!=='騎手')return alert('只有騎手可執行此操作');
 const o=store.orders.find(x=>x.id===id);if(!o)return;
 const t=v54init(o)[i];if(!t||t.stage!=='運送總部中')return alert('此商品目前不能交件');
 const field=document.getElementById('v60hqdrop_'+id+'_'+i);
 if(!field||field.value.trim()!==t.sku)return alert('商品 SKU 不符，請重新掃碼核對');
 if((t.events||[]).some(e=>String(e.text||'').includes('騎手已掃碼交至總部')))return alert('此商品已完成騎手交件掃碼');
 if(!confirm('確認將 '+t.sku+' 交至總部集中倉？總部仍須 IN 箱簽收。'))return;
 v54event(o,t,t.sku+'｜騎手已掃碼交至總部，待總部 IN 箱簽收');persist();v60tasks();
}
function v60memberOrder(id){let o=store.orders.find(x=>x.id===id);if(!o)return;let tracking=o.shipment?.deliveryTracking;let stage=tracking?.stage||o.status;screen(`<button class="secondary tiny" onclick="go('orders')">← 我的訂單</button><div class="card"><h2>訂單 ${safe(o.id)}</h2><p>目前進度：<b>${safe(stage)}</b></p>${orderLines(o)}<p><b>合計 NT$ ${o.total}</b></p></div><div class="card"><h3>🚚 物流查詢（唯讀）</h3><p>物流商：${safe(o.shipment?.carrier||'尚未交寄')}<br>託運單號：${safe(o.shipment?.tracking||'尚未建立')}<br>配送進度：${safe(stage)}</p>${tracking?.events?.length?tracking.events.map(e=>`<div class="v053-orderline v053-muted">${v56time(e.at)}｜${safe(e.stage)}</div>`).join(''):'<p class="muted">尚無物流配送紀錄。</p>'}<p class="muted">此為人工模擬狀態，非物流商即時查詢。</p></div>`,'會員訂單詳情');v60menu()}
const v60oldGo=go;go=function(p){if(v60role!=='會員'){if(p==='work'){v60dashboard();return}if(['home','categories','share','cart','me','orders','wallet','favorites'].includes(p)){v60dashboard();return}}if(v60role==='會員'&&p==='work'){v60home();return}v60oldGo(p);v60menu()};
const v60oldMe=me;me=function(){return v60oldMe().replace(/<button class="card row"[^>]*onclick="go\('work'\)"[\s\S]*?<\/button>/,'')};
let v60MemberOrderTab='pending';
function v60SetMemberOrderTab(tab){v60MemberOrderTab=tab==='done'?'done':'pending';orders()}
const v60oldOrders=orders;orders=function(){
 if(v60role!=='會員'){v60hqOrders();return}
 const all=[...store.orders].sort((a,b)=>{
   const ta=Date.parse(a.createdAt||'')||0,tb=Date.parse(b.createdAt||'')||0;
   return tb-ta||String(b.id||'').localeCompare(String(a.id||''),'zh-TW',{numeric:true});
 });
 const isDone=o=>o.shipment?.deliveryTracking?.stage==='已送達';
 const pending=all.filter(o=>!isDone(o)),done=all.filter(isDone);
 const shown=v60MemberOrderTab==='done'?done:pending;
 const tab=(name,key,count)=>`<button type="button" class="${v60MemberOrderTab===key?'primary':'secondary'}" style="flex:1;min-width:0" onclick="v60SetMemberOrderTab('${key}')">${name}（${count}）</button>`;
 let body=`<h2 class="title">我的訂單</h2><p class="muted">未送達的訂單列於「未完成」；只有配送狀態為「已送達」才列於「已完成」。</p><div style="display:flex;gap:8px;margin:14px 0">${tab('未完成','pending',pending.length)}${tab('已完成','done',done.length)}</div>`;
 body+=shown.length?shown.map(o=>`<div class="card"><b>${safe(o.id)}</b><p class="muted">${safe(o.shipment?.deliveryTracking?.stage||o.status)}</p><p>總額 NT$ ${o.total}</p><button class="secondary wide" onclick="v60memberOrder('${safe(o.id)}')">查看訂單／物流進度</button></div>`).join(''):'<div class="card muted">此分類目前沒有訂單。</div>';
 screen(body,'我的訂單');v60menu();
};
const v60oldOpenOrder=window.v053OpenOrder;window.v053OpenOrder=function(id){if(v60role==='會員')return v60memberOrder(id);if(v60role!=='總部')return v60tasks();v60oldOpenOrder(id);v60menu()};
const v60oldTracking=window.v56Open;window.v56Open=function(id){if(v60role!=='總部')return v60memberOrder(id);v60oldTracking(id);v60menu()};
const v60oldAdvance=window.v56Advance;window.v56Advance=function(id){if(v60role!=='總部')return alert('只有總部可以更新物流狀態');v60oldAdvance(id)};
const v60oldStep=window.v54Step;window.v54Step=function(id,i,action){if((['pack','out'].includes(action)&&v60role!=='職人')||(action==='pickup'&&v60role!=='騎手')||(action==='receive'&&v60role!=='總部'))return alert('此操作不屬於目前端別');v60oldStep(id,i,action);if(v60role==='職人'||v60role==='騎手')v60tasks()};
const v60oldShip=window.v54Ship;window.v54Ship=function(id){if(v60role!=='總部')return alert('只有總部可以建立出貨');if(typeof duty!=='undefined'&&(duty!=='出貨'||!store.orders.find(o=>o.id===id)?.lxPickTicket?.checkedAt))return alert('請先完成揀貨單複核並切換出貨職位');v60oldShip(id)};
const v60oldAssign=window.v54Assign;window.v54Assign=function(id,i){return alert('保管職人由 IN 箱簽收紀錄自動帶入，不開放人工指定。')};
const v60oldSlip=window.v55OpenSlip;window.v55OpenSlip=function(id){if(v60role!=='總部')return alert('電子出貨單由總部管理');v60oldSlip(id)};
/* V0.6.1: Inline onclick handlers execute in global scope. Expose portal actions explicitly. */
Object.assign(window,{
 v60switch,v60home,v60dashboard,v60legacyWork,v60hqOrders,v60logistics,
 v60tasks,v60RiderDrop,v60SetTaskTab,v60SetLogTab,v60SetOrderTab,v60SetMemberOrderTab,v60memberOrder
});
setTimeout(()=>{v60menu();if(v60role!=='會員')v60dashboard()},500);

/* V0.6.1w: picking module shares the original order store scope. */
let duty='揀貨';
let lxWorkTab={揀貨:'pending',複核出貨:'review'};
const lxOrder=id=>store.orders.find(o=>o.id===id);
const lxTicket=o=>o?.lxPickTicket||null;
const lxReady=o=>v55ready(o);
const lxHasSlip=o=>!!o.shipment;
const lxShipped=o=>!!(o.shipment?.handedAt||o.status==='總部已出貨'||['物流已收件','配送中','已送達'].includes(o.shipment?.deliveryTracking?.stage));
function lxCreate(o){if(!o.lxPickTicket){o.lxPickTicket={number:'LX-PCK-'+o.id.replace('LX-ORD-',''),createdAt:new Date().toISOString(),picker:'',checker:'',picked:[],pickedAt:null,checkedAt:null};o.events=o.events||[];o.events.push({at:new Date().toISOString(),text:'建立內部揀貨單'});persist()}return o.lxPickTicket}
window.lxDutySet=function(d){if(!['揀貨','複核出貨'].includes(d))return;duty=d;v60OrderTab='pick';v60hqOrders()};
window.lxDutyTab=function(t){lxWorkTab[duty]=t;v60hqOrders()};
function lxPickOpen(id){const o=lxOrder(id);if(!o||!lxReady(o))return alert('訂單商品尚未全部入倉');const p=lxCreate(o);const done=!!p.pickedAt;
 const lines=o.lines.map((x,i)=>`<div class="v053-orderline"><div><b>${safe(x.name)}</b><p class="v053-muted">SKU：${safe(x.sku)}｜數量：1</p></div>${!done?`<label><input type="checkbox" class="lxpick" value="${i}" ${p.picked.includes(i)?'checked':''}> 已揀貨</label>`:'✓ 已揀貨'}</div>`).join('');
 screen(`<button class="secondary tiny" onclick="v60hqOrders()">← 返回揀貨</button><div class="card"><h2>內部揀貨單</h2><p>單號：${safe(p.number)}<br>訂單：${safe(o.id)}</p><p class="muted">僅供內部作業，不顯示買家姓名、電話、地址與物流資料。</p>${lines}<label>揀貨員代號<input class="v053-field" id="lxpicker" value="${safe(p.picker)}" ${done?'readonly':''}></label><p>狀態：${p.checkedAt?'已複核，歷史紀錄':done?'揀貨完成，等待複核':'揀貨未完成'}</p>${done?'<p>已完成揀貨，請交由複核出貨員。</p>':`<button class="primary wide" onclick="lxPickSave('${safe(id)}')">儲存／完成揀貨</button>`}</div>`,'內部揀貨單');document.getElementById('nav').innerHTML='';v60menu();}
window.lxPickOpen=lxPickOpen;
window.lxPickSave=function(id){const o=lxOrder(id);if(duty!=='揀貨'||!o||!lxReady(o))return;const p=lxCreate(o);if(p.pickedAt)return alert('揀貨已完成，不可修改');const name=document.getElementById('lxpicker')?.value.trim();if(!name)return alert('請填寫揀貨員代號');p.picker=name;p.picked=[...document.querySelectorAll('.lxpick:checked')].map(x=>Number(x.value));if(p.picked.length===o.lines.length){p.pickedAt=new Date().toISOString();o.events.push({at:p.pickedAt,text:'揀貨員 '+name+' 完成揀貨'});}persist();alert(p.pickedAt?'揀貨完成，等待複核出貨員':'已儲存揀貨進度');v60hqOrders()};
function lxReviewPage(id){const o=lxOrder(id);if(!o||!lxReady(o))return;const p=lxTicket(o);if(!p?.pickedAt)return alert('請先完成揀貨');if(p.checkedAt)return lxPackPage(id);
 screen(`<button class="secondary tiny" onclick="v60hqOrders()">← 返回複核出貨</button><div class="card"><h2>複核出貨｜第一步：逐件複核</h2><p>揀貨單：${safe(p.number)}<br>揀貨員：${safe(p.picker)}</p><p class="muted">複核作業不顯示買家個資；核對商品 SKU 與數量後才可進入包裝出貨。</p>${o.lines.map((x,i)=>`<div class="v053-orderline"><div><b>${safe(x.name)}</b><p class="muted">${safe(x.sku)}｜數量：1</p></div><label><input type="checkbox" class="lxreview" value="${i}"> 確認</label></div>`).join('')}<label>複核出貨員代號<input class="v053-field" id="lxchecker" placeholder="請填寫不同於揀貨員的代號"></label><button class="primary wide" onclick="lxPickVerify('${safe(id)}')">確認複核完成（第一步）</button></div>`,'複核出貨｜複核');document.getElementById('nav').innerHTML='';v60menu();}
window.lxReviewOpen=lxReviewPage;
window.lxPickVerify=function(id){const o=lxOrder(id);if(duty!=='複核出貨'||!o)return;const p=lxTicket(o);if(!p?.pickedAt)return alert('揀貨尚未完成');if(p.checkedAt)return lxPackPage(id);const name=document.getElementById('lxchecker')?.value.trim();if(!name)return alert('請填寫複核出貨員代號');if(name===p.picker)return alert('揀貨員與複核出貨員不得為同一人');if(document.querySelectorAll('.lxreview:checked').length!==o.lines.length)return alert('請先逐件確認所有商品');p.checker=name;p.checkedAt=new Date().toISOString();o.events.push({at:p.checkedAt,text:'複核出貨員 '+name+' 完成逐件複核'});persist();alert('複核完成！揀貨單已移入歷史紀錄，接著包裝並建立出貨單。');lxPackPage(id)};
function lxPackPage(id){const o=lxOrder(id);if(!o)return;const p=lxTicket(o);if(!p?.checkedAt)return alert('請先完成複核');
 const f=o.shipment;const made=!!f;
 screen(`<button class="secondary tiny" onclick="v60hqOrders()">← 返回複核出貨</button><div class="card"><h2>複核出貨｜第二步：包裝與出貨單</h2><p>訂單：${safe(o.id)}<br>揀貨員：${safe(p.picker)}<br>複核出貨員：${safe(p.checker)}</p><p class="muted">商品已完成揀貨與逐件複核，此步驟不需再次勾選。</p>${o.lines.map(x=>`<div class="v053-orderline">✓ ${safe(x.name)}｜${safe(x.sku)}｜1 件</div>`).join('')}<label><input type="checkbox" id="lxpacked" ${made?'checked disabled':''}> 已將全部商品裝入物流袋並封口</label>${made?`<p><b>已建立出貨單：${safe(f.number)}</b></p><button class="primary wide" onclick="v55OpenSlip('${safe(id)}')">查看／列印出貨單</button>`:`<button class="primary wide" onclick="lxPackFinish('${safe(id)}')">確認包裝完成並建立出貨單</button>`}</div>`,'複核出貨｜包裝');document.getElementById('nav').innerHTML='';v60menu();}
window.lxPackOpen=lxPackPage;
window.lxPackFinish=function(id){const o=lxOrder(id);if(duty!=='複核出貨'||!o||!lxTicket(o)?.checkedAt)return alert('請先完成複核');if(!document.getElementById('lxpacked')?.checked)return alert('請先完成裝袋封口確認');if(o.shipment)return lxPackPage(id);const p=lxTicket(o);const f=v55slip(o);f.picker=p.picker;f.checker=p.checker;f.checked=o.lines.map(x=>x.sku);f.status='待物流交寄';f.packedAt=new Date().toISOString();o.status='待物流交寄';o.events.push({at:f.packedAt,text:'複核出貨員完成裝袋並建立正式出貨單'});persist();alert('正式出貨單已建立，訂單進入上層「出貨」階段。');v55OpenSlip(id)};
const lxOriginalList=v60hqOrders;
v60hqOrders=function(){
 lxOriginalList();if(v60role!=='總部')return;const h=document.querySelector('main');if(!h)return;
 const header=h.querySelector('.card');if(!header)return;
 const roleBox=document.createElement('div');roleBox.className='card';roleBox.innerHTML=`<b>倉庫作業職位</b><p class="muted">揀貨與複核出貨採雙人核對；複核出貨員負責複核、包裝與建立出貨單。</p><div style="display:flex;gap:8px">${['揀貨','複核出貨'].map(d=>`<button style="flex:1" class="${duty===d?'primary':'secondary'}" onclick="lxDutySet('${d}')">${d}</button>`).join('')}</div>`;header.insertAdjacentElement('afterend',roleBox);
 if(v60OrderTab!=='pick')return;
 const all=store.orders.filter(lxReady).sort((a,b)=>(Date.parse(b.createdAt||'')||0)-(Date.parse(a.createdAt||'')||0)||String(b.id).localeCompare(String(a.id),'zh-TW',{numeric:true}));
 let labels,groups;
 if(duty==='揀貨'){
  labels=[['pending','未完成'],['done','已完成'],['history','歷史紀錄']];
  groups={pending:all.filter(o=>!lxTicket(o)?.pickedAt&&!lxHasSlip(o)),done:all.filter(o=>lxTicket(o)?.pickedAt&&!lxTicket(o)?.checkedAt&&!lxHasSlip(o)),history:all.filter(o=>!!lxTicket(o)?.checkedAt)};
 }else{
  labels=[['review','待複核'],['pack','待包裝出貨'],['handoff','待交寄'],['history','歷史紀錄']];
  groups={review:all.filter(o=>lxTicket(o)?.pickedAt&&!lxTicket(o)?.checkedAt),pack:all.filter(o=>lxTicket(o)?.checkedAt&&!lxHasSlip(o)),handoff:all.filter(o=>lxTicket(o)?.checkedAt&&lxHasSlip(o)&&!lxShipped(o)),history:all.filter(o=>lxTicket(o)?.checkedAt&&lxShipped(o))};
 }
 const selected=groups[lxWorkTab[duty]]||groups[labels[0][0]];
 const sub=document.createElement('div');sub.className='card';sub.innerHTML=`<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">${labels.map(([k,t])=>`<button class="${lxWorkTab[duty]===k?'primary':'secondary'}" onclick="lxDutyTab('${k}')">${t}（${groups[k].length}）</button>`).join('')}</div>`;roleBox.insertAdjacentElement('afterend',sub);
 Array.from(h.querySelectorAll('.card')).filter(c=>c.querySelector('button[onclick^="v053OpenOrder("]')).forEach(c=>c.remove());
 const blank=Array.from(h.querySelectorAll('.card')).find(c=>c.textContent.trim()==='此分類目前沒有訂單。');if(blank)blank.remove();
 const ledger=document.createElement('div');ledger.innerHTML=selected.map(o=>{
  const p=lxTicket(o);let action='',text='查看／處理';
  if(duty==='揀貨'){action=`lxPickOpen('${safe(o.id)}')`;text=lxWorkTab[duty]==='history'?'查看揀貨紀錄':p?.pickedAt?'查看已完成揀貨單':'查看／處理';}
  else if(lxWorkTab[duty]==='review'){action=`lxReviewOpen('${safe(o.id)}')`}
  else if(lxWorkTab[duty]==='pack'){action=`lxPackOpen('${safe(o.id)}')`}
  else {action=`v55OpenSlip('${safe(o.id)}')`;text='查看／列印出貨單'}
  return `<div class="card"><b>${safe(o.id)}</b><p class="muted">商品 ${o.lines.length} 件｜${safe(p?.number||'待建立揀貨單')}</p><button class="${lxWorkTab[duty]==='history'?'secondary':'primary'} wide" onclick="${action}">${text}</button></div>`;
 }).join('')||'<div class="card muted">此分類目前沒有單據。</div>';sub.insertAdjacentElement('afterend',ledger);
};
window.v60hqOrders=v60hqOrders;
const lxOldOrder=window.v053OpenOrder;
window.v053OpenOrder=function(id){if(v60role==='總部'&&v60OrderTab==='pick')return duty==='揀貨'?lxPickOpen(id):lxReviewPage(id);return lxOldOrder(id)};
const lxOldSlip=window.v55OpenSlip;
window.v55OpenSlip=function(id){const o=lxOrder(id);if(v60role==='總部'&&o&&!o.shipment&&!lxTicket(o)?.pickedAt)return alert('請先完成第一步揀貨，才能建立出貨單');const p=lxTicket(o);if(o?.shipment&&p?.checkedAt){o.shipment.picker=p.picker;o.shipment.checker=p.checker;o.shipment.checked=o.lines.map(x=>x.sku);persist()}const r=lxOldSlip(id);if(o?.shipment&&p?.checkedAt){const h=document.querySelector('main');if(h){h.querySelectorAll('input.v55check').forEach(x=>{x.checked=true;x.style.pointerEvents='none';x.style.display='none'});['v55picker','v55checker'].forEach(k=>{const x=h.querySelector('#'+k);if(x)x.readOnly=true});const note=document.createElement('p');note.className='muted';note.textContent='已完成雙人逐件核對，出貨單直接沿用結果，無須再次勾選。';h.querySelector('.v55slip h3')?.insertAdjacentElement('afterend',note)}}return r};
const lxOldShip=window.v54Ship;window.v54Ship=function(id){const o=lxOrder(id);if(o&&!lxTicket(o)?.checkedAt)return alert('請先完成揀貨及複核出貨作業');return lxOldShip(id)};
/* V0.6.2g: HQ navigation runs inside original order/role scope. */

/* V0.6.2e: six-tile HQ home; no changes to workflows.
 V0.6.2c: HQ navigation only. Existing business logic and storage untouched. */
(function(){
 const hqCard=(title,description,button,action,icon)=>`<button type="button" class="lx-hq-tile" onclick="${action}" aria-label="${title}"><span class="lx-hq-icon">${icon}</span><span class="lx-hq-name">${title}</span><span class="lx-hq-desc">${description}</span></button>`;
 window.lxHQHome=function(){
  if(v60role!=='總部')return v60dashboard();
  const body=`<div class="lx-hq-panel lx-role-colorful"><div class="lx-hq-head"><h2>樂享家｜總部工作台</h2><p class="muted">請選擇今天要處理的工作</p></div><div class="lx-hq-grid">`+
  hqCard('分享袋物流','收件・分派・騎手配送','', 'lxHQBagHub()','<img alt="騎手配送" width="23" height="23" style="width:23px;height:23px;object-fit:contain;display:block" src="data:image/png;base64,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">')+
  hqCard('商品審核核價','審核・定價・上架','', 'v04Home()','☑')+
  hqCard('商品庫存','SKU・保管位置・庫存','', 'v05Dashboard()','▤')+
  hqCard('訂單與出貨','收貨・揀貨・複核出貨','', 'v60hqOrders()','<svg viewBox="0 0 48 48" width="32" height="32" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 11h23a3 3 0 0 1 3 3v22H6a3 3 0 0 1-3-3V14a3 3 0 0 1 3-3Z"/><path d="M32 19h6l7 9v8H32V19Z"/><circle cx="14" cy="36" r="4" fill="#079c63"/><circle cx="38" cy="36" r="4" fill="#079c63"/></svg>')+
  hqCard('帳務與分潤','結算・回饋・提領','', 'lxHQFinance()','<svg viewBox="0 0 24 24" width="27" height="27" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.2" y="3.2" width="17.6" height="17.6" rx="2.2"/><path d="M15.5 8.5c-.7-.9-1.8-1.3-3.4-1.3-2 0-3.3 1-3.3 2.5 0 1.6 1.4 2.2 3.3 2.5 2 .3 3.4 1 3.4 2.6 0 1.6-1.4 2.6-3.5 2.6-1.5 0-2.8-.5-3.6-1.4M12.1 5.9v12.2"/></svg>')+
  hqCard('系統管理','人員・權限・異常','', 'lxHQSystem()','⚙')+'</div></div>';
  screen(body,'總部工作台');document.getElementById('nav').innerHTML='';v60menu();
 };
 window.lxHQBagList=function(kind){
  if(v60role!=='總部')return;
  const groups={
   awaitsign:['待職人簽收',b=>Number(b.stage)===4],
   pickup:['待騎手取件',b=>Number(b.stage)===2],
   delivery:['配送與交接',b=>Number(b.stage)===3],
   done:['已完成',b=>Number(b.stage)>=5],
   issues:['異常處理',b=>false],
   history:['物流紀錄',b=>true]
  };
  const [title,filter]=groups[kind]||groups.history;
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const bags=data.bags.filter(filter).slice().sort(lxRiderBagNewest);
  let body=`<button class="secondary tiny" onclick="lxHQBagHub()">← 分享袋物流</button><div class="card"><h2 style="margin:0 0 6px">${title}</h2><p class="muted">依袋號由新到舊顯示；不更改原有配送及掃碼狀態。</p></div>`;
  if(kind==='issues'){
   body+=`<div class="card"><h3>待處理異常（${data.incidents.filter(x=>!x.done).length}）</h3>${data.incidents.filter(x=>!x.done).map(x=>`<p class="muted">${esc(typeof x==='string'?x:JSON.stringify(x))}</p>`).join('')||'<p class="muted">目前沒有未結案異常。</p>'}</div>`;
   body+=`<div class="card"><h3>待職人簽收｜異常追蹤（${data.bags.filter(b=>Number(b.stage)===4).length}）</h3><p class="muted">騎手已完成投箱掃碼；等待時間及後續處理由總部記錄。</p></div>`;
   body+=`<div class="card"><button class="secondary wide" onclick="lxHQBagList('awaitsign')">前往待職人簽收追蹤</button></div>`;
  }else{
   body+=bags.map(b=>`<div class="card"><div class="row"><b>${esc(b.id)}</b><span class="status">${esc(label(b.stage))}</span></div><p class="muted">${esc(b.point||'未設定集貨點')}｜${esc(b.count||0)} 件</p>${kind==='awaitsign'?`<p class="muted">投箱時間：${b.depositedAt?new Date(b.depositedAt).toLocaleString('zh-TW'):'舊單無紀錄'}<br>已等待：${b.depositedAt&&Number.isFinite(Date.parse(b.depositedAt))?Math.max(0,Math.floor((Date.now()-Date.parse(b.depositedAt))/60000))+' 分鐘':'無法計算'}</p><p class="muted">總部處理紀錄：${(b.hqFollowups||[]).map(x=>esc(new Date(x.at).toLocaleString('zh-TW')+'｜'+x.note)).join('；')||'尚無'}</p><button class="secondary wide" onclick="lxHQBagNote('${esc(b.id)}')">記錄後續處理</button>`:''}</div>`).join('')||'<div class="card muted">此分類目前沒有分享袋。</div>';
   if(kind==='history')body+=`<div class="card"><h3>操作歷程</h3>${data.logs.slice(0,40).map(x=>`<div class="log">${esc(x)}</div>`).join('')||'<p class="muted">尚無操作紀錄。</p>'}</div>`;
  }
  screen(body,title);document.getElementById('nav').innerHTML='';v60menu();
 };
 window.lxHQBagNote=function(id){
  const b=data.bags.find(x=>x.id===id);
  if(!b||Number(b.stage)!==4)return alert('目前非待職人簽收狀態');
  const note=prompt('請輸入總部處理紀錄');if(!note||!note.trim())return;
  b.hqFollowups=b.hqFollowups||[];
  b.hqFollowups.push({at:new Date().toISOString(),note:note.trim()});
  log('總部追蹤分享袋 '+id+'：'+note.trim());save();lxHQBagList('awaitsign');
 };
 window.lxHQBagHub=function(){
  if(v60role!=='總部')return;
  const bagTile=(name,desc,icon,kind)=>hqCard(name,desc,'',`lxHQBagList('${kind}')`,icon);
  const body=`<button class="secondary tiny" onclick="lxHQHome()">← 總部工作台</button>
   <div class="lx-hq-panel lx-bag-hub"><div class="lx-hq-head"><h2>分享袋物流</h2><p class="muted">分享者 → 騎手 → 職人｜選擇作業項目</p></div><div class="lx-hq-grid">`+
   bagTile('待騎手取件','自動派單後等待取件','<svg viewBox="0 0 24 24" width="31" height="31" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="M3 7v10l9 5 9-5V7M12 12v10"/></svg>','pickup')+
   bagTile('配送與交接','騎手運送及投箱','<svg viewBox="0 0 24 24" width="31" height="31" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 5h13v12H1zM14 9h4l4 4v4h-8"/><circle cx="5.5" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>','delivery')+
   bagTile('待職人簽收','投箱後追蹤等待時間','<svg viewBox="0 0 24 24" width="31" height="31" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="4" width="14" height="18" rx="2"/><rect x="9" y="2" width="6" height="4" rx="1"/><path d="m9 14 2 2 4-4"/></svg>','awaitsign')+
   bagTile('已完成','職人已完成簽收','<svg viewBox="0 0 24 24" width="31" height="31" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>','done')+
   bagTile('異常處理','逾時與交接異常','<svg viewBox="0 0 24 24" width="31" height="31" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m10.3 3.6-8 14A2 2 0 0 0 4 20h16a2 2 0 0 0 1.7-2.4l-8-14a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4m0 4h.01"/></svg>','issues')+
   bagTile('物流紀錄','查詢完整操作歷程','<svg viewBox="0 0 24 24" width="31" height="31" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5"/><path d="M12 7v5l3 2"/></svg>','history')+
   `</div></div><p class="muted" style="font-size:12px;margin:14px 4px">六個入口已依物流狀態分流；原有資料與掃碼流程維持不變。</p>`;
  screen(body,'分享袋物流');document.getElementById('nav').innerHTML='';v60menu();
 };
 window.lxHQBagLegacy=function(){v60legacyWork('總部')};
 window.lxHQFinance=function(){screen(`<button class="secondary tiny" onclick="lxHQHome()">← 總部工作台</button><h2 class="title">帳務與分潤</h2><div class="card"><p>此版尚未整合獨立總部帳務工作台。原有結算資料未修改，暫不提供可能誤導的操作入口。</p></div>`,'帳務與分潤');document.getElementById('nav').innerHTML='';v60menu()};
 window.lxHQSystem=function(){screen(`<button class="secondary tiny" onclick="lxHQHome()">← 總部工作台</button><h2 class="title">系統管理</h2>${lxPermissionPreview()}<div class="card"><h3>🏢 公司資料管理（Admin 專屬）</h3><p class="muted">法定名稱、統一編號、登記地址、客服聯絡資訊、個資權利行使窗口及正式生效日期，只能由後端確認的 Admin 修改。</p><p style="color:#956319">🔒 目前尚未完成後端 Admin 驗證，正式資料編輯功能鎖定；此處僅顯示權限規劃。</p></div><div class="card"><h3>既有測試工具</h3><p class="muted">以下為舊模組入口，僅供測試與診斷。</p><button class="secondary wide" onclick="v60legacyWork('總部')">開啟原分派及異常工具</button></div>`,'系統管理');document.getElementById('nav').innerHTML='';v60menu()};
 // Route the ACTUAL top role switch and dashboard home into the new HQ hub.
 // v60home() was still calling the old dashboard in some navigation paths.
 const oldDashboard=v60dashboard;
 const oldHome=v60home;
 const oldSwitch=v60switch;
 v60dashboard=function(){if(v60role==='總部')return lxHQHome();return oldDashboard()};
 v60home=function(){if(v60role==='總部'){lxHQHome();v60menu();return}return oldHome()};
 v60switch=function(role){if(!['會員','職人','騎手','總部'].includes(role))return;if(role==='總部'){
   v60role=role;sessionStorage.setItem('lx-v60-role',role);data.role=role;save();
   lxHQHome();v60menu();return;
  }return oldSwitch(role)};
 window.v60dashboard=v60dashboard;
 window.v60home=v60home;
 window.v60switch=v60switch;
 // A dedicated, clearly labelled entry back to the six-function HQ hub
 // from the legacy tools; the tools themselves are preserved.
 const oldLegacy=v60legacyWork;
 v60legacyWork=function(role){oldLegacy(role);if(role==='總部'){
   const main=document.querySelector('#app main');
   if(main){const back=document.createElement('button');back.className='secondary wide';
    back.textContent='← 返回新版總部工作台（六大功能）';back.onclick=()=>lxHQHome();
    back.style.marginBottom='12px';main.prepend(back)}
  }};
 window.v60legacyWork=v60legacyWork;

/* V0.6.2L: install role dashboard within the original private app scope. */
const lxRolePreviousDashboard=v60dashboard;
const lxRoleTile=(name,desc,icon,action)=>`<button type="button" class="lx-hq-tile" onclick="${action}"><span class="lx-hq-icon">${icon}</span><span class="lx-hq-name">${name}</span><span class="lx-hq-desc">${desc}</span></button>`;
v60dashboard=function(){
 if(v60role!=='職人'&&v60role!=='騎手')return lxRolePreviousDashboard();
 const tiles=v60role==='職人'
  ? lxRoleTile('衣物驗收與保管','分享袋收件・IN 箱確認・逐件驗收','▣',"v60legacyWork('職人')")+lxRoleTile('成交商品包裝','查看包裝任務・OUT 箱交接','▤','v60tasks()')
  : lxRoleTile('衣物分享袋配送','取件・交件掃碼','▣',"v60legacyWork('騎手')")+lxRoleTile('成交衣物送總部','查看配送交接任務','➜','v60tasks()');
 screen(`<div class="lx-hq-panel lx-role-colorful"><div class="lx-hq-head"><h2>樂享家｜${v60role}工作台</h2><p>請選擇今天要處理的工作</p></div><div class="lx-hq-grid">${tiles}</div></div>`,`${v60role}工作台`);
 document.getElementById('nav').innerHTML='';v60menu();
};
window.v60dashboard=v60dashboard;

})();




/* V0.6.3o: expose existing order/role state to later isolated modules.
   This repairs ReferenceError without resetting or replacing stored data. */
const lxExposeNames={v60menu:()=>v60menu,v60role:()=>v60role,store:()=>store,persist:()=>persist,safe:()=>safe,v54init:()=>v54init,v55ready:()=>v55ready,v60OrderTab:()=>v60OrderTab,v60OrderPhase:()=>v60OrderPhase,v60hqOrders:()=>v60hqOrders,v60dashboard:()=>v60dashboard,screen:()=>screen,inventory:()=>inventory,v54event:()=>v54event,v54status:()=>v54status};
Object.keys(lxExposeNames).forEach(k=>{
  const old=Object.getOwnPropertyDescriptor(window,k);
  if(old&&!old.configurable)return;
  Object.defineProperty(window,k,{configurable:true,enumerable:false,get:lxExposeNames[k],set(v){
    switch(k){case 'v60role':v60role=v;break;case 'v60OrderTab':v60OrderTab=v;break;case 'v60hqOrders':v60hqOrders=v;break;case 'v60dashboard':v60dashboard=v;break;case 'store':store=v;break;}
  }});
});
})();
