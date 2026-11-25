// Midnight Ramen Bar — orders: ticket rail, spawning, patience and serving.
// One clear job: the order queue and the score it pays out.

import { randomTicket, ticketBaseReward } from './recipes.js';

export function createOrderBook() {
  return { tickets: [], nextId: 1, spawnIn: 1.5, served: 0, lost: 0, combo: 0, bestCombo: 0 };
}

export function spawnTicket(book, rng) {
  if (book.tickets.length >= 4) return null;
  const ticket = randomTicket(rng, book.nextId++);
  book.tickets.push(ticket);
  return ticket;
}

// Returns 'lost' ticket ids that walked out this tick.
export function updateOrders(book, dt, elapsed, rng) {
  const lost = [];
  const interval = elapsed > 90 ? 13 : 16;
  book.spawnIn -= dt;
  if (book.spawnIn <= 0) {
    spawnTicket(book, rng);
    book.spawnIn = interval;
  }
  for (const t of book.tickets) t.patience -= dt;
  for (let i = book.tickets.length - 1; i >= 0; i--) {
    if (book.tickets[i].patience <= 0) {
      lost.push(book.tickets[i].id);
      book.tickets.splice(i, 1);
      book.lost += 1;
      book.combo = 0;
    }
  }
  return lost;
}

// Does this bowl satisfy the ticket? Broth must match, noodles must be in,
// every required topping must be present. Extra toppings are allowed but cost.
export function bowlMatchesTicket(bowl, ticket) {
  if (!bowl || !bowl.broth || !bowl.noodles) return false;
  if (bowl.broth !== ticket.broth) return false;
  return ticket.toppings.every((t) => bowl.toppings.includes(t));
}

export function findMatchingTicket(book, bowl) {
  return book.tickets.find((t) => bowlMatchesTicket(bowl, t)) ?? null;
}

// Serve a matching bowl. Returns the points earned, or 0 when nothing matches.
export function serveBowl(book, bowl) {
  const ticket = findMatchingTicket(book, bowl);
  if (!ticket) return { points: 0, ticket: null };
  const extra = bowl.toppings.filter((t) => !ticket.toppings.includes(t)).length;
  let points = ticketBaseReward(ticket);
  points += Math.round(ticket.patience * 0.8); // serve fast, earn more
  if (bowl.noodles === 'perfect') points += 25;
  if (bowl.noodles === 'under') points -= 10;
  if (bowl.noodles === 'over') points -= 15;
  points -= extra * 10;
  points = Math.max(20, points);
  book.combo += 1;
  book.bestCombo = Math.max(book.bestCombo, book.combo);
  if (book.combo >= 2) points = Math.round(points * (1 + 0.1 * Math.min(book.combo - 1, 5)));
  book.tickets = book.tickets.filter((t) => t.id !== ticket.id);
  book.served += 1;
  return { points, ticket, combo: book.combo, perfect: bowl.noodles === 'perfect' };
}

// The next tickets after the active rail — the planning preview.
export function queuePreview(book) {
  return book.tickets.map((t) => t.name);
}
