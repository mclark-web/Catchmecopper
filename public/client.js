const cv=document.getElementById('c'),ctx=cv.getContext('2d'); let W,H; function rs(){W=cv.width=innerWidth;H=cv.height=innerHeight} rs(); onresize=rs;
const ws=new WebSocket((location.protocol==='https:'?'wss':'ws')+'://'+location.host);
const st={map:null,you:0,R:14,cfg:{},roster:{},snaps:[],spec:0,pel:[],me:{},rings:[],pings:[],end:null};
const $=id=>document.getElementById(id);
function join(team){ ws.send(JSON.stringify({t:'join',team,map:$('map').value,seed:+$('seed').value||0,name:$('name').value||'Player',token:localStorage.token||null})); $('lobby').style.display='none'; }
ws.onmessage=e=>{ const o=JSON.parse(e.data);
  if(o.t==='init'){ st.map=o.map; st.you=o.you; st.R=o.R; st.cfg=o.cfg; st.snaps=[]; st.end=null; st.rings=[]; st.pings=[]; setRoster(o.roster); }
  else if(o.t==='roster') setRoster(o.roster); else if(o.t==='pl') st.pel=o.p; else if(o.t==='me') st.me=o;
  else if(o.t==='ev'){ const now=performance.now(); for(const v of o.e){ if(v.t==='shock') st.rings.push({...v,at:now}); else if(v.t==='ping') st.pings=v.p.map(p=>({x:p[0],y:p[1],at:now})); else if(v.t==='end') st.end=v; } }
  else if(o.t==='s'){ o.at=performance.now(); st.snaps.push(o); if(st.snaps.length>4) st.snaps.shift(); } };
ws.onclose=()=>{ $('msg').style.color='#f44'; $('msg').textContent='DISCONNECTED'; };
function setRoster(r){ st.roster={}; for(const p of r) st.roster[p.id]=p; }
// ---- INPUT (numpad primary, WASD/arrows fallback)
const keys=new Set(); let specNext=false;
const MOVE={Numpad8:[0,-1],Numpad2:[0,1],Numpad4:[-1,0],Numpad6:[1,0],Numpad7:[-1,-1],Numpad9:[1,-1],Numpad1:[-1,1],Numpad3:[1,1],
  KeyW:[0,-1],KeyS:[0,1],KeyA:[-1,0],KeyD:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]};
const SPRINT=['NumpadEnter','NumpadAdd','ShiftLeft','ShiftRight'], JUMP=['Numpad5','Space'], CAMO=['Numpad0','NumpadDecimal','KeyC'], SPEC=['KeyQ','Numpad5'];
const ALL=new Set([...Object.keys(MOVE),...SPRINT,...JUMP,...CAMO,'Tab','KeyQ']);
let lastIn='';
function sendIn(extra){ let x=0,y=0; for(const k of keys) if(MOVE[k]){x+=MOVE[k][0];y+=MOVE[k][1];} x=Math.sign(x);y=Math.sign(y);
  const o={t:'in',x,y,a:SPRINT.some(k=>keys.has(k)),...extra}; const s=JSON.stringify(o); if((extra||s!==lastIn)&&ws.readyState===1){ ws.send(s); lastIn=extra?'':s; } }
onkeydown=e=>{ if(ALL.has(e.code)) e.preventDefault(); const first=!keys.has(e.code); keys.add(e.code);
  if(first&&SPEC.includes(e.code)) specNext=true;
  if(first&&JUMP.includes(e.code)) sendIn({j:1}); else if(first&&CAMO.includes(e.code)) sendIn({c:1}); else sendIn();
  if(e.code==='Tab') $('sb').style.display='block'; };
