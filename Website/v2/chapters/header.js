// Shared header/nav, rendered into a <header id="header" data-root="..."> thin
// placeholder on every page — mirrors assets/footer.js. Deliberately
// synchronous (no fetch): module scripts run in document order right after
// parsing, before DOMContentLoaded fires, so as long as this <script> tag
// comes before script.js's on every page, the nav is fully built by the time
// script.js's DOMContentLoaded handler wires up its interactivity
// (mobile-menu toggle, scroll effect, active-link highlight).
import { NAV_LINKS } from '../assets/qrs-data.js';

function renderHeader() {
    const chapter = document.body.dataset.chapter;
    const header = document.getElementById('header');
    if (!header) return;
    const root = header.dataset.root || '';
    const homeHref = document.body.dataset.variant === 'landing' ? 'https://qrsntu.org/' : new URL(`./${document.body.dataset.slug}/`, import.meta.url).href;

    const linksHTML = [['https://qrsntu.org/', 'Main Branch']]
        .map(([href, label]) => {
            const isCta = href === 'join_us/';
            return `<a href="${href.startsWith('https:') ? href : root + href}" class="${isCta ? 'nav-cta' : 'nav-link'}">${label}</a>`;
        })
        .join('');

    header.innerHTML = `
        <nav class="container mx-auto px-6 py-4 flex justify-between items-center flex-wrap">
            <a href="${homeHref}" class="flex items-center gap-3">
                <img src="${root}Files/logo-v1.png" alt="QRS@${chapter} Logo" class="h-10 w-10 rounded-md">
                <span class="font-serif font-bold text-xl text-white">${document.body.dataset.brand || `QRS@${chapter}`}</span>
            </a>

            <div id="mobile-menu" class="flex items-center">
                <div class="flex items-center text-sm">
                    ${linksHTML}
                </div>
            </div>
        </nav>`;

    if (window.lucide) lucide.createIcons();
}

renderHeader();
