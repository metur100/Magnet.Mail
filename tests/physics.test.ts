import { describe, expect, it } from 'vitest';

import { ground } from '../src/game/levels/LevelData';
import { circleVsBox, circleVsCapsule, circleVsCircle, createContact, segmentHitsBox } from '../src/game/physics/CollisionSystem';
import { PARCEL_TYPES } from '../src/game/physics/ParcelBody';
import { run, runnerFor } from './helpers';

describe('Collision detection', () => {
  const c = createContact();

  it('circle vs box: outside, touching and inside', () => {
    expect(circleVsBox(0, -50, 20, 0, 0, 40, 20, 1, 0, c)).toBe(false);
    expect(circleVsBox(0, -35, 20, 0, 0, 40, 20, 1, 0, c)).toBe(true);
    expect(c.ny).toBeCloseTo(-1);
    expect(c.depth).toBeCloseTo(5);
    expect(circleVsBox(30, 0, 10, 0, 0, 40, 20, 1, 0, c)).toBe(true);
    expect(c.nx).toBe(1);
  });

  it('circle vs rotated box', () => {
    const a = Math.PI / 4;
    expect(circleVsBox(0, -45, 10, 0, 0, 40, 5, Math.cos(a), Math.sin(a), c)).toBe(false);
    expect(circleVsBox(20, 20, 10, 0, 0, 40, 5, Math.cos(a), Math.sin(a), c)).toBe(true);
  });

  it('circle vs circle and capsule', () => {
    expect(circleVsCircle(0, 0, 10, 25, 0, 10, c)).toBe(false);
    expect(circleVsCircle(0, 0, 10, 15, 0, 10, c)).toBe(true);
    expect(c.nx).toBeCloseTo(-1);
    expect(circleVsCapsule(50, 12, 5, 0, 0, 100, 0, 10, c)).toBe(true);
    expect(circleVsCapsule(50, 30, 5, 0, 0, 100, 0, 10, c)).toBe(false);
  });

  it('segment vs box (magnetic barrier line of sight)', () => {
    expect(segmentHitsBox(0, 0, 100, 0, 50, 0, 5, 50, 1, 0)).toBe(true);
    expect(segmentHitsBox(0, 100, 100, 100, 50, 0, 5, 50, 1, 0)).toBe(false);
  });
});

