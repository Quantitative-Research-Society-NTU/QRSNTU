// Shared renderer for every /people/<id>/ profile page. Each profile page is
// a thin HTML wrapper with data-person-id set on <body>; all rendering logic
// lives here so profile pages never duplicate markup or data-lookup code.
import {
    loadData, renderPersonName, personRoles, externalLinksHTML,
    projectsForPerson, publicPublications, publicationsForPerson, publicationLinksHTML, escapeHtml
} from './qrs-data.js';

// research.json is a curated accepted-only collection; filter defensively too.

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
            research: `${ROOT}data/research.json`,
        });

        const person = data.people.find(p => p.id === personId);
        if (!person) {
            container.innerHTML = `<p class="text-gray-600">This profile could not be found.</p>`;
            return;
        }

        const links = externalLinksHTML(person);
        const roles = personRoles(person).filter(role => !(person.research_academy?.length && role === 'QRS Research Academy Member'));
        const myProjects = projectsForPerson(person.id, data.projects);
        const myPublications = publicationsForPerson(person.id, publicPublications(data.publications, data.research));
        const publicationItem = p => `<li><a href="${ROOT}publications/#pub-${p.id}">${escapeHtml(p.title)}</a><span class="person-list-meta publication-meta">${escapeHtml(p.venue)}, ${p.year}</span><span class="publication-links">${publicationLinksHTML(p, ROOT)}</span></li>`;

        container.innerHTML = `
            <div class="person-header">
                ${person.photo ? `<img src="${ROOT}${escapeHtml(person.photo)}" alt="${escapeHtml(person.name)}" class="person-photo">` : ''}
                <div>
                    <h1 class="person-name">${renderPersonName(person)}</h1>
                    ${roles.length ? `<p class="person-role">${roles.map(escapeHtml).join('<br>')}</p>` : ''}
                    ${(person.education || []).map(e => `<p class="person-affiliation affiliation-row"><span>${escapeHtml(e.role)}, ${escapeHtml(e.institution)}${e.field ? `, <em>${escapeHtml(e.field)}</em>` : ''}</span>${e.dates ? `<span class="affiliation-dates">${escapeHtml(e.dates)}</span>` : ''}</p>`).join('')}
                    ${(person.experience || []).map(e => `<p class="person-affiliation affiliation-row"><span>${escapeHtml(e.role)}, ${escapeHtml(e.organisation)}</span>${e.dates ? `<span class="affiliation-dates">${escapeHtml(e.dates)}</span>` : ''}</p>`).join('')}
                    ${(person.research_academy || []).map(a => `<p class="person-affiliation academy-history"><a href="${ROOT}research-academy/members/">${a.status === 'promoted' ? 'Graduate' : 'Member'}, QRS Research Academy, ${escapeHtml(a.batch)}</a></p>`).join('')}
                    ${links ? `<div class="external-links">${links}</div>` : ''}
                </div>
            </div>

            ${myProjects.length ? `<p class="profile-projects"><strong>Projects:</strong> ${myProjects.map(p => `<a href="${ROOT}projects/${p.id}/">${escapeHtml(p.title)}</a>`).join(', ')}</p>` : ''}
            ${person.about ? `<section class="person-section person-about">
                <h2 class="font-serif text-xl font-bold text-gray-900 mb-4">About</h2>
                <p>${escapeHtml(person.about)}</p>
            </section>` : ''}
            ${section('Publications', myPublications.map(publicationItem))}
            ${section('Service', (person.service || []).map(serviceItem))}
        `;

        if (window.lucide) lucide.createIcons();
    } catch (err) {
        console.error('Error loading person profile:', err);
        container.innerHTML = `<p class="text-gray-600">Profile data could not be loaded.</p>`;
    }
}

document.addEventListener('DOMContentLoaded', renderPersonProfile);
