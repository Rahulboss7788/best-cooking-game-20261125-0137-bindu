// Midnight Ramen Bar — menu data: broths, toppings and the ticket recipes.
// One clear job: everything the kitchen can serve, and nothing else.

export const BROTHS = {
  shoyu:   { id: 'shoyu',   name: 'Shoyu',       color: '#8a5a2b', steam: '#d9a05b', desc: 'Clear soy broth' },
  tonkotsu:{ id: 'tonkotsu',name: 'Tonkotsu',    color: '#e8d9b0', steam: '#f5eeda', desc: 'Rich pork broth' },
  spicy:   { id: 'spicy',   name: 'Spicy Miso',  color: '#c0392b', steam: '#ff7a5c', desc: 'Chilli miso broth' },
};

export const TOPPINGS = {
  chashu:   { id: 'chashu',   name: 'Chashu',   color: '#d98a6a', emoji: '🥩' },
  egg:      { id: 'egg',      name: 'Ajitama',  color: '#f7e08b', emoji: '🥚' },
  nori:     { id: 'nori',     name: 'Nori',     color: '#2e5d3a', emoji: '🟩' },
  naruto:   { id: 'naruto',   name: 'Naruto',   color: '#f2f2f2', emoji: '🌀' },
  scallion: { id: 'scallion', name: 'Scallion', color: '#7bc96f', emoji: '🌿' },
  corn:     { id: 'corn',     name: 'Corn',     color: '#ffd23f', emoji: '🌽' },
};

export const TOPPING_ORDER = ['chashu', 'egg', 'nori', 'naruto', 'scallion', 'corn'];

// Named house bowls — the ticket generator mixes these with freestyle orders.
export const HOUSE_BOWLS = [
  { name: 'Midnight Classic', broth: 'shoyu',    toppings: ['chashu', 'egg', 'nori'] },
  { name: 'Lantern Tonkotsu', broth: 'tonkotsu', toppings: ['chashu', 'scallion', 'corn'] },
  { name: 'Red Alley Fire',   broth: 'spicy',    toppings: ['egg', 'naruto', 'scallion'] },
  { name: 'Last Train',       broth: 'shoyu',    toppings: ['naruto', 'corn', 'nori'] },
  { name: 'Neon Pork',        broth: 'tonkotsu', toppings: ['chashu', 'egg', 'scallion'] },
  { name: '2AM Special',      broth: 'spicy',    toppings: ['chashu', 'naruto', 'corn'] },
];

export function randomTicket(rng, id) {
  const pick = HOUSE_BOWLS[Math.floor(rng() * HOUSE_BOWLS.length)];
  // 1 in 4 tickets is a freestyle order: random broth + 2-3 random toppings.
  if (rng() < 0.25) {
    const brothIds = Object.keys(BROTHS);
    const broth = brothIds[Math.floor(rng() * brothIds.length)];
    const shuffled = [...TOPPING_ORDER].sort(() => rng() - 0.5);
    const n = 2 + Math.floor(rng() * 2);
    return { id, name: 'Freestyle', broth, toppings: shuffled.slice(0, n), patience: 75, max: 75 };
  }
  return { id, name: pick.name, broth: pick.broth, toppings: [...pick.toppings], patience: 75, max: 75 };
}

export function ticketBaseReward(ticket) {
  return 80 + ticket.toppings.length * 20;
}
