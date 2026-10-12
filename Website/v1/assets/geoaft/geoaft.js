// GeoAFT microsite enhancements: header offset, active section, the stretching-geometry figure (overview),
// the geometry explorer (details), reveals, fading page heads and the reading-progress bar.
// Everything here is optional: without JavaScript the page shows static figures and plain links.
// The toy geometry mirrors Website/tools/geoaft/build_figures.py (see assets/geoaft/toy.json).

const root = document.querySelector('.geo');

function syncHeaderOffset() {
    const header = document.getElementById('header');
    if (!root || !header) return;
    // While the bar is slid away, things pinned beneath it move up to the top of the window.
    const h = header.classList.contains('geo-nav-hidden') ? 0 : Math.round(header.getBoundingClientRect().height) || 62;
    document.querySelectorAll('.geo').forEach(el => el.style.setProperty('--geo-header', h + 'px'));
}

// The dark site navigation bar slides away while the reader scrolls down and returns on any scroll up.
// It stays put near the top of the page, while its mobile menu is open, and while it has keyboard focus.
function autoHideNav() {
    const header = document.getElementById('header');
    if (!header) return;
    let last = window.scrollY;
    const set = hidden => {
        if (header.classList.contains('geo-nav-hidden') === hidden) return;
        header.classList.toggle('geo-nav-hidden', hidden);
        syncHeaderOffset();
    };
    window.addEventListener('scroll', () => {
        const y = window.scrollY, menu = document.getElementById('mobile-menu');
        const menuOpen = menu && !menu.classList.contains('hidden') && window.innerWidth < 768;
        if (y < 480 || menuOpen || header.contains(document.activeElement)) set(false);
        else if (y > last + 4) set(true);
        else if (y < last - 4) set(false);
        last = y;
    }, { passive: true });
    header.addEventListener('focusin', () => set(false));
}

function trackSections(nav) {
    if (!nav || !('IntersectionObserver' in window)) return;
    const links = [...nav.querySelectorAll('a[href^="#"]')];
    const targets = links.map(a => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
    const visible = new Map();
    const io = new IntersectionObserver(entries => {
        entries.forEach(e => visible.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0));
        let best = null;
        for (const t of targets) if ((visible.get(t.id) || 0) > 0) { best = t.id; break; }
        if (!best) return;
        links.forEach(a => a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + best)));
    }, { rootMargin: '-25% 0px -60% 0px', threshold: [0, 0.01] });
    targets.forEach(t => io.observe(t));
}

// ---------------------------------------------------------------- geometry explorer
const TOY = {
    query: [0.9, 0.6],
    keys: { A: [1.32, 0.18], B: [2.6, 1.55], C: [0.25, 1.75], D: [1.62, 0.6], E: [-0.55, 0.75], F: [0.5, 1.35], G: [0.1, -0.45] },
    tau: { dot: 0.8, l2: 0.22, lp: 0.22, maha: 0.22 },
    p: 1.0,
    angle: 105,
    eig: [0.16, 2.6],
    domain: [-1.25, 3.25, -1.05, 2.45],
};
const C = { navy: '#183b63', key: '#64748b', teal: '#00929a', tealInk: '#006f76', rule: '#cfd4dc', body: '#374151', muted: '#6b7280' };
const NS = 'http://www.w3.org/2000/svg';
const SUB = t => `<tspan baseline-shift="sub" font-size="10">${t}</tspan>`;

function metric(angle) {
    const t = angle * Math.PI / 180, c = Math.cos(t), s = Math.sin(t), [l1, l2] = TOY.eig;
    return [[l1 * c * c + l2 * s * s, (l1 - l2) * c * s], [(l1 - l2) * c * s, l1 * s * s + l2 * c * c]];
}
function score(kind, q, k, state) {
    const dx = k[0] - q[0], dy = k[1] - q[1];
    if (kind === 'dot') return q[0] * k[0] + q[1] * k[1];
    if (kind === 'l2') return -Math.hypot(dx, dy);
    if (kind === 'lp') return -Math.pow(Math.abs(dx) ** state.p + Math.abs(dy) ** state.p, 1 / state.p);
    const M = metric(state.angle);
    return -Math.sqrt(dx * (M[0][0] * dx + M[0][1] * dy) + dy * (M[1][0] * dx + M[1][1] * dy));
}
function attention(kind, state) {
    const names = Object.keys(TOY.keys);
    const logits = names.map(n => score(kind, state.q, TOY.keys[n], state) / TOY.tau[kind]);
    const top = Math.max(...logits);
    const w = logits.map(v => Math.exp(v - top));
    const z = w.reduce((a, b) => a + b, 0);
    return Object.fromEntries(names.map((n, i) => [n, w[i] / z]));
}

