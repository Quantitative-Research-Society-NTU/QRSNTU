// Populates the homepage's Current Work and Publications previews
// sections from the shared JSON data, keeping them in sync with the full
// Projects/Publications/Events pages without duplicating hand-written content.
import { loadData, personRefs, publicPublications, publicationLinksHTML, escapeHtml } from './qrs-data.js';

async function renderHome() {
    try {
        const { projects, publications: archives, research, people } = await loadData({
            projects: 'data/projects.json',
            publications: 'data/publications.json',
            people: 'data/people.json',
            research: 'data/research.json',
        });
        const publications = publicPublications(archives, research).sort((a, b) => b.year - a.year);

        // Curated homepage picks, in this order — not "all active projects".
        const HOME_FEATURED_PROJECT_IDS = ['ai-native-workflow', 'policyattention'];
        const featured = HOME_FEATURED_PROJECT_IDS
            .map(id => projects.find(p => p.id === id))
            .filter(Boolean);
        document.getElementById('home-projects').innerHTML = featured.map(p => `
            <div class="home-card">
                <h3 class="card-title">${escapeHtml(p.title)}</h3>
                <p class="card-description">${escapeHtml(p.summary)}</p>
                <a href="projects/${p.id}/" class="card-link">
                    Learn more <i data-lucide="arrow-right" class="inline-block h-4 w-4 ml-1"></i>
                </a>
            </div>`).join('');

        // Show two recent entries; the full catalogue remains on Publications.
        document.getElementById('home-publications').innerHTML = publications.slice(0, 2).map(pub => `
            <div class="home-card">
                <h3 class="card-title">${escapeHtml(pub.title)}</h3>
                <p class="card-description">${personRefs(pub.authors, people)} &middot; ${escapeHtml(pub.venue)}, ${pub.year}</p>
                <p class="publication-links">${publicationLinksHTML(pub)}</p>
                <a href="publications/#pub-${pub.id}" class="card-link">
                    Read more <i data-lucide="arrow-right" class="inline-block h-4 w-4 ml-1"></i>
                </a>
            </div>`).join('');

        if (window.lucide) lucide.createIcons();
    } catch (err) {
        console.error('Error loading homepage data:', err);
    }
}

document.addEventListener('DOMContentLoaded', renderHome);
