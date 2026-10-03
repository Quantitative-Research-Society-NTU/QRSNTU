// Use the browser's card renderer at build time too. The searchable catalog
// enhances these cards; meaningful project content never depends on JSON fetches.
import { readFile, writeFile } from 'node:fs/promises';
import { projectCard } from '../v1/assets/project-card.js';

const root = new URL('../v1/', import.meta.url);
const [people, projects] = await Promise.all(['people', 'projects'].map(async name =>
    JSON.parse(await readFile(new URL('data/' + name + '.json', root), 'utf8')),
));
const path = new URL('projects/index.html', root);
const original = await readFile(path, 'utf8');
const block = '<!-- PROJECTS: generated -->\n' + projects.map(p => projectCard(p, people)).join('\n') + '\n<!-- /PROJECTS -->';
let updated;
if (original.includes('<!-- PROJECTS: generated -->')) {
    updated = original.replace(/<!-- PROJECTS: generated -->[\s\S]*?<!-- \/PROJECTS -->/, () => block);
} else {
    const placeholder = '<div id="projects-container" class="max-w-4xl mx-auto"></div>';
    if (!original.includes(placeholder)) throw new Error('Project catalog placeholder missing');
    updated = original.replace(placeholder, '<div id="projects-container" class="max-w-4xl mx-auto">' + block + '</div>');
}
updated = updated.split(/\r?\n/).map(line => line.trimEnd()).join('\n');
if (process.argv.includes('--check')) {
    if (original !== updated) throw new Error('Stale static project index; run generate_project_index.mjs');
} else if (updated !== original) {
    await writeFile(path, updated, 'utf8');
}
console.log(`PASS: ${projects.length} static project cards ${process.argv.includes('--check') ? 'checked' : 'generated'} from the shared renderer.`);
