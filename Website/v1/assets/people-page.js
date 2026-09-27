// Renders the People directory: Officers (is_admin: true), then Researchers
// (non-admin people holding a Quantitative Research Society role), then
// Coordination (other non-admin people with an explicit role). Branches are
// listed below, only when data/branches.json is non-empty.
import { loadData, renderPersonName, personRoles, personPath, escapeHtml } from './qrs-data.js';

const QRS_ROLE = /, Quantitative Research Society$/;

function personCard(person) {
    return `
        <a href="${personPath(person, '../')}" class="person-directory-card">
            <span class="person-directory-name">${renderPersonName(person)}</span>
            ${personRoles(person).map(role => `<span class="person-directory-role">${escapeHtml(role)}</span>`).join('')}
        </a>`;
}

// Fills a directory group, hiding its section when nobody belongs to it.
function fillGroup(sectionId, containerId, members) {
    if (members.length) {
        document.getElementById(containerId).innerHTML = members.map(personCard).join('');
    } else {
        document.getElementById(sectionId).classList.add('hidden');
    }
}

async function renderPeople() {
    try {
        const { people, branches } = await loadData({
            people: '../data/people.json',
            branches: '../data/branches.json',
        });

        const officers = people.filter(p => p.is_admin);
        const others = people.filter(p => !p.is_admin && personRoles(p).length);
        const researchers = others.filter(p => personRoles(p).some(role => QRS_ROLE.test(role)));
        const coordination = others.filter(p => !researchers.includes(p));

        document.getElementById('officers-container').innerHTML = officers.map(personCard).join('');
        fillGroup('researchers-section', 'researchers-container', researchers);
        fillGroup('coordination-section', 'coordination-container', coordination);

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
