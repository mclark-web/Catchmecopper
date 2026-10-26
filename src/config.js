// All tunable gameplay values.
module.exports = {
  TEAM_SIZE: 50, R: 14, TICK: 20,
  HEADSTART: 15,          // s runners move while cops are frozen
  CHASE: 240,             // s chase after head start
  FINAL: 60,              // last N s: cop boost + pings
  FINAL_COP_BOOST: 1.15,
  PING_EVERY: 6,          // s between runner pings in final phase
  IDLE_REVEAL: 8,         // s standing still before a runner is revealed on the map
  IDLE_EPS: 25,           // px movement that resets the idle timer
  SHRINK: [ { at: 70, scale: 0.8 }, { at: 140, scale: 0.6 }, { at: 205, scale: 0.42 } ], // chase-seconds, fraction of map
  SHRINK_DURATION: 8,     // s to animate each shrink
  SPEED: { cop: 160, runner: 230 }, SPRINT: 1.5, BOT_COP_SIGHT: 180, BOT_RUNNER_FLEE: 480, STAMINA_DRAIN: 2.5, STAMINA_REGEN: 6,
  PELLETS: {
    green:  { max: 40, rate: 1.6 },  // jump progress
    blue:   { max: 14, rate: 0.6 },  // armor
    orange: { max: 10, rate: 0.35 }, // camo progress (rarest)
  },
  PELLET_R: 8,
  JUMP_NEED: 5, JUMP_DIST: 80, JUMP_MAX: 170, JUMP_TIME: 0.35, // hop ~one 80px grid tile/obstacle
  SHOCK_RADIUS: 170, SHOCK_PUSH: 130,
  STUN_TIME: 1.5,         // escape window: cops in shockwave stunned this long
  STUN_SLOW: 0,           // speed multiplier while stunned (0 = frozen)
  ARMOR_IMMUNE: 0.6,      // s of tag immunity for the armored player after the shockwave
  CAMO_NEED: 10, CAMO_TIME: 30, CAMO_HIDE_BELOW: 0.15,
  SCORE: { LAST: [5, 3, 1], FREE_AT_END: 5, PER_30S: 1, TAG: 1, COP_ALL_CAUGHT_BONUS: 5 },
  END_SCREEN: 10,
};
Object.assign(module.exports, {
  // Obstacle density multipliers per map (1 = default, 0.5 = sparse, 1.5 = dense). Maps are seeded/deterministic.
  MAP_DENSITY: { outdoor: 1, indoor: 1 },
  MAP_SEED: { outdoor: 1337, indoor: 4242 },
  CELL: 20,               // connectivity grid cell size (px)
  BOT_STUCK_THINKS: 2,    // bot thinks with ~no movement before escape maneuver
});
Object.assign(module.exports, {
  // Runner bot AI
  BOT_SPRINT_DIST: 220, BOT_CAMO_DIST: 160, BOT_JUMP_DIST: 110,
  BOT_FLEE_SAMPLES: 14, BOT_FLEE_RANGE: 300, BOT_FLEE_REPLAN: 6, BOT_COVER_BONUS: 150, BOT_CENTER_PULL: 0.15,
});
Object.assign(module.exports, { BOT_FLEE_CLEARANCE: 90, BOT_SCATTER_UNTIL: 20, BOT_SCATTER_MINDIST: 900 });
Object.assign(module.exports, { BOT_FLEE_DIRECT_BONUS: 200 });
Object.assign(module.exports, { MAP_SIZE: [2400,1600], BOT_COP_SPRINT_DIST: 230 });
Object.assign(module.exports, { MAP_SPEED: { outdoor:{ cop:1 }, indoor:{ cop:1 } } }); // per-map speed multipliers
// ---- Tuned defaults from simulation (see TUNING.md). These override values above.
Object.assign(module.exports, {
  MAP_SIZE: [3200, 2200],
  MAP_DENSITY: { outdoor: 0.8, indoor: 1 },
  MAP_SPEED: { outdoor: { cop: 0.86 }, indoor: { cop: 1 } },
  SPEED: { cop: 140, runner: 230 },
  SPRINT: { cop: 1.1, runner: 1.5 },
  BOT_COP_SIGHT: 130,
  PELLETS: { green: { max: 40, rate: 1.6 }, blue: { max: 25, rate: 1.2 }, orange: { max: 14, rate: 0.6 } },
  STUN_TIME: 2, CAMO_NEED: 4,
  SHRINK: [ { at: 70, scale: 0.88 }, { at: 140, scale: 0.76 }, { at: 205, scale: 0.65 } ],
  FINAL_COP_BOOST: 1.0, PING_EVERY: 10, BOT_STUCK_THINKS: 1,
});
