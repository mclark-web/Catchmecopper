// Seeded map generator. Walls are axis-aligned rects [x,y,w,h].
// Obstacles: thick (>150px, cannot be jumped with JUMP_MAX 170) and thin/single-tile (jumpable).
// Every obstacle is accepted only if all open space stays connected (flood fill), so no sealed pockets.
const C = require('./config'); const R = C.R, CS = C.CELL; let W = 2400, H = 1600;
function rng(seed){ return ()=>{ seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; }; }
const hit=(x,y,r,w)=>x+r>w[0]&&x-r<w[0]+w[2]&&y+r>w[1]&&y-r<w[1]+w[3];
const overlap=(a,b,pad)=>a[0]<b[0]+b[2]+pad&&a[0]+a[2]+pad>b[0]&&a[1]<b[1]+b[3]+pad&&a[1]+a[3]+pad>b[1];
class Builder {
  constructor(spawns){ this.walls=[[0,0,W,20],[0,H-20,W,20],[0,0,20,H],[W-20,0,20,H]]; this.spawns=spawns; this.gw=W/CS|0; this.gh=H/CS|0;
    this.block=new Uint8Array(this.gw*this.gh); for(const w of this.walls) this.stamp(w,this.block); this.added=0; }
  cellsOf(w,f){ const pad=R+1; const x0=Math.max(0,Math.floor((w[0]-pad)/CS)),x1=Math.min(this.gw-1,Math.floor((w[0]+w[2]+pad)/CS)),y0=Math.max(0,Math.floor((w[1]-pad)/CS)),y1=Math.min(this.gh-1,Math.floor((w[1]+w[3]+pad)/CS));
    for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++) if(hit(x*CS+CS/2,y*CS+CS/2,R,w)) f(y*this.gw+x); }
  stamp(w,arr){ this.cellsOf(w,i=>arr[i]=1); }
  connected(b){ const n=this.gw*this.gh, seen=new Uint8Array(n); let start=-1,free=0; for(let i=0;i<n;i++) if(!b[i]){ free++; if(start<0) start=i; }
    const q=[start]; seen[start]=1; let c=1; while(q.length){ const i=q.pop(), x=i%this.gw, y=i/this.gw|0;
      for(const j of [x>0?i-1:-1,x<this.gw-1?i+1:-1,y>0?i-this.gw:-1,y<this.gh-1?i+this.gw:-1]) if(j>=0&&!b[j]&&!seen[j]){ seen[j]=1; c++; q.push(j); } }
    return c===free; }
  add(w,minGap=0){ w=w.map(v=>Math.round(v)); if(w[0]<20||w[1]<20||w[0]+w[2]>W-20||w[1]+w[3]>H-20) return false;
    for(const s of Object.values(this.spawns)) if(overlap(w,s,30)) return false;
    if(minGap) for(const o of this.walls.slice(4)) if(overlap(w,o,minGap)) return false;
    const b=this.block.slice(); this.stamp(w,b); if(!this.connected(b)) return false; this.block=b; this.walls.push(w); this.added++; return true; }
  // force-add (structural walls designed with gaps); still connectivity-checked
  scatter(n,make,tries=8,gap=0){ let k=0; for(let i=0;i<n;i++) for(let t=0;t<tries;t++) if(this.add(make(),gap)){ k++; break; } return k; }
  done(meta){ const reach=new Uint8Array(this.gw*this.gh); for(let i=0;i<reach.length;i++) reach[i]=this.block[i]?0:1;
    return {...meta,w:W,h:H,walls:this.walls,spawns:this.spawns,cell:CS,gw:this.gw,gh:this.gh,reach}; }
}
function outdoor(seed){ const area=W*H/(2400*1600), d=C.MAP_DENSITY.outdoor*area, r=rng(seed);
  const b=new Builder({ cop:[60,60,300,250], runner:[W-360,H-310,300,250] });
  // thick buildings in a block grid with alleys (unjumpable)
  for(let bx=0;bx<Math.floor((W-200)/330);bx++) for(let by=0;by<Math.floor((H-100)/300);by++){ if(r()>0.55+0.35*Math.min(1,C.MAP_DENSITY.outdoor)) continue;
    const x=120+bx*330+r()*60, y=110+by*300+r()*50, w=160+r()*110, h=160+r()*80;
    if(r()<0.35){ b.add([x,y,w,h*0.45]); b.add([x,y+h*0.45+60,w,h*0.55]); } else b.add([x,y,w,h]); } // some split by an alley
  // L-shaped walls / fences (thin, jumpable)
  b.scatter(Math.round(45*d),()=>{ const x=60+r()*(W-200), y=60+r()*(H-200); return r()<.5?[x,y,40+r()*200,20]:[x,y,20,40+r()*200]; },14,22);
  // concrete barriers (jumpable, medium)
  b.scatter(Math.round(45*d),()=>{ const x=60+r()*(W-200), y=60+r()*(H-200); return r()<.5?[x,y,120,30]:[x,y,30,120]; },14,30);
  // cars / dumpsters (80x40) and crates (single tile 40x40)
  b.scatter(Math.round(55*d),()=>{ const x=40+r()*(W-120), y=40+r()*(H-120); return r()<.5?[x,y,80,40]:[x,y,40,80]; },14,26);
  b.scatter(Math.round(110*d),()=>[40+r()*(W-80),40+r()*(H-80),40,40],6,30);
  return b.done({ id:'outdoor', name:'Downtown (outdoor)', floor:'street', seed }); }
