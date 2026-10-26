// ASSET MANIFEST: swap art here without touching game logic.
// Give any entry `src:'img/name.png'` to draw an image instead of the placeholder shape.
window.ASSETS = {
  palette: { bg:'#05050a', ui:'#39ff14', uiDim:'#1b7a0a', text:'#e8ffe0', zone:'#ff00aa', ping:'#ffee00', reveal:'#ffee00' },
  floor:  { street:{ src:null, color:'#0a0a12', line:'#12331a' }, tile:{ src:null, color:'#0b0b14', line:'#1a1a3a' } },
  wall:   { src:null, color:'#111827', glow:'#39ff14' },
  // Cops: royal blue body + white outline (distinct from the cyan armor pellets)
  cop:    { src:null, color:'#2a3dff', glow:'#5c6cff', outline:'#ffffff', shape:'circle' },
  runner: { src:null, color:'#ff1e3c', glow:'#ff5a6e', outline:null, shape:'circle' },
  caught: { src:null, color:'#444', glow:'#666', shape:'x' },
  stunned:{ src:null, color:'#ffffff', glow:'#39ff14', outline:'#39ff14', shape:'circle' },
  shield: { color:'#00e5ff' },
  shockwave:{ color:'#00e5ff' },
  pellet: {
    green:  { src:null, color:'#39ff14', shape:'circle',  label:'JUMP' },
    blue:   { src:null, color:'#00e5ff', shape:'hex',     label:'ARMOR' },
    orange: { src:null, color:'#ff8c00', shape:'diamond', label:'CAMO' },
  },
  you:    { ring:'#39ff14' },
};
