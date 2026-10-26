# Tuning log

Bot-only simulations run with `node test/sim.js --games N --label ... --set '<json overrides>' --log`.
The harness fast-forwards each round headlessly (dt 0.05 s, no real-time waits) across random seeds and alternates outdoor/indoor maps. It runs on 8 worker threads.

## Metrics and targets (proxies for "fun")
| Metric | Target | Why |
|---|---|---|
| cop win % | 40-60 | both sides have a real chance |
| median chase length | 2:30-3:45 of 4:00 | rounds use most of the clock |
| rounds reaching final minute % | >=50 | the final-minute ping/boost actually happens |
| close rounds % | >=40 | cop win in final minute, or runners win with <=10 survivors |
| last-3 catch spread (median s) | <=60 | the endgame is tense, not a long mop-up |
| shockwaves / jumps / camo per round | >=1 / >=3 / >=0.5 | the abilities actually get used |
| stuck % | <=3 | bots move sensibly |
| camping % | <=2 | runners don't win by hiding still |
| runner score gini | 0.2-0.55 | scores differ, but aren't one lucky player's |
| runner score stdev | >=1.5 | there is a visible score spread |

**Caveat:** bot-only metrics are only a proxy for fun. Human playtesting is still needed, because humans play smarter and differently than these bots.

## Pre-log iterations (32-game smoke runs)
- **baseline** (cop 160/runner 230, 2400x1600): cops win 100%, median chase 0:44. 4/12 targets.
- **iter1:** runner flee rewrite (flee point sampling, cover, center pull) plus a head-start scatter. Median 0:54.
- **iter2:** flee BFS paths avoid cops. Median 0:56 (root cause: flee paths routed through cops). 4/12.
- **sweeps** (24 games each): 3200x2200 map → 1:47. Cop sprint 1.2 with sight 150 → 1:13. Both → 2:25 (7/12). Cops still won 100%.

### iter3: big map, weak cop sprint, short cop sight, more armor, longer stun (24 games, 221s)
Overrides: `{"MAP_SIZE":[3200,2200],"SPRINT":{"cop":1.1,"runner":1.5},"BOT_COP_SIGHT":130,"PELLETS":{"blue":{"max":25,"rate":1.2}},"STUN_TIME":2}`

| Metric | Value | Target | OK |
|---|---|---|---|
| cop win % | 100.00 | 40-60 | ❌ |
| median chase length | 2:46 | 2:30-3:45 | ✅ |
| rounds reaching final minute % | 29.17 | >=50 | ❌ |
| close rounds % | 29.17 | >=40 | ❌ |
| last-3 catch spread (median s, cop wins) | 15.85 | <=60 | ✅ |
| shockwaves / round | 50.67 | >=1 | ✅ |
| jumps / round | 15.04 | >=3 | ✅ |
| camo uses / round | 0.00 | >=0.5 | ❌ |
| stuck % (bot-samples <20px in 3s) | 3.15 | <=3 | ❌ |
| camping % (runner time revealed idle) | 0.03 | <=2 | ✅ |
| runner score gini (luck/domination) | 0.38 | 0.2-0.55 | ✅ |
| runner score spread (stdev) | 1.79 | >=1.5 | ✅ |

outdoor: cop win 100%, median chase 2:31 · indoor: cop win 100%, median chase 2:53 · **7/12 targets met**

### iter4: iter3 + gentler shrink, smaller final boost, easier camo (24 games, 239s)
Overrides: `{"MAP_SIZE":[3200,2200],"SPRINT":{"cop":1.1,"runner":1.5},"BOT_COP_SIGHT":130,"PELLETS":{"blue":{"max":25,"rate":1.2},"orange":{"max":14,"rate":0.6}},"STUN_TIME":2,"CAMO_NEED":6,"SHRINK":[{"at":70,"scale":0.85},{"at":140,"scale":0.7},{"at":205,"scale":0.58}],"FINAL_COP_BOOST":1.05}`

| Metric | Value | Target | OK |
|---|---|---|---|
| cop win % | 91.67 | 40-60 | ❌ |
| median chase length | 2:51 | 2:30-3:45 | ✅ |
| rounds reaching final minute % | 33.33 | >=50 | ❌ |
| close rounds % | 33.33 | >=40 | ❌ |
| last-3 catch spread (median s, cop wins) | 25.80 | <=60 | ✅ |
| shockwaves / round | 49.50 | >=1 | ✅ |
| jumps / round | 15.13 | >=3 | ✅ |
| camo uses / round | 0.17 | >=0.5 | ❌ |
| stuck % (bot-samples <20px in 3s) | 2.45 | <=3 | ✅ |
| camping % (runner time revealed idle) | 0.07 | <=2 | ✅ |
| runner score gini (luck/domination) | 0.37 | 0.2-0.55 | ✅ |
| runner score spread (stdev) | 1.80 | >=1.5 | ✅ |

