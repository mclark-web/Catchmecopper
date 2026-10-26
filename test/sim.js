// Headless fast-forward simulation harness. Runs many bot-only rounds across random seeds and both map types in parallel.
// Usage: node test/sim.js --games 200 --label "iter 3" --set '{"SPEED":{"cop":160,"runner":230}}' [--log]
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const os=require('os'), fs=require('fs'), path=require('path');
function deepAssign(t,s){ for(const k in s){ if(s[k]&&typeof s[k]==='object'&&!Array.isArray(s[k])&&t[k]&&typeof t[k]==='object') deepAssign(t[k],s[k]); else t[k]=s[k]; } return t; }
if(!isMainThread){
  const C=require('../src/config'); deepAssign(C,workerData.set||{});
  const {Match}=require('../src/game');
  parentPort.on('message',job=>{ if(job===null) return process.exit(0);
    const m=new Match(job.type,job.seed); m.fill(); const dt=0.05, hist=new Map(); let i=0;
    while(m.phase!=='end'&&i<20*400){ m.step(dt); i++;
      if(i%20===0) for(const p of m.players.values()){ if(p.caught||m.phase==='head') continue; if(p.stun>0||p.jump){ hist.delete(p.id); continue; } /* stunned/jumping isn't stuck */ const h=hist.get(p.id)||[]; h.push(p.x,p.y); if(h.length>8) h.splice(0,2); hist.set(p.id,h);
        if(h.length===8){ m.stats.samples++; if(Math.hypot(h[0]-h[6],h[1]-h[7])<20) m.stats.stuck++; } } }
    const ps=[...m.players.values()], run=ps.filter(p=>p.team==='runner').map(p=>p.score).sort((a,b)=>b-a);
    parentPort.postMessage({type:job.type,seed:job.seed,winner:m.winner,chase:Math.min(C.CHASE,m.chaseT),survivors:ps.filter(p=>p.team==='runner'&&!p.caught).length,
      ...m.stats,catches:undefined,last3:m.stats.catches.slice(-3),runScores:run,walls:m.map.walls.length}); });
  return;
}
const args=process.argv.slice(2), arg=(k,d)=>{ const i=args.indexOf('--'+k); return i<0?d:args[i+1]; };
const N=+arg('games',200), set=JSON.parse(arg('set','{}')), label=arg('label','run'), log=args.includes('--log');
const C=deepAssign(require('../src/config'),set);
const jobs=[]; for(let i=0;i<N;i++) jobs.push({type:i%2?'indoor':'outdoor',seed:1000+i*7919});
const res=[]; const t0=Date.now(); const W=Math.min(os.cpus().length,8); let done=0;
const med=a=>{ const s=[...a].sort((x,y)=>x-y); return s.length?s[s.length>>1]:0; }, mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0, pct=(a,f)=>100*a.filter(f).length/Math.max(1,a.length);
function report(){ const r=res, fmt=s=>Math.floor(s/60)+':'+String(Math.round(s%60)).padStart(2,'0'), FIN=C.CHASE-C.FINAL;
  const close=x=> x.winner==='cop' ? (x.chase>=FIN) : (x.survivors<=10);
  const gini=a=>{ const s=[...a].sort((x,y)=>x-y), n=s.length, sum=s.reduce((x,y)=>x+y,0); if(!sum) return 0; let g=0; s.forEach((v,i)=>g+=(2*(i+1)-n-1)*v); return g/(n*sum); };
  const M={
    'cop win %':[pct(r,x=>x.winner==='cop'),'40-60'],
    'median chase length':[med(r.map(x=>x.chase)),'2:30-3:45',fmt],
    'median chase length, cop wins only':[med(r.filter(x=>x.winner==='cop').map(x=>x.chase)),'2:30-3:45',fmt],
    'rounds reaching final minute %':[pct(r,x=>x.chase>=FIN),'>=50'],
    'close rounds %':[pct(r,close),'>=40'],
    'last-3 catch spread (median s, cop wins)':[med(r.filter(x=>x.winner==='cop'&&x.last3.length===3).map(x=>x.last3[2]-x.last3[0])),'<=60'],
    'shockwaves / round':[mean(r.map(x=>x.shocks)),'>=1'], 'jumps / round':[mean(r.map(x=>x.jumps)),'>=3'], 'camo uses / round':[mean(r.map(x=>x.camos)),'>=0.5'],
    'stuck % (bot-samples <20px in 3s)':[100*mean(r.map(x=>x.stuck/Math.max(1,x.samples))),'<=3'],
    'camping % (runner time revealed idle)':[100*mean(r.map(x=>x.idleRev/Math.max(1,x.aliveT))),'<=2'],
    'runner score gini (luck/domination)':[mean(r.map(x=>gini(x.runScores))),'0.2-0.55'],
    'runner score spread (stdev)':[mean(r.map(x=>{const m=mean(x.runScores);return Math.sqrt(mean(x.runScores.map(v=>(v-m)**2)));})),'>=1.5'],
  };
  const byType=t=>{ const q=r.filter(x=>x.type===t); return `${t}: cop win ${pct(q,x=>x.winner==='cop').toFixed(0)}%, median chase ${fmt(med(q.map(x=>x.chase)))}`; };
  const ok=(v,t)=>{ if(t.includes('-')&&!t.startsWith('<')&&!t.startsWith('>')){ const [a,b]=t.split('-').map(z=>z.includes(':')?(+z.split(':')[0]*60+ +z.split(':')[1]):+z); return v>=a&&v<=b; } if(t.startsWith('>=')) return v>=+t.slice(2); if(t.startsWith('<=')) return v<=+t.slice(2); return true; };
  let md=`\n### ${label} (${r.length} games, ${((Date.now()-t0)/1000).toFixed(0)}s)\nOverrides: \`${JSON.stringify(set)}\`\n\n| Metric | Value | Target | OK |\n|---|---|---|---|\n`;
  let pass=0; for(const [k,[v,t,f]] of Object.entries(M)){ const o=ok(v,t); if(o) pass++; md+=`| ${k} | ${f?f(v):(+v).toFixed(2)} | ${t} | ${o?'✅':'❌'} |\n`; }
  md+=`\n${byType('outdoor')} · ${byType('indoor')} · **${pass}/${Object.keys(M).length} targets met**\n`;
  console.log(md); if(log) fs.appendFileSync(path.join(__dirname,'..','TUNING.md'),md); }
let next=0; for(let w=0;w<W;w++){ const wk=new Worker(__filename,{workerData:{set}}); const feed=()=>{ if(next<jobs.length) wk.postMessage(jobs[next++]); else wk.postMessage(null); };
  wk.on('message',m=>{ res.push(m); done++; if(done%25===0) process.stderr.write(`${done}/${N}\n`); feed(); if(done===N) report(); }); feed(); }
