// Spawns N ws clients (half cops/half runners) sending movement/sprint/jump/camo inputs; reports snapshot rate & size.
const WebSocket=require('ws'); const N=+process.argv[2]||100, URL=process.argv[3]||'ws://localhost:3000', T=+process.argv[4]||6;
let got=0,bytes=0,maxP=0,types={},errs=0;
for(let i=0;i<N;i++){ const ws=new WebSocket(URL,{headers:{'bypass-tunnel-reminder':'1'}}); ws.on('error',()=>errs++);
  ws.on('open',()=>{ ws.send(JSON.stringify({t:'join',team:i%2?'cop':'runner',map:'outdoor',name:'t'+i}));
    setInterval(()=>ws.readyState===1&&ws.send(JSON.stringify({t:'in',x:Math.round(Math.random()*2-1),y:Math.round(Math.random()*2-1),a:Math.random()<.3,j:Math.random()<.05?1:0,c:Math.random()<.02?1:0})),200); });
  ws.on('message',d=>{ const o=JSON.parse(d); types[o.t]=(types[o.t]||0)+1; if(o.t==='s'){got++;bytes+=d.length;maxP=Math.max(maxP,o.p.length);} }); }
setTimeout(()=>{ console.log(`clients ${N}, errors ${errs}, snapshots/client/s ${(got/N/T).toFixed(1)}, avg snapshot ${(bytes/got|0)}B, max players in snapshot ${maxP}, msg types ${JSON.stringify(types)}`); process.exit(0); },T*1000);
