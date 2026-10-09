import { describe, expect, it } from 'vitest';

import {
  BASE_FIELD,
  distanceFalloff,
  FALLOFF_DISTANCE,
  MAX_HOLD,
  MAX_MAGNETIC_ACCEL,
  magneticAcceleration,
  TAP_BOOST,
  TAP_PULSE,
  updateChannel,
} from '../src/game/physics/MagneticField';
import type { ChannelState } from '../src/game/physics/ParcelBody';

const out = new Float64Array(2);
const unlimited = { impulsesLeft: Infinity, energy: Infinity };
const channel = (): ChannelState => ({ pressed: false, level: 0, holdTime: 0, pulseLeft: 0, exhausted: false, blocked: false });

describe('Attraction force', () => {
  it('points from the parcel towards the attractor', () => {
    const a = magneticAcceleration(100, 500, 400, 500, 1, 1, 1, 1, 1, out);
    expect(a).toBeGreaterThan(0);
    expect(out[0]).toBeGreaterThan(0);
    expect(Math.abs(out[1])).toBeLessThan(1e-9);
  });

  it('follows force = strength · control · falloff / mass', () => {
    const d = 400;
    const a = magneticAcceleration(0, 0, d, 0, 1, 1, 0.5, 1, 1, out);
    expect(a).toBeCloseTo(BASE_FIELD * 0.5 * distanceFalloff(d), 6);
  });

  it('is zero when the control is off', () => {
    expect(magneticAcceleration(0, 0, 300, 0, 1, 0, 1, 1, 1, out)).toBe(0);
    expect(out[0]).toBe(0);
  });
});

describe('Repulsion force', () => {
  it('points away from the repeller', () => {
    magneticAcceleration(100, 500, 400, 500, -1, 1, 1, 1, 1, out);
    expect(out[0]).toBeLessThan(0);
    magneticAcceleration(500, 200, 500, 600, -1, 1, 1, 1, 1, out);
    expect(out[1]).toBeLessThan(0);
  });

  it('has the same size as attraction at the same distance', () => {
    const a = magneticAcceleration(0, 0, 300, 0, 1, 1, 1, 1, 1, out);
    const r = magneticAcceleration(0, 0, 300, 0, -1, 1, 1, 1, 1, out);
    expect(r).toBeCloseTo(a);
  });
});

describe('Distance falloff', () => {
  it('is 1 at the source, ½ at FALLOFF_DISTANCE and keeps decreasing', () => {
    expect(distanceFalloff(0)).toBe(1);
    expect(distanceFalloff(FALLOFF_DISTANCE)).toBeCloseTo(0.5);
    for (let d = 50; d < 1500; d += 50) expect(distanceFalloff(d + 50)).toBeLessThan(distanceFalloff(d));
  });

  it('never exceeds the acceleration cap, even right next to a magnet', () => {
    const a = magneticAcceleration(0, 0, 0.5, 0, 1, 1.4, 3, 2, 0.3, out);
    expect(a).toBeLessThanOrEqual(MAX_MAGNETIC_ACCEL);
  });
});

describe('Parcel mass and susceptibility', () => {
  it('heavier parcels accelerate less', () => {
    const light = magneticAcceleration(0, 0, 600, 0, 1, 1, 1, 1, 0.6, out);
    const heavy = magneticAcceleration(0, 0, 600, 0, 1, 1, 1, 1, 2.1, out);
    expect(heavy).toBeLessThan(light);
    expect(light / heavy).toBeCloseTo(2.1 / 0.6, 5);
  });

  it('magnetic parcels feel stronger fields', () => {
    const normal = magneticAcceleration(0, 0, 600, 0, 1, 1, 1, 1, 1, out);
    const magnetic = magneticAcceleration(0, 0, 600, 0, 1, 1, 1, 1.75, 1, out);
    expect(magnetic).toBeCloseTo(normal * 1.75, 5);
  });
});

describe('Control channel (tap / hold / decay)', () => {
  const dt = 1 / 120;

  it('a tap counts one impulse and keeps a boosted pulse alive', () => {
    const ch = channel();
    expect(updateChannel(ch, true, dt, unlimited)).toBe(true);
    updateChannel(ch, false, dt, unlimited);
    for (let i = 0; i < Math.floor((TAP_PULSE * 0.8) / dt); i++) updateChannel(ch, false, dt, unlimited);
    expect(ch.level).toBeGreaterThan(1);
    expect(ch.level).toBeLessThanOrEqual(TAP_BOOST * 1.01);
  });

  it('holding grows the force slightly, releasing decays it', () => {
    const ch = channel();
    for (let i = 0; i < 60; i++) updateChannel(ch, true, dt, unlimited);
    const early = ch.level;
    for (let i = 0; i < 150; i++) updateChannel(ch, true, dt, unlimited);
    expect(ch.level).toBeGreaterThan(early);
    for (let i = 0; i < 120; i++) updateChannel(ch, false, dt, unlimited);
    expect(ch.level).toBe(0);
  });

  it('stops after the maximum hold time until released', () => {
    const ch = channel();
    for (let t = 0; t < MAX_HOLD + 0.5; t += dt) updateChannel(ch, true, dt, unlimited);
    expect(ch.exhausted).toBe(true);
    expect(ch.level).toBeLessThan(0.2);
    updateChannel(ch, false, dt, unlimited);
    expect(updateChannel(ch, true, dt, unlimited)).toBe(true);
  });

  it('refuses presses without impulses or energy', () => {
    const ch = channel();
    expect(updateChannel(ch, true, dt, { impulsesLeft: 0, energy: Infinity })).toBe(false);
    expect(ch.blocked).toBe(true);
    for (let i = 0; i < 30; i++) updateChannel(ch, true, dt, { impulsesLeft: 0, energy: Infinity });
    expect(ch.level).toBe(0);
    const empty = channel();
    expect(updateChannel(empty, true, dt, { impulsesLeft: 5, energy: 0 })).toBe(false);
  });
});
