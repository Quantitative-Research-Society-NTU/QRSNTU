// Renders the People directory: Officers (is_admin: true), then Coordination
// (non-admin people with an explicit role). Branches are listed below, only
// when data/branches.json is non-empty.
import { loadData, renderPersonName, personPath, escapeHtml } from './qrs-data.js';

function personCard(person) {
    return `
        <a href="${personPath(person, '../')}" class="person-directory-card">
            <span class="person-directory-name">${renderPersonName(person)}</span>
            ${person.role ? `<span class="person-directory-role">${escapeHtml(person.role)}</span>` : ''}
        </a>`;
}

async function renderPeople() {
    try {
        const { people, branches } = await loadData({
            people: '../data/people.json',
            branches: '../data/branches.json',
        });

        const officers = people.filter(p => p.is_admin);
        const coordination = people.filter(p => !p.is_admin && p.role);

        document.getElementById('officers-container').innerHTML = officers.map(personCard).join('');

        const coordSection = document.getElementById('coordination-section');
        if (coordination.length) {
            document.getElementById('coordination-container').innerHTML = coordination.map(personCard).join('');
        } else {
            coordSection.classList.add('hidden');
        }

        const branchesSection = document.getElementById('branches-section');
        if (branches.length) {
            document.getElementById('branches-container').innerHTML = branches.map(b => `
                <a href="${escapeHtml(b.url)}" target="_blank" rel="noopener noreferrer" class="external-link">${escapeHtml(b.name)}<i data-lucide="arrow-up-right" class="h-3.5 w-3.5"></i></a>`).join('');
        } else {
            branchesSection.classList.add('hidden');
        }

        if (window.lucide) lucide.createIcons();
    } catch (err) {
        console.error('Error loading people:', err);
        document.getElementById('officers-container').innerHTML = `<p class="text-gray-600">People could not be loaded.</p>`;
    }
}

document.addEventListener('DOMContentLoaded', renderPeople);
