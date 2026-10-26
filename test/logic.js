const {Match,C,R}=require('../src/game'); const ok=(n,c)=>console.log((c?'PASS ':'FAIL ')+n);
const P=m=>[...m.players.values()];
for(const id of ['outdoor','indoor']){ const m=new Match(id); m.fill(); const tj=m.tryJump.bind(m),tc=m.tryCamo.bind(m); let J=0,K=0; m.tryJump=p=>{const r=tj(p); if(r&&!p.human)J++; return r}; m.tryCamo=p=>{const r=tc(p); if(r&&!p.human)K++; return r};
  for(const p of [...m.players.values()].filter(p=>p.team==='runner').slice(0,10)) p.camoCharge=true; for(const p of [...m.players.values()].slice(0,100)) p.jumpCharge=true; // seed charges so camo use is exercised
  let inWall=0,jumps=0,camos=0,armors=0,shocks=0,copMovedHead=false; const c0=P(m).find(p=>p.team==='cop'), cx=c0.x;
  for(let i=0;i<20*(C.HEADSTART+C.CHASE+5)&&m.phase!=='end';i++){ m.step(.05); if(m.t<C.HEADSTART-0.5&&c0.x!==cx) copMovedHead=true;
    for(const p of P(m)){ if(!p.jump&&m.wallOnly(p.x,p.y)) inWall++; }
    shocks+=m.events.filter(e=>e.t==='shock').length; m.events=[]; }
  jumps=J; camos=K; const ps=P(m); ok(id+' spawns+pellets on reachable open cells',[...m.pellets.values()].every(q=>!m.wallOnly(q[1],q[2])&&m.reachable(q[1],q[2]))); console.log(id,'winner',m.winner,'t',m.t.toFixed(0),'caught',ps.filter(p=>p.caught).length,'botJumps',jumps,'botCamos',camos,'pelletsLeft',m.pellets.size,'shockwaves',shocks,'shrinkPhases',m.shrinkI,'zone',m.zone.map(v=>v|0).join(','));
  ok(id+' no player inside walls',inWall===0); ok(id+' cops frozen in head start',!copMovedHead); ok(id+' bots jump',jumps>0); ok(id+' bots camo',camos>0); ok(id+' armor shockwaves',shocks>0); ok(id+' 3 shrink phases (if reached)',m.t<C.HEADSTART+205||m.shrinkI===3);
  console.log('  top scores',ps.sort((a,b)=>b.score-a.score).slice(0,5).map(p=>p.team+':'+p.score).join(' ')); }
// unit checks
let m=new Match('outdoor'); m.fill(); m.t=C.HEADSTART+1; m.phase='play'; let ps=P(m); const r=ps.find(p=>p.team==='runner'), r2=ps.filter(p=>p.team==='runner')[1], c=ps.find(p=>p.team==='cop');
for(const p of ps) if(p!==r&&p!==c&&p!==r2){ p.x=60+Math.random()*200; p.y=1400; p.caught=p.team==='runner'; }
for(let k=0;k<500;k++){ const [x,y]=m.free(...m.zone); let okk=true; for(let a=0;a<6.3;a+=.4) for(const d of [40,80,140]) if(m.blocked(x+Math.cos(a)*d,y+Math.sin(a)*d)) okk=false; if(okk){ r.x=x; r.y=y; break; } }
r.armor=1; c.x=r.x+10; c.y=r.y; r2.x=r.x-30; r2.y=r.y; c.dx=c.dy=0; m.step(.01);
ok('armor saves runner',!r.caught&&r.armor===0); ok('shockwave stuns cop',c.stun>1.4); ok('shockwave pushes all nearby',Math.hypot(c.x-r.x,c.y-r.y)>60&&Math.hypot(r2.x-r.x,r2.y-r.y)>40);
m.step(.5); c.x=r.x+10; c.y=r.y; m.step(.01); ok('stunned cop cannot tag',!r.caught);
// greens: 5 -> jump, non-stackable
m=new Match('indoor'); m.fill(); const q=P(m)[0]; for(let i=0;i<7;i++){ m.pellets.set(900+i,[900+i,q.x|0,q.y|0,'green']); m.collect(); } ok('5 greens = 1 jump charge, extras ignored',q.jumpCharge&&q.green===0);
m.pellets.clear(); m.pellets.set(1,[1,q.x|0,q.y|0,'blue']); m.pellets.set(2,[2,q.x|0,q.y|0,'blue']); m.collect(); ok('blue armor (runner only, non-stackable)',q.team==='cop'?q.armor===0:q.armor===1);
// jump over wall
m.phase='play'; const w=m.map.walls.find(w=>w[2]<=24&&w[3]>100&&!m.blocked(w[0]-R-3,w[1]+w[3]/2)&&!m.blocked(w[0]+w[2]+R+30,w[1]+w[3]/2)); const j=P(m)[1]; j.x=w[0]-R-3; j.y=w[1]+w[3]/2; j.dx=1; j.dy=0; j.jumpCharge=true; j.stun=0;
ok('jump starts over wall',m.tryJump(j)); for(let i=0;i<10;i++) m.step(.05); ok('landed past wall',j.x>w[0]+w[2]&&!m.wallOnly(j.x,j.y));
// scoring
m=new Match('outdoor'); m.fill(); m.phase='play'; m.t=C.HEADSTART+10; ps=P(m); const runners=ps.filter(p=>p.team==='runner'); runners.forEach(p=>{p.caught=true;m.caughtOrder.push(p);}); m.step(.01);
ok('cops win; last=5,2nd=3,3rd=1; cop bonus 5',m.winner==='cop'&&runners[49].score===5&&runners[48].score===3&&runners[47].score===1&&ps.find(p=>p.team==='cop').score===5);
m=new Match('outdoor'); m.fill(); m.phase='play'; m.t=C.HEADSTART+C.CHASE-0.01; m.step(.05); ok('timer end: free runners +5',m.winner==='runner'&&P(m).filter(p=>p.team==='runner').every(p=>p.score>=5));
// idle reveal + camo hiding
m=new Match('outdoor'); m.fill(); const ir=P(m).find(p=>p.team==='runner'); ir.camoT=C.CAMO_TIME; ir.dx=ir.dy=0; ir.human=true;
ok('camo hidden from cops',!m.snapshot('cop').p.some(x=>x[0]===ir.id)&&m.snapshot('runner').p.some(x=>x[0]===ir.id));
for(let i=0;i<20*9;i++) m.step(.05); ok('idle >8s revealed even in camo',m.revealed(ir)&&m.snapshot('cop').p.some(x=>x[0]===ir.id));
// final phase ping
m=new Match('outdoor'); m.fill(); m.phase='play'; m.t=C.HEADSTART+C.CHASE-C.FINAL+0.01; m.step(.05); ok('final minute ping event',m.events.some(e=>e.t==='ping'));
