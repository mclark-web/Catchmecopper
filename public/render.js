// Renderer: draws using only ASSETS. The only file that draws; swap shapes for sprites here or in assets.js.
(function(){
  const imgs={}; function img(a){ if(!a||!a.src) return null; if(!imgs[a.src]){ const i=new Image(); i.src=a.src; imgs[a.src]=i; } const i=imgs[a.src]; return i.complete&&i.naturalWidth?i:null; }
  function poly(ctx,x,y,r,n,rot){ ctx.beginPath(); for(let i=0;i<n;i++){ const a=rot+i*2*Math.PI/n; ctx[i?'lineTo':'moveTo'](x+Math.cos(a)*r,y+Math.sin(a)*r); } ctx.closePath(); }
  window.Renderer = {
    drawFloor(ctx,map){ const f=ASSETS.floor[map.floor]||ASSETS.floor.street,i=img(f); ctx.fillStyle=i?ctx.createPattern(i,'repeat'):f.color; ctx.fillRect(0,0,map.w,map.h);
      if(!i){ ctx.strokeStyle=f.line; ctx.lineWidth=1; ctx.beginPath(); for(let x=0;x<=map.w;x+=80){ctx.moveTo(x,0);ctx.lineTo(x,map.h);} for(let y=0;y<=map.h;y+=80){ctx.moveTo(0,y);ctx.lineTo(map.w,y);} ctx.stroke(); } },
    drawZone(ctx,map,z){ ctx.fillStyle='rgba(255,0,170,0.18)'; ctx.fillRect(0,0,map.w,z[1]); ctx.fillRect(0,z[1]+z[3],map.w,map.h-z[1]-z[3]); ctx.fillRect(0,z[1],z[0],z[3]); ctx.fillRect(z[0]+z[2],z[1],map.w-z[0]-z[2],z[3]);
      ctx.strokeStyle=ASSETS.palette.zone; ctx.lineWidth=4; ctx.shadowColor=ASSETS.palette.zone; ctx.shadowBlur=15; ctx.strokeRect(z[0],z[1],z[2],z[3]); ctx.shadowBlur=0; },
    drawWalls(ctx,walls){ const a=ASSETS.wall,i=img(a); ctx.shadowColor=a.glow; ctx.shadowBlur=12;
      for(const w of walls){ if(i) ctx.drawImage(i,w[0],w[1],w[2],w[3]); else { ctx.fillStyle=a.color; ctx.fillRect(w[0],w[1],w[2],w[3]); ctx.strokeStyle=a.glow; ctx.lineWidth=2; ctx.strokeRect(w[0],w[1],w[2],w[3]); } } ctx.shadowBlur=0; },
    drawPellets(ctx,list){ for(const q of list){ const a=ASSETS.pellet[q[3]],i=img(a); if(i){ ctx.drawImage(i,q[1]-8,q[2]-8,16,16); continue; }
      ctx.fillStyle=a.color; ctx.shadowColor=a.color; ctx.shadowBlur=10;
      if(a.shape==='diamond') poly(ctx,q[1],q[2],8,4,0); else if(a.shape==='hex') poly(ctx,q[1],q[2],7,6,0); else { ctx.beginPath(); ctx.arc(q[1],q[2],5,0,7); }
      ctx.fill(); } ctx.shadowBlur=0; },
    drawShockRing(ctx,s,now){ const k=(now-s.at)/600; if(k>1) return false; ctx.strokeStyle=ASSETS.shockwave.color; ctx.globalAlpha=1-k; ctx.lineWidth=6*(1-k)+1; ctx.shadowColor=ASSETS.shockwave.color; ctx.shadowBlur=20;
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r*k,0,7); ctx.stroke(); ctx.globalAlpha=1; ctx.shadowBlur=0; return true; },
    drawPlayer(ctx,p,R,isYou){ let a=p.caught?ASSETS.caught:ASSETS[p.team]; if(p.stun&&Math.floor(performance.now()/90)%2) a=ASSETS.stunned;
      const i=img(a), r=p.jump?R*1.45:R;
      if(p.jump){ ctx.fillStyle='rgba(0,0,0,.5)'; ctx.beginPath(); ctx.arc(p.x+6,p.y+8,R,0,7); ctx.fill(); }
      if(i) ctx.drawImage(i,p.x-r,p.y-r,2*r,2*r);
      else if(a.shape==='x'){ ctx.strokeStyle=a.color; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(p.x-r/1.5,p.y-r/1.5); ctx.lineTo(p.x+r/1.5,p.y+r/1.5); ctx.moveTo(p.x+r/1.5,p.y-r/1.5); ctx.lineTo(p.x-r/1.5,p.y+r/1.5); ctx.stroke(); }
      else { ctx.shadowColor=a.glow; ctx.shadowBlur=p.sprint?25:14; ctx.fillStyle=a.color; ctx.beginPath(); ctx.arc(p.x,p.y,r,0,7); ctx.fill(); ctx.shadowBlur=0;
        if(a.outline){ ctx.strokeStyle=a.outline; ctx.lineWidth=2; ctx.stroke(); } }
      if(p.armor&&!p.caught){ ctx.strokeStyle=ASSETS.shield.color; ctx.shadowColor=ASSETS.shield.color; ctx.shadowBlur=12; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(p.x,p.y,r+4,0,7); ctx.stroke(); ctx.shadowBlur=0; }
      if(isYou){ ctx.strokeStyle=ASSETS.you.ring; ctx.lineWidth=2; ctx.setLineDash([4,4]); ctx.beginPath(); ctx.arc(p.x,p.y,r+9,0,7); ctx.stroke(); ctx.setLineDash([]); } }
  };
})();
