/**
 * Level solver report: a beam search plays every campaign level (plus a set of daily challenges)
 * with the real physics and the same controls as a player. It proves each level can be completed
 * and reports the impulses it needed, so `par` values stay honest.
 *
 * Usage: npm run solve:levels            (all levels)
 *        npm run solve:levels -- w3      (levels whose id contains "w3")
 */
import { Solver } from '../src/game/gameplay/Solver';
import { LEVELS } from '../src/game/levels/LevelData';
import type { LevelDefinition } from '../src/game/levels/LevelDefinition';
import { generateDailyLevel } from '../src/game/progression/DailyChallenge';
import { Action } from '../src/game/gameplay/Solver';
import { TUTORIAL_STEPS } from '../src/game/levels/TutorialData';

const filter = process.argv[2];
const dailies = Array.from({ length: 10 }, (_, i) => generateDailyLevel(`2026-10-${String(10 + i).padStart(2, '0')}`));
const levels: LevelDefinition[] = [...LEVELS, ...dailies].filter((l) => !filter || l.id.includes(filter));

let failures = 0;
console.log('level             name                 parcel     solved  impulses  par  time   collisions  explored  ms');
for (const level of levels) {
  const started = performance.now();
  let result = new Solver(level).solve({ budgetMs: 60000 });
  // Tighten: solve again with fewer impulses allowed until it no longer works.
  while (result.success && result.impulses > 1) {
    const limit = result.impulses - 1;
    const tighter = new Solver({ ...level, impulseLimit: Math.min(level.impulseLimit ?? Infinity, limit) }).solve({ budgetMs: 15000 });
    if (!tighter.success) break;
    result = tighter;
  }
  const ms = Math.round(performance.now() - started);
  if (!result.success) failures++;
  const parNote = result.success && result.impulses > level.par ? ' (par too low)' : result.success && result.impulses + 2 < level.par ? ' (par generous)' : '';
  console.log(
    [
      level.id.padEnd(17),
      level.name.padEnd(20),
      level.parcel.padEnd(10),
      (result.success ? 'yes' : 'NO').padEnd(7),
      String(result.impulses).padStart(8),
      String(level.par).padStart(4),
      `${result.time.toFixed(1)}s`.padStart(6),
      String(result.collisions).padStart(11),
      String(result.explored).padStart(9),
      String(ms).padStart(6),
    ].join('  ') + parNote,
  );
}
// Tutorial steps, using only the controls each step enables.
for (const step of TUTORIAL_STEPS.filter((t) => !filter || t.level.id.includes(filter))) {
  const actions = [Action.None, ...(step.attract ? [Action.TapAttract, Action.HoldAttract] : []), ...(step.repel ? [Action.TapRepel, Action.HoldRepel] : [])];
  const result = new Solver(step.level).solve({ budgetMs: 30000, actions });
  const ok = result.success && (step.maxImpulses === undefined || result.impulses <= step.maxImpulses);
  if (!ok) failures++;
  console.log(`${step.level.id.padEnd(17)}  ${step.title.padEnd(20)}  ${ok ? 'yes' : 'NO'}  impulses ${result.impulses}`);
}
if (failures) {
  console.error(`\n${failures} level(s) could not be solved.`);
  process.exit(1);
}
console.log(`\nAll ${levels.length} levels solved.`);
