// Renders the Projects, Competitions & Recognition page from data/projects.json.
// Accepted research is shown on dedicated generated project pages. The index
// stays focused on stable parent programmes and their project relationships.
import { loadData, projectPeople } from './qrs-data.js?v=20261003-data';
import { mountCatalog, peopleSearch } from './catalog.js';

import { projectCard, TYPE_LABELS, STATUS_LABELS } from './project-card.js';

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
        if (!container.textContent.trim()) container.innerHTML = `<p class="text-gray-600">Projects could not be loaded.</p>`;
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
