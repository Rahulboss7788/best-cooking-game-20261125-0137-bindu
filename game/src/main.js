// Midnight Ramen Bar — main: the game loop, movement, stations and serving.
// One clear job: run the shift — update state, answer input, draw the frame.

import { createGame, addToast, emptyBowl, seedShot, STATIONS, SINK, SHIFT_LENGTH } from './state.js';
import { createOrderBook, updateOrders, serveBowl, findMatchingTicket } from './orders.js';
import { createInput, consumePressed, clearPressed } from './input.js';
import { render } from './render.js';
import { sfx, toggleMute } from './audio.js';
import { BROTHS } from './recipes.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

function fitCanvas() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = 1280 * dpr;
  canvas.height = 800 * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
fitCanvas();
window.addEventListener('resize', fitCanvas);

const input = createInput(canvas);
const params = new URLSearchParams(location.search);
const game = createGame();

// Screenshot mode: ?shot=cover|rush|tense|serve stages a real playing state.
const shot = params.get('shot');
if (shot) seedShot(game, shot);

let last = performance.now();

function nearestStation() {
  let best = null;
  let bestD = 1e9;
  for (const st of STATIONS) {
    const d = Math.hypot(game.chef.x - st.cx, game.chef.y - st.floorY);
    if (d < bestD) { bestD = d; best = st; }
  }
  return bestD < 110 ? best : null;
}

function nearSink() {
  return Math.hypot(game.chef.x - SINK.cx, game.chef.y - SINK.cy) < 110;
}

function interact() {
  const st = nearestStation();
  if (nearSink() && game.bowl) {
    game.bowl = null;
    addToast(game, 'Bowl dumped — fresh start', '#9fb3d5');
    sfx.pour();
    return;
  }
  if (!st) { sfx.denied(); return; }

  if (st.id === 'bowls') {
    if (game.bowl) { addToast(game, 'Hands full — serve or dump first', '#ff7a5c'); sfx.denied(); return; }
    game.bowl = emptyBowl();
    addToast(game, 'Empty bowl in hand', '#ffd23f');
    sfx.pickup();
    return;
  }
  if (st.broth) {
    if (!game.bowl) { addToast(game, 'Grab a bowl first!', '#ff7a5c'); sfx.denied(); return; }
    if (game.bowl.broth) { addToast(game, 'Bowl already has broth — dump it to change', '#ff7a5c'); sfx.denied(); return; }
    game.bowl.broth = st.broth;
    addToast(game, `${BROTHS[st.broth].name} broth poured`, '#ffd23f');
    sfx.pour();
    return;
  }
  if (st.id === 'noodles') {
    if (!game.bowl) { addToast(game, 'Grab a bowl first!', '#ff7a5c'); sfx.denied(); return; }
    if (!game.bowl.broth) { addToast(game, 'Broth first — noodles need a bowl of broth', '#ff7a5c'); sfx.denied(); return; }
    if (game.bowl.noodles) { addToast(game, 'Noodles already in', '#ff7a5c'); sfx.denied(); return; }
    if (game.noodle) {
      // Pull! Judge the needle: green zone 0.45–0.62 is perfect.
      const n = game.noodle.needle;
      let quality = 'perfect';
      if (n < 0.45) quality = 'under';
      else if (n > 0.62) quality = 'over';
      game.bowl.noodles = quality;
      game.noodle = null;
      if (quality === 'perfect') { addToast(game, 'PERFECT PULL! +25', '#7bc96f'); sfx.perfectPull(); }
      else { addToast(game, quality === 'under' ? 'Pulled too early — underdone' : 'Left too long — overdone', '#ff7a5c'); sfx.badPull(); }
      return;
    }
    game.noodle = { t: 0, needle: 0 };
    addToast(game, 'Noodles in — watch the bar, pull in the green!', '#ffd23f');
    sfx.noodleStart();
    return;
  }
  if (st.topping) {
    if (!game.bowl) { addToast(game, 'Grab a bowl first!', '#ff7a5c'); sfx.denied(); return; }
    if (!game.bowl.noodles) { addToast(game, 'Noodles first — toppings go on top', '#ff7a5c'); sfx.denied(); return; }
    if (game.bowl.toppings.includes(st.topping)) { addToast(game, 'Already on the bowl', '#ff7a5c'); sfx.denied(); return; }
    game.bowl.toppings.push(st.topping);
    addToast(game, `+ ${st.label}`, '#ffd23f');
    sfx.topping();
    return;
  }
  if (st.id === 'serve') {
    if (!game.bowl) { addToast(game, 'Nothing to serve — build a bowl first', '#ff7a5c'); sfx.denied(); return; }
    const match = findMatchingTicket(game.orders, game.bowl);
    if (!match) {
      addToast(game, 'No ticket matches this bowl — check the rail!', '#ff7a5c');
      sfx.denied();
      return;
    }
    const result = serveBowl(game.orders, game.bowl);
    game.score += result.points;
    game.readyBowl = game.bowl;
    game.bowl = null;
    game.servedFlash = 1.2;
    addToast(game, `SERVED #${result.ticket.id} ${result.ticket.name}! +${result.points}${result.combo >= 2 ? ` • Combo x${result.combo}` : ''}`, '#7bc96f');
    sfx.serve();
    setTimeout(() => { sfx.bell(); }, 250);
  }
}

