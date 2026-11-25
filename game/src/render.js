// Midnight Ramen Bar — render: every pixel the player sees.
// One clear job: draw the night shop, the rail, the chef and the bowls.

import { BROTHS, TOPPINGS, TOPPING_ORDER } from './recipes.js';
import { STATIONS, SINK, SHIFT_LENGTH, bowlSummary } from './state.js';

const W = 1280;
const H = 800;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, s, x, y, size, color, align = 'center', weight = 'bold') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px "Trebuchet MS", Verdana, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

export function drawBowl(ctx, x, y, bowl, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  // Bowl body
  ctx.fillStyle = '#1d2a4a';
  ctx.beginPath();
  ctx.ellipse(0, 0, 34, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2c3f6e';
  ctx.beginPath();
  ctx.ellipse(0, -3, 34, 14, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#3d5a99';
  ctx.fillRect(-34, -6, 68, 5);
  // Broth surface
  if (bowl && bowl.broth) {
    ctx.fillStyle = BROTHS[bowl.broth].color;
    ctx.beginPath();
    ctx.ellipse(0, -4, 29, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    // Noodle swirls
    if (bowl.noodles) {
      ctx.strokeStyle = bowl.noodles === 'perfect' ? '#ffe9a8' : '#d9c07a';
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(-12 + i * 12, -4, 6, 0.3, Math.PI * 1.6);
        ctx.stroke();
      }
    }
    // Toppings as coloured dots on the broth
    const spots = [[-18, -8], [0, -10], [18, -8], [-8, -2], [10, -2]];
    bowl.toppings.forEach((t, i) => {
      const [sx, sy] = spots[i % spots.length];
      ctx.fillStyle = TOPPINGS[t].color;
      ctx.beginPath();
      ctx.arc(sx, sy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  } else {
    ctx.fillStyle = '#e8e2d4';
    ctx.beginPath();
    ctx.ellipse(0, -4, 29, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawTicket(ctx, ticket, x, y, w, h) {
  const frac = Math.max(0, ticket.patience / ticket.max);
  const urgent = frac < 0.25;
  ctx.save();
  ctx.fillStyle = '#fff8e7';
  ctx.strokeStyle = urgent ? '#ff5c5c' : '#c9a86a';
  ctx.lineWidth = urgent ? 3 : 2;
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();
  if (urgent) {
    // Pulsing red corner badge — the ticket is about to walk out.
    ctx.fillStyle = Math.floor(performance.now() / 300) % 2 === 0 ? '#ff5c5c' : '#c0392b';
    ctx.beginPath();
    ctx.arc(x + w - 14, y + 14, 10, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, '!', x + w - 14, y + 14, 14, '#fff');
  }
  // Perforation
  ctx.strokeStyle = '#d9c9a3';
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  ctx.moveTo(x + 8, y + 26);
  ctx.lineTo(x + w - 8, y + 26);
  ctx.stroke();
  ctx.setLineDash([]);
  text(ctx, `#${ticket.id} ${ticket.name}`, x + w / 2, y + 14, 13, '#3a2a18');
  // Broth: dark name + a coloured dot, so pale broths stay readable.
  ctx.fillStyle = BROTHS[ticket.broth].color;
  ctx.beginPath();
  ctx.arc(x + 16, y + 42, 6, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, BROTHS[ticket.broth].name, x + 26, y + 42, 12, '#3a2a18', 'left');
  // Topping chips
  let tx = x + 10;
  for (const t of ticket.toppings) {
    ctx.fillStyle = TOPPINGS[t].color;
    ctx.beginPath();
    ctx.arc(tx + 7, y + 62, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.stroke();
    tx += 20;
  }
  text(ctx, `${Math.ceil(ticket.patience)}s`, x + w - 10, y + 62, 13, urgent ? '#c0392b' : '#3a2a18', 'right');
  // Patience bar
  ctx.fillStyle = '#e0d5bd';
  roundRect(ctx, x + 10, y + h - 12, w - 20, 6, 3);
  ctx.fill();
  ctx.fillStyle = frac > 0.5 ? '#7bc96f' : frac > 0.25 ? '#ffd23f' : '#ff5c5c';
  if (w - 20 > 4) {
    roundRect(ctx, x + 10, y + h - 12, Math.max(4, (w - 20) * frac), 6, 3);
    ctx.fill();
  }
  ctx.restore();
}

function drawChef(ctx, chef, bowl) {
  const { x, y, dir } = chef;
  const bob = chef.walking ? Math.sin(performance.now() / 90) * 2 : 0;
  ctx.save();
  ctx.translate(x, y + bob);
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 34, 26, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body: indigo happi coat + white apron
  ctx.fillStyle = '#2c3f6e';
  roundRect(ctx, -18, -6, 36, 40, 10);
  ctx.fill();
  ctx.fillStyle = '#f2ede0';
  roundRect(ctx, -12, 2, 24, 32, 6);
  ctx.fill();
  ctx.fillStyle = '#c0392b';
  ctx.fillRect(-18, 8, 36, 4);
  // Head + hachimaki
  ctx.fillStyle = '#f2c89b';
  ctx.beginPath();
  ctx.arc(0, -20, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e63946';
  ctx.fillRect(-14, -30, 28, 6);
  ctx.fillStyle = '#e63946';
  ctx.beginPath();
  ctx.moveTo(14 * dir, -28);
  ctx.lineTo(14 * dir + 12 * dir, -22);
  ctx.lineTo(14 * dir + 12 * dir, -30);
  ctx.closePath();
  ctx.fill();
  // Eyes
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(-5, -20, 1.8, 0, Math.PI * 2);
  ctx.arc(5, -20, 1.8, 0, Math.PI * 2);
  ctx.fill();
  // Carried bowl, held out to the chef's side so it reads as a bowl, not a hat.
  if (bowl) drawBowl(ctx, dir * 26, 10, bowl, 0.7);
  ctx.restore();
}

function drawSteam(ctx, game) {
  for (const p of game.steam) {
    ctx.fillStyle = `rgba(230,235,255,${p.a})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawStation(ctx, st, game) {
  const y = 170;
  const h = 130;
  const near = Math.abs(game.chef.x - st.cx) < 90 && game.chef.y < 420;
  ctx.save();
  // Counter block
  ctx.fillStyle = '#4a2f1d';
  roundRect(ctx, st.x, y, st.w, h, 10);
  ctx.fill();
  ctx.fillStyle = '#6b4426';
  roundRect(ctx, st.x, y, st.w, 14, 10);
  ctx.fill();
  if (near) {
    ctx.strokeStyle = '#ffd23f';
    ctx.lineWidth = 3;
    roundRect(ctx, st.x - 3, y - 3, st.w + 6, h + 6, 12);
    ctx.stroke();
  }
  if (st.id === 'bowls') {
    for (let i = 0; i < 3; i++) drawBowl(ctx, st.cx, y + 42 + i * 26, null, 0.55);
    text(ctx, 'BOWLS', st.cx, y + 112, 12, '#ffd9a0');
  } else if (st.broth) {
    const b = BROTHS[st.broth];
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.ellipse(st.cx, y + 62, 38, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.ellipse(st.cx, y + 58, 32, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c9a86a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(st.cx + 10, y + 40);
    ctx.lineTo(st.cx + 26, y + 22);
    ctx.stroke();
    text(ctx, st.label, st.cx, y + 112, 12, '#ffd9a0');
  } else if (st.id === 'noodles') {
    ctx.fillStyle = '#3a3f4a';
    roundRect(ctx, st.x + 12, y + 30, st.w - 24, 56, 8);
    ctx.fill();
    ctx.fillStyle = '#7fb3d5';
    roundRect(ctx, st.x + 18, y + 36, st.w - 36, 44, 6);
    ctx.fill();
    ctx.strokeStyle = '#ffe9a8';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(st.cx - 20 + i * 20, y + 58, 8, 0.3, Math.PI * 1.5);
      ctx.stroke();
    }
    text(ctx, game.noodle ? 'PULL! [E]' : 'NOODLES [E]', st.cx, y + 112, 12, '#ffd9a0');
  } else if (st.topping) {
    const t = TOPPINGS[st.topping];
    ctx.fillStyle = '#2b2b33';
    roundRect(ctx, st.x + 4, y + 34, st.w - 8, 52, 8);
    ctx.fill();
    ctx.fillStyle = t.color;
    ctx.beginPath();
    ctx.arc(st.cx, y + 60, 16, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, t.emoji, st.cx, y + 60, 15, '#fff');
    text(ctx, st.label, st.cx, y + 112, 11, '#ffd9a0');
  } else if (st.id === 'serve') {
    ctx.fillStyle = '#7a1f1f';
    roundRect(ctx, st.x + 8, y + 8, st.w - 16, 44, 8);
    ctx.fill();
    text(ctx, '🔔 SERVE', st.cx, y + 30, 15, '#ffd23f');
    // Ready bowl on the pass
    if (game.readyBowl) drawBowl(ctx, st.cx, y + 78, game.readyBowl, 0.8);
    else {
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.font = 'bold 12px "Trebuchet MS", Verdana, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('pass is empty', st.cx, y + 78);
    }
    text(ctx, '[E] serve', st.cx, y + 112, 12, '#ffd9a0');
  }
  ctx.restore();
}

function drawNoodleBar(ctx, game) {
  if (!game.noodle) return;
  const n = game.noodle;
  const x = 440, y = 560, w = 400, h = 54;
  ctx.save();
  ctx.fillStyle = 'rgba(10,12,28,0.92)';
  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = '#ffd23f';
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 10);
  ctx.stroke();
  text(ctx, 'PERFECT PULL — press E in the green!', x + w / 2, y + 14, 14, '#ffd23f');
  // Track
  ctx.fillStyle = '#333a55';
  roundRect(ctx, x + 16, y + 28, w - 32, 12, 6);
  ctx.fill();
  // Green perfect zone
  ctx.fillStyle = '#7bc96f';
  roundRect(ctx, x + 16 + (w - 32) * 0.45, y + 28, (w - 32) * 0.17, 12, 6);
  ctx.fill();
  // Needle
  const nx = x + 16 + (w - 32) * n.needle;
  ctx.fillStyle = '#fff';
  ctx.fillRect(nx - 2, y + 24, 4, 20);
  ctx.restore();
}

function drawHud(ctx, game) {
  // Shift timer — big, top centre-right, you can feel it
  const mins = Math.floor(game.shiftLeft / 60);
  const secs = Math.floor(game.shiftLeft % 60);
  const low = game.shiftLeft < 30;
  text(ctx, `SHIFT ${mins}:${String(secs).padStart(2, '0')}`, 640, 132, 26, low ? '#ff5c5c' : '#ffd23f');
  // Shift progress bar
  ctx.fillStyle = '#333a55';
  roundRect(ctx, 480, 146, 320, 8, 4);
  ctx.fill();
  ctx.fillStyle = low ? '#ff5c5c' : '#ffd23f';
  roundRect(ctx, 480, 146, 320 * (game.shiftLeft / SHIFT_LENGTH), 8, 4);
  ctx.fill();
  text(ctx, `SCORE ${game.score}`, 90, 132, 22, '#fff', 'left');
  text(ctx, `SERVED ${game.orders.served}   COMBO x${Math.max(1, game.orders.combo)}`, 1190, 132, 18, '#7bc96f', 'right');
  // Carried-bowl summary, bottom centre — clear of the sink (bottom left).
  if (game.bowl) {
    ctx.fillStyle = 'rgba(10,12,28,0.85)';
    roundRect(ctx, 430, 716, 420, 44, 10);
    ctx.fill();
    text(ctx, `🍜 ${bowlSummary(game.bowl)}`, 446, 738, 16, '#ffe9a8', 'left');
  }
  // Controls hint
  text(ctx, 'WASD / arrows move • E interact • click a station to walk there • M mute', 640, 786, 13, 'rgba(255,255,255,0.55)');
  // Toasts: pill banners low on the floor, clear of the counter.
  game.toasts.forEach((t, i) => {
    ctx.globalAlpha = Math.max(0, 1 - t.t / 3);
    const ty = 636 + i * 30;
    ctx.fillStyle = 'rgba(10,12,28,0.85)';
    ctx.font = 'bold 16px "Trebuchet MS", Verdana, sans-serif';
    const tw = ctx.measureText(t.text).width + 28;
    roundRect(ctx, 640 - tw / 2, ty - 14, tw, 28, 14);
    ctx.fill();
    text(ctx, t.text, 640, ty, 16, t.color);
    ctx.globalAlpha = 1;
  });
  // Sink label
  text(ctx, 'SINK — dump a bad bowl [E]', SINK.cx, SINK.y - 14, 12, '#9fb3d5');
}

function drawTitle(ctx, game) {
  ctx.fillStyle = 'rgba(8,10,24,0.82)';
  ctx.fillRect(0, 0, W, H);
  text(ctx, '🌙', 640, 150, 64, '#ffd23f');
  text(ctx, 'MIDNIGHT RAMEN BAR', 640, 230, 52, '#ffd23f');
  text(ctx, 'a late-night ramen shop', 640, 275, 20, '#ffe9a8');
  drawBowl(ctx, 640, 350, { broth: 'tonkotsu', noodles: 'perfect', toppings: ['chashu', 'egg', 'nori'] }, 1.6);
  const lines = [
    'Tickets come in on the rail. Build each bowl to match:',
    '1. Grab a bowl   2. Fill the right broth   3. Time the PERFECT PULL on the noodles',
    '4. Add the toppings   5. Ring the bell at SERVE before the ticket walks out.',
    'Wrong broth? Dump it in the sink. Fast serves and perfect pulls pay more.',
  ];
  lines.forEach((l, i) => text(ctx, l, 640, 440 + i * 30, 17, '#fff'));
  text(ctx, 'WASD / arrows + E  •  or click a station', 640, 600, 17, '#ffd23f');
  if (Math.floor(performance.now() / 500) % 2 === 0) {
    text(ctx, 'Press ENTER or click to open the shop', 640, 660, 22, '#7bc96f');
  }
  text(ctx, '180-second shift • top scores win the night', 640, 700, 14, 'rgba(255,255,255,0.6)');
}

function drawGameOver(ctx, game) {
  ctx.fillStyle = 'rgba(8,10,24,0.85)';
  ctx.fillRect(0, 0, W, H);
  text(ctx, '🌙 SHIFT OVER', 640, 220, 46, '#ffd23f');
  text(ctx, `Score: ${game.score}`, 640, 300, 30, '#fff');
  text(ctx, `Bowls served: ${game.orders.served}    Walked out: ${game.orders.lost}    Best combo: x${game.orders.bestCombo}`, 640, 350, 20, '#ffe9a8');
  const verdict = game.score >= 1500 ? 'The regulars are chanting your name. Legendary night!'
    : game.score >= 900 ? 'A fine night at the bar. The lanterns approve.'
    : game.score >= 400 ? 'A decent shift — the broth could be bolder.'
    : 'A quiet night. The noodles forgive you. Try again.';
  text(ctx, verdict, 640, 400, 18, '#7bc96f');
  if (Math.floor(performance.now() / 500) % 2 === 0) {
    text(ctx, 'Press R to work another shift', 640, 480, 22, '#ffd23f');
  }
}

export function render(ctx, game) {
  // Night sky + wall
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#141a33');
  grad.addColorStop(0.55, '#1d2340');
  grad.addColorStop(1, '#0d1020');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Ticket rail
  ctx.fillStyle = '#2a1f14';
  ctx.fillRect(0, 0, W, 112);
  ctx.fillStyle = '#6b4426';
  ctx.fillRect(0, 108, W, 6);
  text(ctx, '🎫 TICKETS', 72, 24, 14, '#ffd9a0', 'left');
  if (game.orders.tickets.length === 0) {
    text(ctx, 'No tickets — the night is young…', 640, 62, 16, 'rgba(255,255,255,0.6)');
  }
  game.orders.tickets.forEach((t, i) => drawTicket(ctx, t, 280 + i * 235, 12, 220, 88));
  // Paper lanterns hang at the rail's ends, clear of the tickets.
  for (const [lx, lc] of [[36, '#ff5c5c'], [1244, '#ff8c42']]) {
    ctx.fillStyle = lc;
    ctx.beginPath();
    ctx.ellipse(lx, 62, 17, 21, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,210,63,0.9)';
    ctx.fillRect(lx - 2, 36, 4, 8);
    text(ctx, '🍜', lx, 62, 13, '#fff');
  }

  // Floor: dark wood + a red runner down the middle + bar stools.
  ctx.fillStyle = '#241a12';
  ctx.fillRect(0, 300, W, H - 300);
  ctx.fillStyle = '#2e2115';
  for (let y = 340; y < H; y += 60) ctx.fillRect(0, y, W, 2);
  ctx.fillStyle = '#332016';
  ctx.fillRect(618, 300, 44, H - 300);
  ctx.fillStyle = '#3d2418';
  ctx.fillRect(622, 300, 36, H - 300);
  for (const sx of [300, 980]) {
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(sx - 3, 720, 6, 50);
    ctx.fillStyle = '#6b4426';
    ctx.beginPath();
    ctx.ellipse(sx, 718, 34, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Stations along the counter
  for (const st of STATIONS) drawStation(ctx, st, game);

  // Sink
  ctx.fillStyle = '#3a3f4a';
  roundRect(ctx, SINK.x, SINK.y, SINK.w, SINK.h, 10);
  ctx.fill();
  ctx.fillStyle = '#7fb3d5';
  roundRect(ctx, SINK.x + 10, SINK.y + 10, SINK.w - 20, SINK.h - 20, 8);
  ctx.fill();

  drawSteam(ctx, game);
  drawChef(ctx, game.chef, game.bowl);
  drawNoodleBar(ctx, game);
  drawHud(ctx, game);

  if (game.servedFlash > 0) {
    ctx.fillStyle = `rgba(123,201,111,${Math.min(0.25, game.servedFlash * 0.2)})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (game.walkoutFlash > 0) {
    ctx.fillStyle = `rgba(255,92,92,${Math.min(0.25, game.walkoutFlash * 0.2)})`;
    ctx.fillRect(0, 0, W, H);
  }

  if (game.phase === 'title') drawTitle(ctx, game);
  if (game.phase === 'over') drawGameOver(ctx, game);
}