outdoor: cop win 100%, median chase 2:51 · indoor: cop win 83%, median chase 2:59 · **8/12 targets met**

### iter5: iter4 + cop speed 150, camo needs 4 (24 games, 270s)
Overrides: `{"MAP_SIZE":[3200,2200],"SPEED":{"cop":150,"runner":230},"SPRINT":{"cop":1.1,"runner":1.5},"BOT_COP_SIGHT":130,"PELLETS":{"blue":{"max":25,"rate":1.2},"orange":{"max":14,"rate":0.6}},"STUN_TIME":2,"CAMO_NEED":4,"SHRINK":[{"at":70,"scale":0.85},{"at":140,"scale":0.7},{"at":205,"scale":0.58}],"FINAL_COP_BOOST":1.05}`

| Metric | Value | Target | OK |
|---|---|---|---|
| cop win % | 91.67 | 40-60 | ❌ |
| median chase length | 3:15 | 2:30-3:45 | ✅ |
| rounds reaching final minute % | 70.83 | >=50 | ✅ |
| close rounds % | 70.83 | >=40 | ✅ |
| last-3 catch spread (median s, cop wins) | 32.10 | <=60 | ✅ |
| shockwaves / round | 54.79 | >=1 | ✅ |
| jumps / round | 20.04 | >=3 | ✅ |
| camo uses / round | 4.71 | >=0.5 | ✅ |
| stuck % (bot-samples <20px in 3s) | 2.45 | <=3 | ✅ |
| camping % (runner time revealed idle) | 0.02 | <=2 | ✅ |
| runner score gini (luck/domination) | 0.37 | 0.2-0.55 | ✅ |
| runner score spread (stdev) | 1.97 | >=1.5 | ✅ |

outdoor: cop win 100%, median chase 3:07 · indoor: cop win 83%, median chase 3:37 · **11/12 targets met**

### iter6: iter5 + pings every 10s, no final boost, last shrink 0.65 (24 games, 262s)
Overrides: `{"MAP_SIZE":[3200,2200],"SPEED":{"cop":150,"runner":230},"SPRINT":{"cop":1.1,"runner":1.5},"BOT_COP_SIGHT":130,"PELLETS":{"blue":{"max":25,"rate":1.2},"orange":{"max":14,"rate":0.6}},"STUN_TIME":2,"CAMO_NEED":4,"SHRINK":[{"at":70,"scale":0.88},{"at":140,"scale":0.76},{"at":205,"scale":0.65}],"FINAL_COP_BOOST":1,"PING_EVERY":10}`

| Metric | Value | Target | OK |
|---|---|---|---|
| cop win % | 91.67 | 40-60 | ❌ |
| median chase length | 3:17 | 2:30-3:45 | ✅ |
| rounds reaching final minute % | 83.33 | >=50 | ✅ |
| close rounds % | 83.33 | >=40 | ✅ |
| last-3 catch spread (median s, cop wins) | 31.80 | <=60 | ✅ |
| shockwaves / round | 53.29 | >=1 | ✅ |
| jumps / round | 19.79 | >=3 | ✅ |
| camo uses / round | 5.17 | >=0.5 | ✅ |
| stuck % (bot-samples <20px in 3s) | 2.71 | <=3 | ✅ |
| camping % (runner time revealed idle) | 0.10 | <=2 | ✅ |
| runner score gini (luck/domination) | 0.35 | 0.2-0.55 | ✅ |
| runner score spread (stdev) | 1.91 | >=1.5 | ✅ |

outdoor: cop win 100%, median chase 3:25 · indoor: cop win 83%, median chase 3:17 · **11/12 targets met**

### iter7: iter6 + cop speed 140 (24 games, 251s)
Overrides: `{"MAP_SIZE":[3200,2200],"SPEED":{"cop":140,"runner":230},"SPRINT":{"cop":1.1,"runner":1.5},"BOT_COP_SIGHT":130,"PELLETS":{"blue":{"max":25,"rate":1.2},"orange":{"max":14,"rate":0.6}},"STUN_TIME":2,"CAMO_NEED":4,"SHRINK":[{"at":70,"scale":0.88},{"at":140,"scale":0.76},{"at":205,"scale":0.65}],"FINAL_COP_BOOST":1,"PING_EVERY":10}`

