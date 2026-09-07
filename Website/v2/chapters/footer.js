// Shared multi-column footer, rendered into a <footer id="site-footer"> thin
// placeholder on every page. Reads its site-root depth from the element's
// data-root attribute (mirrors the pattern used by person-page.js), so the
// same code works whether the page lives at the site root, at /people/<id>/,
// or at a short vanity alias like /yh/.
//
// The "Chapters"/"Collaborators" sub-groups (sharing one column) are
// entirely data-driven from data/branches.json and data/collaborators.json,
// and each only renders once its file has at least one entry — do not
// hardcode a link here.
import { loadData, escapeHtml, NAV_LINKS } from '../assets/qrs-data.js';

const GITHUB_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-6 w-6" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.333-1.754-1.333-1.754-1.089-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>';
const LINKEDIN_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-6 w-6" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.446-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>';

// Renders a title + list of {name, url} external links as one sub-group
// within the third footer column, or '' when the list is empty.
function siteLink(value) {
    const url = new URL(value, document.baseURI);
    const path = url.pathname.replace(/^\/|\/$/g, "");
    if (url.hostname === "qrsntu.org" && ["", "cmu", "cuhk", "fdu", "sjtu", "hkust"].includes(path)) {
        return new URL("../../v1/" + (path ? path + "/" : ""), import.meta.url).href;
    }
    return url.href;
}

function linkGroup(title, items) {
    if (!items.length) return '';
    return `
        <div class="footer-subgroup">
            <h4 class="footer-col-title">${title}</h4>
            <nav class="footer-links">
                ${items.map(item => !item.url
                    ? `<span class="footer-link"><span>${escapeHtml(item.name)}${item.status === "coming-soon" ? "<small> — Coming soon</small>" : ""}</span></span>`
                    : `<a href="${escapeHtml(siteLink(item.url))}" data-site-link class="footer-link"><span>${escapeHtml(item.name)}${item.status === "coming-soon" ? "<small> — Coming soon</small>" : ""}</span><i data-lucide="arrow-up-right" class="h-3.5 w-3.5"></i></a>`).join("")}
            </nav>
        </div>`;
}

async function renderFooter() {
    const chapter = document.body.dataset.chapter || 'NTU';
    const bilingual = {
        cuhk: ['QRS@CUHK', '量化研究协会@香港中文'],
        sjtu: ['QRS@SJTU', '量化研究协会@交大'],
        fdu: ['QRS@FDU', '量化研究协会@复旦'],
    }[document.body.dataset.slug];
    const footerBrand = bilingual
        ? `<span class="block">${escapeHtml(bilingual[0])}</span><span class="block" lang="zh-Hans">${escapeHtml(bilingual[1])}</span>`
        : escapeHtml(`QRS@${chapter}`);
    const footer = document.getElementById('site-footer');
    if (!footer) return;
    const root = footer.dataset.root || '';

    let branches = [];
    let collaborators = [];
    try {
        ({ branches, collaborators } = await loadData({
            branches: `${root}data/branches.json?v=20260907-footer-clickable`,
            collaborators: `${root}data/collaborators.json`,
        }));
    } catch (err) {
        console.error('Error loading footer link data:', err);
    }

    const exploreLinksHTML = NAV_LINKS.filter(([href]) => href !== 'math_notes/')
        .map(([href, label]) => `<a href="${root}${href}" class="footer-link">${label}</a>`)
        .join('');

    // Chapters (QRS's own sub-branches) and Collaborators (frequently
    // collaborating, independent clubs) share one third column — keeps the
    // footer a clean 3 columns instead of growing a 4th for every new
    // "other society" category.
    const communityColumnHTML = (branches.length || collaborators.length) ? `
        <div class="footer-col footer-col-community">
            ${linkGroup('MAIN BRANCH:', [{name: 'QRS@NTU', url: 'https://qrsntu.org/'}])}
            ${linkGroup('SUB BRANCH:', branches)}
            ${linkGroup('Collaborators', collaborators)}
        </div>` : '';

    footer.innerHTML = `
        <div class="container mx-auto px-6 py-10">
            <div class="footer-columns">
                <div class="footer-col footer-col-brand">
                    <div class="footer-brand">
                        <img src="${root}Files/logo-v1.png" alt="QRS@NTU Logo" class="h-9 w-9 rounded-md">
                        <span class="footer-brand-name">${footerBrand}</span>
                    </div>
                    <p class="footer-blurb">Quantitative research, technical learning, and industry activity at ${chapter}.</p>
                    <div class="footer-social">
                        <a href="https://github.com/Quantitative-Research-Society-NTU" target="_blank" rel="noopener noreferrer" aria-label="QRS@NTU on GitHub">${GITHUB_ICON}</a>
                        <a href="https://www.linkedin.com/company/quantitative-research-society-ntu/" target="_blank" rel="noopener noreferrer" aria-label="QRS@NTU on LinkedIn">${LINKEDIN_ICON}</a>
                        <a href="mailto:contact@qrsntu.org" aria-label="Email QRS@NTU"><i data-lucide="mail" class="h-6 w-6"></i></a>
                    </div>
                </div>
                <div class="footer-col">
                    <h4 class="footer-col-title">Explore</h4>
                    <nav class="footer-links">${exploreLinksHTML}</nav>
                </div>
                ${communityColumnHTML}
            </div>
            <div class="footer-bottom">
                <p>Contact us at <a href="mailto:contact@qrsntu.org" class="font-medium">contact@qrsntu.org</a></p>
                <p class="footer-copyright"><a href="${root}contact/">Contact</a> &middot; &copy; <span id="footer-year"></span> ${escapeHtml(bilingual ? bilingual[0] : `QRS@${chapter}`)}. All Rights Reserved.</p>
            </div>
        </div>`;

    const yearEl = document.getElementById('footer-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    if (window.lucide) lucide.createIcons();
}

document.addEventListener('DOMContentLoaded', renderFooter);
