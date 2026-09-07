// Shared JSON-loading and rendering helpers for the QRS@NTU data-driven pages
// (Projects, Publications, Events, People, and person profiles).
//
// Every page passes its own relative path prefixes, since pages live at
// different depths (e.g. root pages vs. /people/<id>/), so this module never
// hardcodes "data/" or "people/" itself.

// The primary nav, shared by both header.js and footer.js so the link set
// only needs updating in one place. Targets are clean directory URLs
// (no .html) — every top-level page lives at "<name>/index.html".
export const NAV_LINKS = [
    ['about/', 'About'],
    ['projects/', 'Projects'],
    ['publications/', 'Publications'],
    ['programmes/', 'Programmes'],
    ['events/', 'Events'],
    ['math_notes/', 'Math Notes'],
    ['people/', 'People'],
    ['join_us/', 'Join QRS'],
];

export async function loadData(paths) {
    const entries = await Promise.all(
        Object.entries(paths).map(async ([key, url]) => {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
            return [key, await res.json()];
        })
    );
    return Object.fromEntries(entries);
}

// Turns a kebab-case id like "wang-zhoufu" into "Wang Zhoufu" for participant
// IDs that intentionally have no People record yet.
export function humanizeId(id) {
    return id
        .split('-')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

// Bolds the preferred-name substring within the full name, when supplied.
export function renderPersonName(person) {
    const { name, preferred_name } = person;
    if (preferred_name && name.includes(preferred_name)) {
        return name.replace(preferred_name, `<strong>${preferred_name}</strong>`);
    }
    return escapeHtml(name);
}

export function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
}

// A person's default profile URL: their short vanity alias when they have
// one (e.g. "yh/"), so links go straight there instead of via a redirect;
// otherwise the canonical "people/<id>/" route.
export function personPath(person, rootBase = '') {
    return person.short_id ? `${rootBase}${person.short_id}/` : `${rootBase}people/${person.id}/`;
}

// Renders a participant/author id as a link to their canonical profile when
// they exist in People, or as plain humanised text when they don't.
export function personRef(id, people, rootBase = '') {
    const person = people.find(p => p.id === id);
    if (!person) {
        return `<span class="person-plain">${escapeHtml(humanizeId(id))}</span>`;
    }
    return `<a href="${personPath(person, rootBase)}" class="person-link">${renderPersonName(person)}</a>`;
}

export function personRefs(ids, people, rootBase = '') {
    return (ids || []).map(id => personRef(id, people, rootBase)).join(', ');
}

const EXTERNAL_LINK_ORDER = [
    { key: 'openreview', label: 'OpenReview', href: v => `https://openreview.net/profile?id=${encodeURIComponent(v)}` },
    { key: 'orcid', label: 'ORCID', href: v => `https://orcid.org/${v}` },
    { key: 'github', label: 'GitHub', href: v => `https://github.com/${v}` },
    { key: 'linkedin', label: 'LinkedIn', href: v => v },
];

// Renders external profile links in the required OpenReview -> ORCID ->
// GitHub -> LinkedIn order, omitting any field that is null/missing.
export function externalLinksHTML(person, className = 'external-link') {
    return EXTERNAL_LINK_ORDER
        .filter(({ key }) => person[key])
        .map(({ key, label, href }) => `<a href="${href(person[key])}" target="_blank" rel="noopener noreferrer" class="${className}">${label}<i data-lucide="arrow-up-right" class="h-3.5 w-3.5"></i></a>`)
        .join('');
}

export function projectsForPerson(personId, projects) {
    return projects.filter(p => (p.participants || []).includes(personId));
}

export function researchForPerson(personId, research) {
    return research.filter(r => (r.authors || []).includes(personId));
}

export function publicationsForPerson(personId, publications) {
    return publications.filter(p => (p.authors || []).includes(personId));
}