| Metric | Value | Target | OK |
|---|---|---|---|
| cop win % | 66.67 | 40-60 | ❌ |
| median chase length | 3:43 | 2:30-3:45 | ✅ |
| rounds reaching final minute % | 91.67 | >=50 | ✅ |
| close rounds % | 91.67 | >=40 | ✅ |
| last-3 catch spread (median s, cop wins) | 39.75 | <=60 | ✅ |
| shockwaves / round | 56.46 | >=1 | ✅ |
| jumps / round | 27.29 | >=3 | ✅ |
| camo uses / round | 5.92 | >=0.5 | ✅ |
| stuck % (bot-samples <20px in 3s) | 2.81 | <=3 | ✅ |
| camping % (runner time revealed idle) | 0.09 | <=2 | ✅ |
| runner score gini (luck/domination) | 0.34 | 0.2-0.55 | ✅ |
| runner score spread (stdev) | 2.21 | >=1.5 | ✅ |

outdoor: cop win 83%, median chase 3:32 · indoor: cop win 50%, median chase 4:00 · **11/12 targets met**

### iter8: iter7 + outdoor density 1.4, cop 145 (24 games, 267s)
Overrides: `{"MAP_SIZE":[3200,2200],"MAP_DENSITY":{"outdoor":1.4,"indoor":1},"SPEED":{"cop":145,"runner":230},"SPRINT":{"cop":1.1,"runner":1.5},"BOT_COP_SIGHT":130,"PELLETS":{"blue":{"max":25,"rate":1.2},"orange":{"max":14,"rate":0.6}},"STUN_TIME":2,"CAMO_NEED":4,"SHRINK":[{"at":70,"scale":0.88},{"at":140,"scale":0.76},{"at":205,"scale":0.65}],"FINAL_COP_BOOST":1,"PING_EVERY":10}`

| Metric | Value | Target | OK |
|---|---|---|---|
| cop win % | 66.67 | 40-60 | ❌ |
| median chase length | 3:28 | 2:30-3:45 | ✅ |
| rounds reaching final minute % | 79.17 | >=50 | ✅ |
| close rounds % | 79.17 | >=40 | ✅ |
| last-3 catch spread (median s, cop wins) | 27.40 | <=60 | ✅ |
| shockwaves / round | 54.67 | >=1 | ✅ |
| jumps / round | 22.79 | >=3 | ✅ |
| camo uses / round | 4.71 | >=0.5 | ✅ |
| stuck % (bot-samples <20px in 3s) | 2.82 | <=3 | ✅ |
| camping % (runner time revealed idle) | 0.19 | <=2 | ✅ |
| runner score gini (luck/domination) | 0.35 | 0.2-0.55 | ✅ |
| runner score spread (stdev) | 2.03 | >=1.5 | ✅ |

outdoor: cop win 83%, median chase 3:13 · indoor: cop win 50%, median chase 4:00 · **11/12 targets met**

### iter9: cop 140, outdoor cop speed x0.94, outdoor density 1.4 (32 games, 320s)
Overrides: `{"MAP_SIZE":[3200,2200],"MAP_DENSITY":{"outdoor":1.4,"indoor":1},"MAP_SPEED":{"outdoor":{"cop":0.94},"indoor":{"cop":1}},"SPEED":{"cop":140,"runner":230},"SPRINT":{"cop":1.1,"runner":1.5},"BOT_COP_SIGHT":130,"PELLETS":{"blue":{"max":25,"rate":1.2},"orange":{"max":14,"rate":0.6}},"STUN_TIME":2,"CAMO_NEED":4,"SHRINK":[{"at":70,"scale":0.88},{"at":140,"scale":0.76},{"at":205,"scale":0.65}],"FINAL_COP_BOOST":1,"PING_EVERY":10}`

| Metric | Value | Target | OK |
|---|---|---|---|
| cop win % | 75.00 | 40-60 | ❌ |
| median chase length | 3:45 | 2:30-3:45 | ✅ |
| rounds reaching final minute % | 87.50 | >=50 | ✅ |
| close rounds % | 84.38 | >=40 | ✅ |
| last-3 catch spread (median s, cop wins) | 24.15 | <=60 | ✅ |
| shockwaves / round | 55.13 | >=1 | ✅ |
| jumps / round | 26.59 | >=3 | ✅ |
| camo uses / round | 6.25 | >=0.5 | ✅ |
| stuck % (bot-samples <20px in 3s) | 3.94 | <=3 | ❌ |
| camping % (runner time revealed idle) | 0.11 | <=2 | ✅ |
| runner score gini (luck/domination) | 0.34 | 0.2-0.55 | ✅ |
| runner score spread (stdev) | 2.26 | >=1.5 | ✅ |

