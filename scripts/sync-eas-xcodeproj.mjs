import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const capacitorProject = resolve(projectRoot, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
const easProject = resolve(projectRoot, 'ios', 'StreamFlicker.xcodeproj', 'project.pbxproj');
const capacitorScheme = resolve(projectRoot, 'ios', 'App', 'App.xcodeproj', 'xcshareddata', 'xcschemes', 'App.xcscheme');
const easScheme = resolve(projectRoot, 'ios', 'StreamFlicker.xcodeproj', 'xcshareddata', 'xcschemes', 'App.xcscheme');

let project = await readFile(capacitorProject, 'utf8');
const replacements = [
  ['path = ../debug.xcconfig;', 'path = debug.xcconfig;'],
  ['\t\t\tpath = App;\n\t\t\tsourceTree = "<group>";', '\t\t\tpath = App/App;\n\t\t\tsourceTree = "<group>";'],
  ['relativePath = "CapApp-SPM";', 'relativePath = "App/CapApp-SPM";'],
];

for (const [from, to] of replacements) {
  if (!project.includes(from)) {
    throw new Error(`Unexpected Capacitor Xcode project layout; missing ${from}`);
  }
  project = project.replace(from, to);
}

const infoPlistMatches = project.match(/INFOPLIST_FILE = App\/Info\.plist;/g) ?? [];
if (infoPlistMatches.length !== 2) {
  throw new Error('Unexpected Capacitor Xcode project layout; expected two Info.plist build settings');
}
project = project.replaceAll('INFOPLIST_FILE = App/Info.plist;', 'INFOPLIST_FILE = App/App/Info.plist;');

await mkdir(dirname(easProject), { recursive: true });
await writeFile(easProject, project);

const scheme = await readFile(capacitorScheme, 'utf8');
if (!scheme.includes('container:App.xcodeproj')) {
  throw new Error('Unexpected Capacitor scheme; missing App.xcodeproj container');
}
await mkdir(dirname(easScheme), { recursive: true });
await writeFile(easScheme, scheme.replaceAll('container:App.xcodeproj', 'container:StreamFlicker.xcodeproj'));

console.log('Synchronized EAS Xcode project shim from Capacitor native project.');
