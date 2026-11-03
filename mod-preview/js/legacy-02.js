
/* V0.4 isolated HQ review extension; V0.3.4 workflows untouched */
(function(){
const KEY='lexiangjia-v04-reviews';let state={};try{state=JSON.parse(localStorage.getItem(KEY))||{}}catch(e){}
let active='',idx=0;const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){alert('核價紀錄無法保存：'+e.message)}};
function sources(){let a={};Object.entries(v03).forEach(([id,rec])=>{if(rec?.submitted&&Array.isArray(rec.items))a[id]={record:rec,source:'職人本機提交'}});Object.entries(state).forEach(([id,rec])=>{if(rec.record)a[id]={record:rec.record,source:rec.source||'匯入審核包'}});return a}
let v04ListTab='pending';window.v04SetListTab=function(tab){v04ListTab=tab==='done'?'done':'pending';show()};function show(){page='v04';let a=sources(),ids=Object.keys(a).sort((x,y)=>y.localeCompare(x,'zh-Hant',{numeric:true}));let isDone=id=>{let rec=a[id].record,r=state[id]?.reviews||{};return rec.items.length>0&&Object.keys(r).length>=rec.items.length};let pending=ids.filter(id=>!isDone(id)),done=ids.filter(isDone);ids=v04ListTab==='done'?done:pending;document.getElementById('app').innerHTML=headerMarkup('總部審核與定價')+`<main class="main"><button class="secondary tiny" onclick="go('work')">← 返回工作台</button><div class="card"><h2>🏷️ V0.4 總部定價工作台</h2><p class="muted">授權定價員逐件審核，核定售價後直接模擬上架，無主管複審。</p><p class="muted">本機示範版，不會真的上架商城或上傳伺服器。</p><label>匯入職人已提交 JSON 審核包</label><input type="file" accept=".json,application/json" onchange="v04Import(this)"><p class="muted">大型照片檔可能需要等待。請保留原 JSON 備份。</p></div><div class="card"><div style="display:flex;gap:8px"><button class="${v04ListTab==='pending'?'primary':'secondary'}" style="flex:1" onclick="v04SetListTab('pending')">待核價（${pending.length}）</button><button class="${v04ListTab==='done'?'primary':'secondary'}" style="flex:1" onclick="v04SetListTab('done')">已核價（${done.length}）</button></div></div>${ids.map(id=>{let rec=a[id].record,r=state[id]?.reviews||{},ok=Object.values(r).filter(x=>x.action==='上架').length;return `<div class="card"><b>${esc(id)}</b><p class="muted">${esc(a[id].source)}｜${rec.items.length} 件｜已審 ${Object.keys(r).length} 件｜模擬上架 ${ok} 件</p><p><b>${rec.items.length>0 && Object.keys(r).length>=rec.items.length ? "✅ 已核價完成" : "⏳ 尚有商品待核價"}</b></p><button class="${rec.items.length>0 && Object.keys(r).length>=rec.items.length ? "secondary lx-reviewed-btn" : "primary"} wide" onclick="v04Open('${esc(id)}')">${rec.items.length>0 && Object.keys(r).length>=rec.items.length ? "查看核價結果" : "開啟逐件核價"}</button></div>`}).join('')||'<div class="card">此分類目前沒有單據。</div>'}</main>`;nav()}
window.v04Import=async function(el){let f=el.files?.[0];if(!f)return;try{let x=JSON.parse(await f.text());if(x.format!=='lexiangjia-v031-offline-review'||!x.bag||!Array.isArray(x.record?.items))throw Error('JSON 格式不符合樂享家審核包，請使用職人端「匯出完整驗收 JSON」。');if(!x.record.submitted)throw Error('此袋已儲存驗收資料，但尚未按「提交總部審核」。請回職人端提交後重新匯出 JSON。');let id=x.bag;if(state[id]?.reviews&&Object.keys(state[id].reviews).length&&!confirm('此袋已有核價紀錄，將保留原核價結果。繼續匯入？'))return;let count=0;for(let i=0;i<x.record.items.length;i++){for(let [kind,img] of Object.entries(x.photos?.[i]||{})){if(img?.data?.startsWith('data:image/')){await v031put(v031key(id,i,kind),img);count++}}}state[id]={...state[id],record:x.record,source:'JSON 匯入',reviews:state[id]?.reviews||{}};persist();alert(`匯入成功：${id}，${x.record.items.length} 件衣物、${count} 張照片。`);show()}catch(e){alert('匯入失敗：'+e.message)}finally{el.value=''}};
window.v04Open=function(id){active=id;idx=0;item()};
function item(){let a=sources()[active];if(!a){show();return}let all=a.record.items,o=all[idx],saved=state[active]?.reviews?.[idx]||{},status=o.status||'未標示';document.getElementById('app').innerHTML=headerMarkup('逐件核價')+`<main class="main"><button class="secondary tiny" onclick="v04Home()">← 返回袋件清單</button><div class="card"><b>${esc(active)}｜第 ${idx+1} / ${all.length} 件</b><p class="muted">職人初判：${esc(status)}｜${esc(o.category||'未分類')}｜${esc(o.brand||'無')}</p><p>尺寸：${esc(o.size||'—')}　顏色：${esc(o.color||'—')}</p><p>衣況：${esc(o.condition||'—')}　瑕疵：${esc(o.defect||o.notes||'無')}</p><div id="v04pics" class="v04pics">正在載入照片…</div></div><div class="card"><h3>總部審核決定</h3><label>核定售價（新台幣）</label><input id="v04price" class="field" type="number" onkeydown="v04PriceEnter(event)" onkeyup="v04PriceEnter(event)" min="1" step="1" inputmode="numeric" value="${saved.price||''}" placeholder="例如 150"><div class="v046quick" aria-label="快速核定售價"><div class="v046quicktitle">快速給價（NT$）</div><div class="v046quickgrid">${[100,150,200,250,300].map(n=>`<button type="button" class="v046pricebtn ${Number(saved.price)===n?'selected':''}" onclick="v04QuickPrice(${n})" aria-label="核定售價 ${n} 元">${n}</button>`).join('')}</div></div><button class="primary wide" id="v04confirm" onclick="v04Decision('上架')" ${status!=='合格'?'disabled':''}>確認核價並模擬直接上架</button><button class="secondary wide" onclick="v04Decision('退回')" style="margin-top:8px">退回／不予上架</button><details class="v045note"><summary>＋ 審核備註（選填）</summary><textarea id="v04note" class="field" rows="2" placeholder="有需要再填寫">${esc(saved.note||'')}</textarea></details><p class="muted">只有總部授權定價員可核價。職人初判不合格時，須退回／結案，不可直接上架。</p>${saved.action?`<p class="muted">目前結果：${esc(saved.action)}${saved.price?'｜NT$ '+saved.price:''}</p>`:''}</div><div class="row" style="gap:8px"><button class="secondary" onclick="v04Step(-1)" ${idx===0?'disabled':''}>← 上一件</button><button class="secondary" onclick="v04Step(1)" ${idx===all.length-1?'disabled':''}>下一件 →</button></div></main>`;nav();photos()}
async function photos(){let el=document.getElementById('v04pics');if(!el)return;el.innerHTML='';for(let kind of ['正面','背面','標籤','瑕疵']){let p;try{p=await v031get(v031key(active,idx,kind))}catch(e){}let div=document.createElement('div');div.innerHTML='<b>'+kind+'</b>';if(p?.data){let img=document.createElement('img');img.src=p.data;img.alt=kind;img.style.cssText='width:100%;max-height:220px;object-fit:contain;border-radius:8px;display:block';div.appendChild(img)}else div.innerHTML+='<p class="muted">尚無照片</p>';el.appendChild(div)}}
window.v04QuickPrice=function(amount){
 const input=document.getElementById('v04price');
 const confirmButton=document.getElementById('v04confirm');
 if(!input)return;
 input.value=String(amount);
 input.dispatchEvent(new Event('input',{bubbles:true}));
 input.blur();
 document.querySelectorAll('.v046pricebtn').forEach(btn=>{
   const selected=Number(btn.textContent.trim())===amount;
   btn.classList.toggle('selected',selected);
   btn.setAttribute('aria-pressed',String(selected));
 });
 if(confirmButton&&!confirmButton.disabled){
   confirmButton.focus({preventScroll:true});
   confirmButton.scrollIntoView({behavior:'smooth',block:'center'});
 }
};
window.v04PriceEnter=function(event){
 if(event.key!=='Enter'&&event.key!=='NumpadEnter')return;
 event.preventDefault();
 if(event.type==='keyup'&&event.__v045done)return;
 const button=document.getElementById('v04confirm');
 const price=document.getElementById('v04price');
 if(!button||!price)return;
 price.blur(); // 收起手機數字鍵盤，避免遮住確認按鈕
 if(button.disabled)return;
 button.focus({preventScroll:true});
 button.scrollIntoView({behavior:'smooth',block:'center'});
};
document.addEventListener('focusin',function(e){if(e.target?.id==='v04confirm'&&page==='v04'){e.target.scrollIntoView({behavior:'smooth',block:'center'});}});
window.v04Home=show;window.v04Step=n=>{idx+=n;item()};window.v04Decision=function(action){let src=sources()[active],o=src.record.items[idx],price=Number(document.getElementById('v04price').value),note=(document.getElementById('v04note')?.value||'').trim();if(action==='上架'){if(o.status!=='合格')return alert('職人初判不合格，不可直接上架。');if(!Number.isSafeInteger(price)||price<=0)return alert('請輸入大於零的整數售價。')}if(!state[active])state[active]={record:src.record,source:src.source,reviews:{}};state[active].reviews??={};state[active].reviews[idx]={action,price:action==='上架'?price:null,note,reviewedAt:new Date().toISOString(),demo:true};persist();
// 完成一件後自動前往下一件尚未審核的衣物；全部完成則返回袋件清單。
const total=src.record.items.length;
let next=-1;
for(let offset=1;offset<=total;offset++){
 const candidate=(idx+offset)%total;
 if(!Object.prototype.hasOwnProperty.call(state[active].reviews,candidate)){next=candidate;break}
}
if(next>=0){idx=next;item();toast(action==='上架'?'核價完成，已跳至下一件':'不予上架已記錄，已跳至下一件')}
else{const bag=active;active='';show();alert('袋件 '+bag+' 已完成全部 '+total+' 件審核，已返回袋件清單。')}
};
const oldRender=render;render=function(){if(page==='v04'){show();return}oldRender();/* V0.5.2: 商品圖片由庫存模組統一載入，避免跨作用域錯誤 */if(page==='work'&&data.role==='總部'){let main=document.querySelector('#app main');if(main){let b=document.createElement('div');b.className='card';b.innerHTML='<b>🏷️ V0.4 總部審核與定價</b><p class="muted">接收職人資料 → 逐件審核 → 核價 → 模擬直接上架</p><button class="primary wide" onclick="v04Home()">進入總部核價工作台</button>';main.insertBefore(b,main.children[2]||null)}}};
})();