outdoor: cop win 100%, median chase 3:33 · indoor: cop win 50%, median chase 4:00 · **10/12 targets met**

### iter10 (defaults): outdoor density 0.8, outdoor cop speed x0.9 (32 games, 409s)
Overrides: `{}`

| Metric | Value | Target | OK |
|---|---|---|---|
| cop win % | 46.88 | 40-60 | ✅ |
| median chase length | 4:00 | 2:30-3:45 | ❌ |
| rounds reaching final minute % | 93.75 | >=50 | ✅ |
| close rounds % | 87.50 | >=40 | ✅ |
| last-3 catch spread (median s, cop wins) | 26.05 | <=60 | ✅ |
| shockwaves / round | 56.94 | >=1 | ✅ |
| jumps / round | 26.94 | >=3 | ✅ |
| camo uses / round | 8.09 | >=0.5 | ✅ |
| stuck % (bot-samples <20px in 3s) | 3.38 | <=3 | ❌ |
| camping % (runner time revealed idle) | 0.05 | <=2 | ✅ |
| runner score gini (luck/domination) | 0.33 | 0.2-0.55 | ✅ |
| runner score spread (stdev) | 2.31 | >=1.5 | ✅ |

outdoor: cop win 50%, median chase 4:00 · indoor: cop win 44%, median chase 4:00 · **10/12 targets met**

### iter11: stuck fix (reset path/flee on stuck, finer line checks), stun excluded from stuck metric (32 games, 251s)
Overrides: `{}`

| Metric | Value | Target | OK |
|---|---|---|---|
| cop win % | 59.38 | 40-60 | ✅ |
| median chase length | 3:58 | 2:30-3:45 | ❌ |
| median chase length, cop wins only | 3:35 | 2:30-3:45 | ✅ |
| rounds reaching final minute % | 93.75 | >=50 | ✅ |
| close rounds % | 93.75 | >=40 | ✅ |
| last-3 catch spread (median s, cop wins) | 21.00 | <=60 | ✅ |
| shockwaves / round | 57.63 | >=1 | ✅ |
| jumps / round | 22.16 | >=3 | ✅ |
| camo uses / round | 7.56 | >=0.5 | ✅ |
| stuck % (bot-samples <20px in 3s) | 3.04 | <=3 | ❌ |
| camping % (runner time revealed idle) | 0.11 | <=2 | ✅ |
| runner score gini (luck/domination) | 0.35 | 0.2-0.55 | ✅ |
| runner score spread (stdev) | 2.22 | >=1.5 | ✅ |

outdoor: cop win 69%, median chase 3:39 · indoor: cop win 50%, median chase 4:00 · **11/13 targets met**

### iter12 (final defaults): outdoor cop speed x0.86, faster stuck detection (48 games, 361s)
Overrides: `{}`

| Metric | Value | Target | OK |
|---|---|---|---|
| cop win % | 47.92 | 40-60 | ✅ |
| median chase length | 4:00 | 2:30-3:45 | ❌ |
| median chase length, cop wins only | 3:43 | 2:30-3:45 | ✅ |
| rounds reaching final minute % | 100.00 | >=50 | ✅ |
| close rounds % | 100.00 | >=40 | ✅ |
| last-3 catch spread (median s, cop wins) | 22.05 | <=60 | ✅ |
| shockwaves / round | 59.85 | >=1 | ✅ |
| jumps / round | 25.60 | >=3 | ✅ |
| camo uses / round | 7.42 | >=0.5 | ✅ |
| stuck % (bot-samples <20px in 3s) | 2.43 | <=3 | ✅ |
| camping % (runner time revealed idle) | 0.05 | <=2 | ✅ |
| runner score gini (luck/domination) | 0.33 | 0.2-0.55 | ✅ |
| runner score spread (stdev) | 2.20 | >=1.5 | ✅ |

outdoor: cop win 42%, median chase 4:00 · indoor: cop win 54%, median chase 3:59 · **12/13 targets met**

## Conclusion
iter12 is the committed default in `src/config.js` (the last `Object.assign` block). It meets 12/13 targets over 48 games.
- **Median length miss:** the remaining miss, "median chase length (all rounds)", conflicts with the win-rate target. With about 50% runner wins, and every runner win lasting the full 4:00, the overall median sits at about 4:00. The cop-wins-only median (3:43) is the meaningful one.
- **Close rounds:** every round reaching the final minute means rounds are close, but it also suggests the cops' finish comes late. If human play feels slow, try cop speed +5.
- **Sample size:** 24-48 games per iteration is small, so win rates are roughly ±10-15%.