function frame(x, y, w, h) {
    const [x0, x1, y0, y1] = TOY.domain;
    const s = Math.min(w / (x1 - x0), h / (y1 - y0));
    const ox = x + (w - s * (x1 - x0)) / 2 - s * x0;
    const oy = y + (h - s * (y1 - y0)) / 2 + s * y1;
    const f = (px, py) => [ox + s * px, oy - s * py];
    f.inv = (sx, sy) => [(sx - ox) / s, (oy - sy) / s];
    f.box = [f(x0, y1), f(x1, y0)];
    return f;
}

function contours(kind, f, state) {
    const q = state.q, out = [];
    if (kind === 'dot') {
        const n = Math.hypot(q[0], q[1]) || 1, u = [q[0] / n, q[1] / n], v = [-u[1], u[0]];
        [-1.5, -0.75, 0, 0.75, 1.5, 2.25, 3].forEach((c, i) => {
            const a = f(u[0] * c - v[0] * 6, u[1] * c - v[1] * 6), b = f(u[0] * c + v[0] * 6, u[1] * c + v[1] * 6);
            out.push(`<path d="M${a[0].toFixed(1)},${a[1].toFixed(1)}L${b[0].toFixed(1)},${b[1].toFixed(1)}" fill="none" stroke="${C.navy}" stroke-opacity="${Math.min(0.18 + 0.1 * i, 0.8).toFixed(2)}" stroke-dasharray="3 4"/>`);
        });
        return out.join('');
    }
    const th = state.angle * Math.PI / 180, [l1, l2] = TOY.eig;
    [0.3, 0.6, 0.9, 1.2, 1.5, 1.8].forEach((r, i) => {
        const pts = [];
        for (let j = 0; j <= 96; j++) {
            const t = 2 * Math.PI * j / 96, c = Math.cos(t), s = Math.sin(t);
            let dx, dy;
            if (kind === 'l2') { dx = r * c; dy = r * s; }
            else if (kind === 'lp') {
                const p = state.p, e = 2 / p;
                dx = Math.sign(c) * Math.abs(c) ** e; dy = Math.sign(s) * Math.abs(s) ** e;
                const nrm = Math.pow(Math.abs(dx) ** p + Math.abs(dy) ** p, 1 / p) || 1;
                dx *= r / nrm; dy *= r / nrm;
            } else {
                const ex = r / Math.sqrt(l1) * c, ey = r / Math.sqrt(l2) * s;
                dx = ex * Math.cos(th) - ey * Math.sin(th); dy = ex * Math.sin(th) + ey * Math.cos(th);
            }
            pts.push(f(q[0] + dx, q[1] + dy));
        }
        const d = 'M' + pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L') + 'Z';
        out.push(`<path d="${d}" fill="${i === 0 ? C.teal : 'none'}" fill-opacity="0.10" stroke="${C.teal}" stroke-width="1.1" stroke-opacity="${(0.75 - 0.1 * i).toFixed(2)}"/>`);
    });
    return out.join('');
}

function geometries(state) {
    const p = Math.round(state.p * 10) / 10;
    return [
        ['dot', 'Dot product', 'q · k', C.navy],
        ['l2', 'Euclidean distance', `−‖q − k‖${SUB(2)}`, C.teal],
        ['lp', p === 1 ? 'L1 (taxicab) distance' : `L${SUB('p')} distance, p = ${p.toFixed(1)}`, `−‖q − k‖${SUB(p === 1 ? '1' : 'p')}`, C.teal],
        ['maha', 'Anisotropic (Mahalanobis)', `−‖q − k‖${SUB('M')}`, C.teal],
    ];
}

