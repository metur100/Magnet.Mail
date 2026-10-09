/**
 * Applies the Magnet Mail customisations to the generated Capacitor iOS project (ios/ is not committed, but is uploaded to EAS via .easignore):
 * portrait only, iPhone only, export compliance, App Store icon, plain splash colour, version, a shared "App" scheme
 * and ios/App.xcodeproj (where EAS looks for the project).
 *
 *   npx cap add ios          # once (creates ios/)
 *   npm run ios:setup        # after every `cap add`, and after changing the version or the icon
 *   npm run ios:sync         # web build → ios/App/App/public (before every EAS build)
 *   eas build -p ios --profile production --auto-submit   # cloud build + upload to App Store Connect (no Mac needed)
 *
 * Needs ffmpeg.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const APP = path.join(ROOT, 'ios', 'App');
const ASSETS = path.join(APP, 'App', 'Assets.xcassets');
const PBXPROJ = path.join(APP, 'App.xcodeproj', 'project.pbxproj');
const SPLASH_COLOR = '0xd9ecff';

if (!fs.existsSync(PBXPROJ)) throw new Error('ios/ not found – run `npx cap add ios` first');

function edit(file, change) {
  const before = fs.readFileSync(file, 'utf8');
  const after = change(before);
  if (after !== before) fs.writeFileSync(file, after);
}

// ---------- Info.plist: portrait only, arm64, no encryption question ----------
edit(path.join(APP, 'App', 'Info.plist'), (s) => {
  s = s.replace(
    /<key>UISupportedInterfaceOrientations<\/key>\s*<array>[\s\S]*?<\/array>/,
    '<key>UISupportedInterfaceOrientations</key>\n\t<array>\n\t\t<string>UIInterfaceOrientationPortrait</string>\n\t</array>',
  );
  s = s.replace(/\s*<key>UISupportedInterfaceOrientations~ipad<\/key>\s*<array>[\s\S]*?<\/array>/, '');
  s = s.replace(/<string>armv7<\/string>/, '<string>arm64</string>');
  if (!s.includes('ITSAppUsesNonExemptEncryption')) s = s.replace('<key>LSRequiresIPhoneOS</key>', '<key>ITSAppUsesNonExemptEncryption</key>\n\t<false/>\n\t<key>LSRequiresIPhoneOS</key>');
  if (!s.includes('UIRequiresFullScreen')) s = s.replace('<key>UILaunchStoryboardName</key>', '<key>UIRequiresFullScreen</key>\n\t<true/>\n\t<key>UILaunchStoryboardName</key>');
  return s;
});

// ---------- Project: iPhone only, version from package.json ----------
const { version } = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
edit(PBXPROJ, (s) =>
  s
    .replace(/TARGETED_DEVICE_FAMILY = "1,2";/g, 'TARGETED_DEVICE_FAMILY = 1;')
    .replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${version};`),
);

// ---------- Icon (1024, no alpha) and splash (plain game background colour) ----------
fs.copyFileSync(path.join(ROOT, 'store', 'app-store', 'icon-1024.png'), path.join(ASSETS, 'AppIcon.appiconset', 'AppIcon-512@2x.png'));
for (const file of fs.readdirSync(path.join(ASSETS, 'Splash.imageset')).filter((f) => f.endsWith('.png'))) {
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'lavfi', '-i', `color=c=${SPLASH_COLOR}:s=2732x2732`, '-frames:v', '1', path.join(ASSETS, 'Splash.imageset', file)]);
}

// ---------- Shared scheme (cloud builds cannot rely on Xcode auto-creating it) ----------
const target = fs.readFileSync(PBXPROJ, 'utf8').match(/(\w{24}) \/\* App \*\/ = \{\s*isa = PBXNativeTarget;/)[1];
const ref = `<BuildableReference BuildableIdentifier = "primary" BlueprintIdentifier = "${target}" BuildableName = "App.app" BlueprintName = "App" ReferencedContainer = "container:App.xcodeproj"></BuildableReference>`;
const schemes = path.join(APP, 'App.xcodeproj', 'xcshareddata', 'xcschemes');
fs.mkdirSync(schemes, { recursive: true });
fs.writeFileSync(
  path.join(schemes, 'App.xcscheme'),
  `<?xml version="1.0" encoding="UTF-8"?>
<Scheme LastUpgradeVersion = "1600" version = "1.7">
   <BuildAction parallelizeBuildables = "YES" buildImplicitDependencies = "YES">
      <BuildActionEntries>
         <BuildActionEntry buildForTesting = "YES" buildForRunning = "YES" buildForProfiling = "YES" buildForArchiving = "YES" buildForAnalyzing = "YES">
            ${ref}
         </BuildActionEntry>
      </BuildActionEntries>
   </BuildAction>
   <TestAction buildConfiguration = "Debug" selectedDebuggerIdentifier = "Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier = "Xcode.DebuggerFoundation.Launcher.LLDB" shouldUseLaunchSchemeArgsEnv = "YES"></TestAction>
   <LaunchAction buildConfiguration = "Debug" selectedDebuggerIdentifier = "Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier = "Xcode.DebuggerFoundation.Launcher.LLDB" launchStyle = "0" useCustomWorkingDirectory = "NO" ignoresPersistentStateOnLaunch = "NO" debugDocumentVersioning = "YES" debugServiceExtension = "internal" allowLocationSimulation = "YES">
      <BuildableProductRunnable runnableDebuggingMode = "0">
         ${ref}
      </BuildableProductRunnable>
   </LaunchAction>
   <ProfileAction buildConfiguration = "Release" shouldUseLaunchSchemeArgsEnv = "YES" savedToolIdentifier = "" useCustomWorkingDirectory = "NO" debugDocumentVersioning = "YES"></ProfileAction>
   <AnalyzeAction buildConfiguration = "Debug"></AnalyzeAction>
   <ArchiveAction buildConfiguration = "Release" revealArchiveInOrganizer = "YES"></ArchiveAction>
</Scheme>
`,
);

// ---------- ios/App.xcodeproj for EAS ----------
// EAS only looks for ios/*.xcodeproj, Capacitor keeps its project in ios/App/. A copy one level up, with every path
// pointing back into App/, builds the same sources; `cap sync` keeps updating ios/App/ as usual.
const ROOT_PROJECT = path.join(ROOT, 'ios', 'App.xcodeproj');
fs.rmSync(ROOT_PROJECT, { recursive: true, force: true });
fs.cpSync(path.join(APP, 'App.xcodeproj'), ROOT_PROJECT, { recursive: true, filter: (src) => !src.includes('xcuserdata') });
edit(path.join(ROOT_PROJECT, 'project.pbxproj'), (s) => {
  const out = s
    .replace(/(\/\* App \*\/ = \{\s*isa = PBXGroup;[\s\S]*?)path = App;/, '$1path = App/App;')
    .replace('path = ../debug.xcconfig; sourceTree = SOURCE_ROOT;', 'path = debug.xcconfig; sourceTree = SOURCE_ROOT;')
    .replace(/INFOPLIST_FILE = App\/Info\.plist;/g, 'INFOPLIST_FILE = App/App/Info.plist;')
    .replace('relativePath = "CapApp-SPM";', 'relativePath = "App/CapApp-SPM";');
  for (const expected of ['path = App/App;', 'path = debug.xcconfig;', 'INFOPLIST_FILE = App/App/Info.plist;', 'relativePath = "App/CapApp-SPM";']) {
    if (!out.includes(expected)) throw new Error(`ios/App.xcodeproj: could not rewrite "${expected}" – Capacitor template changed?`);
  }
  return out;
});

// ---------- Podfile ----------
// EAS always runs `pod install` in ios/. Capacitor 8 uses Swift Package Manager, so this Podfile installs nothing
// and leaves the Xcode project untouched.
fs.writeFileSync(
  path.join(ROOT, 'ios', 'Podfile'),
  `# Only for EAS Build (it always runs \`pod install\`). Dependencies come from Swift Package Manager (App/CapApp-SPM).
platform :ios, '15.0'
install! 'cocoapods', :integrate_targets => false
project 'App.xcodeproj'

target 'App' do
end
`,
);

console.log(`ios/ ready: ${version}, portrait, iPhone only, icon, splash, shared scheme "App", ios/App.xcodeproj for EAS`);
