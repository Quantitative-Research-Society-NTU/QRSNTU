// Renders the News page from data/news.json and data/events.json (see news-card.js). The static
// list written by tools/generate_news.mjs stays in place if the data cannot be loaded.
import { loadData } from './qrs-data.js?v=20261014-news';
import { mountCatalog } from './catalog.js?v=20261014-news';
import { NEWS_TYPES, buildFeed, newsCard } from './news-card.js?v=20261015-workshop';

async function renderNews() {
    const container = document.getElementById('news-container');
    try {
        const { news, events, projects } = await loadData({ news: '../data/news.json', events: '../data/events.json', projects: '../data/projects.json' });
        const feed = buildFeed(news, events);
        const types = [...new Set(feed.map(item => item.type))];
        mountCatalog({
            container, items: feed, noun: 'news items',
            filters: [
                { key: 'type', label: 'Types', options: Object.keys(NEWS_TYPES).filter(t => types.includes(t)).map(value => ({ value, label: NEWS_TYPES[value] })), matches: (item, value) => item.type === value },
                { key: 'year', label: 'Years', options: [...new Set(feed.map(item => item.date.slice(0, 4)))].sort().reverse().map(value => ({ value, label: value })), matches: (item, value) => item.date.startsWith(value) },
            ],
            searchText: item => [item.title, item.summary, item.date, NEWS_TYPES[item.type] || item.type, ...(item.project_ids || [])].join(' '),
            render: results => results.map(item => newsCard(item, projects)).join(''),
        });
    } catch (err) {
        console.error('Error loading news:', err);
    }
}

document.addEventListener('DOMContentLoaded', renderNews);
