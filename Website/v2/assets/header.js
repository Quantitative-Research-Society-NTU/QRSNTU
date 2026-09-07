// Shared header/nav, rendered into a <header id="header" data-root="..."> thin
// placeholder on every page — mirrors assets/footer.js. Deliberately
// synchronous (no fetch): module scripts run in document order right after
// parsing, before DOMContentLoaded fires, so as long as this <script> tag
// comes before script.js's on every page, the nav is fully built by the time
// script.js's DOMContentLoaded handler wires up its interactivity
// (mobile-menu toggle, scroll effect, active-link highlight).
import { NAV_LINKS } from './qrs-data.js';

function renderHeader() {
    const header = document.getElementById('header');
    if (!header) return;
    const root = header.dataset.root || '';
    const homeHref = root || './';

    const linksHTML = NAV_LINKS
        .map(([href, label]) => {
            const isCta = href === 'join_us/';
            return `<a href="${root}${href}" class="${isCta ? 'nav-cta' : 'nav-link'}">${label}</a>`;
        })
        .join('');

    header.innerHTML = `
        <nav class="container mx-auto px-6 py-4 flex justify-between items-center flex-wrap">
            <a href="${homeHref}" class="flex items-center gap-3">
                <img src="${root}Files/logo-v1.png" alt="QRS@NTU Logo" class="h-10 w-10 rounded-md">
                <span class="font-serif font-bold text-xl text-white">QRS@NTU</span>
            </a>

            <button id="mobile-menu-button" class="md:hidden p-2 rounded-md hover:bg-white/10" aria-label="Toggle navigation menu" aria-expanded="false" aria-controls="mobile-menu">
                <i data-lucide="menu" class="h-6 w-6 text-white"></i>
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