function panelSVG(kind, title, formula, color, x, y, w, h, uid, state) {
    const head = 44, barsH = 46;
    const f = frame(x + 6, y + head, w - 12, h - head - barsH - 14);
    const att = attention(kind, state);
    const [[cx0, cy0], [cx1, cy1]] = f.box;
    const [qx, qy] = f(...state.q);
    let s = `<g data-geometry="${kind}" data-frame="${uid}">`;
    s += `<text class="gf-t gf-h" x="${x + 8}" y="${y + 20}" font-size="17">${title}</text>`;
    s += `<text class="gf-x" x="${x + 8}" y="${y + 39}" font-size="14.5">s(q, k) = ${formula}</text>`;
    s += `<clipPath id="lclip-${uid}"><rect x="${cx0}" y="${cy0}" width="${cx1 - cx0}" height="${cy1 - cy0}" rx="6"/></clipPath>`;
    s += `<rect class="geo-drag-surface" x="${cx0}" y="${cy0}" width="${cx1 - cx0}" height="${cy1 - cy0}" rx="6" fill="#fbfbfa" stroke="${C.rule}"/>`;
    s += `<g clip-path="url(#lclip-${uid})" pointer-events="none">`;
    s += contours(kind, f, state);
    if (kind === 'dot') {
        const a = f(state.q[0] * 0.15, state.q[1] * 0.15), b = f(state.q[0] * 2.3, state.q[1] * 2.3);
        s += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${color}" stroke-width="1.4" stroke-opacity=".55" marker-end="url(#larrow-${uid})"/>`;
        s += `<marker id="larrow-${uid}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="${color}" fill-opacity=".7"/></marker>`;
    }
    for (const [n, k] of Object.entries(TOY.keys)) {
        const [kx, ky] = f(...k), a = att[n];
        s += `<line x1="${qx}" y1="${qy}" x2="${kx}" y2="${ky}" stroke="${color}" stroke-width="${(0.5 + 8 * a).toFixed(2)}" stroke-opacity="${(0.18 + 0.8 * a).toFixed(2)}" stroke-linecap="round"/>`;
    }
    s += '</g><g pointer-events="none">';
    for (const [n, k] of Object.entries(TOY.keys)) {
        const [kx, ky] = f(...k), a = att[n];
        s += `<circle cx="${kx}" cy="${ky}" r="5.5" fill="#fff" stroke="${C.key}" stroke-width="1.6"/>`;
        const pct = a >= 0.15 ? ` <tspan class="gf-strong" style="fill:${color === C.teal ? C.tealInk : C.navy}">${Math.round(100 * a)}%</tspan>` : '';
        s += `<text class="gf-t" x="${kx + 8}" y="${ky - 7}" font-size="13">${n}${pct}</text>`;
    }
    s += '</g>';
    s += `<g class="geo-q-handle"><circle cx="${qx}" cy="${qy}" r="16" fill="${C.navy}" fill-opacity="0.08"/><circle cx="${qx}" cy="${qy}" r="8" fill="${C.navy}" stroke="#fff" stroke-width="2.5"/>`;
    s += `<text class="gf-x" x="${qx - 6}" y="${qy - 13}" font-size="16" pointer-events="none">q</text></g>`;
    const by = y + h - barsH, names = Object.keys(TOY.keys), bw = (w - 16) / names.length, mx = Math.max(...Object.values(att));
    s += `<line x1="${x + 8}" y1="${by + 30}" x2="${x + w - 8}" y2="${by + 30}" stroke="${C.rule}"/>`;
    names.forEach((n, i) => {
        const a = att[n], bx = x + 8 + i * bw + bw * 0.2, hh = 28 * a / mx;
        s += `<rect x="${bx.toFixed(1)}" y="${(by + 30 - hh).toFixed(1)}" width="${(bw * 0.6).toFixed(1)}" height="${Math.max(hh, 0.8).toFixed(1)}" rx="2" fill="${color}" fill-opacity="${a === mx ? 1 : 0.35}"/>`;
        s += `<text class="gf-t gf-m" x="${(bx + bw * 0.3).toFixed(1)}" y="${by + 44}" font-size="11.5" text-anchor="middle">${n}</text>`;
    });
    return { svg: s + '</g>', frame: f, att };
}

function initExplorer(fig) {
    const staticBox = fig.querySelector('.geo-explorer-static');
    const state = { q: [...TOY.query], p: TOY.p, angle: TOY.angle, single: 3 };
    const controls = document.createElement('div');
    controls.className = 'geo-explorer-controls';
    controls.innerHTML = `
        <label><span>L<sub>p</sub> exponent</span> <input type="range" min="1" max="4" step="0.1" value="${state.p}" data-k="p" aria-describedby="geo-p-out"><output id="geo-p-out">p = 1.0</output></label>
        <label><span>Metric direction</span> <input type="range" min="0" max="180" step="5" value="${state.angle}" data-k="angle" aria-describedby="geo-a-out"><output id="geo-a-out">105°</output></label>
        <button type="button" data-play aria-pressed="false">▶ Animate query</button>
        <button type="button" data-reset>Reset</button>
        <div class="geo-explorer-tabs" role="group" aria-label="Choose a compatibility rule to show">
            ${['Dot', 'Euclidean', 'L1 / Lp', 'Mahalanobis'].map((t, i) => `<button type="button" data-tab="${i}" aria-pressed="${i === 3}">${t}</button>`).join('')}
        </div>`;
    const live = document.createElement('div');
    live.className = 'geo-explorer-live';
    const readout = document.createElement('p');
    readout.className = 'geo-explorer-readout';
    readout.setAttribute('aria-live', 'polite');
    staticBox.hidden = true;
    fig.prepend(controls);
    controls.after(live);
    live.after(readout);
    fig.classList.add('is-live');

    let frames = [], layout = null, svgEl = null, announce = 0;
    function render() {
        const width = live.clientWidth || fig.clientWidth || 900;
        const single = width < 560;
        fig.classList.toggle('is-single', single);
        const cols = single ? 1 : width >= 780 ? 4 : 2;
        const pw = cols === 4 ? 250 : cols === 2 ? 270 : 340, ph = single ? 350 : 330, gap = 16;
        const all = geometries(state);
        const geos = single ? [all[state.single]] : all;
        const W = cols * pw + (cols - 1) * gap, H = Math.ceil(geos.length / cols) * ph + (Math.ceil(geos.length / cols) - 1) * 18;
        frames = [];
        let body = '';
        const tops = [];
        geos.forEach(([kind, title, formula, color], i) => {
            const c = i % cols, r = Math.floor(i / cols);
            const out = panelSVG(kind, title, formula, color, c * (pw + gap), r * (ph + 18), pw, ph, 'live' + i, state);
            if (single) {
                // Also report the other rules so the live readout stays complete.
                all.forEach(([k2, t2], j) => { if (j !== state.single) { const a2 = attention(k2, state); const top2 = Object.entries(a2).sort((a, b) => b[1] - a[1])[0]; tops.push(`${t2.replace(/<[^>]+>/g, '')}: ${top2[0]} (${Math.round(100 * top2[1])}%)`); } });
            }
            body += out.svg;
            frames.push(out.frame);
            const top = Object.entries(out.att).sort((a, b) => b[1] - a[1])[0];
            tops.push(`${title.replace(/<[^>]+>/g, '')}: ${top[0]} (${Math.round(100 * top[1])}%)`);
        });
        const layoutKey = cols + (single ? 's' : '');
        if (!svgEl || layout !== layoutKey) {
            live.innerHTML = `<svg xmlns="${NS}" viewBox="0 0 ${W} ${H}" class="geo-svg" role="group" aria-label="Interactive geometry comparison. The query point can be moved with the arrow keys."><g class="geo-live-body"></g></svg>`;
            svgEl = live.querySelector('svg');
            svgEl.setAttribute('tabindex', '0');
            layout = layoutKey;
            bindPointer();
        }
        svgEl.setAttribute('viewBox', `0 0 ${W} ${H}`);
        svgEl.querySelector('.geo-live-body').innerHTML = body;
        clearTimeout(announce);
        announce = setTimeout(() => {
            readout.textContent = `Query at (${state.q[0].toFixed(2)}, ${state.q[1].toFixed(2)}). Most-attended key — ${tops.join('; ')}.`;
        }, 250);
    }

    function toToy(evt) {
        const pt = svgEl.createSVGPoint();
        pt.x = evt.clientX; pt.y = evt.clientY;
        const loc = pt.matrixTransform(svgEl.getScreenCTM().inverse());
        for (const f of frames) {
            const [[x0, y0], [x1, y1]] = f.box;
            if (loc.x >= x0 - 4 && loc.x <= x1 + 4 && loc.y >= y0 - 4 && loc.y <= y1 + 4) return f.inv(loc.x, loc.y);
        }
        return null;
    }
    function clamp(q) {
        const [x0, x1, y0, y1] = TOY.domain;
        return [Math.min(x1 - 0.05, Math.max(x0 + 0.05, q[0])), Math.min(y1 - 0.05, Math.max(y0 + 0.05, q[1]))];
    }
    function bindPointer() {
        let dragging = false;
        svgEl.addEventListener('pointerdown', e => {
            const q = toToy(e);
            if (!q) return;
            setPlaying(false);
            dragging = true;
            live.classList.add('is-dragging');
            svgEl.setPointerCapture(e.pointerId);
            state.q = clamp(q);
            render();
        });
        svgEl.addEventListener('pointermove', e => {
            if (!dragging) return;
            const q = toToy(e);
            if (q) { state.q = clamp(q); render(); }
        });
        const end = () => { dragging = false; live.classList.remove('is-dragging'); };
        svgEl.addEventListener('pointerup', end);
        svgEl.addEventListener('pointercancel', end);
        svgEl.addEventListener('keydown', e => {
            const step = e.shiftKey ? 0.25 : 0.05;
            const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key];
            if (!d) return;
            e.preventDefault();
            state.q = clamp([state.q[0] + d[0], state.q[1] + d[1]]);
            render();
        });
    }

    controls.addEventListener('input', e => {
        const k = e.target.dataset.k;
        if (!k) return;
        state[k] = Number(e.target.value);
        controls.querySelector('#geo-p-out').textContent = `p = ${state.p.toFixed(1)}`;
        controls.querySelector('#geo-a-out').textContent = `${state.angle}°`;
        render();
    });
    controls.querySelectorAll('[data-tab]').forEach(btn => btn.addEventListener('click', () => {
        state.single = Number(btn.dataset.tab);
        controls.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
        render();
    }));
    // Play: move the query round a loop so every rule can be watched responding at once.
    const playBtn = controls.querySelector('[data-play]');
    let orbit = 0, phase = -0.35;
    function setPlaying(on) {
        cancelAnimationFrame(orbit);
        orbit = 0;
        playBtn.setAttribute('aria-pressed', String(on));
        playBtn.textContent = on ? '❚❚ Pause' : '▶ Animate query';
        if (!on) return;
        let last = performance.now();
        const step = now => {
            phase += (now - last) / 1000 * 0.6;
            last = now;
            state.q = clamp([1.0 + 1.35 * Math.cos(phase), 0.7 + 0.95 * Math.sin(phase)]);
            render();
            orbit = requestAnimationFrame(step);
        };
        orbit = requestAnimationFrame(step);
    }
    let auto = false;
    playBtn.addEventListener('click', () => { auto = false; setPlaying(!orbit); });
    // The first time the explorer is seen, carry the query round one loop, then put it back.
    const calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!calm && 'IntersectionObserver' in window) {
        const seen = new IntersectionObserver(entries => {
            if (!entries.some(e => e.isIntersecting)) return;
            seen.disconnect();
            auto = true;
            setPlaying(true);
            setTimeout(() => { if (auto && orbit) { setPlaying(false); state.q = [...TOY.query]; render(); } }, 10500);
        }, { threshold: 0.5 });
        seen.observe(live);
    }
    controls.querySelector('[data-reset]').addEventListener('click', () => {
        setPlaying(false);
        Object.assign(state, { q: [...TOY.query], p: TOY.p, angle: TOY.angle });
        controls.querySelector('[data-k="p"]').value = state.p;
        controls.querySelector('[data-k="angle"]').value = state.angle;
        controls.querySelector('#geo-p-out').textContent = 'p = 1.0';
        controls.querySelector('#geo-a-out').textContent = '105°';
        render();
    });
    let resizeTimer = 0;
    window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(render, 120); });
    render();
}

