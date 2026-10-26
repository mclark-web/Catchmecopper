const MAPS = require('./maps'); const C = require('./config'); const { R } = C;
let nextId = 1;
const hit=(x,y,r,w)=>x+r>w[0]&&x-r<w[0]+w[2]&&y+r>w[1]&&y-r<w[1]+w[3];
const d2=(a,b)=>(a.x-b.x)**2+(a.y-b.y)**2;
class Match {
  constructor(mapId,seed){ this.map=MAPS.generate(mapId,seed); this.players=new Map(); this.t=0; this.phase='head'; this.winner=null; this.endT=0;
    this.pellets=new Map(); this.pid=1; this.pelletsDirty=true; this.caughtOrder=[]; this.events=[]; this.nextPing=C.CHASE-C.FINAL;
    this.stats={jumps:0,camos:0,shocks:0,catches:[],finalAlive:null,idleRev:0,aliveT:0,stuck:0,samples:0}; this.zone=[0,0,this.map.w,this.map.h]; this.zFrom=this.zone.slice(); this.zTo=this.zone.slice(); this.zT=1; this.shrinkI=0; }
  get chaseT(){ return this.t-C.HEADSTART; }
  get remaining(){ return Math.max(0,C.HEADSTART+C.CHASE-this.t); }
  blocked(x,y){ const z=this.zone; if(x-R<z[0]||y-R<z[1]||x+R>z[0]+z[2]||y+R>z[1]+z[3]) return true; for(const w of this.map.walls) if(hit(x,y,R,w)) return true; return false; }
  wallOnly(x,y){ for(const w of this.map.walls) if(hit(x,y,R,w)) return true; return x<R||y<R||x>this.map.w-R||y>this.map.h-R; }
  reachable(x,y){ const m=this.map, i=(y/m.cell|0)*m.gw+(x/m.cell|0); return !!m.reach[i]; }
  free(x0,y0,w,h){ for(let k=0;k<200;k++){ const x=x0+Math.random()*w,y=y0+Math.random()*h; if(!this.blocked(x,y)&&this.reachable(x,y)) return [x,y]; }
    for(let i=0;i<this.map.reach.length;i++) if(this.map.reach[i]){ const x=(i%this.map.gw+.5)*this.map.cell, y=((i/this.map.gw|0)+.5)*this.map.cell; if(!this.blocked(x,y)) return [x,y]; } return [x0+w/2,y0+h/2]; }
  add(team,name,human){ const [x,y]=this.free(...this.map.spawns[team]);
    const p={id:nextId++,team,name,human,x,y,dx:0,dy:0,act:false,caught:false,stam:1,score:0,tags:0,armor:0,green:0,jumpCharge:false,orange:0,camoCharge:false,camoT:0,
      stun:0,immune:0,fx:0,jump:null,idle:0,ix:x,iy:y,wx:x,wy:y,tk:0,lx:x,ly:y,survived:0}; this.players.set(p.id,p); return p; }
  fill(){ for(const team of ['cop','runner']){ const ps=[...this.players.values()].filter(p=>p.team===team); let n=ps.length;
      while(n<C.TEAM_SIZE){ this.add(team,(team==='cop'?'Unit-':'Runner-')+nextId,false); n++; }
      for(const p of ps) if(n>C.TEAM_SIZE&&!p.human){ this.players.delete(p.id); n--; } } }
  humanJoin(team,name){ const p=this.add(team,name,true); this.fill(); return p; }
  remove(id){ this.players.delete(id); this.fill(); }
  alpha(p){ return p.camoT>0?1-p.camoT/C.CAMO_TIME:1; }
  revealed(p){ return p.team==='runner'&&!p.caught&&p.idle>=C.IDLE_REVEAL; }
  // ---- actions
  tryJump(p){ if(!p.jumpCharge||p.jump||p.caught||p.stun>0||(p.team==='cop'&&this.phase==='head')) return false; let dx=p.dx,dy=p.dy,l=Math.hypot(dx,dy); if(!l) return false; dx/=l;dy/=l;
    for(let s=C.JUMP_DIST;s<=C.JUMP_MAX;s+=10){ const x=p.x+dx*s,y=p.y+dy*s; if(!this.blocked(x,y)){ p.jump={x0:p.x,y0:p.y,x1:x,y1:y,t:0}; p.jumpCharge=false; this.stats.jumps++; return true; } }
    return false; }
  tryCamo(p){ if(p.camoCharge&&!p.caught){ p.camoCharge=false; p.camoT=C.CAMO_TIME; this.stats.camos++; return true; } return false; }
  shockwave(src){ this.stats.shocks++; src.fx=0.5; src.immune=C.ARMOR_IMMUNE; this.events.push({t:'shock',x:src.x|0,y:src.y|0,r:C.SHOCK_RADIUS});
    for(const o of this.players.values()){ if(o===src||o.caught) continue; const dx=o.x-src.x,dy=o.y-src.y,d=Math.hypot(dx,dy); if(d>C.SHOCK_RADIUS) continue;
      const ux=d?dx/d:1,uy=d?dy/d:0; if(o.team==='cop') o.stun=C.STUN_TIME;
      for(let s=C.SHOCK_PUSH*(1-d/C.SHOCK_RADIUS*0.5);s>0;s-=10){ const nx=o.x+ux*10,ny=o.y+uy*10; if(this.blocked(nx,ny)) break; o.x=nx;o.y=ny; } } }
  // ---- bots
  bots(){ const all=[...this.players.values()], cops=all.filter(p=>p.team==='cop'), run=all.filter(p=>p.team==='runner'&&!p.caught);
    for(const b of all){ if(b.human||b.caught||b.jump) continue; if(--b.tk>0) continue; b.tk=3+(b.id%3);
      const moved=Math.hypot(b.x-b.lx,b.y-b.ly); b.lx=b.x; b.ly=b.y; b.stuckN=(moved<4&&Math.hypot(b.dx,b.dy)>0)?(b.stuckN||0)+1:0; const stuck=b.stuckN>=C.BOT_STUCK_THINKS;
      if(b.escape>0){ b.escape--; continue; }
      if(stuck){ b.path=null; b.flee=null; b.sc=null; b.goal=null; if(b.jumpCharge&&this.tryJump(b)) continue; const [fx,fy]=this.free(...this.zone); b.wx=fx; b.wy=fy;
        const a=Math.random()*6.283; for(let k=0;k<16;k++){ const aa=a+k*0.3927; if(!this.blocked(b.x+Math.cos(aa)*40,b.y+Math.sin(aa)*40)){ b.dx=Math.cos(aa); b.dy=Math.sin(aa); break; } } b.escape=3; b.stuckN=0; continue; }
      const foes=b.team==='cop'?run:cops; let best=null,bd=1e12;
      for(const f of foes){ const a=this.alpha(f); if(!(this.revealed(f)||this.pinged)&&(a<C.CAMO_HIDE_BELOW||Math.random()>a)) continue; const d=d2(f,b); if(d<bd){bd=d;best=f;} }
      if(b.team==='runner'&&!b.scattered&&this.chaseT<C.BOT_SCATTER_UNTIL){ if(!b.sc){ const sp=this.map.spawns.cop; for(let k=0;k<30;k++){ const [x,y]=this.free(...this.zone); if(Math.hypot(x-sp[0],y-sp[1])>C.BOT_SCATTER_MINDIST||k===29){ b.sc=[x,y]; break; } } }
        if(Math.hypot(b.sc[0]-b.x,b.sc[1]-b.y)<60) b.scattered=true; else if(!foes.some(f=>d2(f,b)<C.BOT_RUNNER_FLEE**2)){ const a=this.steerTo(b,b.sc[0],b.sc[1]); b.mode='scatter'; b.dx=Math.cos(a); b.dy=Math.sin(a); continue; } }
      let ang=null; b.act=false; b.path=b.path||null; const hadPath=b.path;
      if(b.team==='cop'){ if(best&&(bd<C.BOT_COP_SIGHT**2||this.revealed(best)||this.pinged)){ ang=this.steerTo(b,best.x,best.y); b.mode='chase'; b.act=bd<C.BOT_COP_SPRINT_DIST**2; } }
      else if(best&&bd<C.BOT_RUNNER_FLEE**2){ b.mode='flee'; b.act=bd<C.BOT_SPRINT_DIST**2;
        if(bd<C.BOT_CAMO_DIST**2) this.tryCamo(b);
        if(bd<C.BOT_JUMP_DIST**2&&b.jumpCharge){ b.dx=b.x-best.x; b.dy=b.y-best.y; const l=Math.hypot(b.dx,b.dy)||1; b.dx/=l; b.dy/=l;
          if(this.blocked(b.x+b.dx*30,b.y+b.dy*30)&&this.tryJump(b)) continue; }
        if(!b.flee||b.fleeAge++>C.BOT_FLEE_REPLAN||Math.hypot(b.flee[0]-b.x,b.flee[1]-b.y)<40) { b.flee=this.fleePoint(b,cops); b.fleeAge=0; }
        const av=cops.filter(c=>d2(c,b)<500*500&&c.stun<=0); if(b.fleeAge===0) b.path=null; ang=this.steerTo(b,b.flee[0],b.flee[1],av); }
      if(ang===null){ // seek wanted pellets
        let pb=null,pd=520*520; for(const q of this.pellets.values()){ const k=q[3];
          if(k==='green'&&b.jumpCharge||k==='blue'&&(b.armor||b.team==='cop')||k==='orange'&&b.camoCharge) continue;
          const d=(q[1]-b.x)**2+(q[2]-b.y)**2; if(d<pd){pd=d;pb=q;} }
        if(pb){ ang=this.steerTo(b,pb[1],pb[2]); b.mode='pellet'; }
        else { const z=this.zone; if(Math.hypot(b.wx-b.x,b.wy-b.y)<40||Math.random()<.02||!this.inZone(b.wx,b.wy)){ { const [fx,fy]=this.free(...z); b.wx=fx; b.wy=fy; } } ang=this.steerTo(b,b.wx,b.wy); b.mode='wander'; } }
      if(b.camoCharge&&b.team==='cop'&&best&&bd<300*300) this.tryCamo(b);
      if(b.path&&b.mode!=='flee'){ b.dx=Math.cos(ang); b.dy=Math.sin(ang); continue; }
      b.dx=Math.cos(ang); b.dy=Math.sin(ang);
      if(this.blocked(b.x+b.dx*30,b.y+b.dy*30)&&b.jumpCharge&&(best||stuck)&&this.tryJump(b)) continue;
      // steer: prefer side (b.side) consistently to slide around obstacles instead of oscillating
      if(!b.side) b.side=Math.random()<.5?1:-1;
      for(let k=0;k<=8;k++){ const o=k===0?0:(Math.ceil(k/2)*0.39*(k%2?b.side:-b.side)); const a=ang+o;
        if(!this.blocked(b.x+Math.cos(a)*24,b.y+Math.sin(a)*24)&&!this.blocked(b.x+Math.cos(a)*48,b.y+Math.sin(a)*48)){ ang=a; break; } if(k===8) b.side=-b.side; }
      b.dx=Math.cos(ang); b.dy=Math.sin(ang); } }
  // pick a flee destination: reachable, far from nearby cops, prefers broken line of sight (cover), stays inside zone
  fleePoint(b,cops){ const near=cops.filter(c=>d2(c,b)<800*800&&c.stun<=0); let best=null,bs=-1e9; const z=this.zone, cx=z[0]+z[2]/2, cy=z[1]+z[3]/2;
    for(let k=0;k<C.BOT_FLEE_SAMPLES;k++){ const a=Math.random()*6.283, r=100+Math.random()*C.BOT_FLEE_RANGE, x=b.x+Math.cos(a)*r, y=b.y+Math.sin(a)*r;
      if(!this.inZone(x,y)||this.blocked(x,y)||!this.reachable(x,y)) continue; let mn=1e9, cover=0, pass=false;
      for(const c of near){ const dc=Math.hypot(c.x-x,c.y-y); mn=Math.min(mn,dc);
        // segment b->(x,y) passing near cop?
        const vx=x-b.x, vy=y-b.y, t=Math.max(0,Math.min(1,((c.x-b.x)*vx+(c.y-b.y)*vy)/(vx*vx+vy*vy))); if(dc<1e9&&d2(c,b)<450*450&&Math.hypot(b.x+vx*t-c.x,b.y+vy*t-c.y)<C.BOT_FLEE_CLEARANCE) pass=true;
        if(!this.clearLine(c.x,c.y,x,y)) cover++; }
      if(pass) continue; const sc=(this.clearLine(b.x,b.y,x,y)?C.BOT_FLEE_DIRECT_BONUS:0)+Math.min(mn,900)+cover*C.BOT_COVER_BONUS/Math.max(1,near.length)-Math.hypot(x-cx,y-cy)*C.BOT_CENTER_PULL;
      if(sc>bs){ bs=sc; best=[x,y]; } }
    if(!best){ let fx=0,fy=0; for(const c of near){ const dd=Math.max(400,d2(c,b)); fx+=(b.x-c.x)/dd; fy+=(b.y-c.y)/dd; } const a=Math.atan2(fy,fx); b.fleeAge=99; return [b.x+Math.cos(a)*200,b.y+Math.sin(a)*200]; }
    return best; }
  clearLine(ax,ay,bx,by){ const d=Math.hypot(bx-ax,by-ay), n=Math.ceil(d/10); for(let i=1;i<=n;i++){ const k=i/n; if(this.blocked(ax+(bx-ax)*k,ay+(by-ay)*k)) return false; } return true; }
  // BFS on the reachability grid; returns list of cell-center waypoints
  bfs(sx,sy,tx,ty,avoid){ const m=this.map, gw=m.gw, gh=m.gh, cs=m.cell, A=C.BOT_FLEE_CLEARANCE**2; const ok=i=>{ const x=(i%gw+.5)*cs, y=((i/gw|0)+.5)*cs; if(!m.reach[i]||this.blocked(x,y)) return false; if(avoid) for(const c of avoid) if((c.x-x)**2+(c.y-y)**2<A) return false; return true; };
    const s=(sy/cs|0)*gw+(sx/cs|0); let t=(ty/cs|0)*gw+(tx/cs|0); const prev=new Int32Array(gw*gh).fill(-1); prev[s]=s; const q=[s]; let found=-1;
    for(let h=0;h<q.length;h++){ const i=q[h]; if(i===t){found=i;break;} const x=i%gw,y=i/gw|0;
      for(const j of [x>0?i-1:-1,x<gw-1?i+1:-1,y>0?i-gw:-1,y<gh-1?i+gw:-1]) if(j>=0&&prev[j]<0&&ok(j)){ prev[j]=i; q.push(j); } }
    if(found<0) return null; const path=[]; for(let i=found;i!==s;i=prev[i]) path.push([(i%gw+.5)*cs,((i/gw|0)+.5)*cs]); return path.reverse(); }
  steerTo(b,tx,ty,avoid){ if(this.clearLine(b.x,b.y,tx,ty)){ b.path=null; return Math.atan2(ty-b.y,tx-b.x); }
    const pick=()=>{ if(!b.path) return -1; for(let k=Math.min(b.path.length-1,10);k>=0;k--) if(this.clearLine(b.x,b.y,b.path[k][0],b.path[k][1])) return k; return -1; };
    let k=-1; if(b.path&&b.goal&&Math.hypot(b.goal[0]-tx,b.goal[1]-ty)<80&&b.pathAge++<15) k=pick();
    if(k<0){ b.path=this.bfs(b.x,b.y,tx,ty,avoid); b.goal=[tx,ty]; b.pathAge=0; k=pick(); }
    if(k<0) return Math.atan2(ty-b.y,tx-b.x);
    b.path.splice(0,k); const w=b.path[0]; if(b.path.length>1&&Math.hypot(w[0]-b.x,w[1]-b.y)<12) b.path.shift();
    b.pathed=true; return Math.atan2(b.path[0][1]-b.y,b.path[0][0]-b.x); }
  inZone(x,y){ const z=this.zone; return x>z[0]+R&&y>z[1]+R&&x<z[0]+z[2]-R&&y<z[1]+z[3]-R; }
  // ---- tick
  step(dt){
    if(this.phase==='end'){ this.endT-=dt; return; }
    this.t+=dt; if(this.phase==='head'&&this.t>=C.HEADSTART) this.phase='play';
    const ct=this.chaseT, final=ct>=C.CHASE-C.FINAL; this.pinged=false;
    // zone shrink
    const sh=C.SHRINK[this.shrinkI]; if(sh&&ct>=sh.at){ this.shrinkI++; this.zFrom=this.zone.slice(); const w=this.map.w*sh.scale,h=this.map.h*sh.scale; this.zTo=[(this.map.w-w)/2,(this.map.h-h)/2,w,h]; this.zT=0; this.events.push({t:'shrink',n:this.shrinkI}); }
    if(this.zT<1){ this.zT=Math.min(1,this.zT+dt/C.SHRINK_DURATION); this.zone=this.zFrom.map((v,i)=>v+(this.zTo[i]-v)*this.zT);
      for(const q of this.pellets.values()) if(!this.inZone(q[1],q[2])){ this.pellets.delete(q[0]); this.pelletsDirty=true; } }
    if(final&&this.stats.finalAlive===null) this.stats.finalAlive=[...this.players.values()].filter(p=>p.team==='runner'&&!p.caught).length;
    if(final&&ct>=this.nextPing){ this.nextPing+=C.PING_EVERY; this.pinged=true;
      this.events.push({t:'ping',p:[...this.players.values()].filter(p=>p.team==='runner'&&!p.caught).map(p=>[p.x|0,p.y|0])}); }
    this.bots();
    for(const p of this.players.values()){ p.fx=Math.max(0,p.fx-dt); p.immune=Math.max(0,p.immune-dt); if(p.camoT>0) p.camoT=Math.max(0,p.camoT-dt);
      if(p.wantJump){ p.wantJump=false; this.tryJump(p); } if(p.wantCamo){ p.wantCamo=false; this.tryCamo(p); } }
    for(const p of this.players.values()){ if(p.caught) continue;
      if(p.jump){ const j=p.jump; j.t+=dt/C.JUMP_TIME; const k=Math.min(1,j.t); p.x=j.x0+(j.x1-j.x0)*k; p.y=j.y0+(j.y1-j.y0)*k; if(k>=1) p.jump=null; continue; }
      if(p.team==='cop'&&this.phase==='head') continue;
      if(p.stun>0){ p.stun=Math.max(0,p.stun-dt); if(!C.STUN_SLOW) continue; }
      let {dx,dy}=p; const l=Math.hypot(dx,dy); if(l>1){dx/=l;dy/=l;}
      let sp=C.SPEED[p.team]*((C.MAP_SPEED[this.map.id]||{})[p.team]||1)*(p.stun>0?C.STUN_SLOW:1)*(p.team==='cop'&&final?C.FINAL_COP_BOOST:1);
      if(p.act&&p.stam>0&&l>0){ sp*=(typeof C.SPRINT==='object'?C.SPRINT[p.team]:C.SPRINT); p.stam=Math.max(0,p.stam-dt/C.STAMINA_DRAIN); } else p.stam=Math.min(1,p.stam+dt/C.STAMINA_REGEN);
      const nx=p.x+dx*sp*dt, ny=p.y+dy*sp*dt; if(!this.blocked(nx,p.y)) p.x=nx; if(!this.blocked(p.x,ny)) p.y=ny;
      if(!this.inZone(p.x,p.y)){ const z=this.zone; p.x=Math.max(z[0]+R+1,Math.min(z[0]+z[2]-R-1,p.x)); p.y=Math.max(z[1]+R+1,Math.min(z[1]+z[3]-R-1,p.y)); if(this.wallOnly(p.x,p.y)){ const [fx,fy]=this.free(...this.zone); p.x=fx;p.y=fy; } }
      if(p.team==='runner'){ if(Math.hypot(p.x-p.ix,p.y-p.iy)>C.IDLE_EPS){ p.idle=0;p.ix=p.x;p.iy=p.y; } else p.idle+=dt;
        if(this.phase==='play'){ this.stats.aliveT+=dt; if(this.revealed(p)) this.stats.idleRev+=dt; p.survived+=dt; if(p.survived>=30){ p.survived-=30; p.score+=C.SCORE.PER_30S; } } } }
    this.spawnPellets(dt); this.collect();
    if(this.phase==='play'){ const cops=[...this.players.values()].filter(p=>p.team==='cop'&&p.stun<=0&&!p.jump);
      for(const r of this.players.values()){ if(r.team!=='runner'||r.caught||r.jump||r.immune>0) continue;
        for(const c of cops) if(d2(c,r)<(2*R)**2){ if(r.armor){ r.armor=0; this.shockwave(r); } else { r.caught=true; c.tags++; c.score+=C.SCORE.TAG; this.caughtOrder.push(r); this.stats.catches.push(this.chaseT); } break; } } }
    const alive=[...this.players.values()].filter(p=>p.team==='runner'&&!p.caught);
    if(alive.length===0) this.finish('cop'); else if(this.remaining<=0) this.finish('runner');
  }
  spawnPellets(dt){ if(this.phase==='end') return; const cnt={green:0,blue:0,orange:0}; for(const q of this.pellets.values()) cnt[q[3]]++;
    for(const [k,v] of Object.entries(C.PELLETS)) if(cnt[k]<v.max&&Math.random()<v.rate*dt){ const [x,y]=this.free(...this.zone); const id=this.pid++; this.pellets.set(id,[id,x|0,y|0,k]); this.pelletsDirty=true; } }
  collect(){ const rr=(R+C.PELLET_R)**2; for(const p of this.players.values()){ if(p.caught||p.jump) continue;
      for(const q of this.pellets.values()){ if((q[1]-p.x)**2+(q[2]-p.y)**2>rr) continue; const k=q[3];
        if(k==='blue'&&(p.team==='cop'||p.armor)) continue; // armor only useful to taggable players; non-stackable
        this.pellets.delete(q[0]); this.pelletsDirty=true;
        if(k==='blue') p.armor=1;
        else if(k==='green'){ if(!p.jumpCharge&&++p.green>=C.JUMP_NEED){ p.green=0; p.jumpCharge=true; } }
        else if(!p.camoCharge&&++p.orange>=C.CAMO_NEED){ p.orange=0; p.camoCharge=true; } } } }
  finish(w){ this.phase='end'; this.winner=w; this.endT=10; const S=C.SCORE;
    if(w==='cop'){ const o=this.caughtOrder; S.LAST.forEach((pts,i)=>{ const r=o[o.length-1-i]; if(r) r.score+=pts; });
      for(const p of this.players.values()) if(p.team==='cop') p.score+=S.COP_ALL_CAUGHT_BONUS; }
    else for(const p of this.players.values()) if(p.team==='runner'&&!p.caught) p.score+=S.FREE_AT_END;
    this.events.push({t:'end',w,top:[...this.players.values()].sort((a,b)=>b.score-a.score).slice(0,C.END_SCREEN).map(p=>[p.name,p.team,p.score,p.human?1:0])}); }
  snapshot(viewTeam){ const p=[]; for(const q of this.players.values()){ const a=this.alpha(q), rev=this.revealed(q);
      if(q.team!==viewTeam&&a<C.CAMO_HIDE_BELOW&&!rev) continue;
      p.push([q.id,q.x|0,q.y|0,(q.caught?1:0)|(q.act&&q.stam>0?2:0)|(q.stun>0?4:0)|(q.fx>0?8:0)|(q.armor?16:0)|(q.jump?32:0)|(rev?64:0)|(q.camoT>0?128|(Math.round((rev&&q.team!==viewTeam?1:a)*100)<<8):0)]); }
    return {t:'s',tm:Math.ceil(this.remaining),hs:this.phase==='head'?Math.ceil(C.HEADSTART-this.t):0,fin:this.chaseT>=C.CHASE-C.FINAL?1:0,ph:this.phase,w:this.winner,zn:this.zone.map(v=>v|0),p}; }
  roster(){ return [...this.players.values()].map(q=>({id:q.id,n:q.name,tm:q.team,h:q.human,tg:q.tags,sc:q.score,c:q.caught})); }
}
module.exports={Match,MAPS,R,C};
