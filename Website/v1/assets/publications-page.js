// Accepted records plus intentionally retained archives, merged by title.
import { loadData, personRefs, publicPublications, publicationLinksHTML, escapeHtml } from './qrs-data.js';
import { mountCatalog, peopleSearch } from './catalog.js';

async function renderPublications() {
    const container = document.getElementById('publications-container');
    try {
        const { publications: archives, research, people } = await loadData({
            publications: '../data/publications.json',
            people: '../data/people.json',
            research: '../data/research.json',
        });
        const publications = publicPublications(archives, research);

        const render = results => {
        const byYear = {};
        results.forEach(pub => {
            (byYear[pub.year] ||= []).push(pub);
        });
        const years = Object.keys(byYear).sort((a, b) => b - a);

        return years.map(year => `
            <section class="publication-year-group">
                <h2 class="publication-year">${year}</h2>
                <ul class="publication-list">
                    ${byYear[year].map(pub => `
                        <li id="pub-${pub.id}" class="publication-entry">
                            ${(pub.legacy_ids || []).map(id => `<span id="pub-${id}"></span>`).join('')}
                            <p class="publication-title">${escapeHtml(pub.title)}</p>
                            <p class="publication-authors">${personRefs(pub.authors, people, '../')}</p>
                            <p class="publication-venue">${escapeHtml(pub.venue)}
                                ${pub.status === 'accepted' ? ' · Accepted' : ''} ${publicationLinksHTML(pub, '../')}
                            </p>
                        </li>`).join('')}
                </ul>
            </section>`).join('');
        };
        mountCatalog({
            container, items: publications, noun: 'publications',
            filters: [
                { key: 'type', label: 'Types', options: [{ value: 'workshop', label: 'Workshop papers' }, { value: 'publication', label: 'Other publications' }], matches: (p, value) => value === 'workshop' ? p.type === 'workshop' : p.type !== 'workshop' },
                { key: 'author', label: 'Authors', options: [...new Set(publications.flatMap(p => p.authors || []))].map(value => ({value, label: people.find(p => p.id === value)?.name || value})), matches: (p, value) => (p.authors || []).includes(value) },
                { key: 'year', label: 'Years', options: [...new Set(publications.map(p => p.year))].sort((a, b) => b - a).map(year => ({ value: String(year), label: String(year) })), matches: (p, value) => String(p.year) === value },
                { key: 'venue', label: 'Venues', options: [...new Set(publications.map(p => p.venue))].sort().map(value => ({ value, label: value })), matches: (p, value) => p.venue === value },
            ],
            searchText: p => [p.title, p.venue, p.year, p.type, p.status, p.project_id, peopleSearch(p.authors, people)].join(' '),
            render,
        });

        if (window.lucide) lucide.createIcons();
    } catch (err) {
        console.error('Error loading publications:', err);
        container.innerHTML = `<p class="text-gray-600">Publications could not be loaded.</p>`;
    }
}

document.addEventListener('DOMContentLoaded', renderPublications);