// ---------------------------------------------------------------- stretching-geometry figure (overview hero)
// Same toy as the explorer. The compatibility rule cycles through the families the project uses:
// Euclidean, L_p (p from 1 to 4), a Mahalanobis metric that stretches and turns, cosine and the dot
// product. Rings and grid are the rule's ruler, the colour field is compatibility with q, and the list
// below re-ranks the keys by attention. The query and keys are never moved.
function initHero(fig) {
    const names = Object.keys(TOY.keys), W = 540, H = 420, GX = 108, GY = 84, ROW = 21, T = 28500;
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const smooth = t => t * t * (3 - 2 * t);
    const f = frame(0, 0, W, H), q = TOY.query, [x0, x1, y0, y1] = TOY.domain, [qx, qy] = f(...q);

    const head = document.createElement('div');
    head.className = 'geo-live-head';
    head.innerHTML = '<span class="geo-live-rule"></span><button type="button"></button>';
    const stage = document.createElement('div');
    stage.innerHTML = `<div class="geo-live-field"><canvas width="${GX}" height="${GY}"></canvas><svg xmlns="${NS}" viewBox="0 0 ${W} ${H}" class="geo-svg" role="img" aria-label="Animated toy: a distance grid stretches and turns under one query and seven fixed keys, and attention to the keys changes."></svg></div>` +
        `<ol class="geo-live-rank" style="height:${names.length * ROW}px" aria-label="Attention to each key, highest first">${names.map(n => `<li data-k="${n}"><span>${n}</span><span class="geo-meter-track"><span class="geo-bar geo-bar-teal"></span></span><span class="geo-meter-value"></span></li>`).join('')}</ol>`;
    const label = head.querySelector('span'), btn = head.querySelector('button');
    const ctx = stage.querySelector('canvas').getContext('2d'), img = ctx.createImageData(GX, GY), svgEl = stage.querySelector('svg');
    const rows = [...stage.querySelectorAll('li')];

    const field = new Float32Array(GX * GY), qn = Math.hypot(q[0], q[1]), COS_TAU = 0.15;
    const seg = (x, a, b) => smooth(Math.max(0, Math.min(1, (x - a) / (b - a))));
    const pt = p => p[0].toFixed(1) + ',' + p[1].toFixed(1);
    function draw(ms) {
        // Timeline (ms): Euclidean, p 2→1→4→2, metric stretches, turns and relaxes, then cosine, dot, back.
        const x = ms % T;
        const p = x < 5000 ? 2 - seg(x, 1500, 4000) : x < 7500 ? 1 + 3 * seg(x, 5000, 7500) : 4 - 2 * seg(x, 7500, 9000);
        const a = seg(x, 10000, 12000) - seg(x, 17000, 18500);
        const wCos = seg(x, 18500, 21000) - seg(x, 22000, 24500), wDot = seg(x, 22000, 24500) - seg(x, 25500, 28000);
        const wGeo = Math.max(0, 1 - wCos - wDot);
        const theta = x > 21500 ? 0 : (TOY.angle * seg(x, 9000, 10000) + 180 * seg(x, 12000, 17000)) * Math.PI / 180;
        const l1 = TOY.eig[0] ** a, l2 = TOY.eig[1] ** a, e1 = [Math.cos(theta), Math.sin(theta)], e2 = [-e1[1], e1[0]];
        const dist = (px, py) => {
            const dx = px - q[0], dy = py - q[1];
            if (a > 0) { const m1 = dx * e1[0] + dy * e1[1], m2 = dx * e2[0] + dy * e2[1]; return Math.sqrt(l1 * m1 * m1 + l2 * m2 * m2); }
            return (Math.abs(dx) ** p + Math.abs(dy) ** p) ** (1 / p);
        };
        // Between rules the logits are blended, so every frame is a valid softmax score.
        const logit = (px, py) => {
            const along = q[0] * px + q[1] * py;
            return (wGeo ? -wGeo * dist(px, py) / TOY.tau.l2 : 0) + (wCos ? wCos * along / (qn * (Math.hypot(px, py) || 1e-9)) / COS_TAU : 0) + (wDot ? wDot * along / TOY.tau.dot : 0);
        };
        // Colour field: how compatible each location is with q (softened so the slope stays visible).
        let peak = -Infinity;
        for (let j = 0, n = 0; j < GY; j++) for (let i = 0; i < GX; i++, n++) {
            const v = logit(x0 + (i + 0.5) / GX * (x1 - x0), y1 - (j + 0.5) / GY * (y1 - y0));
            field[n] = v;
            if (v > peak) peak = v;
        }
        for (let n = 0; n < field.length; n++) {
            const v = Math.exp(0.2 * (field[n] - peak));
            img.data[4 * n] = 251 - 141 * v; img.data[4 * n + 1] = 251 - 55 * v; img.data[4 * n + 2] = 250 - 50 * v; img.data[4 * n + 3] = 255;
        }
        ctx.putImageData(img, 0, 0);
        // Softmax attention over the keys under the current rule.
        const logits = names.map(n => logit(...TOY.keys[n])), top = Math.max(...logits);
        const w = logits.map(v => Math.exp(v - top)), z = w.reduce((m, c) => m + c, 0);
        const att = Object.fromEntries(names.map((n, i) => [n, w[i] / z]));
        let s = '';
        if (wGeo > 0.01) {
            // Distance rules: a grid of unit cells plus equal-distance rings around q.
            const at = (u, v) => f(q[0] + u * e1[0] + v * e2[0], q[1] + u * e1[1] + v * e2[1]);
            let g = '';
            for (let n = -30; n <= 30; n++) {
                const c = 0.3 * n;
                g += `<path d="M${pt(at(c / Math.sqrt(l1), -9))}L${pt(at(c / Math.sqrt(l1), 9))}M${pt(at(-9, c / Math.sqrt(l2)))}L${pt(at(9, c / Math.sqrt(l2)))}" stroke="${C.navy}" stroke-opacity="${n % 2 === 0 ? 0.26 : 0.11}" fill="none"/>`;
            }
            for (const r of [0.3, 0.6, 0.9, 1.2, 1.5, 1.8]) {
                const ring = [];
                for (let j = 0; j <= 96; j++) {
                    const t = 2 * Math.PI * j / 96, c = Math.cos(t), sn = Math.sin(t);
                    ring.push(pt(a > 0 ? at(r * c / Math.sqrt(l1), r * sn / Math.sqrt(l2))
                        : f(q[0] + r * Math.sign(c) * Math.abs(c) ** (2 / p), q[1] + r * Math.sign(sn) * Math.abs(sn) ** (2 / p))));
                }
                const main = r === 0.6 || r === 1.2;
                g += `<path d="M${ring.join('L')}Z" fill="none" stroke="${C.tealInk}" stroke-width="${main ? 1.8 : 0.9}" stroke-opacity="${main ? 1 : 0.5}"/>`;
            }
            s += `<g opacity="${wGeo.toFixed(2)}">${g}</g>`;
        }
        if (wCos > 0.01) {
            // Cosine: only the direction from the origin matters, so the level sets are rays.
            const base = Math.atan2(q[1], q[0]);
            let g = '';
            for (let k = -11; k <= 12; k++) {
                const ang = base + k * Math.PI / 12;
                g += `<path d="M${pt(f(0, 0))}L${pt(f(9 * Math.cos(ang), 9 * Math.sin(ang)))}" stroke="${C.tealInk}" stroke-width="${k === 0 ? 1.8 : 0.9}" stroke-opacity="${k === 0 ? 1 : 0.5}" fill="none"/>`;
            }
            s += `<g opacity="${wCos.toFixed(2)}">${g}</g>`;
        }
        if (wDot > 0.01) {
            // Dot product: level sets are lines across q's direction; further along q scores higher.
            const u = [q[0] / qn, q[1] / qn], v = [-u[1], u[0]];
            let g = '';
            for (let c = -2.25; c <= 4.5; c += 0.75) {
                g += `<path d="M${pt(f(u[0] * c - v[0] * 9, u[1] * c - v[1] * 9))}L${pt(f(u[0] * c + v[0] * 9, u[1] * c + v[1] * 9))}" stroke="${C.tealInk}" stroke-width="${Math.abs(c - 1.5) < 0.01 ? 1.8 : 0.9}" stroke-opacity=".6" fill="none"/>`;
            }
            s += `<g opacity="${wDot.toFixed(2)}">${g}</g>`;
        }
        if (wCos + wDot > 0.01) {
            const [ox, oy] = f(0, 0);
            s += `<g opacity="${Math.min(1, wCos + wDot).toFixed(2)}"><path d="M${ox - 6},${oy}h12M${ox},${oy - 6}v12" stroke="${C.navy}" stroke-width="1.6"/><text class="gf-t gf-m" x="${ox + 8}" y="${oy + 16}" font-size="14">origin</text></g>`;
        }
        let dots = '';
        for (const n of names) {
            const [kx, ky] = f(...TOY.keys[n]), v = att[n];
            s += `<line x1="${qx.toFixed(1)}" y1="${qy.toFixed(1)}" x2="${kx.toFixed(1)}" y2="${ky.toFixed(1)}" stroke="${C.navy}" stroke-width="${(0.5 + 9 * v).toFixed(2)}" stroke-opacity="${(0.15 + 0.75 * v).toFixed(2)}" stroke-linecap="round"/>`;
            dots += `<circle cx="${kx.toFixed(1)}" cy="${ky.toFixed(1)}" r="6.5" fill="#fff" stroke="${C.navy}" stroke-width="1.8"/><text class="gf-t gf-h gf-strong" x="${(kx + 10).toFixed(1)}" y="${(ky - 9).toFixed(1)}" font-size="17">${n}</text>`;
        }
        svgEl.innerHTML = s + dots + `<circle cx="${qx.toFixed(1)}" cy="${qy.toFixed(1)}" r="9" fill="${C.navy}" stroke="#fff" stroke-width="2.5"/><text class="gf-x" x="${(qx - 6).toFixed(1)}" y="${(qy - 15).toFixed(1)}" font-size="20">q</text>`;
        // Ranking: rows slide to their new place as the order changes.
        const order = [...names].sort((m, n) => att[n] - att[m]);
        rows.forEach(li => {
            const n = li.dataset.k;
            li.style.transform = `translateY(${order.indexOf(n) * ROW}px)`;
            li.classList.toggle('is-top', order[0] === n);
            li.querySelector('.geo-bar').style.width = `${(100 * att[n]).toFixed(1)}%`;
            li.querySelector('.geo-meter-value').textContent = `${Math.round(100 * att[n])}%`;
        });
        label.textContent = wDot > 0.5 ? 'Dot product: further along q scores higher'
            : wCos > 0.5 ? 'Cosine: only direction matters'
            : a > 0.03 ? 'Mahalanobis metric: one direction is cheap'
            : Math.abs(p - 2) > 0.05 ? `Lp distance, p = ${p.toFixed(1)}` : 'Euclidean distance';
    }

    let t = reduced ? 13500 : 0, last = 0, raf = 0, playing = !reduced, visible = !('IntersectionObserver' in window);
    const tick = now => { t += Math.min(now - last, 100); last = now; draw(t); raf = requestAnimationFrame(tick); };
    const sync = () => {
        cancelAnimationFrame(raf);
        btn.textContent = playing ? '❚❚ Pause' : '▶ Play';
        if (playing && visible) { last = performance.now(); raf = requestAnimationFrame(tick); }
    };
    btn.addEventListener('click', () => { playing = !playing; sync(); });
    fig.querySelector('.geo-live-static').hidden = true;
    fig.prepend(head);
    head.after(stage);
    fig.classList.add('is-live');
    draw(t);
    if (!visible) new IntersectionObserver(es => { visible = es.some(e => e.isIntersecting); sync(); }, { threshold: 0.2 }).observe(fig);
    sync();
    // Exposed so a frame at any time can be rendered and checked without waiting for playback.
    window.__geoaftHeroFrame = draw;
}

