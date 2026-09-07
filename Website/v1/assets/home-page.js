// Populates the homepage's Current Work, Publications, and Events preview
// sections from the shared JSON data, keeping them in sync with the full
// Projects/Publications/Events pages without duplicating hand-written content.
import { loadData, personRefs, escapeHtml } from './qrs-data.js';

async function renderHome() {
    try {
        const { projects, publications, events, people } = await loadData({
            projects: 'data/projects.json',
            publications: 'data/publications.json',
            events: 'data/events.json',
            people: 'data/people.json',
        });

        // Curated homepage picks, in this order — not "all active projects".
        const HOME_FEATURED_PROJECT_IDS = ['cffa-2026', 'ntuinfo-com'];
        const featured = HOME_FEATURED_PROJECT_IDS
            .map(id => projects.find(p => p.id === id))
            .filter(Boolean);
        document.getElementById('home-projects').innerHTML = featured.map(p => `
            <div class="home-card">
                <h3 class="card-title">${escapeHtml(p.title)}</h3>
                <p class="card-description">${escapeHtml(p.summary)}</p>
                <a href="projects/#project-${p.id}" class="card-link">
                    Learn more <i data-lucide="arrow-right" class="inline-block h-4 w-4 ml-1"></i>
                </a>
            </div>`).join('');

        // All curated publications — this list is intentionally short.
        document.getElementById('home-publications').innerHTML = publications.map(pub => `
            <div class="home-card">
                <h3 class="card-title">${escapeHtml(pub.title)}</h3>
                <p class="card-description">${personRefs(pub.authors, people)} &middot; ${escapeHtml(pub.venue)}, ${pub.year}</p>
                <a href="publications/#pub-${pub.id}" class="card-link">
                    Read more <i data-lucide="arrow-right" class="inline-block h-4 w-4 ml-1"></i>
                </a>
            </div>`).join('');

        // All events: soonest-upcoming first, then most-recent-past first.
        const upcoming = events.filter(e => e.status !== 'past')
            .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
        const past = events.filter(e => e.status === 'past')
            .sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
        document.getElementById('home-events').innerHTML = [...upcoming, ...past].map(ev => `
            <div class="home-card">
                <h3 class="card-title">${escapeHtml(ev.title)}</h3>
                <p class="card-description">${escapeHtml(ev.summary)}</p>
                <a href="events/#event-${ev.id}" class="card-link">
                    Learn more <i data-lucide="arrow-right" class="inline-block h-4 w-4 ml-1"></i>
                </a>
            </div>`).join('');

        if (window.lucide) lucide.createIcons();
    } catch (err) {
        console.error('Error loading homepage data:', err);
    }
}

document.addEventListener('DOMContentLoaded', renderHome);
