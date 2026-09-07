// Renders the Projects, Competitions & Recognition page from data/projects.json.
// data/research.json is intentionally not shown here: research outputs are
// working artifacts, not the curated, fully-published record — that lives on
// the Publications page.
import { loadData, personRefs, escapeHtml } from './qrs-data.js';

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

        container.innerHTML = projects.map(p => projectCard(p, people)).join('');
        if (window.lucide) lucide.createIcons();
    } catch (err) {
        console.error('Error loading projects:', err);
        container.innerHTML = `<p class="text-gray-600">Projects could not be loaded.</p>`;
    }
}

document.addEventListener('DOMContentLoaded', renderProjects);