// Blocks marked data-reveal animate once when they scroll into view: bars grow (CSS), numbers
// marked data-count count up to their printed value, children of data-reveal="rise" enter in
// sequence, and data-flow diagrams assemble piece by piece and then run their arrows for a few seconds.
function countUp(el) {
    const final = el.textContent, m = final.match(/^([\d,]*\.?\d+)(.*)$/);
    if (!m) return;
    const target = Number(m[1].replace(/,/g, '')), decimals = (m[1].split('.')[1] || '').length, grouped = m[1].includes(',');
    const t0 = performance.now();
    const step = now => {
        const t = Math.min(1, (now - t0) / 1100), v = target * (1 - (1 - t) ** 3);
        el.textContent = t < 1 ? (grouped ? Math.round(v).toLocaleString('en-US') : v.toFixed(decimals)) + m[2] : final;
        if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}
function revealOnScroll() {
    const targets = document.querySelectorAll('.geo [data-reveal]');
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!targets.length || reduced || !('IntersectionObserver' in window)) return;
    document.querySelectorAll('.geo').forEach(el => el.classList.add('geo-anim'));
    targets.forEach(t => {
        if (t.dataset.reveal === 'rise') [...t.children].forEach((c, i) => c.style.setProperty('--i', i));
        if (t.hasAttribute('data-flow')) t.querySelectorAll('svg').forEach(svg => [...svg.children].forEach((c, i) => c.style.setProperty('--i', i)));
    });
    const io = new IntersectionObserver(entries => entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target;
        io.unobserve(el);
        el.classList.add('is-in');
        el.querySelectorAll('[data-count]').forEach(countUp);
        if (el.hasAttribute('data-flow')) {
            const arrows = el.querySelectorAll('svg [marker-end]');
            arrows.forEach(a => a.classList.add('gf-flow'));
            setTimeout(() => arrows.forEach(a => a.classList.remove('gf-flow')), 5200);
        }
    }), { threshold: 0.2 });
    targets.forEach(t => io.observe(t));
}

