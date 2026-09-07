import { escapeHtml, humanizeId } from './qrs-data.js';

export function peopleSearch(ids, people) {
    return (ids || []).map(id => people.find(p => p.id === id)?.name || humanizeId(id)).join(' ');
}

// Native controls keep the catalogue usable with keyboards and on phones.
export function mountCatalog({ container, items, noun, filters, searchText, render }) {
    const toolbar = document.createElement('div');
    toolbar.className = 'catalog-toolbar';
    toolbar.innerHTML = `<div class="catalog-controls">
        <label class="catalog-search">Search ${noun}<input type="search" placeholder="Search by title, person or keyword" aria-label="Search ${noun}"></label>
        ${filters.map(f => `<label>${escapeHtml(f.label)}<select data-filter="${f.key}" aria-label="${escapeHtml(f.label)}"><option value="">All ${escapeHtml(f.label.toLowerCase())}</option>${f.options.map(o => `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`).join('')}</select></label>`).join('')}
        <button type="button" class="catalog-reset">Clear filters</button>
        </div><p class="catalog-count" role="status" aria-live="polite"></p>`;
    container.before(toolbar);
    const input = toolbar.querySelector('input');
    const selects = [...toolbar.querySelectorAll('select')];
    const reset = toolbar.querySelector('button');
    const normalized = text => String(text).normalize('NFKC').toLocaleLowerCase();
    const update = () => {
        const terms = normalized(input.value).trim().split(/\s+/).filter(Boolean);
        const results = items.filter(item => terms.every(term => normalized(searchText(item)).includes(term)) && filters.every((f, i) => !selects[i].value || f.matches(item, selects[i].value)));
        toolbar.querySelector('.catalog-count').textContent = `${results.length} of ${items.length} ${noun}`;
        reset.disabled = !input.value && selects.every(s => !s.value);
        container.innerHTML = results.length ? render(results) : '<div class="catalog-empty"><h2>No matching results</h2><p>Try a different keyword or clear the filters above.</p></div>';
        if (window.lucide) window.lucide.createIcons();
    };
    input.addEventListener('input', update);
    selects.forEach(select => select.addEventListener('change', update));
    reset.addEventListener('click', () => { input.value = ''; selects.forEach(s => s.value = ''); update(); input.focus(); });
    update();
    // Data arrives after navigation, so honour incoming record anchors explicitly.
    let anchor = location.hash.slice(1);
    try { anchor = decodeURIComponent(anchor); } catch { /* Ignore malformed URL encoding. */ }
    const target = document.getElementById(anchor);
    if (target) target.scrollIntoView();
}
