// Shared renderer for every /people/<id>/ profile page. Each profile page is
// a thin HTML wrapper with data-person-id set on <body>; all rendering logic
// lives here so profile pages never duplicate markup or data-lookup code.
import {
    loadData, renderPersonName, personRoles, externalLinksHTML,
    projectsForPerson, researchForPerson, publicationsForPerson, isNonArchival, escapeHtml
} from './qrs-data.js';

// Research outputs (data/research.json) are disabled site-wide for now (per
// operator request) — flip this back to true to list them under
// "Workshop & Preprint" on profiles.
const SHOW_RESEARCH = false;

function section(title, items) {
    if (!items.length) return '';
    return `
            <section class="person-section">
                <h2 class="font-serif text-xl font-bold text-gray-900 mb-4">${title}</h2>
                <ul class="person-list">${items.join('')}</ul>
            </section>`;
}

// One service record, e.g. "Reviewer, Example Workshop 2026", linked when a
// URL is supplied. Records come only from the person's `service` data.
function serviceItem(record) {
    const label = [record.role, record.organisation].filter(Boolean).map(escapeHtml).join(', ');
    const text = record.url
        ? `<a href="${escapeHtml(record.url)}" target="_blank" rel="noopener noreferrer">${label}</a>`
        : label;
    return `<li>${text}${record.year ? `<span class="person-list-meta">${escapeHtml(record.year)}</span>` : ''}</li>`;
}

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
        const roles = personRoles(person);
        const myProjects = projectsForPerson(person.id, data.projects);
        const myResearch = SHOW_RESEARCH ? researchForPerson(person.id, data.research) : [];
        const myPublications = publicationsForPerson(person.id, data.publications);
        const publicationItem = p => `<li><a href="${ROOT}publications/#pub-${p.id}">${escapeHtml(p.title)}</a><span class="person-list-meta">${escapeHtml(p.venue)}, ${p.year}</span></li>`;

        container.innerHTML = `
            <div class="person-header">
                ${person.photo ? `<img src="${ROOT}${escapeHtml(person.photo)}" alt="${escapeHtml(person.name)}" class="person-photo">` : ''}
                <div>
                    <h1 class="person-name">${renderPersonName(person)}</h1>
                    ${roles.length ? `<p class="person-role">${roles.map(escapeHtml).join('<br>')}</p>` : ''}
                    ${links ? `<div class="external-links">${links}</div>` : ''}
                </div>
            </div>

            ${section('Projects', myProjects.map(p => `<li><a href="${ROOT}projects/#project-${p.id}">${escapeHtml(p.title)}</a></li>`))}
            ${section('Publications', myPublications.filter(p => !isNonArchival(p)).map(publicationItem))}
            ${section('Workshop &amp; Preprint', [
                ...myPublications.filter(isNonArchival).map(publicationItem),
                ...myResearch.map(r => `<li>${escapeHtml(r.title)}<span class="person-list-meta">${escapeHtml(r.venue)}, ${new Date(r.date).getFullYear()}</span></li>`),
            ])}
            ${section('Service', (person.service || []).map(serviceItem))}
        `;

        if (window.lucide) lucide.createIcons();
    } catch (err) {
        console.error('Error loading person profile:', err);
        container.innerHTML = `<p class="text-gray-600">Profile data could not be loaded.</p>`;
    }
}

document.addEventListener('DOMContentLoaded', renderPersonProfile);
