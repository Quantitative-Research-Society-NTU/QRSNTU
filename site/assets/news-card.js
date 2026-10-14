// News feed shared by the News page, the homepage strip and tools/generate_news.mjs (which uses
// it at build time for the static fallback and the RSS feed). Curated items come from
// data/news.json; every event in data/events.json also appears as an item unless a curated item
// already covers it (event_id), so the feed stays current without duplicate entry.
import { escapeHtml } from './qrs-data.js?v=20261014-news';

export const NEWS_TYPES = {
    announcement: 'Announcement',
    research: 'Research',
    paper: 'Paper',
    workshop: 'Workshop paper',
    event: 'Event',
    release: 'Release',
    guide: 'Guide',
    award: 'Award',
};

// An event is past once its last day is over (viewer's local date), so "Upcoming" never goes stale.
const todayISO = () => new Date().toLocaleDateString('en-CA');
const isPastEvent = (ev, today = todayISO()) => (ev.end_date || ev.start_date) < today;
export { todayISO, isPastEvent };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Fixed format so the build-time and in-browser renderings match exactly.
export function formatNewsDate(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return `${d} ${MONTHS[m - 1]} ${y}`;
}

// Pass today (YYYY-MM-DD) to prefix events that have not ended with "Upcoming:".
export function buildFeed(news, events = [], today = null) {
    const covered = new Set(news.map(item => item.event_id).filter(Boolean));
    const fromEvents = events.filter(ev => !covered.has(ev.id)).map(ev => ({
        id: 'event-' + ev.id,
        date: ev.start_date,
        type: 'event',
        title: today && !isPastEvent(ev, today) ? 'Upcoming: ' + ev.title : ev.title,
        summary: ev.summary,
        url: ev.url || '/events/#event-' + ev.id,
        event_id: ev.id,
    }));
    return [...news, ...fromEvents].sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
}

const isExternal = url => /^https?:\/\//.test(url);

export function newsCard(item, projects = []) {
    const target = isExternal(item.url) ? ' target="_blank" rel="noopener noreferrer"' : '';
    const related = (item.project_ids || [])
        .map(id => projects.find(p => p.id === id))
        .filter(Boolean)
        .map(p => `<a href="/projects/${p.id}/" class="card-link">${escapeHtml(p.title)}</a>`)
        .join(', ');
    return `
        <article id="news-${item.id}" class="news-card">
            <p class="news-meta"><time datetime="${item.date}">${formatNewsDate(item.date)}</time><span class="badge">${escapeHtml(NEWS_TYPES[item.type] || item.type)}</span></p>
            <h3 class="card-title"><a href="${escapeHtml(item.url)}"${target}>${escapeHtml(item.title)}</a></h3>
            <p class="card-description">${escapeHtml(item.summary)}</p>${related ? `
            <p class="news-related"><span class="label">Project:</span> ${related}</p>` : ''}
        </article>`;
}

// Compact card for the homepage "Latest news" strip.
export function newsTeaser(item) {
    const target = isExternal(item.url) ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `
            <div class="home-card news-teaser">
                <p class="news-meta"><time datetime="${item.date}">${formatNewsDate(item.date)}</time><span class="badge">${escapeHtml(NEWS_TYPES[item.type] || item.type)}</span></p>
                <h3 class="card-title"><a href="${escapeHtml(item.url)}"${target}>${escapeHtml(item.title)}</a></h3>
                <p class="card-description">${escapeHtml(item.summary)}</p>
            </div>`;
}
