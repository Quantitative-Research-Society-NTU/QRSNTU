// Shared renderer for every /people/<id>/ profile page. Each profile page is
// a thin HTML wrapper with data-person-id set on <body>; all rendering logic
// lives here so profile pages never duplicate markup or data-lookup code.
import {
    loadData, renderPersonName, externalLinksHTML,
    projectsForPerson, researchForPerson, publicationsForPerson, escapeHtml
} from './qrs-data.js';

// Research outputs are disabled site-wide for now (per operator request) —
// flip this back to true to restore the "Research" section on profiles.
const SHOW_RESEARCH = false;

async function renderPersonProfile() {
    const container = document.getElementById('person-profile');
    const personId = document.body.dataset.personId;
    // Canonical profiles live at /people/<id>/ (two levels deep); a person
    // with a short_id is instead served straight from their vanity alias
    // (e.g. /yh/, one level deep) via a thin wrapper, which sets data-root
    // accordingly since it can't reuse the "../../" depth.
    const ROOT = document.body.dataset.root || '../../';

    try {
        const data = await loadData({
            people: `${ROOT}data/people.json`,
            projects: `${ROOT}data/projects.json`,
            publications: `${ROOT}data/publications.json`,
            ...(SHOW_RESEARCH ? { research: `${ROOT}data/research.json` } : {}),
        });

        const person = data.people.find(p => p.id === personId);
        if (!person) {
            container.innerHTML = `<p class="text-gray-600">This profile could not be found.</p>`;
            return;
        }

        const links = externalLinksHTML(person);
        const myProjects = projectsForPerson(person.id, data.projects);
        const myResearch = SHOW_RESEARCH ? researchForPerson(person.id, data.research) : [];
        const myPublications = publicationsForPerson(person.id, data.publications);

        container.innerHTML = `
            <div class="person-header">
                ${person.photo ? `<img src="${ROOT}${escapeHtml(person.photo)}" alt="${escapeHtml(person.name)}" class="person-photo">` : ''}
                <div>
                    <h1 class="person-name">${renderPersonName(person)}</h1>
                    ${person.role ? `<p class="person-role">${escapeHtml(person.role)}</p>` : ''}
                    ${links ? `<div class="external-links">${links}</div>` : ''}
                </div>
            </div>

            ${myProjects.length ? `
            <section class="person-section">
                <h2 class="font-serif text-xl font-bold text-gray-900 mb-4">Projects</h2>
                <ul class="person-list">
                    ${myProjects.map(p => `<li><a href="${ROOT}projects/#project-${p.id}">${escapeHtml(p.title)}</a></li>`).join('')}
                </ul>
            </section>` : ''}

            ${myResearch.length ? `
            <section class="person-section">
                <h2 class="font-serif text-xl font-bold text-gray-900 mb-4">Research</h2>
                <ul class="person-list">
                    ${myResearch.map(r => `<li>${escapeHtml(r.title)}<span class="person-list-meta">${escapeHtml(r.venue)}, ${new Date(r.date).getFullYear()}</span></li>`).join('')}
                </ul>
            </section>` : ''}

            ${myPublications.length ? `
            <section class="person-section">
                <h2 class="font-serif text-xl font-bold text-gray-900 mb-4">Publications</h2>
                <ul class="person-list">
                    ${myPublications.map(p => `<li><a href="${ROOT}publications/#pub-${p.id}">${escapeHtml(p.title)}</a><span class="person-list-meta">${escapeHtml(p.venue)}, ${p.year}</span></li>`).join('')}
                </ul>
            </section>` : ''}
        `;

        if (window.lucide) lucide.createIcons();
    } catch (err) {
        console.error('Error loading person profile:', err);
        container.innerHTML = `<p class="text-gray-600">Profile data could not be loaded.</p>`;
    }
}

document.addEventListener('DOMContentLoaded', renderPersonProfile);
