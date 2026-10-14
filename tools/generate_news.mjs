// Build-time News output from site/data/news.json and site/data/events.json, using the same
// renderer as the browser (site/assets/news-card.js):
//   * the static list on /news/ (the page enhances it with search and filters),
//   * the "Latest news" strip on the homepage,
//   * the RSS feed at /news/feed.xml.
// Run after editing news or events data. --check reports stale output without writing.
import { readFile, writeFile } from 'node:fs/promises';
import { buildFeed, newsCard, newsTeaser, NEWS_TYPES } from '../site/assets/news-card.js';

const ORIGIN = 'https://qrsntu.org';
const HOME_ITEMS = 3;
const FEED_ITEMS = 30;
const site = new URL('../site/', import.meta.url);
const check = process.argv.includes('--check');
const read = async name => JSON.parse(await readFile(new URL('data/' + name + '.json', site), 'utf8'));
const [news, events, projects] = await Promise.all(['news', 'events', 'projects'].map(read));

const ids = new Set();
for (const item of news) {
    for (const key of ['id', 'date', 'type', 'title', 'summary', 'url']) {
        if (!item[key]) throw new Error(`news.json item ${item.id || '?'} is missing ${key}`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date)) throw new Error(`news.json item ${item.id}: date must be YYYY-MM-DD`);
    if (!NEWS_TYPES[item.type]) throw new Error(`news.json item ${item.id}: unknown type ${item.type}`);
    if (ids.has(item.id)) throw new Error(`news.json: duplicate id ${item.id}`);
    ids.add(item.id);
}
const feed = buildFeed(news, events);

const xml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
const absolute = url => (/^https?:\/\//.test(url) ? url : ORIGIN + url);
const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>QRS News</title>
<link>${ORIGIN}/news/</link>
<atom:link href="${ORIGIN}/news/feed.xml" rel="self" type="application/rss+xml"/>
<description>News from the Quantitative Research Society: research, releases, events and guides.</description>
<language>en</language>
${feed.slice(0, FEED_ITEMS).map(item => `<item>
<title>${xml(item.title)}</title>
<link>${xml(absolute(item.url))}</link>
<guid isPermaLink="false">qrs-news-${xml(item.id)}</guid>
<pubDate>${new Date(item.date + 'T00:00:00+08:00').toUTCString()}</pubDate>
<category>${xml(NEWS_TYPES[item.type])}</category>
<description>${xml(item.summary)}</description>
</item>`).join('\n')}
</channel>
</rss>
`;

function between(source, start, end, body, file) {
    const a = source.indexOf(start), b = source.indexOf(end);
    if (a < 0 || b < a) throw new Error(`${file}: missing ${start} … ${end} markers`);
    return source.slice(0, a + start.length) + body + source.slice(b);
}

// Only the marked regions are compared: generate_seo.py also edits these pages (head metadata and
// asset versions) after this script runs.
const region = (source, start, end) => source.slice(source.indexOf(start), source.indexOf(end));
const outputs = [];
const newsPage = new URL('news/index.html', site);
const newsMarks = ['<!-- NEWS: generated -->', '<!-- /NEWS -->'];
outputs.push([newsPage, between(await readFile(newsPage, 'utf8'), ...newsMarks,
    '\n' + feed.map(item => newsCard(item, projects)).join('\n') + '\n', 'news/index.html'), newsMarks]);
const home = new URL('index.html', site);
const homeMarks = ['<!-- HOME NEWS: generated -->', '<!-- /HOME NEWS -->'];
outputs.push([home, between(await readFile(home, 'utf8'), ...homeMarks,
    feed.slice(0, HOME_ITEMS).map(newsTeaser).join('') + '\n                    ', 'index.html'), homeMarks]);
outputs.push([new URL('news/feed.xml', site), rss, null]);

const stale = [];
for (const [url, value, marks] of outputs) {
    let current = '';
    try { current = await readFile(url, 'utf8'); } catch { /* new file */ }
    const same = marks ? region(current, ...marks) === region(value, ...marks) : current === value;
    if (!same) {
        stale.push(url.pathname.split('/site/')[1]);
        if (!check) await writeFile(url, value, 'utf8');
    }
}
if (check && stale.length) {
    console.error('Stale news output: ' + stale.join(', '));
    process.exit(1);
}
console.log(`News ${check ? 'checked' : 'generated'}: ${feed.length} items (${news.length} curated, ${feed.length - news.length} from events); ${stale.length} changed.`);
