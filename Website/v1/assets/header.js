// Shared header/nav, rendered into a <header id="header" data-root="..."> thin
// placeholder on every page — mirrors assets/footer.js. Deliberately
// synchronous (no fetch): module scripts run in document order right after
// parsing, before DOMContentLoaded fires, so as long as this <script> tag
// comes before script.js's on every page, the nav is fully built by the time
// script.js's DOMContentLoaded handler wires up its interactivity
// (mobile-menu toggle, scroll effect, active-link highlight).
import { NAV_LINKS } from './qrs-data.js?v=20261003-data';

function renderHeader() {
    const header = document.getElementById('header');
    if (!header) return;
    const root = header.dataset.root || '';
    const slug = document.body.dataset.slug;
    const landing = document.body.dataset.variant === 'landing';
    const site = new URL('../', import.meta.url);
    const homeHref = slug ? (landing ? 'https://qrsntu.org/' : new URL(`${slug}/`, site).href) : root || './';
    const navigation = slug ? [[site.href, 'Main Branch'], [new URL(`${slug}/${landing ? 'landing/' : ''}about/`, site).href, 'About']] : NAV_LINKS;

    const linksHTML = navigation
        .map(([href, label]) => {
            const isCta = href === 'join_us/';
            return `<a href="${slug ? href : root + href}" ${slug ? 'data-site-link' : ''} class="${isCta ? 'nav-cta' : 'nav-link'}">${label}</a>`;
        })
        .join('');

    header.innerHTML = `
        <nav class="qrs-header-nav container mx-auto px-6 py-4 flex justify-between items-center flex-wrap">
            <a href="${homeHref}" class="qrs-brand flex items-center gap-3">
                <img src="${root}Files/logo-v2-surface.png" alt="QRS surface logo" class="qrs-wordmark">
                <span class="qrs-brand-title">Quantitative Research Society</span>
            </a>

            <button id="mobile-menu-button" class="md:hidden p-2 rounded-md hover:bg-white/10" aria-label="Toggle navigation menu" aria-expanded="false" aria-controls="mobile-menu">
                <i data-lucide="menu" class="h-7 w-7 text-white"></i>
            </button>

            <div id="mobile-menu" class="hidden md:flex w-full md:w-auto items-center mt-4 md:mt-0">
                <div class="flex flex-col md:flex-row md:items-center w-full space-y-3 md:space-y-0 md:space-x-4 lg:space-x-5 text-sm">
                    ${linksHTML}
                </div>
            </div>
        </nav>`;

    if (window.lucide) lucide.createIcons();
}

renderHeader();
