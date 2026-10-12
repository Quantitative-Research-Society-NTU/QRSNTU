// Candidate hero illustrations for "changing the geometry" (projects/geoaft/test/).
// Three treatments of the same toy as geoaft.js: one query, seven fixed keys, and a compatibility
// rule that changes while the points stay put. Review page only; not linked from the site.
import { TOY, score, frame, contours, C } from './geoaft.js';

const NS = 'http://www.w3.org/2000/svg';
const names = Object.keys(TOY.keys);
const W = 540, H = 420;   // same aspect as TOY.domain, so frame() fills it exactly
const base = { q: TOY.query, p: TOY.p, angle: TOY.angle };
const smooth = t => t * t * (3 - 2 * t);
const softmax = logits => {
    const top = Math.max(...logits), w = logits.map(v => Math.exp(v - top)), z = w.reduce((a, b) => a + b, 0);
    return Object.fromEntries(names.map((n, i) => [n, w[i] / z]));
};

// Shared timeline for A and C: hold each rule, then blend its logits into the next one.
const PHASES = [['dot', 'Dot product (pretrained)'], ['l2', 'Euclidean distance'], ['lp', 'L1 (taxicab) distance'], ['maha', 'Mahalanobis metric']];
const HOLD = 1500, MORPH = 2600;
function blend(ms) {
    const seg = HOLD + MORPH, i = Math.floor(ms / seg) % PHASES.length, r = ms % seg;
    const u = r < HOLD ? 0 : smooth((r - HOLD) / MORPH), next = (i + 1) % PHASES.length;
    const w = { dot: 0, l2: 0, lp: 0, maha: 0 };
    w[PHASES[i][0]] += 1 - u;
    w[PHASES[next][0]] += u;
    return { w, label: u === 0 ? PHASES[i][1] : `${PHASES[i][1]} → ${PHASES[next][1]}` };
}
const blended = (w, k) => Object.keys(w).reduce((s, kind) => (w[kind] ? s + w[kind] * score(kind, TOY.query, k, base) / TOY.tau[kind] : s), 0);

function points(f, att) {
    const [qx, qy] = f(...TOY.query);
    let rays = '', dots = '';
    for (const n of names) {
        const [kx, ky] = f(...TOY.keys[n]), a = att[n];
        rays += `<line x1="${qx.toFixed(1)}" y1="${qy.toFixed(1)}" x2="${kx.toFixed(1)}" y2="${ky.toFixed(1)}" stroke="${C.navy}" stroke-width="${(0.5 + 9 * a).toFixed(2)}" stroke-opacity="${(0.15 + 0.75 * a).toFixed(2)}" stroke-linecap="round"/>`;
        const pct = a >= 0.15 ? ` <tspan class="gf-strong" style="fill:${C.navy}">${Math.round(100 * a)}%</tspan>` : '';
        dots += `<circle cx="${kx.toFixed(1)}" cy="${ky.toFixed(1)}" r="6" fill="#fff" stroke="${C.key}" stroke-width="1.6"/><text class="gf-t gf-h" x="${(kx + 9).toFixed(1)}" y="${(ky - 8).toFixed(1)}" font-size="15">${n}${pct}</text>`;
    }
    return rays + dots + `<circle cx="${qx.toFixed(1)}" cy="${qy.toFixed(1)}" r="8" fill="${C.navy}" stroke="#fff" stroke-width="2.5"/><text class="gf-x" x="${(qx - 6).toFixed(1)}" y="${(qy - 14).toFixed(1)}" font-size="18">q</text>`;
}
function bars(att, y) {
    const bw = (W - 16) / names.length, mx = Math.max(...Object.values(att));
    let s = `<line x1="8" y1="${y + 34}" x2="${W - 8}" y2="${y + 34}" stroke="${C.rule}"/>`;
    names.forEach((n, i) => {
        const a = att[n], bx = 8 + i * bw + bw * 0.2, h = 32 * a / mx;
        s += `<rect x="${bx.toFixed(1)}" y="${(y + 34 - h).toFixed(1)}" width="${(bw * 0.6).toFixed(1)}" height="${Math.max(h, 0.8).toFixed(1)}" rx="2" fill="${C.teal}" fill-opacity="${a === mx ? 1 : 0.4}"/>`;
        s += `<text class="gf-t gf-m" x="${(bx + bw * 0.3).toFixed(1)}" y="${y + 50}" font-size="13" text-anchor="middle">${n}</text>`;
    });
    return s;
}
const plot = inner => `<svg xmlns="${NS}" viewBox="0 0 ${W} ${H + 58}" class="geo-svg" role="img" aria-label="Animated toy: attention from one query to seven fixed keys as the compatibility rule changes."><rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="8" fill="#fbfbfa" stroke="${C.rule}"/><clipPath id="CLIP"><rect width="${W}" height="${H}" rx="8"/></clipPath>${inner}</svg>`;

