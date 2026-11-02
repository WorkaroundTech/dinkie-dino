// Keeps package-lock.json pointing at the public npm registry.
//
// A lockfile records the registry that was configured when it was written, so a machine
// configured with a private mirror (via ~/.npmrc or the NPM_CONFIG_REGISTRY variable, which
// even outranks the project .npmrc) writes that mirror into it.
//
//   node scripts/check-lockfile.mjs         fail if any resolved URL is not public
//   node scripts/check-lockfile.mjs --fix   rewrite tarball URLs to the public registry
//
// Integrity hashes are untouched, so a rewritten lockfile is still verified on install.
import { readFileSync, writeFileSync } from 'node:fs';

const PUBLIC = 'https://registry.npmjs.org/';
const LOCKFILE = new URL('../package-lock.json', import.meta.url);
// "<anything>/<package>/-/<file>.tgz", where <package> may be scoped (@scope/name).
const TARBALL = /^https:\/\/.+?\/((?:@[^/]+\/)?[^/]+\/-\/[^/]+\.tgz)$/;

const fix = process.argv.includes('--fix');
const lock = JSON.parse(readFileSync(LOCKFILE, 'utf8'));

let rewritten = 0;
const offenders = [];
for (const [name, pkg] of Object.entries(lock.packages ?? {})) {
  const resolved = pkg.resolved;
  if (typeof resolved !== 'string' || resolved.startsWith(PUBLIC)) continue;
  const match = TARBALL.exec(resolved);
  if (fix && match?.[1]) {
    pkg.resolved = PUBLIC + match[1];
    rewritten++;
  } else {
    offenders.push(`${name || '(root)'} -> ${resolved}`);
  }
}

if (fix && rewritten > 0) {
  writeFileSync(LOCKFILE, JSON.stringify(lock, null, 2) + '\n');
  console.log(`package-lock.json: rewrote ${rewritten} URLs to ${PUBLIC}`);
}

if (offenders.length > 0) {
  console.error(`package-lock.json has ${offenders.length} entries outside ${PUBLIC}:`);
  for (const line of offenders.slice(0, 10)) console.error(`  ${line}`);
  console.error('Run: npm run fix:lockfile');
  process.exit(1);
}
if (!fix || rewritten === 0) console.log(`package-lock.json: all resolved URLs are on ${PUBLIC}`);
