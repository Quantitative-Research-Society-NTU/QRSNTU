// Write the static (no-JavaScript) versions of the explainer's figures into public/.
// They are rendered by the same functions the live figures use (public/pt.js), so the two cannot drift.
//
//   node projects/post-training/build_figures.mjs           # write
//   node projects/post-training/build_figures.mjs --check   # report stale files
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pub = join(here, 'public');
const { FIGS, heroSVG, toyFacts } = await import(pathToFileURL(join(pub, 'pt.js')).href);

// States shown without JavaScript (and the final states shown under reduced motion).
const OVERRIDES = { mctd: { n: 25 } };
const files = { 'hero-static.svg': heroSVG(2, 2, 0).svg };
for (const [name, spec] of Object.entries(FIGS)) {
    const state = { ...spec.state(), ...(OVERRIDES[name] || {}) };
    files[`fig-${name}-wide.svg`] = spec.render(state, false).svg;
    files[`fig-${name}-narrow.svg`] = spec.render(state, true).svg;
}

// The running example's derived numbers, for build_content.py ({{toy:...}} placeholders). Written next
// to this script, not into public/, because it is authoring data rather than a served file.
const outputs = Object.fromEntries(Object.entries(files).map(([name, body]) => [join(pub, name), body + '\n']));
outputs[join(here, 'toy.json')] = JSON.stringify(toyFacts(), null, 2) + '\n';

const check = process.argv.includes('--check');
const stale = [];
for (const [path, text] of Object.entries(outputs)) {
    const name = path.slice(here.length + 1);
    // Compare with line endings normalised, so a CRLF checkout is not reported as stale.
    if (!existsSync(path) || readFileSync(path, 'utf8').replace(/\r\n/g, '\n') !== text) {
        stale.push(name);
        if (!check) writeFileSync(path, text, 'utf8');
    }
}
if (check && stale.length) { console.error('Stale figures: ' + stale.join(', ')); process.exit(1); }
console.log(`Post-training figures ${check ? "checked" : "built"}: ${Object.keys(outputs).length} files, ${stale.length} changed.`);