// A. Contours: the level sets of the rule morph around q.
function drawContours(stage, ms) {
    const { w, label } = blend(ms), f = frame(0, 0, W, H);
    const att = softmax(names.map(n => blended(w, TOY.keys[n])));
    let rings = '';
    for (const kind of Object.keys(w)) if (w[kind] > 0.01) rings += `<g opacity="${w[kind].toFixed(2)}">${contours(kind, f, base)}</g>`;
    stage.innerHTML = plot(`<g clip-path="url(#clip-a)">${rings}</g>${points(f, att)}${bars(att, H + 6)}`).replace('CLIP', 'clip-a');
    return label;
}

// B. Ruler: a grid whose every cell is one unit of distance under the current metric.
function drawRuler(stage, ms) {
    const T = 13000, x = ms % T;
    const a = x < 2500 ? smooth(x / 2500) : x < 9500 ? 1 : x < 12000 ? 1 - smooth((x - 9500) / 2500) : 0;
    const theta = (TOY.angle + (x < 2500 ? 0 : x < 9500 ? 180 * smooth((x - 2500) / 7000) : 180)) * Math.PI / 180;
    const l1 = TOY.eig[0] ** a, l2 = TOY.eig[1] ** a, e1 = [Math.cos(theta), Math.sin(theta)], e2 = [-e1[1], e1[0]];
    const q = TOY.query, f = frame(0, 0, W, H);
    const dist = k => { const dx = k[0] - q[0], dy = k[1] - q[1], m1 = dx * e1[0] + dy * e1[1], m2 = dx * e2[0] + dy * e2[1]; return Math.sqrt(l1 * m1 * m1 + l2 * m2 * m2); };
    const att = softmax(names.map(n => -dist(TOY.keys[n]) / TOY.tau.maha));
    const at = (u, v) => f(q[0] + u * e1[0] + v * e2[0], q[1] + u * e1[1] + v * e2[1]);
    let grid = '';
    for (let n = -30; n <= 30; n++) {
        const c = 0.3 * n, major = n % 2 === 0 ? 0.5 : 0.22;
        const [a1, b1] = [at(c / Math.sqrt(l1), -9), at(c / Math.sqrt(l1), 9)], [a2, b2] = [at(-9, c / Math.sqrt(l2)), at(9, c / Math.sqrt(l2))];
        grid += `<path d="M${a1[0].toFixed(1)},${a1[1].toFixed(1)}L${b1[0].toFixed(1)},${b1[1].toFixed(1)}M${a2[0].toFixed(1)},${a2[1].toFixed(1)}L${b2[0].toFixed(1)},${b2[1].toFixed(1)}" stroke="${C.teal}" stroke-opacity="${major}" fill="none"/>`;
    }
    for (const r of [0.6, 1.2]) {
        const pts = [];
        for (let j = 0; j <= 72; j++) { const t = 2 * Math.PI * j / 72; pts.push(at(r * Math.cos(t) / Math.sqrt(l1), r * Math.sin(t) / Math.sqrt(l2)).map(v => v.toFixed(1)).join(',')); }
        grid += `<path d="M${pts.join('L')}Z" fill="${C.teal}" fill-opacity="${r < 1 ? 0.12 : 0.05}" stroke="${C.tealInk}" stroke-width="1.6"/>`;
    }
    stage.innerHTML = plot(`<g clip-path="url(#clip-b)">${grid}</g>${points(f, att)}${bars(att, H + 6)}`).replace('CLIP', 'clip-b');
    return a < 0.03 ? 'Euclidean: every direction costs the same' : 'Mahalanobis: one direction is cheap, the other expensive';
}

