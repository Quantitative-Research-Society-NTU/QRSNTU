import { personRefs, projectPeople, publicLinkLabel, escapeHtml } from './qrs-data.js?v=20261003-data';

export const TYPE_LABELS = { research: 'Research', competition: 'Competition', infrastructure: 'Infrastructure' };
export const STATUS_LABELS = { active: 'Active', published: 'Published', submitted: 'Submitted', completed: 'Completed' };

export function projectCard(project, people) {
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
