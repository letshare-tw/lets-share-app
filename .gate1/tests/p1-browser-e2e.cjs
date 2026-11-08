const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const fixture=await (await fetch('http://127.0.0.1:8765/__fixture')).json();
  const page=await browser.newPage();
  await page.addInitScript(f=>{
   globalThis.__P1_LOCAL_TEST_CONFIG__={base:'http://127.0.0.1:8765',key:f.key,submitEndpoint:'http://127.0.0.1:8765/submit'};
   sessionStorage.setItem('lx_supabase_auth_v066g',JSON.stringify({token:f.token}));
  },fixture);
  await page.goto('http://127.0.0.1:8765/c09-v5.html');
  await page.waitForFunction(()=>document.querySelector('#identity')?.textContent?.includes('已登入'));
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
  const details=await page.evaluate(()=>({request_id:state.draft,photo_path:state.photo}));
  const r=await fetch('http://127.0.0.1:8765/__verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(details)});
  if(!r.ok||!(await r.json()).pass)throw Error('DB verification failed');
  console.log('PASS DB verifies submitted request, Storage photo, one bag, exact 48 hours');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
