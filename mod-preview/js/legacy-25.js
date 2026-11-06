/* MEMBER-ADDR-002 structured address, retains legacy home_address for compatibility. */
(function(){
'use strict';
const previous=window.lxProfileEditor;
if(typeof previous!=='function')return;
const cities=['臺北市','新北市','桃園市','臺中市','臺南市','高雄市','基隆市','新竹市','嘉義市','新竹縣','苗栗縣','彰化縣','南投縣','雲林縣','嘉義縣','屏東縣','宜蘭縣','花蓮縣','臺東縣','澎湖縣','金門縣','連江縣'];
const tainan=['中西區','東區','南區','北區','安平區','安南區','永康區','歸仁區','新化區','左鎮區','玉井區','楠西區','南化區','仁德區','關廟區','龍崎區','官田區','麻豆區','佳里區','西港區','七股區','將軍區','學甲區','北門區','新營區','後壁區','白河區','東山區','六甲區','下營區','柳營區','鹽水區','善化區','大內區','山上區','新市區','安定區'];
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function val(id){return document.getElementById(id)?.value.trim()||''}
function options(list,selected){return list.map(x=>'<option value="'+esc(x)+'"'+(x===selected?' selected':'')+'>'+esc(x)+'</option>').join('')}
window.lxAddressCityChange=function(){
 const city=val('lx-addr-city'),district=document.getElementById('lx-addr-district');
 if(!district)return;
 const old=district.value;
 if(city==='臺南市'){district.outerHTML='<select id="lx-addr-district" class="field" style="width:100%;box-sizing:border-box" onchange="lxAddressSync()"><option value="">請選擇行政區</option>'+options(tainan,old)+'</select>'}
 else{district.outerHTML='<input id="lx-addr-district" class="field" maxlength="20" placeholder="請輸入行政區" value="'+esc(old)+'" style="width:100%;box-sizing:border-box" oninput="lxAddressSync()">' }
 window.lxAddressSync();
};
window.lxAddressSync=function(){
 const city=val('lx-addr-city'),district=val('lx-addr-district'),street=val('lx-addr-street'),detail=val('lx-addr-detail');
 const full=[city,district,street,detail].join('');
 const hidden=document.getElementById('lx-profile-address');
 if(hidden)hidden.value=full;
 const preview=document.getElementById('lx-addr-preview');if(preview)preview.textContent=full||'請填寫取件地址';
};
window.lxStructuredAddressPayload=function(){
 const city=val('lx-addr-city'),district=val('lx-addr-district'),street=val('lx-addr-street'),detail=val('lx-addr-detail');
 if(!city&&!district&&!street&&!detail)return {address_city:null,address_district:null,address_street:null,address_detail:null};
 if(!cities.includes(city))throw Error('請選擇有效縣市');
 if(!district||district.length>20)throw Error('請填寫行政區');
 if(city==='臺南市'&&!tainan.includes(district))throw Error('請選擇臺南市行政區');
 if(street.length<3||street.length>180)throw Error('請填寫道路及門牌（3～180 字）');
 if(detail.length>60)throw Error('樓層室號最多 60 字');
 const full=city+district+street+detail;
 if(full.length>250)throw Error('完整地址最多 250 字');
 return {address_city:city,address_district:district,address_street:street,address_detail:detail||null};
};
window.lxProfileEditor=function(){
 let html=previous();
 if(!html)return html;
 const p=window.__lxProfile||{};
 const city=p.address_city||'',district=p.address_district||'',street=p.address_street||'',detail=p.address_detail||'';
 const legacy=p.home_address||'';
 const form='<div id="lx-structured-address" style="margin:12px 0;padding:14px;border:1px solid #c8dfd1;border-radius:14px;background:#f8fbf9"><b style="color:#08784c">🏠 會員住址／分享取件地址</b><p style="font-size:12px;color:#587363">選擇縣市與行政區，其他道路門牌直接輸入。</p><label for="lx-addr-city">縣市</label><select id="lx-addr-city" class="field" style="width:100%;box-sizing:border-box;margin:6px 0 12px" onchange="lxAddressCityChange()"><option value="">請選擇縣市</option>'+options(cities,city)+'</select><label for="lx-addr-district">行政區</label>'+(city==='臺南市'?'<select id="lx-addr-district" class="field" style="width:100%;box-sizing:border-box;margin:6px 0 12px" onchange="lxAddressSync()"><option value="">請選擇行政區</option>'+options(tainan,district)+'</select>':'<input id="lx-addr-district" class="field" maxlength="20" value="'+esc(district)+'" placeholder="請輸入行政區" style="width:100%;box-sizing:border-box;margin:6px 0 12px" oninput="lxAddressSync()">')+'<label for="lx-addr-street">道路、段、巷、弄、門牌</label><input id="lx-addr-street" class="field" maxlength="180" value="'+esc(street)+'" placeholder="例如：新建路33巷5號" style="width:100%;box-sizing:border-box;margin:6px 0 12px" oninput="lxAddressSync()"><label for="lx-addr-detail">樓層、室號（選填）</label><input id="lx-addr-detail" class="field" maxlength="60" value="'+esc(detail)+'" placeholder="例如：12樓" style="width:100%;box-sizing:border-box;margin:6px 0 12px" oninput="lxAddressSync()"><div style="font-size:12px;color:#587363">完整地址預覽</div><div id="lx-addr-preview" style="padding:10px;border-radius:9px;background:white;overflow-wrap:anywhere">'+esc(city+district+street+detail||'請填寫取件地址')+'</div>'+(legacy&&!city?'<p style="font-size:12px;color:#9a6b20">原有地址：'+esc(legacy)+'<br>請將原地址拆入上方欄位，儲存後將沿用完整地址。</p>':'')+'</div>';
 const start=html.indexOf('<label for="lx-profile-address">');
 const end=html.indexOf('<label for="lx-profile-placement-note">',start);
 if(start<0||end<0)return html;
 html=html.slice(0,start)+form+'<textarea id="lx-profile-address" style="display:none" aria-hidden="true">'+esc(city+district+street+detail||legacy)+'</textarea>'+html.slice(end);
 return html;
};
})();