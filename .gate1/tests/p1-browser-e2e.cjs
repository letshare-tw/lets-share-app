const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const fixture=await (await fetch('http://127.0.0.1:8765/__fixture')).json();
  const page=await browser.newPage();
  page.on('pageerror',e=>console.error('BROWSER_JS_ERROR',e.message));
  page.on('console',m=>{if(m.type()==='error')console.error('BROWSER_CONSOLE_ERROR',m.text());});
  let photoPath='';page.on('request',r=>{if(r.url().includes('/storage/v1/object/share-placement-photos/'))photoPath=decodeURIComponent(r.url().split('/storage/v1/object/share-placement-photos/')[1]);});
  await page.addInitScript(f=>{
   globalThis.__P1_LOCAL_TEST_CONFIG__={base:'http://127.0.0.1:8765',key:f.key,submitEndpoint:'http://127.0.0.1:8765/submit'};
   sessionStorage.setItem('lx_supabase_auth_v066g',JSON.stringify({token:f.token}));
  },fixture);
  await page.goto('http://127.0.0.1:8765/c09-v5.html');
  await page.waitForFunction(()=>document.querySelector('#identity')?.textContent?.includes('已登入'),null,{timeout:10000}).catch(async e=>{console.error('IDENTITY_DEBUG',await page.locator('#identity').innerText(),'STATUS_DEBUG',await page.locator('#status').innerText());throw e;});
  await page.locator('input[name="kind"][value="collection_point"]').check();
  await page.waitForFunction(()=>document.querySelector('#pointSelect')?.options.length>1,null,{timeout:12000}).catch(async e=>{console.error('POINTS_DEBUG',await page.locator('#status').innerText(),await page.locator('#pointSelect').innerHTML());throw e;});
  await page.locator('#pointSelect').selectOption({index:1});
  await page.locator('#photo').setInputFiles({name:'photo.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlSQG8AAAAASUVORK5CYII=','base64')});
  await page.locator('#placed').check();
  await page.locator('#save').click();
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent?.includes('草稿已儲存'),null,{timeout:20000});
  console.log('PASS browser created actual draft, uploaded photo and saved details');
  await page.locator('#preflight').click();
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent?.includes('提交前檢查通過'),null,{timeout:20000});
  console.log('PASS browser real RPC preflight and published agreement');
  for(const id of ['transfer','noReturn','recycling'])await page.locator('#'+id).check();
  await page.locator('#submit').click();
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent?.includes('正式申報成功'),null,{timeout:20000});
  console.log('PASS browser real JWT -> trusted Deno submit handler -> DB transaction');
  const message=await page.locator('#status').innerText();
  const saved=await page.locator('#status').innerText();
  const details={request_id:photoPath.split('/')[1],photo_path:photoPath};
  if(!details.request_id||!details.photo_path)throw Error('No actual upload captured');
  const r=await fetch('http://127.0.0.1:8765/__verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(details)});
  if(!r.ok||!(await r.json()).pass)throw Error('DB verification failed');
  console.log('PASS DB verifies submitted request, Storage photo, one bag, exact 48 hours');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
