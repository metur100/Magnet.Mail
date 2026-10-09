import { describe, expect, it } from 'vitest';

import { PARCEL_TYPES } from '../src/game/physics/ParcelBody';
import { run, runnerFor } from './helpers';

const restY = (top: number) => top - PARCEL_TYPES.box.radius - 2;

describe('Mailbox delivery', () => {
  it('a parcel resting inside the correct mailbox is delivered', () => {
    const r = runnerFor({ start: { x: 600, y: restY(940) - 30 }, mailbox: { x: 600, y: 940 } });
    run(r, 2);
    expect(r.state.status).toBe('delivered');
    expect(r.getResult()?.success).toBe(true);
  });

  it('a fast parcel passing through does not count', () => {
    const r = runnerFor({ start: { x: 600, y: 860 }, mailbox: { x: 600, y: 940 } });
    r.state.vx = 900;
    r.stepOnce();
    r.stepOnce();
    expect(r.state.status).toBe('flying');
  });

  it('needs to stay inside for a moment', () => {
    const r = runnerFor({ start: { x: 600, y: restY(940) }, mailbox: { x: 600, y: 940 } });
    run(r, 0.1);
    expect(r.state.status).toBe('flying');
    run(r, 0.5);
    expect(r.state.status).toBe('delivered');
  });
});

describe('Wrong mailbox', () => {
  it('pushes the parcel back out and counts a penalty', () => {
    const r = runnerFor({ start: { x: 330, y: restY(940) - 20 }, decoys: [{ x: 330, y: 940 }], mailbox: { x: 620, y: 940 } });
    run(r, 0.3);
    expect(r.state.wrongCount).toBe(1);
    expect(r.state.status).toBe('flying');
    expect(r.state.vy).toBeLessThan(0);
  });

  it('fails immediately when the level says so', () => {
    const r = runnerFor({ start: { x: 330, y: restY(940) - 20 }, decoys: [{ x: 330, y: 940 }], wrongFails: true });
    run(r, 0.5);
    expect(r.state.failReason).toBe('wrong');
  });

  it('the penalty lowers the score of a later delivery', () => {
    const r = runnerFor({ start: { x: 600, y: restY(940) - 30 }, mailbox: { x: 600, y: 940 } });
    r.state.wrongCount = 1;
    run(r, 2);
    const clean = runnerFor({ start: { x: 600, y: restY(940) - 30 }, mailbox: { x: 600, y: 940 } });
    run(clean, 2);
    expect(r.getResult()!.breakdown.score).toBe(clean.getResult()!.breakdown.score - 80);
  });
});