// C. Landscape: the compatibility of every location with q, plus a live ranking of the keys.
const GX = 108, GY = 84, ROW = 27;
function drawField(stage, ms) {
    if (!stage.firstChild) {
        stage.innerHTML = `<div class="geo-opt-field"><canvas width="${GX}" height="${GY}"></canvas><svg xmlns="${NS}" viewBox="0 0 ${W} ${H}" class="geo-svg" role="img" aria-label="Animated toy: a compatibility landscape around one query, with seven fixed keys."></svg></div>` +
            `<ol class="geo-opt-rank" style="height:${names.length * ROW}px">${names.map(n => `<li data-k="${n}"><span>${n}</span><span class="geo-meter-track"><span class="geo-bar geo-bar-teal"></span></span><span class="geo-meter-value"></span></li>`).join('')}</ol>`;
    }
    const { w, label } = blend(ms), f = frame(0, 0, W, H), [x0, x1, y0, y1] = TOY.domain;
    const ctx = stage.querySelector('canvas').getContext('2d'), img = ctx.createImageData(GX, GY), field = new Float32Array(GX * GY);
    let top = -Infinity;
    for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) {
        const v = blended(w, [x0 + (i + 0.5) / GX * (x1 - x0), y1 - (j + 0.5) / GY * (y1 - y0)]);
        field[j * GX + i] = v;
        if (v > top) top = v;
    }
    for (let n = 0; n < field.length; n++) {
        const v = Math.exp((field[n] - top) / 2.4);   // softened so the whole slope stays visible
        img.data[4 * n] = 251 - 196 * v; img.data[4 * n + 1] = 251 - 60 * v; img.data[4 * n + 2] = 250 - 52 * v; img.data[4 * n + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    const att = softmax(names.map(n => blended(w, TOY.keys[n])));
    stage.querySelector('svg').innerHTML = points(f, att);
    const order = [...names].sort((a, b) => att[b] - att[a]);
    stage.querySelectorAll('.geo-opt-rank li').forEach(li => {
        const n = li.dataset.k;
        li.style.transform = `translateY(${order.indexOf(n) * ROW}px)`;
        li.querySelector('.geo-bar').style.width = `${(100 * att[n]).toFixed(1)}%`;
        li.querySelector('.geo-meter-value').textContent = `${Math.round(100 * att[n])}%`;
    });
    return label;
}

function mount(fig, draw, startAt) {
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const head = document.createElement('div');
    head.className = 'geo-opt-head';
    head.innerHTML = '<span class="geo-opt-rule"></span><button type="button"></button>';
    const stage = document.createElement('div');
    stage.className = 'geo-opt-stage';
    fig.prepend(head);
    head.after(stage);
    const label = head.querySelector('span'), btn = head.querySelector('button');
    let t = startAt, last = 0, raf = 0, playing = false, visible = false;
    const tick = now => { t += Math.min(now - last, 100); last = now; label.textContent = draw(stage, t); raf = requestAnimationFrame(tick); };
    const sync = () => {
        cancelAnimationFrame(raf);
        btn.textContent = playing ? '❚❚ Pause' : '▶ Play';
        if (playing && visible) { last = performance.now(); raf = requestAnimationFrame(tick); }
    };
    btn.addEventListener('click', () => { playing = !playing; sync(); });
    label.textContent = draw(stage, t);
    playing = !reduced;
    if ('IntersectionObserver' in window) new IntersectionObserver(es => { visible = es.some(e => e.isIntersecting); sync(); }, { threshold: 0.2 }).observe(fig);
    else visible = true;
    sync();
}

const DRAW = { a: [drawContours, 0], b: [drawRuler, 0], c: [drawField, 0] };
// Exposed so a frame at any time can be rendered and checked without waiting for playback.
window.__geoaftOptions = DRAW;
document.querySelectorAll('[data-geo-opt]').forEach(fig => {
    const [draw, startAt] = DRAW[fig.dataset.geoOpt];
    try { mount(fig, draw, startAt); } catch (err) { console.warn('GeoAFT option figure failed.', err); }
});
