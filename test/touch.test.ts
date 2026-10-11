import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TouchGestures } from '../src/tools/touch';

function setup() {
  const log: string[] = [];
  const timers: (() => void)[] = [];
  const g = new TouchGestures(
    {
      down: (p, b) => log.push(`down ${p.x},${p.y} b${b}`),
      move: (p) => log.push(`move ${p.x},${p.y}`),
      up: (p) => log.push(`up ${p.x},${p.y}`),
      pinch: (c, f, dx, dy) => log.push(`pinch ${c.x},${c.y} x${f} ${dx},${dy}`),
    },
    (f) => {
      timers.push(f);
      return timers.length as unknown as ReturnType<typeof setTimeout>;
    },
    () => {},
  );
  return { g, log, fire: () => timers.forEach((f) => f()) };
}

test('prekja: trokitja jep klikim të plotë vetëm kur ngrihet gishti', () => {
  const { g, log } = setup();
  g.down(1, { x: 10, y: 10 });
  assert.deepEqual(log, ['move 10,10']);
  g.up(1, { x: 12, y: 10 });
  assert.deepEqual(log, ['move 10,10', 'down 10,10 b0', 'move 12,10', 'up 12,10']);
});

test('prekja: gishti që lëviz bëhet tërheqje', () => {
  const { g, log } = setup();
  g.down(1, { x: 0, y: 0 });
  g.move(1, { x: 3, y: 0 });
  assert.equal(log.length, 1);
  g.move(1, { x: 30, y: 0 });
  assert.deepEqual(log.slice(1), ['down 0,0 b0', 'move 30,0']);
});

test('prekja: gishti i dytë para klikimit zhvendos dhe zmadhon pa vizatuar', () => {
  const { g, log, fire } = setup();
  g.down(1, { x: 0, y: 0 });
  g.down(2, { x: 100, y: 0 });
  g.move(2, { x: 200, y: 0 });
  g.up(1, { x: 0, y: 0 });
  g.up(2, { x: 200, y: 0 });
  fire();
  assert.deepEqual(log, ['move 0,0', 'pinch 100,0 x2 50,0']);
});

test('prekja: mbajtja e gishtit vlen si klik i djathtë', () => {
  const { g, log, fire } = setup();
  g.down(1, { x: 5, y: 5 });
  fire();
  g.up(1, { x: 5, y: 5 });
  assert.deepEqual(log, ['move 5,5', 'down 5,5 b2']);
});