onkeyup=e=>{ keys.delete(e.code); sendIn(); if(e.code==='Tab') $('sb').style.display='none'; };
onblur=()=>{ keys.clear(); sendIn(); };
setInterval(()=>{lastIn='';sendIn();},500);
// ---- interpolation (~100ms behind)
function view(){ const n=st.snaps.length; if(!n) return null; const t=performance.now()-100; let a=st.snaps[0],b=st.snaps[n-1];
  for(let i=0;i<n-1;i++) if(st.snaps[i].at<=t&&st.snaps[i+1].at>=t){a=st.snaps[i];b=st.snaps[i+1];break;}
  const k=b.at===a.at?1:Math.max(0,Math.min(1,(t-a.at)/(b.at-a.at))); const pa={}; for(const p of a.p) pa[p[0]]=p;
  return {s:b,ps:b.p.map(p=>{ const q=pa[p[0]]||p,f=p[3],r=st.roster[p[0]]||{tm:'runner',n:'?'};
    return {id:p[0],x:q[1]+(p[1]-q[1])*k,y:q[2]+(p[2]-q[2])*k,caught:!!(f&1),sprint:!!(f&2),stun:!!(f&4),armor:!!(f&16),jump:!!(f&32),rev:!!(f&64),alpha:(f&128)?(f>>8)/100:1,team:r.tm,name:r.n}; })}; }
