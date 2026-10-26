# MANHUNT — 50 Cops vs 50 Runners (top-down, neon)
Node.js + `ws` authoritative server (20 tick/s), HTML5 canvas client with interpolation. Single player vs bots today: you join a team, AI bots fill the other 99 slots. Extra humans can join too, and each one replaces a bot.

## Run
    npm install
    npm start               # node server.js          # PORT env var, default 3000
    open http://localhost:3000
    node test/load.js 100   # headless: offline win-condition sim + 100 ws clients

## Controls
| Action | Numpad | Fallback |
|---|---|---|
| Move (8 directions) | 8/2/4/6, diagonals 7/9/1/3 | WASD / arrows |
| Jump (needs a charge) | 5 | Space |
| Sprint (hold, uses stamina) | Enter / + | Shift |
| Camouflage (needs a charge) | 0 / . | C |
| Next spectate target (while caught) | 5 | Q |
| Scoreboard | Tab | |

## Rules (every value is in src/config.js)
- **Round:** 15 s head start where cops are frozen, then a 4:00 chase. The final 60 s gives cops +15% speed and pings every free runner on the minimap every 6 s. The zone (magenta) shrinks 3 times, at 70 s, 140 s and 205 s into the chase. A runner who stands still for more than 8 s is revealed to the cops, camo or not.
- **Tagging:** a cop touching a runner catches them. Stunned cops and players in mid-jump can't tag or be tagged. Caught runners spectate and stop scoring.
- **Green pellets (circles):** 5 give one jump charge. The jump hops one tile or obstacle (80-170 px). You can hold one charge, and extra greens do nothing while you have it.
- **Cyan pellets (hexagons, the "blue" armor):** one gives a runner one armor charge, shown as a cyan shield ring. Charges don't stack. When an armored runner is tagged, the armor breaks instead and fires a shockwave (an expanding ring). It pushes every nearby player back and stuns nearby cops for 1.5 s, and stunned cops flash white.
- **Orange pellets (diamonds, rarest):** 10 give one camo charge, which you trigger yourself. Camo lasts 30 s: you start fully invisible and fade in linearly. You can still be tagged. The server leaves you out of enemy snapshots while you're nearly invisible, and bots see you only in proportion to your visibility.
- **Scoring:** if all runners are caught, the last one caught gets 5, the second-last 3, the third-last 1. Runners still free when the timer ends get 5 each. Runners also get 1 point per 30 s survived. Cops get 1 per tag, plus 5 each if every runner is caught before the timer ends.
- **Cop color:** royal blue (#2a3dff) with a white outline, so cops don't clash with the cyan (#00e5ff) armor pellets.

## Maps
Every round generates a new random map (seed shown in the HUD; type a seed in the lobby to replay one). Size `MAP_SIZE` (default 3200x2200).
Seeded generator in src/maps.js. `MAP_DENSITY` and `MAP_SEED` in config control it. Each obstacle is kept only if all open space stays connected (flood fill on a 20 px grid). Spawns and pellets only use reachable cells. Thick blocks (>150 px) cannot be jumped; crates, barriers, fences, shelving and room walls can. Bots use BFS paths on the grid.

## Balance simulation
    npm run sim   # or: node test/sim.js --games 100 --set '{"SPEED":{"cop":150,"runner":230}}' --log
See TUNING.md for metrics, targets and the iteration log.

## Tests
    node test/logic.js      # simulated rounds + unit checks (armor, jump, camo hiding, scoring, pings, idle reveal)
    node test/load.js 100   # 100 ws clients

## Code layout
- `src/config.js`: all tuning values (speeds, team size, round length, stun/escape window, pellets, camo).
- `src/maps.js`: Downtown (outdoor: blocks and crates) and Warehouse (indoor: rooms, doors, furniture). Walls are rects.
- `src/game.js`: the Match simulation, bots, collisions and per-team snapshots.
- `src/auth.js`: auth hook (`authenticate(token, req, name)`). Currently a guest stub. Add real login here. The client already sends `localStorage.token`.
- `public/assets.js`: **asset manifest**. Set `src:'img/x.png'` on any entry to replace the placeholder shape with an image. `public/render.js` is the only file that draws.

## Deploy
Vercel can't host long-lived WebSockets. Use Render, Fly.io or Railway (a plain `node server.js` web service with PORT set).
