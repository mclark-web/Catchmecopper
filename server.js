const http=require('http'),fs=require('fs'),path=require('path'),{WebSocketServer}=require('ws');
const {Match,MAPS,R,C}=require('./src/game'),{authenticate}=require('./src/auth');
const PORT=process.env.PORT||3000, PUB=path.join(__dirname,'public');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json'};
const srv=http.createServer((req,res)=>{ let f=path.join(PUB,decodeURIComponent(req.url.split('?')[0])); if(!f.startsWith(PUB)) return res.end(); if(f.endsWith(path.sep)||f===PUB) f=path.join(PUB,'index.html');
  fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404);return res.end('nf');} res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'}); res.end(d); }); });
const wss=new WebSocketServer({server:srv}); const clients=new Set();
let match=new Match('outdoor'); match.fill(); let nextMap=null, nextSeed=0;
const send=(ws,o)=>{ if(ws.readyState===1) ws.send(typeof o==='string'?o:JSON.stringify(o)); };
const cfg={SHOCK_RADIUS:C.SHOCK_RADIUS,JUMP_NEED:C.JUMP_NEED,CAMO_NEED:C.CAMO_NEED,CAMO_TIME:C.CAMO_TIME,IDLE_REVEAL:C.IDLE_REVEAL};
function init(ws){ const m=match.map; send(ws,{t:'init',you:ws.pid,R,cfg,map:{id:m.id,name:m.name,seed:m.seed,w:m.w,h:m.h,walls:m.walls,floor:m.floor},roster:match.roster()}); }
wss.on('connection',(ws,req)=>{ clients.add(ws);
  ws.on('message',async raw=>{ let o; try{o=JSON.parse(raw)}catch{return}
    if(o.t==='join'&&!ws.pid){ const user=await authenticate(o.token,req,o.name); if(!user) return ws.close(4001,'auth');
      ws.user=user; ws.team=o.team==='cop'?'cop':'runner';
      const type=MAPS.TYPES[o.map]?o.map:match.map.id, seed=(+o.seed>>>0)||0;
      if(![...match.players.values()].some(p=>p.human)){ match=new Match(type,seed); match.fill(); } else { nextMap=type; nextSeed=seed; } // first human gets a fresh round
      ws.pid=match.humanJoin(ws.team,user.name).id; init(ws); match.pelletsDirty=true; }
    else if(o.t==='in'&&ws.pid){ const p=match.players.get(ws.pid); if(!p) return;
      p.dx=Math.max(-1,Math.min(1,+o.x||0)); p.dy=Math.max(-1,Math.min(1,+o.y||0)); p.act=!!o.a; if(o.j) p.wantJump=true; if(o.c) p.wantCamo=true; } });
  ws.on('close',()=>{ clients.delete(ws); if(ws.pid) match.remove(ws.pid); }); });
let last=Date.now(), tick=0;
setInterval(()=>{ const now=Date.now(),dt=Math.min(.1,(now-last)/1000); last=now; match.step(dt); tick++;
  if(match.phase==='end'&&match.endT<=0){ const old=match; match=new Match(nextMap||old.map.id,nextSeed); nextMap=null; nextSeed=0; // new random seed each round unless one was requested
    for(const c of clients) if(c.pid){ const op=old.players.get(c.pid); c.pid=match.add(c.team,op?op.name:'Player',true).id; }
    match.fill(); for(const c of clients) if(c.pid){ init(c); } match.pelletsDirty=true; }
  const snap={cop:JSON.stringify(match.snapshot('cop')),runner:JSON.stringify(match.snapshot('runner'))};
  const pl=match.pelletsDirty?JSON.stringify({t:'pl',p:[...match.pellets.values()]}):null; match.pelletsDirty=false;
  const ev=match.events.length?JSON.stringify({t:'ev',e:match.events}):null; match.events=[];
  const ro=tick%20===0||ev?JSON.stringify({t:'roster',roster:match.roster()}):null;
  for(const c of clients){ if(!c.pid||c.readyState!==1) continue; if(pl) c.send(pl); if(ev) c.send(ev); if(ro) c.send(ro); c.send(snap[c.team]);
    const me=match.players.get(c.pid); if(me) c.send(JSON.stringify({t:'me',g:me.green,j:me.jumpCharge,o:me.orange,cc:me.camoCharge,ct:Math.ceil(me.camoT),ar:me.armor,sc:me.score,st:+me.stam.toFixed(2),id:+me.idle.toFixed(0)})); } },1000/C.TICK);
srv.listen(PORT,()=>console.log('Manhunt on :'+PORT));
