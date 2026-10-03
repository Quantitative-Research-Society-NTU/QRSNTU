// Renders the Projects, Competitions & Recognition page from data/projects.json.
// Accepted research is shown on dedicated generated project pages. The index
// stays focused on stable parent programmes and their project relationships.
import { loadData, personRefs, projectPeople, publicLinkLabel, escapeHtml } from './qrs-data.js';
import { mountCatalog, peopleSearch } from './catalog.js';

const TYPE_LABELS = { research: 'Research', competition: 'Competition', infrastructure: 'Infrastructure' };
const STATUS_LABELS = { active: 'Active', published: 'Published', submitted: 'Submitted', completed: 'Completed' };

function projectCard(project, people) {
    const types = (project.type || []).map(t => `<span class="badge">${TYPE_LABELS[t] || escapeHtml(t)}</span>`).join('');
    const statusLabel = project.stage === 'early-stage' ? 'Early-stage / Active derived research' : STATUS_LABELS[project.status] || project.status;
    const status = statusLabel ? `<span class="badge badge-status">${escapeHtml(statusLabel)}</span>` : '';
    const participants = personRefs(projectPeople(project), people, '../');

    const recognitionHTML = (project.recognition || []).length ? `
        <div class="project-recognition">
            <h4>Recognition</h4>
            <ul>
                ${project.recognition.map(r => `<li>${escapeHtml(r.event)}${r.track ? ` — ${escapeHtml(r.track)}` : ''}: <strong>${escapeHtml(r.result)}</strong></li>`).join('')}
            </ul>
        </div>` : '';

    const linksHTML = project.links && Object.keys(project.links).length ? `
        <div class="project-links">
            ${Object.entries(project.links).map(([label, url]) => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="external-link">[${escapeHtml(publicLinkLabel(label, url))}]</a>`).join('')}
        </div>` : '';

    return `
        <article id="project-${project.id}" class="project-full-card">
            <div class="project-badges">${types}${status}</div>
            <h3 class="card-title"><a href="${project.id}/">${escapeHtml(project.title)}</a></h3>
            ${project.alternate_title ? `<p class="project-alt-title">${escapeHtml(project.alternate_title)}</p>` : ''}
            <p class="card-description">${escapeHtml(project.summary)}</p>
            <div class="project-team">${project.lead ? [['Lead', [project.lead]], ['Authors', project.authors], ['Slicers', project.slicers]].filter(([, ids]) => ids?.length).map(([label, ids]) => `<p><span class="label">${label}:</span> ${personRefs(ids, people, '../')}</p>`).join('') : participants ? `<p><span class="label">Participants:</span> ${participants}</p>` : ''}</div>
            ${recognitionHTML}
            ${linksHTML}
        </article>`;
}

async function renderProjects() {
    const container = document.getElementById('projects-container');
    try {
        const { people, projects } = await loadData({
            people: '../data/people.json',
            projects: '../data/projects.json',
        });

        mountCatalog({
            container, items: projects, noun: 'projects',
            filters: [
                { key: 'type', label: 'Types', options: Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label })), matches: (p, value) => (p.type || []).includes(value) },
                { key: 'status', label: 'Statuses', options: [...new Set(projects.map(p => p.status).filter(Boolean))].map(value => ({ value, label: STATUS_LABELS[value] || value })), matches: (p, value) => p.status === value },
            ],
            searchText: p => [p.title, p.alternate_title, p.summary, peopleSearch(projectPeople(p), people), ...(p.recognition || []).map(r => `${r.event} ${r.result}`)].join(' '),
            render: results => results.map(p => projectCard(p, people)).join(''),
        });
        if (window.lucide) lucide.createIcons();
    } catch (err) {
        console.error('Error loading projects:', err);
        container.innerHTML = `<p class="text-gray-600">Projects could not be loaded.</p>`;
    }
}

document.addEventListener('DOMContentLoaded', renderProjects);

// Preserve inbound index anchors, including renamed projects.
if (location.hash.startsWith('#project-')) {
    const id = location.hash.slice('#project-'.length);
    loadData({ projects: '../data/projects.json' }).then(({ projects }) => {
        const project = projects.find(p => p.id === id || (p.legacy_ids || []).includes(id));
        if (project) location.replace(new URL(`${project.id}/`, location.href).href);
    }).catch(console.error);
}
