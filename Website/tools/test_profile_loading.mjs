import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Exercise the actual renderer with a failed enhancement request. Static
// biographies must survive even when a project/publication request fails.
const biography = '<h1>Yuhe Sui</h1><section><h2>About</h2><p>Static biography.</p></section>';
const container = { innerHTML: biography, textContent: 'Yuhe Sui About Static biography.' };
globalThis.document = {
    body: { dataset: { personId: 'yuhe-sui', root: '../' } },
    getElementById: () => container,
};
globalThis.window = {};
globalThis.fetch = async () => { throw new Error('Simulated unavailable JSON'); };
const originalError = console.error;
console.error = () => {};
await import('../v1/assets/person-page.js?failed-request');
await new Promise(resolve => setImmediate(resolve));
assert.equal(container.innerHTML, biography);
console.error = originalError;

// Enhancement still renders the same real biography when requests succeed.
const fixture = Object.fromEntries(await Promise.all(
    ['people', 'projects', 'publications', 'research'].map(async name => [
        name, JSON.parse(await readFile(new URL('../v1/data/' + name + '.json', import.meta.url), 'utf8')),
    ]),
));
globalThis.fetch = async url => ({
    ok: true,
    json: async () => fixture[url.split('/').pop().replace('.json', '')],
});
await import('../v1/assets/person-page.js?successful-request');
await new Promise(resolve => setImmediate(resolve));
assert.match(container.innerHTML, /person-about/);
assert.match(container.innerHTML, /Yuhe studies attention mechanisms/);
assert.match(container.innerHTML, /Projects:/);
console.log('PASS: profile enhancement preserves About on failure and renders it on success.');
