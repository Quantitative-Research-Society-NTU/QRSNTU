// Shared JSON-loading and rendering helpers for the QRS data-driven pages
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
    ['service/', 'Service'],
    ['math_notes/', 'Math Notes'],
    ['people/', 'People'],
    ['join_us/', 'Join QRS'],
];

export async function loadData(paths) {
    const entries = await Promise.all(
        Object.entries(paths).map(async ([key, url]) => {
            // Revalidate mutable canonical records; an old cached JSON response
            // must not overwrite the newly generated static page content.
            const res = await fetch(url, { cache: 'no-cache' });
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
    if (preferred_name) {
        const idx = name.indexOf(preferred_name);
        if (idx !== -1) {
            const before = escapeHtml(name.slice(0, idx));
            const match = escapeHtml(preferred_name);
            const after = escapeHtml(name.slice(idx + preferred_name.length));
            return `${before}<strong>${match}</strong>${after}`;
        }
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
        .map(({ key, label, href }) => {
            const url = escapeHtml(href(person[key]));
            return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="${className}">[${label}]</a>`;
        })
        .join('');
}

// A person's display roles, e.g. "President & Founder, QRS@NTU". Reads the
// roles array, falling back to a legacy single `role` string.
export function personRoles(person) {
    if (Array.isArray(person.roles)) return person.roles.filter(Boolean);
    return person.role ? [person.role] : [];
}

export function projectsForPerson(personId, projects) {
    return projects.filter(p => projectPeople(p).includes(personId));
}

export function projectPeople(project) {
    return [...new Set([project.lead, ...(project.authors || []), ...(project.slicers || []), ...(project.participants || [])].filter(Boolean))];
}

export function projectRolesForPerson(personId, project) {
    return [project.lead === personId ? 'Lead' : '',
        (project.authors || []).includes(personId) ? 'Author' : '',
        (project.slicers || []).includes(personId) ? 'Slicer' : ''].filter(Boolean);
}

export function acceptedResearch(research) {
    return research.filter(r => r.status === 'accepted');
}

export function publicLinkLabel(label, url) {
    if (url.includes('arxiv.org/')) return 'arXiv';
    if (url.includes('github.com/')) return 'GitHub';
    if (url.includes('openreview.net/')) return 'OpenReview';
    return label.charAt(0).toUpperCase() + label.slice(1);
}

// Combine accepted records with retained archives without repeating a paper.
// Keep archive anchors as aliases when an accepted version supersedes them.
export function publicPublications(publications, research) {
    const accepted = acceptedResearch(research).map(r => ({ ...r, type: 'workshop', links: r.url ? { [publicLinkLabel('Paper', r.url)]: r.url } : {}, legacy_ids: [] }));
    const archives = [];
    for (const publication of publications) {
        const match = accepted.find(r => r.title === publication.title);
        if (match) {
            match.legacy_ids.push(publication.id);
            if (publication.url) match.links[publicLinkLabel('Paper', publication.url)] = publication.url;
        } else archives.push(publication);
    }
    return [...accepted, ...archives];
}

export function publicationLinksHTML(publication, rootBase = '') {
    const links = publication.links || (publication.url ? { [publicLinkLabel('Paper', publication.url)]: publication.url } : {});
    return (publication.project_id ? `<a href="${rootBase}projects/${publication.project_id}/" class="external-link"><strong>[Project]</strong></a> ` : '') +
        Object.entries(links).map(([label, url]) => `<a href="${escapeHtml(url)}" class="external-link" target="_blank" rel="noopener noreferrer">[${escapeHtml(publicLinkLabel(label, url))}]</a>`).join(' ');
}

export function researchForPerson(personId, research) {
    return acceptedResearch(research).filter(r => (r.authors || []).includes(personId));
}

export function publicationsForPerson(personId, publications) {
    return publications.filter(p => (p.authors || []).includes(personId));
}

// Non-archival outputs (workshop papers, preprints, working papers) are
// tagged with a publication `type`; untagged entries count as archival.
const NON_ARCHIVAL_TYPES = new Set(['workshop', 'preprint', 'working-paper']);

export function isNonArchival(publication) {
    return NON_ARCHIVAL_TYPES.has(publication.type);
}