describe('Parcel motion', () => {
  it('rests on the ground under gravity', () => {
    const r = run(runnerFor({ start: { x: 300, y: 700 } }), 3);
    expect(r.state.y).toBeCloseTo(940 - PARCEL_TYPES.box.radius, 0);
    expect(Math.abs(r.state.vy)).toBeLessThan(1);
    expect(r.state.grounded).toBe(true);
  });

  it('never exceeds its maximum speed', () => {
    const r = runnerFor({ parcel: 'envelope', gravity: 5000, start: { x: 360, y: 100 }, obstacles: [] });
    let max = 0;
    for (let i = 0; i < 120; i++) {
      r.stepOnce();
      max = Math.max(max, Math.hypot(r.state.vx, r.state.vy));
    }
    expect(max).toBeLessThanOrEqual(PARCEL_TYPES.envelope.maxSpeed + 1e-6);
  });

  it('attraction pulls the parcel towards the blue magnet', () => {
    const r = run(runnerFor({ parcel: 'envelope', attractor: { x: 500, y: 600 } }), 0.6, { attract: true });
    expect(r.state.x).toBeGreaterThan(260);
    expect(r.state.y).toBeLessThan(910);
    expect(r.state.impulses).toBe(1);
  });

  it('repulsion pushes the parcel away from the red magnet', () => {
    const r = runnerFor({ repeller: { x: 140, y: 962 } });
    run(r, 0.02, { repel: true });
    run(r, 0.4);
    expect(r.state.x).toBeGreaterThan(240);
    expect(r.state.impulses).toBe(1);
  });

  it('heavier parcels move less under the same field', () => {
    const light = run(runnerFor({ parcel: 'envelope', start: { x: 200, y: 921 }, attractor: { x: 600, y: 900 } }), 0.4, { attract: true });
    const heavy = run(runnerFor({ parcel: 'crate', start: { x: 200, y: 911 }, attractor: { x: 600, y: 900 } }), 0.4, { attract: true });
    expect(light.state.x - 200).toBeGreaterThan((heavy.state.x - 200) * 2);
  });

  it('bounces off soft bumpers', () => {
    const r = runnerFor({ parcel: 'bouncy', start: { x: 360, y: 400 }, obstacles: [ground(), { type: 'bumper', x: 360, y: 600, r: 40 }] });
    let bounced = false;
    for (let i = 0; i < 240 && !bounced; i++) {
      r.stepOnce();
      if (r.state.vy < -200) bounced = true;
    }
    expect(bounced).toBe(true);
  });

  it('a conveyor carries a resting parcel', () => {
    const r = run(runnerFor({ obstacles: [ground(), { type: 'conveyor', x: 300, y: 946, w: 400, h: 24, speed: 150 }] }), 1.5);
    expect(r.state.x).toBeGreaterThan(300);
  });

  it('moving platforms carry the parcel', () => {
    const r = runnerFor({
      start: { x: 300, y: 500 },
      obstacles: [ground(), { type: 'platform', x: 300, y: 560, w: 200, h: 24, dx: 0, dy: -200, period: 4, motion: 'sine' }],
    });
    run(r, 2);
    expect(r.state.y).toBeLessThan(500);
  });

  it('one-way gates let the parcel pass one way only', () => {
    const pass = runnerFor({ start: { x: 360, y: 600 }, gravity: 600, obstacles: [ground(), { type: 'oneway', x: 360, y: 760, w: 200, h: 14, allowX: 0, allowY: 1 }] });
    run(pass, 2);
    expect(pass.state.y).toBeGreaterThan(800);
    const block = runnerFor({ start: { x: 360, y: 600 }, gravity: 600, obstacles: [ground(), { type: 'oneway', x: 360, y: 760, w: 200, h: 14, allowX: 0, allowY: -1 }] });
    run(block, 2);
    expect(block.state.y).toBeLessThan(760);
  });

  it('magnetic barriers block the field', () => {
    const r = runnerFor({ attractor: { x: 600, y: 900 }, obstacles: [ground(), { type: 'barrier', x: 400, y: 800, w: 20, h: 300 }] });
    expect(r.world.fieldBlocked(200, 916, 600, 900)).toBe(true);
    run(r, 0.5, { attract: true });
    expect(r.state.x).toBeCloseTo(200, 0);
  });

  it('teleporters move the parcel to the other end', () => {
    const r = runnerFor({ start: { x: 200, y: 700 }, obstacles: [ground(), { type: 'teleporter', ax: 200, ay: 760, bx: 600, by: 300 }] });
    run(r, 0.5);
    expect(r.state.x).toBeCloseTo(600, 0);
  });
});

describe('Damage and reset rules', () => {
  it('spikes destroy the parcel', () => {
    const r = run(runnerFor({ start: { x: 360, y: 700 }, obstacles: [ground(), { type: 'spikes', x: 360, y: 926, w: 200, h: 24 }] }), 2);
    expect(r.state.status).toBe('failed');
    expect(r.state.failReason).toBe('spikes');
  });

  it('falling out of the course fails', () => {
    const r = run(runnerFor({ obstacles: [] }), 3);
    expect(r.state.failReason).toBe('out');
  });

  it('a hard impact breaks fragile glass but not a crate', () => {
    const drop = (parcel: 'glass' | 'crate') => run(runnerFor({ parcel, gravity: 3000, start: { x: 360, y: 100 } }), 3);
    const glass = drop('glass');
    expect(glass.state.damage).toBeGreaterThan(0);
    expect(drop('crate').state.status).toBe('flying');
    // Two more hard drops break the glass completely.
    const r = runnerFor({ parcel: 'glass', gravity: 3000, start: { x: 360, y: 100 } });
    r.state.damage = 90;
    run(r, 3);
    expect(r.state.failReason).toBe('broken');
  });

  it('a train hitting the parcel fails the level', () => {
    const r = run(
      runnerFor({ obstacles: [ground(), { type: 'train', y: 900, w: 300, h: 70, from: -300, to: 1000, speed: 600, period: 3 }] }),
      2,
    );
    expect(r.state.failReason).toBe('train');
  });

  it('too many collisions fail when the level limits them', () => {
    const r = runnerFor({ parcel: 'bouncy', maxCollisions: 2, start: { x: 360, y: 300 } });
    run(r, 6);
    expect(r.state.failReason).toBe('collisions');
  });

  it('running out of impulses while stuck fails', () => {
    const r = runnerFor({ impulseLimit: 1, repeller: { x: 140, y: 962 } });
    run(r, 0.02, { repel: true });
    run(r, 6);
    expect(r.state.failReason).toBe('impulses');
  });

  it('the timer runs out', () => {
    const r = run(runnerFor({ timeLimit: 1 }), 2);
    expect(r.state.failReason).toBe('time');
  });
});
