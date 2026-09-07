// Renders the Publications page from data/publications.json ONLY. Do not
// promote entries from data/research.json here — see data/README.md.
import { loadData, personRefs, escapeHtml } from './qrs-data.js';

async function renderPublications() {
    const container = document.getElementById('publications-container');
    try {
        const { publications, people } = await loadData({
            publications: '../data/publications.json',
            people: '../data/people.json',
        });

        const byYear = {};
        publications.forEach(pub => {
            (byYear[pub.year] ||= []).push(pub);
        });
        const years = Object.keys(byYear).sort((a, b) => b - a);

        container.innerHTML = years.map(year => `
            <section class="publication-year-group">
                <h2 class="publication-year">${year}</h2>
                <ul class="publication-list">
                    ${byYear[year].map(pub => `
                        <li id="pub-${pub.id}" class="publication-entry">
                            <p class="publication-title">${escapeHtml(pub.title)}</p>
                            <p class="publication-authors">${personRefs(pub.authors, people, '../')}</p>
                            <p class="publication-venue">${escapeHtml(pub.venue)}
                                ${pub.url ? ` &middot; <a href="${escapeHtml(pub.url)}" target="_blank" rel="noopener noreferrer" class="external-link">View<i data-lucide="arrow-up-right" class="h-3.5 w-3.5"></i></a>` : ''}
                            </p>
                        </li>`).join('')}
                </ul>
            </section>`).join('');

        if (window.lucide) lucide.createIcons();
    } catch (err) {
        console.error('Error loading publications:', err);
        container.innerHTML = `<p class="text-gray-600">Publications could not be loaded.</p>`;
    }
}

document.addEventListener('DOMContentLoaded', renderPublications);