const fmt=s=>Math.floor(s/60)+':'+String(s%60).padStart(2,'0');
function frame(){ requestAnimationFrame(frame); const now=performance.now(); ctx.fillStyle=ASSETS.palette.bg; ctx.fillRect(0,0,W,H); const v=view(); if(!v||!st.map) return;
  const me=v.ps.find(p=>p.id===st.you); let cam=me;
  if(me&&me.caught){ const alive=v.ps.filter(p=>p.team==='runner'&&!p.caught); if(specNext||!alive.find(p=>p.id===st.spec)){ const i=alive.findIndex(p=>p.id===st.spec); st.spec=alive.length?alive[(i+1)%alive.length].id:0; } cam=alive.find(p=>p.id===st.spec)||me; }
  specNext=false;
  ctx.save(); if(location.hash==='#overview'){ const k=Math.min(W/st.map.w,H/st.map.h); ctx.scale(k,k); } else ctx.translate(W/2-(cam?cam.x:0),H/2-(cam?cam.y:0));
  Renderer.drawFloor(ctx,st.map); Renderer.drawPellets(ctx,st.pel); Renderer.drawWalls(ctx,st.map.walls); Renderer.drawZone(ctx,st.map,v.s.zn);
  for(const p of v.ps) if(p.caught) Renderer.drawPlayer(ctx,p,st.R,p.id===st.you);
  for(const p of v.ps) if(!p.caught){ const mine=me&&p.team===me.team; ctx.globalAlpha=mine?Math.max(.35,p.alpha):p.alpha; Renderer.drawPlayer(ctx,p,st.R,p.id===st.you); ctx.globalAlpha=1;
    if(p.rev&&!mine){ ctx.strokeStyle=ASSETS.palette.reveal; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(p.x,p.y,st.R+14,0,7); ctx.stroke(); } }
  st.rings=st.rings.filter(r=>Renderer.drawShockRing(ctx,r,now));
  if(me){ ctx.fillStyle=ASSETS.palette.text; ctx.font='12px monospace'; ctx.textAlign='center'; ctx.fillText(me.name,me.x,me.y-st.R-12); }
  ctx.restore();
  // minimap with zone, pings, idle-revealed runners
  const mw=200,mh=mw*st.map.h/st.map.w,mx=10,my=H-mh-30,sx=mw/st.map.w,sy=mh/st.map.h; ctx.fillStyle='#000a'; ctx.fillRect(mx,my,mw,mh); ctx.strokeStyle=ASSETS.palette.ui; ctx.strokeRect(mx,my,mw,mh);
  const z=v.s.zn; ctx.strokeStyle=ASSETS.palette.zone; ctx.strokeRect(mx+z[0]*sx,my+z[1]*sy,z[2]*sx,z[3]*sy);
  for(const p of v.ps){ if(p.caught) continue; const mine=me&&p.team===me.team; if(!mine&&!p.rev&&p.alpha<1) continue;
    ctx.fillStyle=p.id===st.you?ASSETS.palette.ui:(p.rev&&!mine?ASSETS.palette.reveal:ASSETS[p.team].color); ctx.fillRect(mx+p.x*sx-1.5,my+p.y*sy-1.5,3,3); }
  st.pings=st.pings.filter(p=>now-p.at<2500); for(const p of st.pings){ ctx.strokeStyle=ASSETS.palette.ping; ctx.globalAlpha=1-(now-p.at)/2500; ctx.beginPath(); ctx.arc(mx+p.x*sx,my+p.y*sy,2+(now-p.at)/300,0,7); ctx.stroke(); } ctx.globalAlpha=1;
  // HUD
  const s=v.s,M=st.me,cf=st.cfg, cops=v.ps.filter(p=>p.team==='cop').length, alive=Object.values(st.roster).filter(r=>r.tm==='runner'&&!r.c).length, run=Object.values(st.roster).filter(r=>r.tm==='runner').length;
  $('hud').innerHTML=`${st.map.name} <span style="color:#1b7a0a">seed ${st.map.seed}</span> · ${s.hs?'<span style="color:#ff5a6e">HEAD START '+s.hs+'s</span>':'⏱ '+fmt(s.tm)}${s.fin?' · <span style="color:#ffee00">FINAL MINUTE: cops +15%, pings</span>':''}<br><span style="color:#8c9aff">COPS ${cops}</span> · <span style="color:#ff5a6e">RUNNERS ${alive}/${run} free</span>${me&&me.caught?'<br>CAUGHT. SPECTATING (Q / Num5 = next)':''}`;
  $('inv').innerHTML=`<span style="color:${ASSETS.pellet.green.color}">JUMP ${M.j?'READY (Num5/Space)':(M.g||0)+'/'+cf.JUMP_NEED}</span><br>`+
    (me&&me.team==='runner'?`<span style="color:${ASSETS.pellet.blue.color}">ARMOR ${M.ar?'⬢ ON':'none'}</span><br>`:'')+
    `<span style="color:${ASSETS.pellet.orange.color}">CAMO ${M.cc?'READY (Num0/C)':(M.o||0)+'/'+cf.CAMO_NEED}${M.ct>0?' · ACTIVE '+M.ct+'s':''}</span><br>`+
    (me&&me.team==='runner'&&M.id>=3?`<span style="color:#ffee00">STILL ${M.id}s${M.id>=cf.IDLE_REVEAL?': REVEALED!':''}</span><br>`:'')+`<span style="color:#39ff14">POINTS ${M.sc||0}</span>`;
  const m=$('msg'); if(s.ph==='end'){ m.style.color=s.w==='cop'?'#8c9aff':'#ff5a6e'; m.innerHTML=(s.w==='cop'?'COPS WIN':'RUNNERS ESCAPE')+'<div id="end">'+(st.end?st.end.top.map((t,i)=>`${i+1}. ${t[3]?'★':''}${t[0]} <span style="color:${t[1]==='cop'?'#8c9aff':'#ff5a6e'}">${t[1]}</span> ${t[2]} pts`).join('<br>'):'')+'<br>next round soon…</div>'; } else if(s.hs){ m.style.color='#ff5a6e'; m.innerHTML='HEAD START '+s.hs+'<div id="end">'+(me&&me.team==='cop'?'Cops are frozen at spawn. Get ready.':'RUN! Cops are frozen.')+'</div>'; } else m.textContent='';
  if($('sb').style.display==='block'){ const rows=Object.values(st.roster).sort((a,b)=>b.sc-a.sc), line=r=>`${r.h?'★':''}${r.n} ${r.sc}pts${r.tm==='cop'?' ('+r.tg+' tags)':r.c?' ✖':' ●'}`;
    $('sb').innerHTML='<b style="color:#8c9aff">COPS</b><br>'+rows.filter(r=>r.tm==='cop').slice(0,15).map(line).join('<br>')+'<br><b style="color:#ff5a6e">RUNNERS</b><br>'+rows.filter(r=>r.tm==='runner').slice(0,15).map(line).join('<br>'); } }
frame();
