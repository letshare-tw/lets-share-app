
/* V0.6.2v: isolated HQ receiving interface; all other flows unchanged. */
(function(){
 const previousOrders=window.v60hqOrders;
 const originalReceive=window.v54Step;
 const fmt=o=>o.createdAt?new Date(o.createdAt).toLocaleString('zh-TW'):'日期未記錄';
 const counts=o=>{const ts=v54init(o);return {ts,received:ts.filter(t=>t.stage==='總部已簽收').length,transit:ts.filter(t=>t.stage==='運送總部中').length};};
 window.lxHQReceiptOpen=function(id){
  if(v60role!=='總部')return;
  const o=store.orders.find(x=>x.id===id);if(!o)return;
  const {ts,received}=counts(o);
  const rows=ts.map((t,i)=>{
   const signed=t.stage==='總部已簽收',arrived=t.stage==='運送總部中';
   const riderDone=(t.events||[]).some(e=>String(e.text||'').includes('騎手已掃碼交至總部'));
   return `<div class="card" style="margin:12px 0;border-left:4px solid ${signed?'#07935b':arrived?'#e6a52a':'#b8c6bf'}"><b>${safe(t.sku||'缺少 SKU')}</b><p class="muted">${safe(t.name||'衣物')}｜保管職人：${safe(t.keeper||'未確認')}</p><p>狀態：<b>${signed?'✓ 總部已簽收':safe(t.stage)}</b></p>${signed?'<p class="muted">此件已完成入庫，不可重複簽收。</p>':arrived?`<p class="muted">${riderDone?'騎手已完成交件掃碼；請核對實物。':'尚無騎手交件掃碼紀錄；請先確認實物及交接。'}</p><label>掃描／輸入實際商品 SKU<input class="field" id="v54scan${i}" placeholder="${safe(t.sku)}" autocomplete="off"></label><button class="primary wide" onclick="lxHQReceiptConfirm('${safe(o.id)}',${i})">核對並簽收入庫</button>`:'<p class="muted">商品尚未進入總部收貨階段，暫不能簽收。</p>'}</div>`;
  }).join('');
  const missing=o.lines.filter(x=>!x.sku).length;
  screen(`<button class="secondary tiny" onclick="v60OrderTab='receive';v60hqOrders()">← 返回總部收貨</button><div class="card"><h2>總部集中倉｜逐件收貨</h2><p>訂單：<b>${safe(o.id)}</b></p><p class="muted">${fmt(o)}｜商品 ${o.lines.length} 件｜已簽收 ${received}/${ts.length} 件</p><p class="muted">依實際商品 SKU 核對，完成一件才登記一件；全部簽收後自動進入「揀貨」。</p>${missing?`<p style="color:#a55b18">⚠️ ${missing} 件缺少實體 SKU，不能完成正常收貨。</p>`:''}</div>${rows||'<div class="card muted">尚無可驗證的實體商品交接資料。</div>'}`,'總部收貨確認');
  document.getElementById('nav').innerHTML='';v60menu();
 };
 window.lxHQReceiptConfirm=function(id,i){
  if(v60role!=='總部')return alert('僅總部可執行入庫簽收');
  const o=store.orders.find(x=>x.id===id),t=o&&v54init(o)[i];if(!t||t.stage!=='運送總部中')return alert('此件尚未進入可簽收階段');
  const value=document.getElementById('v54scan'+i)?.value.trim();if(!value||value!==t.sku)return alert('SKU 不符，請核對實際衣物再簽收');
  if(!confirm('確認實際收到商品 '+t.sku+' 並完成入庫簽收？'))return;
  t.stage='總部已簽收';v54event(o,t,t.sku+'｜總部集中倉掃碼簽收');o.status=v54status(o);persist();
  if(v55ready(o)){alert('本訂單全部商品已完成入庫，可至「揀貨」建立內部揀貨單。');v60OrderTab='pick';v60hqOrders()}
  else lxHQReceiptOpen(id);
 };
 window.v60hqOrders=function(){
  if(v60role!=='總部')return previousOrders();
  if(v60OrderTab!=='receive')return previousOrders();
  const all=store.orders.slice().sort((a,b)=>(Date.parse(b.createdAt||'')||0)-(Date.parse(a.createdAt||'')||0)||String(b.id).localeCompare(String(a.id),'zh-TW',{numeric:true}));
  const groups={receive:[],pick:[],ship:[],done:[]};all.forEach(o=>groups[v60OrderPhase(o)].push(o));
  const tabs=[['receive','收貨'],['pick','揀貨'],['ship','出貨'],['done','已完成']];
  const rows=groups.receive.map(o=>{const c=counts(o);return `<div class="card"><b>${safe(o.id)}</b><p class="muted">${fmt(o)}｜${o.lines.length} 件商品</p><p>已簽收 <b>${c.received}/${c.ts.length}</b> 件　｜　運送中 ${c.transit} 件</p><button class="primary wide" onclick="lxHQReceiptOpen('${safe(o.id)}')">查看商品／逐件簽收</button></div>`}).join('')||'<div class="card muted">目前沒有待收貨訂單。</div>';
  screen(`<button class="secondary tiny" onclick="v60dashboard()">← 總部工作台</button><h2>訂單與集中倉</h2><p class="muted">依收貨 → 揀貨 → 出貨 → 已完成分階段管理。</p><div class="card"><div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px">${tabs.map(([k,label])=>`<button style="font-size:13px;padding:10px 2px" class="${k==='receive'?'primary':'secondary'}" onclick="v60SetOrderTab('${k}')">${label}<small style="display:block">${groups[k].length}</small></button>`).join('')}</div></div><div class="card" style="background:#e8f7ee"><b>總部收貨確認</b><p class="muted">掃描實際商品 SKU，逐件簽收；未全數到倉不得揀貨。僅本機流程模擬。</p></div>${rows}`,'總部收貨');document.getElementById('nav').innerHTML='';v60menu();
 };
})();
