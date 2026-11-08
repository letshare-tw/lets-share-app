// Permanent tombstone. Deploy to the NEW fixture function after cleanup verification.
Deno.serve(() => new Response(JSON.stringify({status:'retired',message:'DEV-01B V5 temporary fixture runner permanently disabled'}),{status:410,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}}));