function moveChef(dt) {
  const speed = 280;
  let dx = 0;
  let dy = 0;
  if (input.keys.has('up')) dy -= 1;
  if (input.keys.has('down')) dy += 1;
  if (input.keys.has('left')) dx -= 1;
  if (input.keys.has('right')) dx += 1;
  // Click-to-walk: head for the clicked point, stop on arrival.
  if (game.chef.target && dx === 0 && dy === 0) {
    const t = game.chef.target;
    const d = Math.hypot(t.x - game.chef.x, t.y - game.chef.y);
    if (d < 12) {
      game.chef.target = null;
      interact(); // arrived at a station — work it
    } else {
      dx = (t.x - game.chef.x) / d;
      dy = (t.y - game.chef.y) / d;
    }
  } else if (dx !== 0 || dy !== 0) {
    game.chef.target = null;
  }
  const len = Math.hypot(dx, dy);
  if (len > 0) {
    game.chef.x += (dx / len) * speed * dt;
    game.chef.y += (dy / len) * speed * dt;
    if (dx !== 0) game.chef.dir = dx > 0 ? 1 : -1;
    game.chef.walking = true;
  } else {
    game.chef.walking = false;
  }
  // Keep the chef on the floor: below the counter, inside the room.
  game.chef.x = Math.max(30, Math.min(1250, game.chef.x));
  game.chef.y = Math.max(330, Math.min(770, game.chef.y));
}

function spawnSteam(dt) {
  // Steam rises from the three broth pots and the noodle boiler.
  const pots = [227, 332, 437, 570];
  if (Math.random() < dt * 14) {
    const x = pots[Math.floor(Math.random() * pots.length)] + (Math.random() - 0.5) * 30;
    game.steam.push({ x, y: 200 + Math.random() * 20, r: 3 + Math.random() * 5, a: 0.25, vy: 22 + Math.random() * 14 });
  }
  for (const p of game.steam) {
    p.y -= p.vy * dt;
    p.a -= dt * 0.12;
    p.r += dt * 6;
  }
  game.steam = game.steam.filter((p) => p.a > 0 && p.y > 120);
}

function update(dt) {
  // Toasts age out
  for (const t of game.toasts) t.t += dt;
  game.toasts = game.toasts.filter((t) => t.t < 3.2);
  game.servedFlash = Math.max(0, game.servedFlash - dt);
  game.walkoutFlash = Math.max(0, game.walkoutFlash - dt);
  spawnSteam(dt);

  if (consumePressed(input, 'mute')) {
    const m = toggleMute();
    addToast(game, m ? 'Sound off' : 'Sound on', '#9fb3d5');
  }

  if (game.phase === 'title') {
    if (consumePressed(input, 'start') || input.click) {
      game.phase = 'playing';
      game.orders.spawnIn = 1.2;
      sfx.ticket();
    }
    clearPressed(input);
    input.click = null;
    return;
  }

  if (game.phase === 'over') {
    if (consumePressed(input, 'restart')) {
      const fresh = createGame();
      Object.assign(game, fresh, { phase: 'playing' });
      game.orders.spawnIn = 1.2;
    }
    clearPressed(input);
    input.click = null;
    return;
  }

  // Playing
  game.time += dt;
  game.shiftLeft -= dt;
  const sec = Math.ceil(game.shiftLeft);
  if (sec !== game.lastTickSecond) {
    game.lastTickSecond = sec;
    if (sec <= 10 && sec > 0) sfx.tick();
  }
  if (game.shiftLeft <= 0) {
    game.shiftLeft = 0;
    game.phase = 'over';
    clearPressed(input);
    input.click = null;
    return;
  }

  // Noodle pull needle sweeps back and forth; overcook after 4s.
  if (game.noodle) {
    game.noodle.t += dt;
    game.noodle.needle = (Math.sin(game.noodle.t * 2.4) + 1) / 2;
    if (game.noodle.t > 4) {
      game.bowl.noodles = 'over';
      game.noodle = null;
      addToast(game, 'Noodles overcooked!', '#ff7a5c');
      sfx.badPull();
    }
  }

  const lost = updateOrders(game.orders, dt, game.time, game.rng);
  if (lost.length) {
    game.walkoutFlash = 1;
    addToast(game, 'A customer walked out…', '#ff7a5c');
    sfx.walkout();
  }

  // Click sets a walk target (handled in moveChef).
  if (input.click) {
    game.chef.target = { x: input.click.x, y: Math.max(330, input.click.y) };
    input.click = null;
  }
  if (consumePressed(input, 'interact')) interact();
  moveChef(dt);

  // Screen-reader status line
  const active = game.orders.tickets[0];
  statusEl.textContent = `Score ${game.score}. ${game.orders.tickets.length} tickets on the rail. ` +
    (game.bowl ? `Carrying: ${game.bowl.broth || 'empty bowl'}. ` : 'Hands empty. ') +
    (active ? `Next ticket: ${active.name}, ${Math.ceil(active.patience)} seconds left.` : 'No tickets waiting.');
  clearPressed(input);
}

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  render(ctx, game);
  requestAnimationFrame(frame);
}

// Playtest hooks: the automated checks drive the game through these.
window.__ramen = {
  game,
  input,
  interact,
  start() { game.phase = 'playing'; },
  teleport(x, y) { game.chef.x = x; game.chef.y = y; game.chef.target = null; },
};

requestAnimationFrame(frame);
