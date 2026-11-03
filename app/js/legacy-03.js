
/* V0.5 本機商城商品 / 庫存串接，V0.4.6 工作流保持不變 */
(function(){
const K='lexiangjia-v05-inventory';let inventory={};try{inventory=JSON.parse(localStorage.getItem(K))||{}}catch(e){}
const hqK='lexiangjia-v04-reviews';const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function saveInv(){try{localStorage.setItem(K,JSON.stringify(inventory))}catch(e){alert('庫存保存失敗：'+e.message)}}
function getReviews(){try{return JSON.parse(localStorage.getItem(hqK))||{}}catch(e){return {}}}
function category(raw){let x=String(raw||'');if(x.includes('男'))return '男裝';if(x.includes('童'))return '童裝';if(x.includes('包')||x.includes('配件'))return '包包配件';return '女裝'}
function icon(cat){return cat==='包包配件'?'👜':cat==='童裝'?'👚':cat==='男裝'?'👕':'👗'}
function priceNow(rec){let weeks=Math.max(0,Math.floor((Date.now()-Date.parse(rec.listedAt||new Date().toISOString()))/(7*86400000)));let price=rec.originalPrice;for(let n=0;n<weeks;n++)price=Math.max(Math.ceil(rec.originalPrice*.5),Math.round(price*.9));return Math.max(Math.ceil(rec.originalPrice*.5),price)}
function sync(){let h=getReviews(),seen={};Object.entries(h).forEach(([bag,record])=>{Object.entries(record.reviews||{}).forEach(([i,r])=>{let key=bag+'-'+String(Number(i)+1).padStart(3,'0');if(r.action==='上架'&&Number.isSafeInteger(Number(r.price))&&Number(r.price)>0){seen[key]=true;let item=record.record?.items?.[Number(i)]||{},cat=category(item.cat||item.category),prior=inventory[key];if(!prior){inventory[key]={sku:key,bag,index:Number(i),originalPrice:Number(r.price),listedAt:r.reviewedAt||new Date().toISOString(),status:'在架',category:cat,name:(item.brand&&item.brand!=='無'?item.brand+' ':'')+(item.cat||item.category||'二手衣物'),size:item.size||'未標示',color:item.color||'未標示',condition:item.condition||'未標示',defect:item.defect||item.note||'無',note:r.note||'',source:'總部核價',keeper:(v03[bag]?.keeperId||getbag(bag)?.receivedBy||''),id:100000+Object.keys(inventory).length};}else if(prior.status==='在架'&&prior.originalPrice!==Number(r.price)){prior.originalPrice=Number(r.price);prior.listedAt=r.reviewedAt||new Date().toISOString();} } });});Object.values(inventory).forEach(p=>{if(!seen[p.sku]&&p.status==='在架')p.status='停止上架';});saveInv();
Object.values(inventory).forEach(p=>{const k=v03[p.bag]?.keeperId||getbag(p.bag)?.receivedBy;if(k&&(!p.keeper||p.keeper==='原樂享職人'))p.keeper=k});
// 保持商品 id 穩定，避免舊購物車因重新開啟而錯置。
let used=new Set(products.slice(0,6).map(p=>p.id));Object.values(inventory).forEach(p=>{if(!Number.isSafeInteger(p.id)||used.has(p.id)){let id=100000;while(used.has(id))id++;p.id=id;}used.add(p.id)});saveInv();
products.splice(0);Object.values(inventory).filter(p=>p.status==='在架'&&!window.v053OccupiedSkus?.().has(p.sku)).sort((a,b)=>(Date.parse(b.listedAt||'')||0)-(Date.parse(a.listedAt||'')||0)||String(b.sku||'').localeCompare(String(a.sku||''),'zh-TW',{numeric:true})).forEach(p=>products.push({id:p.id,name:p.name,price:priceNow(p),icon:icon(p.category),cat:p.category,size:p.size,desc:'總部核價已上架（本機模擬）｜'+p.color+'｜'+p.condition,sku:p.sku}));
}
function available(){return Object.values(inventory).filter(x=>x.status==='在架'&&!window.v053OccupiedSkus?.().has(x.sku)).sort((a,b)=>(Date.parse(b.listedAt||'')||0)-(Date.parse(a.listedAt||'')||0)||String(b.sku||'').localeCompare(String(a.sku||''),'zh-TW',{numeric:true}))}
function cardHtml(p){let price=priceNow(p),days=Math.max(0,Math.floor((Date.now()-Date.parse(p.listedAt))/86400000));return `<div class="card v05item"><div class="v05thumb" id="v05thumb-${p.id}">${icon(p.category)}</div><div style="flex:1;min-width:0"><b>${esc(p.name)}</b><div class="muted" style="font-size:12px">${esc(p.sku)}｜${esc(p.size)}｜${esc(p.color)}</div><div><b style="color:#078a50">NT$ ${price}</b>${price<p.originalPrice?`<span class="v05original">${p.originalPrice}</span>`:''}</div><span class="v05tag">${esc(p.status)}</span><span class="muted" style="font-size:12px"> · 上架 ${days} 天</span></div></div>`}
async function thumb(p,elemId){
 try{
  let img=await v031get(v031key(p.bag,p.index,'正面'));
  let el=document.getElementById(elemId);
  if(!el)return;
  if(img?.data&&/^data:image\//.test(img.data)){
   el.textContent='';let node=document.createElement('img');node.src=img.data;node.alt=p.name+' 實拍正面照';node.loading='lazy';el.appendChild(node);
  }else{el.innerHTML='<span style="font-size:13px;color:#65746b;text-align:center;padding:12px">尚無可讀取的商品照片</span>';}
 }catch(e){let el=document.getElementById(elemId);if(el)el.innerHTML='<span style="font-size:13px;color:#65746b;text-align:center;padding:12px">照片未載入，請重新匯入審核包</span>';}
}
let v052GalleryToken=0;
async function gallery(p,elemId){
 const token=++v052GalleryToken;
 const host=document.getElementById(elemId);if(!host)return;
 const kinds=['正面','背面','標籤','瑕疵'];const photos=[];
 for(const kind of kinds){
  try{const x=await v031get(v031key(p.bag,p.index,kind));if(x?.data&&/^data:image\//.test(x.data))photos.push({kind,src:x.data})}catch(e){}
 }
 if(token!==v052GalleryToken||document.getElementById(elemId)!==host)return;
 if(!photos.length){host.innerHTML='<div class="v052-no-photo">尚無可讀取的實拍照片，請重新匯入含照片的 JSON 審核包</div>';return}
 host.innerHTML='';host.classList.add('v052-gallery');
 const main=document.createElement('div');main.className='v052-main';
 const mainImg=document.createElement('img');mainImg.alt=p.name+' '+photos[0].kind+'實拍照片';mainImg.src=photos[0].src;main.appendChild(mainImg);
 const counter=document.createElement('span');counter.className='v052-counter';main.appendChild(counter);
 const controls=document.createElement('div');controls.className='v052-controls';
 const back=document.createElement('button');back.type='button';back.textContent='‹';back.setAttribute('aria-label','上一張照片');
 const next=document.createElement('button');next.type='button';next.textContent='›';next.setAttribute('aria-label','下一張照片');
 main.appendChild(back);main.appendChild(next);
 const thumbs=document.createElement('div');thumbs.className='v052-thumbnails';
 let index=0;const nodes=[];
 function select(i){index=(i+photos.length)%photos.length;mainImg.src=photos[index].src;mainImg.alt=p.name+' '+photos[index].kind+'實拍照片';counter.textContent=(index+1)+' / '+photos.length+' · '+photos[index].kind;nodes.forEach((node,j)=>{node.classList.toggle('on',j===index);node.setAttribute('aria-pressed',String(j===index))})}
 back.onclick=()=>select(index-1);next.onclick=()=>select(index+1);
 photos.forEach((ph,i)=>{const b=document.createElement('button');b.type='button';b.className='v052-mini';b.setAttribute('aria-label','查看'+ph.kind+'照片');const im=document.createElement('img');im.src=ph.src;im.alt=ph.kind+'縮圖';const t=document.createElement('span');t.textContent=ph.kind;b.append(im,t);b.onclick=()=>select(i);thumbs.appendChild(b);nodes.push(b)});
 let startX=null;main.addEventListener('touchstart',e=>{startX=e.touches[0]?.clientX??null},{passive:true});main.addEventListener('touchend',e=>{if(startX===null)return;const dx=(e.changedTouches[0]?.clientX??startX)-startX;if(Math.abs(dx)>45)select(index+(dx<0?1:-1));startX=null},{passive:true});
 host.append(main,thumbs);select(0);
}
function dashboard(){sync();let list=available(),all=Object.values(inventory),discount=list.filter(x=>priceNow(x)<x.originalPrice).length;document.getElementById('app').innerHTML=headerMarkup('商品上架與庫存')+`<main class="main"><button class="secondary tiny" onclick="go('work')">← 返回工作台</button><div class="card"><h2>🛍️ V0.5 商品上架與庫存</h2><p class="muted">已由總部核價並上架的衣物，自動建立商品編號、首次售價、上架時間及保管資訊。此為本機示範，尚無真正的商城同步與訂單扣庫存。</p><div class="v05stat"><div><b>${list.length}</b><small>在架商品</small></div><div><b>${discount}</b><small>已自動降價</small></div><div><b>${all.length}</b><small>累計建立</small></div></div><p class="muted" style="font-size:12px">降價：上架每滿 7 天按當前價降 10%（四捨五入至元），最低不低於首次上架價 50%（向上取整）；停止降價後繼續販售。以裝置日期模擬計算。</p><button class="primary wide" onclick="v05Refresh()">重新整理核價上架資料</button></div><h3 class="title">在架商品清單</h3>${list.length?list.map(cardHtml).join(''):'<div class="card v05empty">目前尚無在架商品。請先到總部工作台完成衣物核價與模擬上架。</div>'}<div class="card"><b>保管及出貨原則</b><p class="muted">未售衣物由原樂享職人以衣架暫存。成交後由職人包裝、騎手送至總部集中倉，再由總部配貨出貨；本版尚未啟用這段物流。</p><button class="secondary wide" onclick="go('categories')">前往商城查看上架商品</button></div></main>`;nav();list.forEach(p=>thumb(p,'v05thumb-'+p.id))}
window.v05Refresh=()=>dashboard();window.v05Dashboard=()=>{page='v05';dashboard()};
const oldRender=render;render=function(){sync();if(page==='v05'){dashboard();return}oldRender();if(page==='categories'||page==='home'){
 document.querySelectorAll('[data-v051-product-id]').forEach(el=>{
  const id=Number(el.getAttribute('data-v051-product-id'));
  const rec=Object.values(inventory).find(r=>r.id===id&&r.status==='在架');
  if(rec){el.id='v052-card-photo-'+id;el.textContent='照片載入中…';thumb(rec,el.id)}
 });
 }if(page==='work'&&data.role==='總部'){let main=document.querySelector('#app main');if(main){let box=document.createElement('div');box.className='card';box.innerHTML='<b>🛍️ V0.5 商品上架與庫存管理</b><p class="muted">總部核價商品 → 建立商品編號 → 商城展示 → 7 天自動降價</p><button class="primary wide" onclick="v05Dashboard()">進入商品庫存工作台</button>';main.insertBefore(box,main.children[2]||null)}}if(page==='product'){let p=products.find(x=>x.id===selected),rec=p&&Object.values(inventory).find(r=>r.id===p.id);if(rec){let el=document.querySelector('#app .detailart');if(el){el.id='v05-product-photo';el.textContent='正在載入衣物照片…';gallery(rec,'v05-product-photo')}let d=document.querySelector('#app .main .card');if(d)d.insertAdjacentHTML('beforeend',`<div class="listitem"><span>商品編號</span><b>${esc(rec.sku)}</b></div><div class="listitem"><span>首次上架售價</span><b>NT$ ${rec.originalPrice}</b></div><div class="listitem"><span>目前保管</span><b>原樂享職人</b></div>`);}}};
// 提供訂單模組使用的受控庫存介面（原本分屬不同閉包）。
window.v05InventoryBridge={inventory,save:saveInv,price:priceNow};
// 核價結果寫入後 v04 會切換畫面，下一次 render 或開啟庫存頁自動同步。
sync();
})();