// The page head (overview hero, details title block) stays put and fades while the content below
// slides up over it; geoaft.css pins it on tall, wide screens.
function heroFade() {
    const hero = document.querySelector('.geo-overview .geo-hero, .geo-details-head');
    if (!hero || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    const update = () => {
        // Only where the stylesheet has pinned the hero; on small screens it scrolls away normally.
        const pinned = getComputedStyle(hero).position === 'sticky';
        const p = pinned ? Math.max(0, Math.min(1, window.scrollY / (hero.offsetHeight * 0.6))) : 0;
        hero.style.opacity = (1 - p).toFixed(3);
        hero.style.transform = p ? `scale(${(1 - 0.04 * p).toFixed(4)})` : '';
        hero.style.visibility = p === 1 ? 'hidden' : '';
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
}

// The per-method scatter: hovering a point names it below the figure; hovering or clicking a legend
// entry isolates that method family. The static SVG (with <title> tooltips) works without this.
function initScatter(fig) {
    const readout = document.createElement('p');
    readout.className = 'geo-explorer-readout';
    readout.setAttribute('aria-live', 'polite');
    const hint = 'Hover a point to see the method, its parameter count and its recovery.';
    readout.textContent = hint;
    fig.querySelector('figcaption').before(readout);
    let pinned = null;
    const isolate = family => fig.querySelectorAll('.gf-pt').forEach(pt => pt.classList.toggle('is-dim', !!family && pt.dataset.family !== family));
    const markKeys = () => fig.querySelectorAll('.gf-key').forEach(k => k.classList.toggle('is-on', k.dataset.family === pinned));
    fig.addEventListener('pointerover', e => {
        const pt = e.target.closest('.gf-pt'), key = e.target.closest('.gf-key');
        if (pt) readout.textContent = pt.dataset.label;
        if (key) isolate(key.dataset.family);
    });
    fig.addEventListener('pointerout', e => {
        if (e.target.closest('.gf-pt')) readout.textContent = hint;
        if (e.target.closest('.gf-key')) isolate(pinned);
    });
    fig.addEventListener('click', e => {
        const key = e.target.closest('.gf-key');
        if (!key) return;
        pinned = pinned === key.dataset.family ? null : key.dataset.family;
        isolate(pinned);
        markKeys();
    });
    fig.classList.add('is-live');
}

// A thin bar under the site header showing how far down the details page the reader is.
function readingProgress() {
    const page = document.querySelector('.geo-details');
    if (!page) return;
    const bar = document.createElement('div');
    bar.className = 'geo-progress';
    bar.setAttribute('aria-hidden', 'true');
    bar.innerHTML = '<span></span>';
    page.append(bar);
    const fill = bar.firstChild;
    let queued = false;
    const update = () => {
        queued = false;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        fill.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
    };
    window.addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
    update();
}

if (root) {
    syncHeaderOffset();
    window.addEventListener('load', syncHeaderOffset);
    window.addEventListener('resize', syncHeaderOffset);
    const header = document.getElementById('header');
    if (header && 'ResizeObserver' in window) new ResizeObserver(syncHeaderOffset).observe(header);
    trackSections(document.querySelector('.geo-details-toc'));
    revealOnScroll();
    readingProgress();
    autoHideNav();
    heroFade();
    document.querySelectorAll('[data-geo-scatter]').forEach(initScatter);
    document.querySelectorAll('[data-geo-hero]').forEach(fig => {
        try { initHero(fig); } catch (err) { console.warn('GeoAFT hero figure unavailable; showing static figure.', err); }
    });
    document.querySelectorAll('[data-geo-explorer]').forEach(fig => {
        try { initExplorer(fig); } catch (err) { console.warn('GeoAFT explorer unavailable; showing static figure.', err); }
    });
    // Exposed for automated parity checks against toy.json.
    window.__geoaftAttention = (kind, q = TOY.query) => attention(kind, { q, p: TOY.p, angle: TOY.angle });
}

// Shared with the explainer animatic (Website/tools/geoaft/video), which reuses the same geometry.
export { TOY, attention, geometries, panelSVG };
