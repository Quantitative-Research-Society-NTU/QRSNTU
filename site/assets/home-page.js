// Populates the homepage's Current Work section from the shared JSON data, keeping it in sync with
// the Projects page. Papers and other updates appear in the Latest News strip, which
// tools/generate_news.mjs writes into the page at build time.
import { loadData, escapeHtml } from './qrs-data.js?v=20261014-news';

async function renderHome() {
    try {
        const { projects } = await loadData({ projects: 'data/projects.json' });

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

        if (window.lucide) lucide.createIcons();
    } catch (err) {
        console.error('Error loading homepage data:', err);
    }
}

document.addEventListener('DOMContentLoaded', renderHome);
