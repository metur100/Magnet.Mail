/**
 * Builds the signed release AAB for Google Play (run `npm run android:setup` once before).
 *   npm run android:bundle  → android/app/build/outputs/bundle/release/app-release.aab
 */
import { execSync } from 'node:child_process';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const run = (command, cwd = ROOT) => execSync(command, { cwd, stdio: 'inherit' });

run('npm run build');
run('npx cap sync android');
const android = path.join(ROOT, 'android');
// Absolute path: Windows may be configured not to run programs from the current directory.
run(`"${path.join(android, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew')}" bundleRelease`, android);
console.log(`AAB: ${path.join(ROOT, 'android', 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab')}`);
