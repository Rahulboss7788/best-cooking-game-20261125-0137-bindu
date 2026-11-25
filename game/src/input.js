// Midnight Ramen Bar — input: keyboard and mouse, translated to game actions.
// One clear job: read the player's keys and clicks, nothing else.

export function createInput(canvas) {
  const input = {
    keys: new Set(),
    pressed: new Set(), // keys pressed since last consume (edge-triggered)
    click: null, // {x, y} in canvas logical coords, consumed by main loop
    moveTarget: null,
  };

  const KEYMAP = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    KeyE: 'interact', Space: 'interact',
    Enter: 'start', KeyR: 'restart', KeyM: 'mute',
  };

  window.addEventListener('keydown', (e) => {
    const action = KEYMAP[e.code];
    if (!action) return;
    if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    if (!e.repeat) {
      input.keys.add(action);
      input.pressed.add(action);
    }
  });
  window.addEventListener('keyup', (e) => {
    const action = KEYMAP[e.code];
    if (action) input.keys.delete(action);
  });

  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 1280;
    const y = ((e.clientY - rect.top) / rect.height) * 800;
    input.click = { x, y };
    input.moveTarget = { x, y };
  });

  return input;
}

export function consumePressed(input, action) {
  if (input.pressed.has(action)) {
    input.pressed.delete(action);
    return true;
  }
  return false;
}

export function clearPressed(input) {
  input.pressed.clear();
}
