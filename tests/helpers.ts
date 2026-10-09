import { LevelRunner } from '../src/game/gameplay/LevelRunner';
import { ground, sides } from '../src/game/levels/LevelData';
import type { LevelDefinition } from '../src/game/levels/LevelDefinition';

/** A minimal open level: ground, magnets far away, mailbox in the bottom right. */
export function testLevel(overrides: Partial<LevelDefinition> = {}): LevelDefinition {
  return {
    id: 'test',
    index: -1,
    world: 0,
    name: 'Test',
    parcel: 'box',
    start: { x: 200, y: 916 },
    attractor: { x: 600, y: 200 },
    repeller: { x: 60, y: 962 },
    magnetStrength: 1,
    mailbox: { x: 600, y: 940 },
    obstacles: [ground(), ...sides()],
    timeLimit: 60,
    par: 2,
    ...overrides,
  };
}

/** Runs a level for `seconds` with fixed inputs; stops early when it finishes. */
export function run(runner: LevelRunner, seconds: number, input: { attract?: boolean; repel?: boolean } = {}): LevelRunner {
  const steps = Math.round(seconds * 120);
  for (let i = 0; i < steps && !runner.finished; i++) {
    runner.input.attract = input.attract ?? false;
    runner.input.repel = input.repel ?? false;
    runner.stepOnce();
  }
  return runner;
}

export function runnerFor(overrides: Partial<LevelDefinition> = {}): LevelRunner {
  return new LevelRunner(testLevel(overrides));
}
