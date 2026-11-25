// Midnight Ramen Bar — state: the shift, the chef, the bowl, the stations.
// One clear job: what the game is right now, and how a screenshot seeds it.

import { BROTHS, TOPPINGS, TOPPING_ORDER } from './recipes.js';
import { createOrderBook, spawnTicket } from './orders.js';

export const SHIFT_LENGTH = 180; // seconds per shift

// Counter stations, left to right. Each has a floor spot the chef stands on.
export const STATIONS = [
  { id: 'bowls',    label: 'Bowls',      x: 40,  w: 120, cx: 100,  floorY: 330 },
  { id: 'broth-shoyu',    label: 'Shoyu',    broth: 'shoyu',    x: 180, w: 95, cx: 227, floorY: 330 },
  { id: 'broth-tonkotsu', label: 'Tonkotsu', broth: 'tonkotsu', x: 285, w: 95, cx: 332, floorY: 330 },
  { id: 'broth-spicy',    label: 'Spicy Miso', broth: 'spicy',  x: 390, w: 95, cx: 437, floorY: 330 },
  { id: 'noodles',   label: 'Noodles',    x: 505, w: 130, cx: 570, floorY: 330 },
  { id: 'top-chashu',   label: 'Chashu',   topping: 'chashu',   x: 655, w: 62, cx: 686, floorY: 330 },
  { id: 'top-egg',      label: 'Ajitama',  topping: 'egg',      x: 722, w: 62, cx: 753, floorY: 330 },
  { id: 'top-nori',     label: 'Nori',     topping: 'nori',     x: 789, w: 62, cx: 820, floorY: 330 },
  { id: 'top-naruto',   label: 'Naruto',   topping: 'naruto',   x: 856, w: 62, cx: 887, floorY: 330 },
  { id: 'top-scallion', label: 'Scallion', topping: 'scallion', x: 923, w: 62, cx: 954, floorY: 330 },
  { id: 'top-corn',     label: 'Corn',     topping: 'corn',     x: 990, w: 62, cx: 1021, floorY: 330 },
  { id: 'serve',     label: 'SERVE',      x: 1072, w: 168, cx: 1156, floorY: 330 },
];

export const SINK = { x: 40, y: 690, w: 150, h: 70, cx: 115, cy: 725 };

export function emptyBowl() {
  return { broth: null, noodles: null, toppings: [] };
}

export function createGame() {
  return {
    phase: 'title', // title | playing | over
    time: 0,
    shiftLeft: SHIFT_LENGTH,
    score: 0,
    chef: { x: 640, y: 520, dir: 1, walking: false, target: null },
    bowl: null, // bowl the chef is carrying, or null
    noodle: null, // { t, needle } while a pull is in progress
    readyBowl: null, // a finished bowl waiting on the serve counter
    orders: createOrderBook(),
    toasts: [], // { text, t, color }
    steam: [], // ambient steam particles
    servedFlash: 0,
    walkoutFlash: 0,
    lastTickSecond: -1,
    rng: Math.random,
  };
}

export function addToast(game, text, color = '#ffd23f') {
  game.toasts.push({ text, t: 0, color });
  if (game.toasts.length > 4) game.toasts.shift();
}

export function bowlSummary(bowl) {
  if (!bowl) return 'No bowl';
  const parts = [];
  if (bowl.broth) parts.push(BROTHS[bowl.broth].name);
  if (bowl.noodles) parts.push(bowl.noodles === 'perfect' ? 'Perfect noodles' : `${bowl.noodles} noodles`);
  for (const t of bowl.toppings) parts.push(TOPPINGS[t].name);
  return parts.length ? parts.join(' + ') : 'Empty bowl';
}

// Deterministic staged scenes for screenshots (?shot=cover|rush|tense|serve).
// These seed a real playing state — the same code path as live play.
export function seedShot(game, name) {
  game.phase = 'playing';
  const rng = mulberry32(name === 'cover' ? 7 : name === 'rush' ? 21 : name === 'tense' ? 33 : 55);
  game.rng = rng;
  game.orders = createOrderBook();
  if (name === 'cover') {
    game.shiftLeft = 142;
    game.score = 340;
    game.orders.combo = 2;
    game.orders.served = 2;
    spawnTicket(game.orders, rng); spawnTicket(game.orders, rng); spawnTicket(game.orders, rng);
    game.orders.tickets[0].patience = 52;
    game.orders.tickets[1].patience = 38;
    game.orders.tickets[2].patience = 61;
    game.chef.x = 570; game.chef.y = 380;
    // Bowl mid-assembly: broth + noodles in, one topping on.
    game.bowl = { broth: 'tonkotsu', noodles: 'perfect', toppings: ['chashu'] };
    // A finished bowl waits on the serve counter, ready to go.
    game.readyBowl = { broth: 'shoyu', noodles: 'perfect', toppings: ['chashu', 'egg', 'nori'] };
    addToast(game, 'Ticket up! Lantern Tonkotsu', '#ffd23f');
  } else if (name === 'rush') {
    game.shiftLeft = 96;
    game.score = 720;
    game.orders.combo = 3;
    game.orders.served = 5;
    spawnTicket(game.orders, rng); spawnTicket(game.orders, rng);
    spawnTicket(game.orders, rng); spawnTicket(game.orders, rng);
    game.orders.tickets[0].patience = 18;
    game.orders.tickets[1].patience = 26;
    game.orders.tickets[2].patience = 44;
    game.orders.tickets[3].patience = 58;
    game.chef.x = 570; game.chef.y = 380;
    game.bowl = { broth: 'spicy', noodles: null, toppings: [] };
    game.noodle = { t: 0, needle: 0.52 }; // mid perfect-pull
    addToast(game, 'RUSH! Four tickets on the rail', '#ff7a5c');
  } else if (name === 'tense') {
    game.shiftLeft = 61;
    game.score = 540;
    game.orders.combo = 1;
    game.orders.served = 3;
    spawnTicket(game.orders, rng); spawnTicket(game.orders, rng);
    game.orders.tickets[0].patience = 8; // nearly out — the tense moment
    game.orders.tickets[1].patience = 41;
    game.chef.x = 820; game.chef.y = 400;
    game.bowl = { broth: 'shoyu', noodles: 'perfect', toppings: ['chashu', 'egg'] };
    addToast(game, 'Hurry — ticket almost walks out!', '#ff7a5c');
  } else { // serve
    game.shiftLeft = 118;
    game.score = 960;
    game.orders.combo = 4;
    game.orders.served = 6;
    spawnTicket(game.orders, rng); spawnTicket(game.orders, rng);
    game.orders.tickets[0].patience = 47;
    game.orders.tickets[1].patience = 55;
    game.chef.x = 1156; game.chef.y = 400;
    game.bowl = { broth: 'tonkotsu', noodles: 'perfect', toppings: ['chashu', 'scallion', 'corn'] };
    game.readyBowl = null;
    game.servedFlash = 1.2;
    addToast(game, 'SERVED! +212  •  Combo x4', '#7bc96f');
  }
  return game;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export { TOPPING_ORDER };