function indoor(seed){ const area=W*H/(2400*1600), d=C.MAP_DENSITY.indoor*area, r=rng(seed);
  const b=new Builder({ cop:[40,40,320,300], runner:[W-360,H-340,320,300] });
  const cols=Math.max(2,Math.round(W/400)), rows=Math.max(2,Math.round(H/400)), cw=W/cols, rh=H/rows, door=100, t=24;
  // room walls (24px, jumpable) with 1-2 doors per wall segment
  for(let c=1;c<cols;c++) for(let rr=0;rr<rows;rr++){ const x=c*cw-t/2, y=rr*rh, g=y+40+r()*(rh-door-80);
    b.add([x,y,t,g-y]); b.add([x,g+door,t,y+rh-(g+door)]); }
  for(let rr=1;rr<rows;rr++) for(let c=0;c<cols;c++){ const y=rr*rh-t/2, x=c*cw, g=x+40+r()*(cw-door-80);
    b.add([x,y,g-x,t]); b.add([g+door,y,x+cw-(g+door),t]); }
  // structural pillars / server blocks (thick, unjumpable)
  b.scatter(Math.round(16*d),()=>{ const s=160+r()*40; return [60+r()*(W-300),60+r()*(H-300),s,s*(0.9+r()*0.3)]; },10,60);
  // shelving rows (thin long, jumpable)
  b.scatter(Math.round(60*d),()=>{ const x=50+r()*(W-200), y=50+r()*(H-200); return r()<.5?[x,y,140+r()*80,24]:[x,y,24,140+r()*80]; },14,30);
  // desks/tables (80x40), crates (40x40)
  b.scatter(Math.round(60*d),()=>{ const x=40+r()*(W-120), y=40+r()*(H-120); return r()<.5?[x,y,80,40]:[x,y,40,80]; },14,22);
  b.scatter(Math.round(90*d),()=>[40+r()*(W-80),40+r()*(H-80),40,40],6,28);
  return b.done({ id:'indoor', name:'Warehouse (indoor)', floor:'tile', seed }); }
const GEN={outdoor,indoor};
const cache=new Map();
function generate(type,seed){ W=C.MAP_SIZE[0]; H=C.MAP_SIZE[1]; type=GEN[type]?type:'outdoor'; seed=(seed>>>0)||randomSeed(); const k=type+':'+seed+':'+W+'x'+H+':'+JSON.stringify(C.MAP_DENSITY); if(!cache.has(k)){ if(cache.size>50) cache.clear(); cache.set(k,GEN[type](seed)); } return cache.get(k); }
function randomSeed(){ return (Math.random()*1e9|0)+1; }
module.exports = { generate, randomSeed, TYPES:{ outdoor:'Downtown (outdoor)', indoor:'Warehouse (indoor)' } };
