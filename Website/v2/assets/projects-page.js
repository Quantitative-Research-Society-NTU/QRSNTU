// Renders the Projects, Competitions & Recognition page from data/projects.json.
// data/research.json is intentionally not shown here: research outputs are
// working artifacts, not the curated, fully-published record — that lives on
// the Publications page.
import { loadData, personRefs, escapeHtml } from './qrs-data.js';
import { mountCatalog, peopleSearch } from './catalog.js';

const TYPE_LABELS = { research: 'Research', competition: 'Competition', infrastructure: 'Infrastructure' };
const STATUS_LABELS = { active: 'Active', published: 'Published', submitted: 'Submitted', completed: 'Completed' };

function projectCard(project, people) {
    const types = (project.type || []).map(t => `<span class="badge">${TYPE_LABELS[t] || escapeHtml(t)}</span>`).join('');
    const status = project.status ? `<span class="badge badge-status">${STATUS_LABELS[project.status] || escapeHtml(project.status)}</span>` : '';
    const participants = personRefs(project.participants, people, '../');

    const recognitionHTML = (project.recognition || []).length ? `
        <div class="project-recognition">
            <h4>Recognition</h4>
            <ul>
                ${project.recognition.map(r => `<li>${escapeHtml(r.event)}${r.track ? ` — ${escapeHtml(r.track)}` : ''}: <strong>${escapeHtml(r.result)}</strong></li>`).join('')}
            </ul>
        </div>` : '';

    const linksHTML = project.links && Object.keys(project.links).length ? `
        <div class="project-links">
            ${Object.entries(project.links).map(([label, url]) => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="external-link">${escapeHtml(label)}<i data-lucide="arrow-up-right" class="h-3.5 w-3.5"></i></a>`).join('')}
        </div>` : '';

    return `
        <article id="project-${project.id}" class="project-full-card">
            <div class="project-badges">${types}${status}</div>
            <h3 class="card-title">${escapeHtml(project.title)}</h3>
            ${project.alternate_title ? `<p class="project-alt-title">${escapeHtml(project.alternate_title)}</p>` : ''}
            <p class="card-description">${escapeHtml(project.summary)}</p>
            ${participants ? `<p class="project-participants"><span class="label">Participants:</span> ${participants}</p>` : ''}
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
            searchText: p => [p.title, p.alternate_title, p.summary, peopleSearch(p.participants, people), ...(p.recognition || []).map(r => `${r.event} ${r.result}`)].join(' '),
            render: results => results.map(p => projectCard(p, people)).join(''),
        });
        if (window.lucide) lucide.createIcons();
    } catch (err) {
        console.error('Error loading projects:', err);
        container.innerHTML = `<p class="text-gray-600">Projects could not be loaded.</p>`;
    }
}

document.addEventListener('DOMContentLoaded', renderProjects);
