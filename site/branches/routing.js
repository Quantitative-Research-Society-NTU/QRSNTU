// Keep shared V1 resources while routing visitors within the selected draft.
const body = document.body;
const site = new URL('../', import.meta.url);
const branch = new URL(`../${body.dataset.slug}/`, import.meta.url);
const landing = body.dataset.variant === 'landing';
const about = new URL(landing ? 'landing/about/' : 'about/', branch);
function routeLinks() {
    document.querySelectorAll('a[href]').forEach(link => {
        if (link.hasAttribute('data-site-link')) return;
        if (/^https?:\/\/qrsntu\.org(?:\/|$)/.test(link.getAttribute('href'))) return;
        const url = new URL(link.getAttribute('href'), document.baseURI);
        if (url.hostname === 'qrsnus.org') return;
        let target = url.href;
        if (url.href.startsWith(branch.href)) return;
        if (url.origin === site.origin && url.pathname.startsWith(site.pathname)) {
            const path = url.pathname.slice(site.pathname.length);
            if (path.startsWith('chapters/')) {
                if (!landing) return;
                target = 'https://qrsntu.org/';
            } else if (path === 'about/' || path === 'about/index.html') {
                target = about.href + url.hash;
            } else if (path.startsWith('math_notes/')) {
                link.remove();
                return;
            } else {
                target = new URL(path + url.search + url.hash, landing ? 'https://qrsntu.org/' : branch).href;
            }
        } else if (landing && url.origin !== 'https://qrsntu.org') {
            target = url.protocol === 'mailto:' ? 'https://qrsntu.org/contact/' : 'https://qrsntu.org/';
        }
        if (link.href !== target) link.href = target;
    });
}
document.addEventListener('DOMContentLoaded', () => {
    routeLinks();
    // Home cards, catalogues and the footer are populated asynchronously.
    new MutationObserver(routeLinks).observe(document.body, {childList: true, subtree: true});
});
