
/* V0.6.2b — selective removal of legacy catalog demos and demo-only orders. */
(function(){
 'use strict';
 const marker='lexiangjia-v062b-demo-cleanup-v1';
 function cleanup(){
  try{
   if(localStorage.getItem(marker)==='done')return;
   const previous=store.orders.length;
   const removable=store.orders.filter(o=>Array.isArray(o.lines)&&o.lines.length>0&&o.lines.every(l=>!l.sku));
   const ids=new Set(removable.map(o=>o.id));
   if(ids.size){
    store.orders=store.orders.filter(o=>!ids.has(o.id));
    persist();
   }
   // Legacy catalog IDs 1–6 have no warehouse SKU; never delete real inventory records.
   data.cart=(data.cart||[]).filter(id=>!([1,2,3,4,5,6].includes(Number(id))&&!Object.values(inventory).some(r=>Number(r.id)===Number(id))));
   data.favorites=(data.favorites||[]).filter(id=>!([1,2,3,4,5,6].includes(Number(id))&&!Object.values(inventory).some(r=>Number(r.id)===Number(id))));
   save();
   // No deletion of bag records, workers, real-SKU orders, shipment records or inventory.
   localStorage.setItem(marker,'done');
   localStorage.setItem('lexiangjia-v062b-demo-cleanup-report',JSON.stringify({removed:ids.size,retained:store.orders.length,at:new Date().toISOString()}));
   if(ids.size&&typeof toast==='function')toast('已清理 '+ids.size+' 筆早期示範訂單；實際商品訂單已保留');
  }catch(err){console.error('示範資料清理失敗',err)}
 }
 cleanup();
 // Re-run inventory/catalog synchronization so legacy sample products disappear immediately.
 if(typeof sync==='function')sync();
 if(typeof render==='function')render();
})();
