// Post-training explainer: page behaviour and the interactive figures. Scoped to .pt.
// Everything here is optional: without JavaScript each figure shows a static SVG that
// build_figures.mjs renders from the same functions below (FIGS[name].render).
// Every figure is deterministic. Random draws come from a seeded generator, so a given state always
// renders the same picture. All probabilities and rewards in the figures are illustrative toys.

const HAS_DOM = typeof document !== 'undefined';
const root = HAS_DOM ? document.querySelector('.pt') : null;
const REDUCED = HAS_DOM && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const NS = 'http://www.w3.org/2000/svg';
const C = {
    ink: '#11182c', body: '#374151', muted: '#6b7280', rule: '#dfe3e8', grid: '#eef0f3', soft: '#f7f8f7',
    navy: '#183b63', teal: '#00929a', tealInk: '#006f76', tealTint: '#e2f3f3',
    ochre: '#c05f0c', ochreInk: '#93480a', ochreTint: '#fbeee2', gray: '#8b95a3', violet: '#7a5ea8',
};

// ------------------------------------------------------------------ small helpers
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = t => t * t * (3 - 2 * t);
const sigmoid = z => 1 / (1 + Math.exp(-z));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const n1 = v => (Math.round(v * 10) / 10).toString();
const pct = (v, d = 0) => (100 * v).toFixed(d) + '%';
const num = (v, d = 2) => v.toFixed(d).replace(/^-/, '−');  // true minus sign in readouts
function softmax(logits) {
    const m = Math.max(...logits), w = logits.map(v => Math.exp(v - m)), z = w.reduce((a, b) => a + b, 0);
    return w.map(v => v / z);
}
function mix(a, b, t) {
    const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
    const [x, y] = [p(a), p(b)];
    return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * clamp(t, 0, 1)).toString(16).padStart(2, '0')).join('');
}
function rng(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function gauss(r) { const u = Math.max(r(), 1e-12), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

function T(x, y, s, o = {}) {
    const { size = 13, anchor = 'start', cls = '', fill = '' } = o;
    return `<text class="pf-t${cls ? ' ' + cls : ''}" x="${n1(x)}" y="${n1(y)}" font-size="${size}"${anchor !== 'start' ? ` text-anchor="${anchor}"` : ''}${fill ? ` style="fill:${fill}"` : ''}>${s}</text>`;
}
const L = (x1, y1, x2, y2, stroke, w = 1, extra = '') => `<line x1="${n1(x1)}" y1="${n1(y1)}" x2="${n1(x2)}" y2="${n1(y2)}" stroke="${stroke}" stroke-width="${w}"${extra ? ' ' + extra : ''}/>`;
const R = (x, y, w, h, fill, extra = '') => `<rect x="${n1(x)}" y="${n1(y)}" width="${n1(Math.max(0, w))}" height="${n1(Math.max(0, h))}" fill="${fill}"${extra ? ' ' + extra : ''}/>`;
const P = (pts, stroke, w = 1.6, extra = '') => `<path d="M${pts.map(p => n1(p[0]) + ',' + n1(p[1])).join('L')}" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"${extra ? ' ' + extra : ''}/>`;
const svg = (W, H, label, body) => `<svg xmlns="${NS}" viewBox="0 0 ${W} ${H}" class="pt-svg" role="img" aria-label="${esc(label)}">${body}</svg>`;
const ITAL = s => `<tspan class="pf-x">${s}</tspan>`;
const SUB = s => `<tspan baseline-shift="sub" font-size="0.72em">${s}</tspan>`;
const SUP = s => `<tspan baseline-shift="super" font-size="0.72em">${s}</tspan>`;

// A plotting frame: data ranges to pixel box.
function frame(x, y, w, h, xr, yr) {
    const sx = v => x + (v - xr[0]) / (xr[1] - xr[0]) * w;
    const sy = v => y + h - (v - yr[0]) / (yr[1] - yr[0]) * h;
    return { x, y, w, h, sx, sy, xr, yr };
}
function axes(F, { xt = [], yt = [], xl = '', yl = '', fx = String, fy = String, zero = false } = {}) {
    let s = '';
    for (const v of yt) s += L(F.x, F.sy(v), F.x + F.w, F.sy(v), C.grid) + T(F.x - 6, F.sy(v) + 4, fy(v), { size: 11, anchor: 'end', cls: 'pf-m' });
    for (const v of xt) s += L(F.sx(v), F.y + F.h, F.sx(v), F.y + F.h + 4, C.rule) + T(F.sx(v), F.y + F.h + 17, fx(v), { size: 11, anchor: 'middle', cls: 'pf-m' });
    s += L(F.x, F.y + F.h, F.x + F.w, F.y + F.h, '#b9c0ca');
    if (zero && F.yr[0] < 0 && F.yr[1] > 0) s += L(F.x, F.sy(0), F.x + F.w, F.sy(0), '#b9c0ca');
    if (xl) s += T(F.x + F.w / 2, F.y + F.h + 34, xl, { size: 12, anchor: 'middle' });
    if (yl) s += T(F.x, F.y - 10, yl, { size: 12 });
    return s;
}

// ------------------------------------------------------------------ figure mounting
// Each figure: { state(), controls(state), render(state, narrow) -> { svg, say }, bind(ctx) }.
function debounce(fn, ms = 120) { let t = 0; return () => { clearTimeout(t); t = setTimeout(fn, ms); }; }
function onFirstView(el, fn) {
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); fn(); } }, { threshold: 0.45 });
    io.observe(el);
}
function range(key, label, min, max, step, value, out) {
    return `<label class="pt-range"><span>${label}</span><input type="range" data-k="${key}" min="${min}" max="${max}" step="${step}" value="${value}"><output data-o="${key}">${out}</output></label>`;
}
function mount(fig, spec) {
    const stat = fig.querySelector('.pt-static');
    if (stat) stat.hidden = true;
    const cap = fig.querySelector('figcaption');
    const controls = document.createElement('div');
    controls.className = 'pt-controls';
    const stage = document.createElement('div');
    stage.className = 'pt-stage';
    const readout = document.createElement('p');
    readout.className = 'pt-readout';
    readout.setAttribute('aria-live', 'polite');
    const state = spec.state();
    controls.innerHTML = spec.controls ? spec.controls(state) : '';
    fig.insertBefore(controls, cap);
    fig.insertBefore(stage, cap);
    fig.insertBefore(readout, cap);
    fig.classList.add('is-live');
    const ctx = { fig, controls, stage, readout, state, narrow: false };
    ctx.busy = on => readout.setAttribute('aria-live', on ? 'off' : 'polite');
    ctx.draw = () => {
        ctx.narrow = (stage.clientWidth || fig.clientWidth || 760) < 560;
        const out = spec.render(ctx.state, ctx.narrow);
        stage.innerHTML = out.svg;
        if (out.say !== undefined) readout.textContent = out.say;
        if (spec.after) spec.after(ctx, out);
    };
    ctx.output = (key, text) => { const o = controls.querySelector(`[data-o="${key}"]`); if (o) o.textContent = text; };
    window.addEventListener('resize', debounce(ctx.draw));
    if (spec.bind) spec.bind(ctx);
    ctx.draw();
    return ctx;
}

// ------------------------------------------------------------------ hero: one prompt, three stages
// Probabilities over five whole responses. Between stages the log-probabilities are blended and
// renormalised, so every frame is a valid distribution. Rows move to their rank with a soft rank,
// so the frame is a pure function of time (no CSS transitions).
const HERO = {
    rows: ['What is the capital of Germany?', 'France is a country in Western Europe, bordered by…', 'Paris.', 'The capital of France is Paris.', 'Lyon.'],
    notes: ['continues the quiz', 'keeps writing', 'answers', 'answers in full', 'wrong'],
    stages: [
        { name: 'Base model', label: 'Base model: it continues the document', p: [0.44, 0.27, 0.12, 0.07, 0.10] },
        { name: 'After SFT', label: 'After SFT: it answers the question', p: [0.04, 0.12, 0.40, 0.30, 0.14] },
        { name: 'After preference tuning', label: 'After preference tuning: the answer raters preferred', p: [0.01, 0.03, 0.17, 0.74, 0.05] },
    ],
    period: 15000,
};
function heroAt(ms) {
    const t = ((ms % HERO.period) + HERO.period) % HERO.period;
    const seg = (a, b) => smooth(clamp((t - a) / (b - a), 0, 1));
    if (t < 3000) return [0, 0, 0];
    if (t < 4500) return [0, 1, seg(3000, 4500)];
    if (t < 8000) return [1, 1, 0];
    if (t < 9500) return [1, 2, seg(8000, 9500)];
    if (t < 13500) return [2, 2, 0];
    return [2, 0, seg(13500, 15000)];
}
function heroSVG(from, to, w, narrow = false) {
    const a = HERO.stages[from].p, b = HERO.stages[to].p;
    const p = softmax(a.map((v, i) => (1 - w) * Math.log(v) + w * Math.log(b[i])));
    const level = ((from === 0 ? 0 : 1) * (1 - w) + (to === 0 ? 0 : 1) * w);
    const colour = mix(C.navy, C.teal, level);
    const W = narrow ? 350 : 460, ROW = 50, TOP = 76, BW = narrow ? 280 : 280;
    let s = R(0, 0, W, 50, C.soft, 'rx="8"');
    s += T(14, 21, 'User', { size: 12, cls: 'pf-m' }) + T(14, 40, 'What is the capital of France?', { size: 16, cls: 'pf-h' });
    s += T(0, 68, 'Probability of each whole reply', { size: 12, cls: 'pf-m' });
    HERO.rows.forEach((text, i) => {
        let rank = 0;
        p.forEach((q, j) => { if (j !== i) rank += sigmoid((q - p[i]) / 0.005); });
        const y = TOP + rank * ROW;
        const top = rank < 0.5;
        s += `<g transform="translate(0 ${n1(y)})">`;
        s += T(0, 15, esc(narrow && text.length > 40 ? text.slice(0, 38) + '…' : text), { size: 14, cls: top ? 'pf-h' : '' });
        s += R(0, 23, BW, 12, C.grid, 'rx="3"') + R(0, 23, BW * p[i], 12, colour, `rx="3" opacity="${top ? 1 : 0.55}"`);
        s += T(BW + 10, 34, pct(p[i]), { size: 14, cls: top ? 'pf-h pf-strong' : 'pf-m' });
        if (!narrow) s += T(BW + 52, 34, HERO.notes[i], { size: 11.5, cls: 'pf-m' });
        s += '</g>';
    });
    const label = (w < 0.5 ? HERO.stages[from] : HERO.stages[to]).label;
    return { svg: svg(W, TOP + 5 * ROW - 6, 'Animated toy: the probabilities a language model gives to five possible replies, before and after each stage of post-training.', s), label, stage: w < 0.5 ? from : to };
}
function initHero(fig) {
    const head = document.createElement('div');
    head.className = 'pt-live-head';
    head.innerHTML = '<span class="pt-live-label"></span><button type="button"></button>';
    const stage = document.createElement('div');
    stage.className = 'pt-live-stage';
    const chips = document.createElement('div');
    chips.className = 'pt-live-chips';
    chips.setAttribute('role', 'group');
    chips.setAttribute('aria-label', 'Show a stage');
    chips.innerHTML = HERO.stages.map((st, i) => `<button type="button" data-stage="${i}">${['Base', 'SFT', 'Preference'][i]}</button>`).join('<span aria-hidden="true">→</span>');
    const label = head.querySelector('span'), btn = head.querySelector('button');
    const holds = [1500, 6000, 11500];
    let t = REDUCED ? holds[2] : 0, last = 0, raf = 0, playing = !REDUCED, visible = !('IntersectionObserver' in window);
    const draw = ms => {
        const [a, b, w] = heroAt(ms), out = heroSVG(a, b, w, stage.clientWidth > 0 && stage.clientWidth < 400);
        stage.innerHTML = out.svg;
        label.textContent = out.label;
        chips.querySelectorAll('button').forEach(c => c.setAttribute('aria-pressed', String(Number(c.dataset.stage) === out.stage)));
        return out.label;
    };
    const tick = now => { t += Math.min(now - last, 100); last = now; draw(t); raf = requestAnimationFrame(tick); };
    const sync = () => {
        cancelAnimationFrame(raf);
        btn.textContent = playing ? '❚❚ Pause' : '▶ Play';
        btn.setAttribute('aria-label', playing ? 'Pause animation' : 'Play animation');
        if (playing && visible) { last = performance.now(); raf = requestAnimationFrame(tick); }
    };
    btn.addEventListener('click', () => { playing = !playing; sync(); });
    chips.addEventListener('click', e => {
        const c = e.target.closest('[data-stage]');
        if (!c) return;
        playing = false;
        t = holds[Number(c.dataset.stage)];
        draw(t);
        sync();
    });
    fig.querySelector('.pt-static').hidden = true;
    fig.prepend(head);
    head.after(stage);
    stage.after(chips);
    fig.classList.add('is-live');
    draw(t);
    window.addEventListener('resize', debounce(() => draw(t)));
    if (!visible) new IntersectionObserver(es => { visible = es.some(e => e.isIntersecting); sync(); }, { threshold: 0.2 }).observe(fig);
    sync();
    // Exposed so a frame at any time can be rendered and checked without waiting for playback.
    window.__ptHeroFrame = draw;
}

// ------------------------------------------------------------------ figure 1: timeline
const ERAS = {
    vec: ['Word vectors', C.gray], pre: ['Pre-train, then adapt', C.navy], arch: ['Architecture', C.violet],
    scale: ['Scale and prompting', C.ochre], post: ['Post-training', C.teal],
};
const EVENTS = [
    ['2013', 'word2vec', 'word2vec and GloVe', 'vec', 'One fixed vector per word, learned from unlabelled text and reused as input features by task-specific models.'],
    ['2015', 'Dai & Le', 'Semi-supervised sequence learning', 'pre', 'An LSTM is first trained as a language model or sequence autoencoder, then used to initialise a supervised classifier. Training is more stable and generalises better.'],
    ['2017', 'Transformer', 'The Transformer', 'arch', 'An attention-only architecture that processes a whole sequence in parallel, which makes much larger pre-training runs practical.'],
    ['2018', 'ULMFiT', 'ULMFiT', 'pre', 'Fine-tunes the whole pre-trained language model for classification, using discriminative learning rates and gradual unfreezing to avoid forgetting.'],
    ['2018', 'ELMo', 'ELMo', 'pre', 'Contextual word representations from a bidirectional LSTM language model, combined per task and fed as features to a task model.'],
    ['2018', 'GPT-1', 'GPT-1', 'pre', 'A Transformer decoder pre-trained on books, then fine-tuned on each task, with tasks reformatted as token sequences.'],
    ['2018', 'BERT', 'BERT', 'pre', 'A bidirectional Transformer encoder pre-trained with masked language modelling, then fine-tuned separately for each task.'],
    ['2019', 'GPT-2', 'GPT-2', 'scale', 'A 1.5-billion-parameter language model evaluated zero-shot: tasks are posed as text, with no fine-tuning at all.'],
    ['2019', 'T5', 'T5', 'scale', 'Every task is cast as text in, text out, with a task prefix. Larger models keep improving.'],
    ['2020', 'GPT-3', 'GPT-3', 'scale', '175 billion parameters. A task can be specified by a few examples in the prompt: in-context learning, with no weight updates.'],
    ['2021', 'FLAN', 'FLAN', 'post', 'Instruction tuning: fine-tuning on many tasks phrased as natural-language instructions improves zero-shot performance on unseen tasks.'],
    ['2022', 'InstructGPT', 'InstructGPT', 'post', 'The full RLHF pipeline: supervised fine-tuning, a reward model trained on human rankings, then PPO against that reward model.'],
    ['2023', 'DPO', 'Direct Preference Optimization', 'post', 'Optimises the policy directly on preference pairs, with no separate reward model and no reinforcement-learning loop.'],
    ['2024', 'GRPO', 'GRPO (DeepSeekMath)', 'post', 'A PPO variant without a critic: each sampled answer is scored against the other answers sampled for the same prompt.'],
    ['2024', 'o1', 'OpenAI o1', 'post', 'Large-scale reinforcement learning for reasoning; performance improves with more RL training and with more thinking at test time.'],
    ['2025', 'DeepSeek-R1', 'DeepSeek-R1', 'post', 'Reinforcement learning with rule-based rewards produces long chains of thought; a multi-stage pipeline makes them readable.'],
];
const timeline = {
    state: () => ({ i: 11 }),
    controls: () => '<button type="button" data-step="-1" aria-label="Previous milestone">◀</button><button type="button" data-step="1" aria-label="Next milestone">▶</button><button type="button" data-play aria-pressed="false">▶ Play</button>',
    render(st, narrow) {
        let s = '';
        const keys = Object.keys(ERAS);
        if (!narrow) {
            const W = 760, H = 196, x0 = 52, x1 = 708, y = 106, dx = (x1 - x0) / (EVENTS.length - 1);
            keys.forEach((k, j) => {
                const lx = 6 + j * 152;
                s += `<circle cx="${lx + 5}" cy="13" r="5" fill="${ERAS[k][1]}"/>` + T(lx + 15, 17.5, ERAS[k][0], { size: 12 });
            });
            s += L(x0 - 20, y, x1 + 20, y, '#b9c0ca', 1.5);
            let year = '';
            EVENTS.forEach((e, i) => {
                const x = x0 + i * dx, on = i === st.i, col = ERAS[e[3]][1], up = i % 2 === 0;
                if (e[0] !== year) { year = e[0]; s += T(x, y + 74, e[0], { size: 11, anchor: 'middle', cls: 'pf-m' }); }
                s += `<g class="pt-tl-node" data-i="${i}" tabindex="-1"><rect x="${n1(x - dx / 2)}" y="34" width="${n1(dx)}" height="${H - 40}" fill="transparent"/>`;
                s += L(x, y, x, y + (up ? -26 : 26), col, 1, 'opacity=".6"');
                s += `<circle cx="${n1(x)}" cy="${y}" r="${on ? 9 : 6}" fill="${on ? col : '#fff'}" stroke="${col}" stroke-width="2.2"/>`;
                s += T(x, y + (up ? -32 : 42), e[1], { size: on ? 13.5 : 12, anchor: 'middle', cls: on ? 'pf-h pf-strong' : '' });
                s += '</g>';
            });
            return { svg: svg(W, H, 'Timeline of milestones from word vectors to reasoning models, coloured by paradigm.', s), say: '' };
        }
        const W = 380, top = 70, dy = 27, H = top + EVENTS.length * dy;
        keys.forEach((k, j) => {
            const lx = 6 + (j % 3) * 128, ly = 14 + Math.floor(j / 3) * 22;
            s += `<circle cx="${lx + 5}" cy="${ly - 4}" r="5" fill="${ERAS[k][1]}"/>` + T(lx + 14, ly + 0.5, ERAS[k][0], { size: 11.5 });
        });
        s += L(56, top - 8, 56, H - 10, '#b9c0ca', 1.5);
        EVENTS.forEach((e, i) => {
            const y = top + i * dy, on = i === st.i, col = ERAS[e[3]][1];
            s += `<g class="pt-tl-node" data-i="${i}"><rect x="0" y="${y - dy / 2}" width="${W}" height="${dy}" fill="${on ? C.soft : 'transparent'}"/>`;
            s += T(8, y + 4, e[0], { size: 11.5, cls: 'pf-m' });
            s += `<circle cx="56" cy="${y}" r="${on ? 7.5 : 5.5}" fill="${on ? col : '#fff'}" stroke="${col}" stroke-width="2"/>`;
            s += T(72, y + 4.5, e[2], { size: on ? 13.5 : 12.5, cls: on ? 'pf-h pf-strong' : '' }) + '</g>';
        });
        return { svg: svg(W, H, 'Timeline of milestones from word vectors to reasoning models, coloured by paradigm.', s), say: '' };
    },
    bind(ctx) {
        const card = document.createElement('div');
        card.className = 'pt-tl-card';
        card.setAttribute('aria-live', 'polite');
        ctx.stage.after(card);
        ctx.readout.hidden = true;
        const show = () => {
            const e = EVENTS[ctx.state.i];
            card.innerHTML = `<p class="pt-tl-meta"><span style="color:${ERAS[e[3]][1]}">●</span> ${e[0]} · ${ERAS[e[3]][0]}</p><h4>${esc(e[2])}</h4><p>${esc(e[4])}</p>`;
            card.style.borderTopColor = ERAS[e[3]][1];
        };
        const go = i => { ctx.state.i = (i + EVENTS.length) % EVENTS.length; ctx.draw(); show(); };
        let timer = 0;
        const play = ctx.controls.querySelector('[data-play]');
        const setPlay = on => {
            clearInterval(timer);
            timer = 0;
            play.setAttribute('aria-pressed', String(on));
            play.textContent = on ? '❚❚ Pause' : '▶ Play';
            if (on) timer = setInterval(() => { if (ctx.state.i === EVENTS.length - 1) setPlay(false); else go(ctx.state.i + 1); }, 1700);
        };
        ctx.controls.addEventListener('click', e => {
            const b = e.target.closest('button');
            if (!b) return;
            if (b.hasAttribute('data-play')) { if (!timer && ctx.state.i === EVENTS.length - 1) go(0); setPlay(!timer); return; }
            setPlay(false);
            go(ctx.state.i + Number(b.dataset.step));
        });
        ctx.stage.addEventListener('click', e => { const g = e.target.closest('[data-i]'); if (g) { setPlay(false); go(Number(g.dataset.i)); } });
        ctx.stage.setAttribute('tabindex', '0');
        ctx.stage.setAttribute('aria-label', 'Timeline. Use the arrow keys to move between milestones.');
        ctx.stage.addEventListener('keydown', e => {
            const d = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key];
            if (!d) return;
            e.preventDefault();
            setPlay(false);
            go(ctx.state.i + d);
        });
        show();
        if (!REDUCED) onFirstView(ctx.stage, () => { go(0); setPlay(true); });
    },
};

// ------------------------------------------------------------------ figure 2: next-token distribution before and after SFT
const PARIS = {
    tokens: [' Paris', ' The', '↵ new line', ' What', ' I', ' France', ' Well', ' Lyon', 'all other tokens'],
    base: [0.17, 0.10, 0.22, 0.12, 0.07, 0.05, 0.04, 0.03, 0.20],
    sft: [0.55, 0.27, 0.01, 0.01, 0.03, 0.02, 0.01, 0.02, 0.08],
};
function parisProbs(s) { return softmax(PARIS.base.map((v, i) => (1 - s) * Math.log(v) + s * Math.log(PARIS.sft[i]))); }
const paris = {
    state: () => ({ s: 1 }),
    controls: st => '<span class="pt-seg" role="group" aria-label="Model"><button type="button" data-s="0">Base model</button><button type="button" data-s="1">After SFT</button></span>' +
        range('s', 'Amount of SFT', 0, 1, 0.01, st.s, pct(st.s)),
    render(st, narrow) {
        const p = parisProbs(st.s), col = mix(C.navy, C.teal, st.s);
        const W = narrow ? 380 : 760, lab = narrow ? 118 : 150, bw = W - lab - 64, top = 74, row = narrow ? 30 : 28;
        let s = R(0, 0, W, 54, C.soft, 'rx="8"');
        s += T(12, 22, 'User: What is the capital of France?', { size: narrow ? 13 : 15, cls: 'pf-h' });
        s += T(12, 43, 'Assistant: <tspan style="fill:' + C.tealInk + '">▮</tspan>  ← next token?', { size: narrow ? 13 : 15 });
        PARIS.tokens.forEach((tok, i) => {
            const y = top + i * row, other = i === PARIS.tokens.length - 1;
            s += T(lab - 10, y + 15, esc(tok.replace(/^ /, '␣')), { size: 13, anchor: 'end', cls: other ? 'pf-m' : 'pf-mono' });
            s += R(lab, y + 4, bw, 14, C.grid, 'rx="3"');
            s += R(lab, y + 4, bw * p[i], 14, other ? C.gray : col, 'rx="3"');
            s += R(lab, y + 4, bw * PARIS.base[i], 14, 'none', `rx="3" stroke="${C.navy}" stroke-dasharray="3 3" stroke-width="1.2"`);
            s += T(lab + bw + 8, y + 16, pct(p[i]), { size: 13, cls: i === 0 ? 'pf-h pf-strong' : '' });
        });
        const H = top + PARIS.tokens.length * row + 18;
        s += R(lab, H - 12, 18, 8, 'none', `stroke="${C.navy}" stroke-dasharray="3 3"`) + T(lab + 24, H - 4, 'dashed outline: base model', { size: 11.5, cls: 'pf-m' });
        const answer = p[0] + p[1];
        return {
            svg: svg(W, H, 'Bar chart of next-token probabilities after the prompt, for the base model and after supervised fine-tuning.', s),
            say: `P(Paris) = ${pct(p[0])}. Tokens that begin an answer (Paris, The) hold ${pct(answer)} of the probability; the base model gave them ${pct(PARIS.base[0] + PARIS.base[1])}. Lyon stays near ${pct(p[7])}: the shift is in behaviour, not knowledge.`,
        };
    },
    bind(ctx) {
        const sync = () => {
            ctx.controls.querySelector('[data-k="s"]').value = ctx.state.s;
            ctx.output('s', pct(ctx.state.s));
            ctx.controls.querySelectorAll('[data-s]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.s) === ctx.state.s)));
        };
        let raf = 0;
        const glide = target => {
            cancelAnimationFrame(raf);
            if (REDUCED || document.hidden) { ctx.state.s = target; sync(); ctx.draw(); return; }
            const from = ctx.state.s, t0 = performance.now();
            const step = now => {
                const k = smooth(clamp((now - t0) / 900, 0, 1));
                ctx.state.s = Math.round((from + (target - from) * k) * 100) / 100;
                sync(); ctx.draw();
                if (k < 1) raf = requestAnimationFrame(step);
            };
            raf = requestAnimationFrame(step);
        };
        ctx.controls.addEventListener('click', e => { const b = e.target.closest('[data-s]'); if (b) glide(Number(b.dataset.s)); });
        ctx.controls.addEventListener('input', e => { if (e.target.dataset.k) { cancelAnimationFrame(raf); ctx.state.s = Number(e.target.value); sync(); ctx.draw(); } });
        sync();
        if (!REDUCED) onFirstView(ctx.stage, () => { ctx.state.s = 0; sync(); ctx.draw(); setTimeout(() => glide(1), 500); });
    },
};

// ------------------------------------------------------------------ figure 3: Bradley–Terry
const bt = {
    state: () => ({ a: 1.2, b: 0.2 }),
    controls: st => range('a', 'Reward of A', -4, 4, 0.1, st.a, st.a.toFixed(1)) + range('b', 'Reward of B', -4, 4, 0.1, st.b, st.b.toFixed(1)) +
        '<button type="button" data-shift>Shift both</button><button type="button" data-reset>Reset</button>',
    render(st, narrow) {
        const W = narrow ? 380 : 760, d = st.a - st.b, p = sigmoid(d), loss = -Math.log(p);
        let s = '';
        // reward axis
        const A = frame(narrow ? 20 : 40, 30, W - (narrow ? 40 : 80), 10, [-4, 4], [0, 1]);
        s += T(A.x, 16, 'Reward model scores ' + ITAL('r') + '(' + ITAL('x') + ', ' + ITAL('y') + ')', { size: 12, cls: 'pf-m' });
        s += L(A.x, 52, A.x + A.w, 52, '#b9c0ca', 1.5);
        for (let v = -4; v <= 4; v++) s += L(A.sx(v), 48, A.sx(v), 56, '#b9c0ca') + T(A.sx(v), 72, String(v), { size: 11, anchor: 'middle', cls: 'pf-m' });
        const xa = A.sx(st.a), xb = A.sx(st.b);
        s += L(Math.min(xa, xb), 40, Math.max(xa, xb), 40, C.navy, 1.4, 'opacity=".55"');
        s += T((xa + xb) / 2, 35, 'Δ = ' + d.toFixed(1), { size: 12, anchor: 'middle' });
        s += `<g class="pt-handle" data-h="b"><circle cx="${n1(xb)}" cy="52" r="15" fill="${C.ochre}" fill-opacity=".12"/><circle cx="${n1(xb)}" cy="52" r="8" fill="${C.ochre}" stroke="#fff" stroke-width="2"/>${T(xb, 90, 'B', { size: 13, anchor: 'middle', cls: 'pf-strong', fill: C.ochreInk })}</g>`;
        s += `<g class="pt-handle" data-h="a"><circle cx="${n1(xa)}" cy="52" r="15" fill="${C.teal}" fill-opacity=".12"/><circle cx="${n1(xa)}" cy="52" r="8" fill="${C.teal}" stroke="#fff" stroke-width="2"/>${T(xa, 90, 'A', { size: 13, anchor: 'middle', cls: 'pf-strong', fill: C.tealInk })}</g>`;
        // P(A > B) and loss
        const pw = narrow ? W - 70 : (W - 150) / 2, ph = 150, y0 = 128;
        const F1 = frame(50, y0, pw, ph, [-6, 6], [0, 1]);
        const F2 = narrow ? frame(50, y0 + ph + 72, pw, ph, [-6, 6], [0, 6]) : frame(50 + pw + 70, y0, pw, ph, [-6, 6], [0, 6]);
        const xs = Array.from({ length: 121 }, (_, i) => -6 + i * 0.1);
        s += axes(F1, { xt: [-6, -3, 0, 3, 6], yt: [0, 0.5, 1], yl: 'P(A preferred to B) = σ(Δ)', xl: 'Δ = r(A) − r(B)', fy: v => v.toFixed(1) });
        s += P(xs.map(x => [F1.sx(x), F1.sy(sigmoid(x))]), C.teal, 2.2);
        const dd = clamp(d, -6, 6), pd = sigmoid(dd);  // the marker stays on the plotted range
        s += L(F1.sx(dd), F1.sy(0), F1.sx(dd), F1.sy(pd), C.teal, 1, 'stroke-dasharray="3 3"') + `<circle cx="${n1(F1.sx(dd))}" cy="${n1(F1.sy(pd))}" r="5.5" fill="${C.teal}" stroke="#fff" stroke-width="2"/>`;
        s += T(F1.sx(dd) + (dd > 3 ? -8 : 8), F1.sy(pd) + (pd > 0.8 ? 18 : -8), pct(p), { size: 13, anchor: dd > 3 ? 'end' : 'start', cls: 'pf-strong', fill: C.tealInk });
        s += axes(F2, { xt: [-6, -3, 0, 3, 6], yt: [0, 2, 4, 6], yl: 'Loss if A was the chosen reply: −log σ(Δ)', xl: 'Δ = r(A) − r(B)' });
        s += P(xs.map(x => [F2.sx(x), F2.sy(Math.min(6, -Math.log(sigmoid(x))))]), C.ochre, 2.2);
        s += `<circle cx="${n1(F2.sx(dd))}" cy="${n1(F2.sy(Math.min(6, -Math.log(pd))))}" r="5.5" fill="${C.ochre}" stroke="#fff" stroke-width="2"/>`;
        const H = narrow ? F2.y + ph + 42 : y0 + ph + 42;
        return {
            svg: svg(W, H, 'Bradley–Terry model: probability that reply A is preferred, as a sigmoid of the reward gap, and the corresponding loss.', s),
            say: `r(A) = ${num(st.a, 1)}, r(B) = ${num(st.b, 1)}, gap Δ = ${num(d, 1)}. P(A preferred) = ${pct(p, 1)}. Loss if A was chosen = ${loss.toFixed(3)}; its slope in Δ is −(1 − σ(Δ)) = ${num(-(1 - p), 3)}.`,
        };
    },
    bind(ctx) {
        const sync = () => {
            ['a', 'b'].forEach(k => { ctx.controls.querySelector(`[data-k="${k}"]`).value = ctx.state[k]; ctx.output(k, ctx.state[k].toFixed(1)); });
            ctx.draw();
        };
        ctx.controls.addEventListener('input', e => { const k = e.target.dataset.k; if (k) { ctx.state[k] = Number(e.target.value); sync(); } });
        ctx.controls.addEventListener('click', e => {
            if (e.target.closest('[data-reset]')) Object.assign(ctx.state, bt.state());
            else if (e.target.closest('[data-shift]')) {
                const up = Math.max(ctx.state.a, ctx.state.b) + 1 <= 4, k = up ? 1 : -2;
                ctx.state.a = Math.round((ctx.state.a + k) * 10) / 10;
                ctx.state.b = Math.round((ctx.state.b + k) * 10) / 10;
            } else return;
            sync();
        });
        // Drag the A and B markers along the reward axis.
        let drag = null;
        const toR = e => {
            const svgEl = ctx.stage.querySelector('svg'), pt = svgEl.createSVGPoint();
            pt.x = e.clientX; pt.y = e.clientY;
            const loc = pt.matrixTransform(svgEl.getScreenCTM().inverse());
            const x0 = ctx.narrow ? 20 : 40, w = (ctx.narrow ? 380 : 760) - (ctx.narrow ? 40 : 80);
            return Math.round(clamp(-4 + (loc.x - x0) / w * 8, -4, 4) * 10) / 10;
        };
        ctx.stage.addEventListener('pointerdown', e => {
            const h = e.target.closest('[data-h]');
            if (!h) return;
            drag = h.dataset.h;
            ctx.stage.setPointerCapture(e.pointerId);
            e.preventDefault();
        });
        ctx.stage.addEventListener('pointermove', e => { if (drag) { ctx.state[drag] = toR(e); sync(); } });
        const end = () => { drag = null; };
        ctx.stage.addEventListener('pointerup', end);
        ctx.stage.addEventListener('pointercancel', end);
    },
};

// ------------------------------------------------------------------ figure 4: discount factor
const discount = {
    state: () => ({ g: 0.9 }),
    controls: st => range('g', 'Discount γ', 0, 0.99, 0.01, st.g, st.g.toFixed(2)),
    render(st, narrow) {
        const g = st.g, N = 20, W = narrow ? 380 : 760;
        const F = frame(narrow ? 40 : 56, 78, W - (narrow ? 56 : 300), 150, [-0.5, N - 0.5], [0, 1]);
        let s = axes(F, { xt: narrow ? [0, 5, 10, 15, 19] : [0, 2, 4, 6, 8, 10, 12, 14, 16, 18], yt: [0, 0.5, 1], fy: v => v.toFixed(1), xl: 'steps into the future, k', yl: 'Weight γ' + SUP('k') + ' on the reward k steps ahead' });
        const bw = F.w / N * 0.62;
        for (let k = 0; k < N; k++) {
            const v = g ** k;
            s += R(F.sx(k) - bw / 2, F.sy(v), bw, F.sy(0) - F.sy(v), C.navy, `opacity="${k === 0 || k === 9 ? 1 : 0.55}"`);
        }
        const hz = 1 / (1 - g);
        if (hz - 1 <= N - 0.5) s += L(F.sx(hz - 1), F.y - 6, F.sx(hz - 1), F.y + F.h, C.violet, 1.3, 'stroke-dasharray="4 3"') + T(F.sx(hz - 1) + 5, F.y + 4, 'horizon 1/(1−γ) ≈ ' + hz.toFixed(1), { size: 11.5, fill: C.violet });
        // reward events
        s += `<circle cx="${n1(F.sx(0))}" cy="18" r="7" fill="${C.ochre}"/>` + T(F.sx(0) + 11, 22, '+1 now', { size: 12, fill: C.ochreInk });
        s += `<circle cx="${n1(F.sx(9))}" cy="18" r="10" fill="${C.teal}"/>` + T(F.sx(9) + 14, 22, '+5 at step 10', { size: 12, fill: C.tealInk });
        s += L(F.sx(0), 28, F.sx(0), F.y - 26, C.ochre, 1, 'stroke-dasharray="2 3"') + L(F.sx(9), 30, F.sx(9), F.y - 26, C.teal, 1, 'stroke-dasharray="2 3"');
        const quick = 1, patient = 5 * g ** 9, win = patient > quick ? 'patient' : 'quick';
        const bx = narrow ? 40 : W - 216, by = narrow ? F.y + F.h + 62 : 96, mw = narrow ? 210 : 104;
        s += T(bx, by - 12, 'Discounted return ' + ITAL('G') + SUB('0'), { size: 12, cls: 'pf-m' });
        [['Quick', quick, C.ochre, 'quick'], ['Patient', patient, C.teal, 'patient']].forEach(([name, v, col, key], j) => {
            const y = by + j * 40;
            s += T(bx, y + 12, name, { size: 13, cls: key === win ? 'pf-h pf-strong' : '' });
            s += R(bx + 58, y + 2, mw, 12, C.grid, 'rx="3"') + R(bx + 58, y + 2, mw * Math.min(v, 5) / 5, 12, col, 'rx="3"');
            s += T(bx + 64 + mw, y + 13, v.toFixed(2), { size: 13, cls: key === win ? 'pf-strong' : '' });
        });
        const H = narrow ? by + 90 : F.y + F.h + 44;
        return {
            svg: svg(W, H, 'Bar chart of the discount weights gamma to the power k, and the discounted return of a quick and a patient reward stream.', s),
            say: `γ = ${g.toFixed(2)}: a reward 10 steps ahead is weighted ${(g ** 9).toFixed(3)}. Quick stream G₀ = 1.00, patient stream G₀ = 5 × γ⁹ = ${patient.toFixed(2)}, so the ${win} stream is preferred. The two tie at γ ≈ 0.836.`,
        };
    },
    bind(ctx) {
        ctx.controls.addEventListener('input', e => { if (e.target.dataset.k) { ctx.state.g = Number(e.target.value); ctx.output('g', ctx.state.g.toFixed(2)); ctx.draw(); } });
    },
};

// ------------------------------------------------------------------ figure 5: Monte Carlo versus TD on a random walk
// The five-state random walk (Sutton and Barto, Example 6.2): start in C, step left or right with equal
// probability; ending on the right pays +1, on the left 0. With γ = 1 the true values are 1/6 ... 5/6.
const WALK_TRUE = [1, 2, 3, 4, 5].map(i => i / 6);
function walkEpisodes(n) {
    const r = rng(20261014), eps = [];
    for (let k = 0; k < n; k++) {
        const path = [3];
        while (path[path.length - 1] > 0 && path[path.length - 1] < 6) path.push(path[path.length - 1] + (r() < 0.5 ? -1 : 1));
        eps.push(path);
    }
    return eps;
}
const WALK = walkEpisodes(200);
function walkLearn(n, alpha, partial = Infinity) {
    // Returns value tables after n whole episodes (plus `partial` TD steps of episode n), and RMS histories.
    const mc = [0, 0.5, 0.5, 0.5, 0.5, 0.5, 0], td = [0, 0.5, 0.5, 0.5, 0.5, 0.5, 0];
    const rms = v => Math.sqrt(WALK_TRUE.reduce((a, t, i) => a + (v[i + 1] - t) ** 2, 0) / 5);
    const hist = { mc: [rms(mc)], td: [rms(td)] };
    for (let k = 0; k <= n && k < WALK.length; k++) {
        const path = WALK[k], last = path[path.length - 1], G = last === 6 ? 1 : 0;
        const steps = k < n ? path.length - 1 : Math.min(partial, path.length - 1);
        if (k === n && partial === Infinity) break;
        for (let t = 0; t < steps; t++) {
            const s = path[t], s2 = path[t + 1], rwd = s2 === 6 ? 1 : 0;
            td[s] += alpha * (rwd + td[s2] - td[s]);
        }
        if (k < n) {
            for (let t = 0; t < path.length - 1; t++) mc[path[t]] += alpha * (G - mc[path[t]]);
            hist.mc.push(rms(mc));
            hist.td.push(rms(td));
        }
    }
    return { mc, td, hist };
}
const mctd = {
    state: () => ({ n: 0, alpha: 0.1, step: Infinity }),
    controls: st => '<button type="button" data-ep="1">Run 1 episode</button><button type="button" data-ep="20">Run 20 episodes</button><button type="button" data-reset>Reset</button>' +
        range('alpha', 'Step size α', 0.02, 0.3, 0.01, st.alpha, st.alpha.toFixed(2)),
    render(st, narrow) {
        const { mc, td, hist } = walkLearn(st.n, st.alpha, st.step);
        const W = narrow ? 380 : 760, names = ['A', 'B', 'C', 'D', 'E'];
        let s = '';
        // the chain
        const cx = i => (narrow ? 30 : 140) + i * (narrow ? 53.3 : 80), cy = 40;
        s += L(cx(0), cy, cx(6), cy, '#b9c0ca', 1.5);
        for (let i = 0; i <= 6; i++) {
            if (i === 0 || i === 6) s += R(cx(i) - 11, cy - 11, 22, 22, C.soft, `stroke="${C.gray}" rx="3"`) + T(cx(i), cy + 30, i === 6 ? '+1' : '0', { size: 12, anchor: 'middle', cls: 'pf-strong', fill: i === 6 ? C.tealInk : C.muted });
            else s += `<circle cx="${n1(cx(i))}" cy="${cy}" r="13" fill="#fff" stroke="${C.navy}" stroke-width="1.6"/>` + T(cx(i), cy + 4.5, names[i - 1], { size: 13, anchor: 'middle', cls: 'pf-h' });
        }
        let pathNote = '';
        if (st.n > 0 || st.step !== Infinity) {
            const k = st.step !== Infinity ? st.n : st.n - 1, path = WALK[k], upto = st.step !== Infinity ? Math.min(st.step, path.length - 1) : path.length - 1;
            const pos = path[upto];
            s += `<circle cx="${n1(cx(pos))}" cy="${cy}" r="6" fill="${C.ochre}"/>`;
            pathNote = `Episode ${k + 1}: ` + path.slice(0, upto + 1).map(i => i === 0 ? 'left end (0)' : i === 6 ? 'right end (+1)' : names[i - 1]).join(' → ') + '.';
        }
        // value estimates
        const vx = narrow ? 44 : 56, vw = narrow ? 300 : 300, vy = 100, vh = 170;
        const F = frame(vx, vy, vw, vh, [0.5, 5.5], [0, 1]);
        s += axes(F, { xt: [1, 2, 3, 4, 5], yt: [0, 0.5, 1], fx: v => names[v - 1], fy: v => v.toFixed(1), yl: 'Estimated value V(s)' });
        s += P(WALK_TRUE.map((v, i) => [F.sx(i + 1), F.sy(v)]), C.navy, 1.4, 'stroke-dasharray="5 4"');
        s += P(mc.slice(1, 6).map((v, i) => [F.sx(i + 1) - 4, F.sy(v)]), C.ochre, 1.6, 'opacity=".7"') + mc.slice(1, 6).map((v, i) => `<circle cx="${n1(F.sx(i + 1) - 4)}" cy="${n1(F.sy(v))}" r="4.5" fill="${C.ochre}"/>`).join('');
        s += P(td.slice(1, 6).map((v, i) => [F.sx(i + 1) + 4, F.sy(v)]), C.teal, 1.6, 'opacity=".7"') + td.slice(1, 6).map((v, i) => `<path d="M${n1(F.sx(i + 1) + 4)},${n1(F.sy(v) - 5.5)}l5.5,5.5l-5.5,5.5l-5.5,-5.5z" fill="${C.teal}"/>`).join('');
        const lg = (x, y) => `<circle cx="${x + 5}" cy="${y - 4}" r="4.5" fill="${C.ochre}"/>` + T(x + 14, y, 'Monte Carlo', { size: 12 }) +
            `<path d="M${x + 105},${y - 9.5}l5.5,5.5l-5.5,5.5l-5.5,-5.5z" fill="${C.teal}"/>` + T(x + 114, y, 'TD(0)', { size: 12 }) +
            L(x + 166, y - 4, x + 186, y - 4, C.navy, 1.4, 'stroke-dasharray="5 4"') + T(x + 191, y, 'true value', { size: 12 });
        s += lg(F.x, vy + vh + 44);
        // RMS error
        const ry = narrow ? vy + vh + 104 : vy, rx = narrow ? 44 : 440, rwid = narrow ? 300 : 290;
        const G = frame(rx, ry, rwid, vh, [0, 100], [0, 0.3]);
        s += axes(G, { xt: [0, 25, 50, 75, 100], yt: [0, 0.1, 0.2, 0.3], fy: v => v.toFixed(1), xl: 'episodes', yl: 'RMS error against the true values' });
        const upto = Math.min(hist.mc.length, 101);
        s += P(hist.mc.slice(0, upto).map((v, i) => [G.sx(i), G.sy(Math.min(v, 0.3))]), C.ochre, 1.8);
        s += P(hist.td.slice(0, upto).map((v, i) => [G.sx(i), G.sy(Math.min(v, 0.3))]), C.teal, 1.8);
        const H = narrow ? ry + vh + 46 : vy + vh + 56;
        const last = hist.mc.length - 1;
        const say = (pathNote ? pathNote + ' ' : '') + `After ${st.n} episode${st.n === 1 ? '' : 's'} with α = ${st.alpha.toFixed(2)}: RMS error ${hist.mc[last].toFixed(3)} (Monte Carlo) and ${hist.td[last].toFixed(3)} (TD).`;
        return { svg: svg(W, H, 'Random-walk example: value estimates from Monte Carlo and TD learning compared with the true values, and their errors over episodes.', s), say };
    },
    bind(ctx) {
        let timer = 0;
        const stop = () => { clearInterval(timer); timer = 0; ctx.busy(false); };
        const runOne = () => {
            if (ctx.state.n >= 100) return;
            stop();
            const path = WALK[ctx.state.n];
            if (REDUCED) { ctx.state.n++; ctx.draw(); return; }
            ctx.state.step = 0;
            ctx.draw();
            timer = setInterval(() => {
                if (ctx.state.step >= path.length - 1) { stop(); ctx.state.step = Infinity; ctx.state.n++; ctx.draw(); return; }
                ctx.state.step++;
                ctx.draw();
            }, 260);
        };
        const runMany = k => {
            stop();
            ctx.state.step = Infinity;
            const target = Math.min(100, ctx.state.n + k);
            if (REDUCED) { ctx.state.n = target; ctx.draw(); return; }
            ctx.busy(true);
            timer = setInterval(() => { if (ctx.state.n >= target) { stop(); ctx.draw(); return; } ctx.state.n++; ctx.draw(); }, 70);
        };
        ctx.controls.addEventListener('click', e => {
            const b = e.target.closest('button');
            if (!b) return;
            if (b.hasAttribute('data-reset')) { stop(); ctx.state.n = 0; ctx.state.step = Infinity; ctx.draw(); }
            else if (b.dataset.ep === '1') runOne();
            else runMany(Number(b.dataset.ep));
        });
        ctx.controls.addEventListener('input', e => { if (e.target.dataset.k) { ctx.state.alpha = Number(e.target.value); ctx.output('alpha', ctx.state.alpha.toFixed(2)); ctx.draw(); } });
        if (REDUCED) { ctx.state.n = 25; ctx.draw(); }
        else onFirstView(ctx.stage, () => runMany(25));
    },
};

// ------------------------------------------------------------------ figure 6: REINFORCE with and without a baseline
// Three-armed bandit with noisy rewards. The same seeds drive both variants; only the baseline differs.
const BANDIT = { mu: [1.0, 1.5, 2.0], steps: 300, alpha: 0.05, runs: 12 };
function banditRun(seed, offset, useBaseline) {
    const r = rng(seed), th = [0, 0, 0], out = [];
    let b = 0, n = 0;
    for (let s = 0; s <= BANDIT.steps; s++) {
        const p = softmax(th);
        out.push(p[2]);
        if (s === BANDIT.steps) break;
        let u = r(), a = 0;
        while (a < 2 && u > p[a]) { u -= p[a]; a++; }
        const reward = BANDIT.mu[a] + offset + gauss(r);
        const adv = useBaseline ? reward - b : reward;
        for (let k = 0; k < 3; k++) th[k] += BANDIT.alpha * adv * ((k === a ? 1 : 0) - p[k]);
        n++;
        b += (reward - b) / n;  // running mean of past rewards: does not depend on the current action
    }
    return out;
}
const banditCache = new Map();
function banditRuns(offset) {
    if (!banditCache.has(offset)) {
        const make = base => Array.from({ length: BANDIT.runs }, (_, i) => banditRun(i + 1, offset, base));
        banditCache.set(offset, { none: make(false), base: make(true) });
    }
    return banditCache.get(offset);
}
function spread(vals) { const m = vals.reduce((a, b) => a + b, 0) / vals.length; return [m, Math.sqrt(vals.reduce((a, b) => a + (b - m) ** 2, 0) / vals.length)]; }
const bandit = {
    state: () => ({ offset: 10, t: BANDIT.steps }),
    controls: st => '<span class="pt-seg" role="group" aria-label="Constant added to every reward">' + [0, 5, 10, 20].map(v => `<button type="button" data-off="${v}" aria-pressed="${v === st.offset}">+${v}</button>`).join('') + '</span>' +
        '<button type="button" data-run>▶ Run</button>',
    render(st, narrow) {
        const runs = banditRuns(st.offset), W = narrow ? 380 : 760, t = st.t;
        const pw = narrow ? 300 : 300, ph = 170;
        let s = '';
        const panels = [['Without a baseline', runs.none, C.ochre, C.ochreInk], ['With a baseline', runs.base, C.teal, C.tealInk]];
        const stats = [];
        panels.forEach(([title, set, col, ink], j) => {
            const x = narrow ? 50 : 56 + j * (pw + 84), y = narrow ? 34 + j * (ph + 84) : 34;
            const F = frame(x, y, pw, ph, [0, BANDIT.steps], [0, 1]);
            s += T(x, y - 16, title, { size: 14, cls: 'pf-h', fill: ink });
            s += axes(F, { xt: [0, 100, 200, 300], yt: [0, 1 / 3, 1], fy: v => v === 1 / 3 ? '⅓' : v.toFixed(0), xl: 'update step' });
            set.forEach(run => { s += P(run.slice(0, t + 1).filter((_, i) => i % 5 === 0 || i === t).map((v, i, arr) => { const idx = Math.min(i * 5, t); return [F.sx(idx), F.sy(v)]; }), col, 1.1, 'opacity=".45"'); });
            const mean = Array.from({ length: t + 1 }, (_, i) => set.reduce((a, r) => a + r[i], 0) / set.length);
            s += P(mean.filter((_, i) => i % 5 === 0 || i === t).map((v, i) => [F.sx(Math.min(i * 5, t)), F.sy(v)]), col, 2.8);
            stats.push(spread(set.map(r => r[t])).concat([set.filter(r => r[t] < 0.5).length]));
        });
        const H = narrow ? 34 + 2 * (ph + 84) - 30 : 34 + ph + 46;
        const say = t < BANDIT.steps ? `Rewards offset by +${st.offset}. Running: step ${t} of ${BANDIT.steps}.` :
            `Rewards offset by +${st.offset}. After ${t} steps, probability of choosing the best arm (mean ± s.d. over ${BANDIT.runs} runs): ${stats[0][0].toFixed(2)} ± ${stats[0][1].toFixed(2)} without a baseline, with ${stats[0][2]} runs ending below 50%; ${stats[1][0].toFixed(2)} ± ${stats[1][1].toFixed(2)} with a baseline, with ${stats[1][2]} below 50%.`;
        return { svg: svg(W, H, 'Two panels of learning curves: probability of choosing the best arm over update steps, for twelve runs of REINFORCE without and with a baseline.', s), say };
    },
    bind(ctx) {
        let raf = 0;
        const run = () => {
            cancelAnimationFrame(raf);
            if (REDUCED || document.hidden) { ctx.state.t = BANDIT.steps; ctx.draw(); return; }
            ctx.busy(true);
            ctx.state.t = 0;
            ctx.draw();
            const t0 = performance.now();
            const step = now => {
                ctx.state.t = Math.min(BANDIT.steps, Math.round((now - t0) / 3200 * BANDIT.steps));
                ctx.draw();
                if (ctx.state.t < BANDIT.steps) raf = requestAnimationFrame(step); else { ctx.busy(false); ctx.draw(); }
            };
            raf = requestAnimationFrame(step);
        };
        ctx.controls.addEventListener('click', e => {
            const o = e.target.closest('[data-off]');
            if (o) {
                ctx.state.offset = Number(o.dataset.off);
                ctx.controls.querySelectorAll('[data-off]').forEach(b => b.setAttribute('aria-pressed', String(b === o)));
                run();
            } else if (e.target.closest('[data-run]')) run();
        });
        if (!REDUCED) onFirstView(ctx.stage, run);
    },
};

// ------------------------------------------------------------------ figure 7: GAE weights
const gae = {
    state: () => ({ g: 0.99, l: 0.95 }),
    controls: st => range('l', 'λ', 0, 1, 0.01, st.l, st.l.toFixed(2)) + range('g', 'γ', 0.8, 1, 0.01, st.g, st.g.toFixed(2)),
    render(st, narrow) {
        const { g, l } = st, N = narrow ? 16 : 30, W = narrow ? 380 : 760, gl = g * l;
        const F = frame(narrow ? 40 : 56, 40, W - (narrow ? 56 : 80), 130, [-0.5, N - 0.5], [0, 1]);
        let s = axes(F, { xt: narrow ? [0, 5, 10, 15] : [0, 5, 10, 15, 20, 25], yt: [0, 0.5, 1], fy: v => v.toFixed(1), xl: 'l, steps ahead', yl: 'Weight (γλ)' + SUP('l') + ' on the TD error δ' + SUB('t+l') });
        const bw = F.w / N * 0.62;
        for (let k = 0; k < N; k++) { const v = gl ** k; s += R(F.sx(k) - bw / 2, F.sy(v), bw, F.sy(0) - F.sy(v), C.teal); }
        const G = frame(F.x, F.y + F.h + 78, F.w, 90, [0.5, N + 0.5], [0, 1]);
        s += axes(G, { xt: narrow ? [1, 5, 10, 15] : [1, 5, 10, 15, 20, 25, 30], yt: [0, 1], fy: v => v.toFixed(0), xl: 'k, look-ahead of the k-step estimate', yl: 'Weight (1−λ)λ' + SUP('k−1') + ' on the k-step advantage' });
        if (l >= 0.999) s += T(G.x + G.w / 2, G.y + 40, 'λ = 1: all weight on the full Monte Carlo return', { size: 13, anchor: 'middle', fill: C.navy });
        else for (let k = 1; k <= N; k++) { const v = (1 - l) * l ** (k - 1); s += R(G.sx(k) - bw / 2, G.sy(v), bw, G.sy(0) - G.sy(v), C.navy, 'opacity=".75"'); }
        const H = G.y + G.h + 44;
        const half = gl > 0 && gl < 1 ? Math.log(0.5) / Math.log(gl) : (gl >= 1 ? Infinity : 0);
        const mode = l <= 0.001 ? 'λ = 0: the advantage is the one-step TD error δₜ, low variance but biased by the critic.' : l >= 0.999 ? 'λ = 1: the advantage is the Monte Carlo return minus V(sₜ), unbiased but high variance.' : 'In between: real rewards for the first few steps, the critic for the rest.';
        return {
            svg: svg(W, H, 'Bar charts of the GAE weights on future TD errors and on k-step advantage estimates.', s),
            say: `${mode} γλ = ${gl.toFixed(3)}; the weights halve every ${Number.isFinite(half) ? half.toFixed(1) : '∞'} steps.`,
        };
    },
    bind(ctx) {
        ctx.controls.addEventListener('input', e => { const k = e.target.dataset.k; if (k) { ctx.state[k] = Number(e.target.value); ctx.output(k, ctx.state[k].toFixed(2)); ctx.draw(); } });
    },
};

// ------------------------------------------------------------------ figure 8: PPO's clipped objective
const ppo = {
    state: () => ({ eps: 0.2, r: 1.35 }),
    controls: st => range('eps', 'Clip range ε', 0.05, 0.5, 0.01, st.eps, st.eps.toFixed(2)) + range('r', 'Ratio ρ', 0, 2, 0.01, st.r, st.r.toFixed(2)),
    render(st, narrow) {
        const { eps, r } = st, W = narrow ? 380 : 760, pw = narrow ? 300 : 290, ph = 170;
        let s = '';
        const says = [];
        [[1, 'Advantage A > 0 (a good action)', C.teal, C.tealInk], [-1, 'Advantage A < 0 (a bad action)', C.ochre, C.ochreInk]].forEach(([A, title, col, ink], j) => {
            const x = narrow ? 50 : 56 + j * (pw + 110), y = narrow ? 40 + j * (ph + 92) : 40;
            const F = frame(x, y, pw, ph, [0, 2], A > 0 ? [0, 2] : [-2, 0]);
            s += T(x, y - 18, title, { size: 13.5, cls: 'pf-h', fill: ink });
            s += R(F.sx(1 - eps), F.y, F.sx(1 + eps) - F.sx(1 - eps), F.h, C.soft) + L(F.sx(1), F.y, F.sx(1), F.y + F.h, C.rule);
            s += axes(F, { xt: [0, 0.5, 1, 1.5, 2], yt: A > 0 ? [0, 1, 2] : [-2, -1, 0], fx: v => v.toString(), xl: 'ρ = π' + SUB('θ') + '(a|s) / π' + SUB('old') + '(a|s)' });
            const xs = Array.from({ length: 201 }, (_, i) => i * 0.01);
            const clipObj = v => Math.min(v * A, clamp(v, 1 - eps, 1 + eps) * A);
            s += P(xs.map(v => [F.sx(v), F.sy(v * A)]), C.gray, 1.4, 'stroke-dasharray="5 4"');
            s += P(xs.map(v => [F.sx(v), F.sy(clipObj(v))]), col, 2.6);
            const flat = A > 0 ? r > 1 + eps : r < 1 - eps;
            s += `<circle cx="${n1(F.sx(r))}" cy="${n1(F.sy(clipObj(r)))}" r="6" fill="${flat ? '#fff' : col}" stroke="${col}" stroke-width="2.2"/>`;
            s += T(F.sx(1 - eps), F.y + 14, '1−ε', { size: 11, anchor: 'end', cls: 'pf-m' }) + T(F.sx(1 + eps) + 2, F.y + 14, '1+ε', { size: 11, cls: 'pf-m' });
            const label = A > 0 ? (flat ? 'clipped: no gradient' : 'gradient pushes ρ up') : (flat ? 'clipped: no gradient' : 'gradient pushes ρ down');
            s += T(F.x + F.w, A > 0 ? F.y + F.h - 8 : F.y + 30, label, { size: 12, anchor: 'end', fill: flat ? C.muted : ink });
            says.push(`${A > 0 ? 'A > 0' : 'A < 0'}: objective ${num(clipObj(r))}, ${flat ? 'clipped, so this sample contributes no gradient' : 'gradient active'}`);
        });
        const lx = narrow ? 50 : 56, ly = narrow ? 40 + 2 * (ph + 92) - 22 : 40 + ph + 62;
        s += L(lx, ly - 4, lx + 22, ly - 4, C.gray, 1.4, 'stroke-dasharray="5 4"') + T(lx + 28, ly, 'unclipped ρA', { size: 12 });
        s += L(lx + 130, ly - 4, lx + 152, ly - 4, C.navy, 2.6) + T(lx + 158, ly, 'PPO: min(ρA, clip(ρ, 1−ε, 1+ε)A)', { size: 12 });
        return {
            svg: svg(W, ly + 12, 'Two plots of the PPO clipped surrogate objective against the probability ratio, for a positive and a negative advantage.', s),
            say: `ρ = ${r.toFixed(2)}, ε = ${eps.toFixed(2)}. ${says.join('. ')}.`,
        };
    },
    bind(ctx) {
        ctx.controls.addEventListener('input', e => { const k = e.target.dataset.k; if (k) { ctx.state[k] = Number(e.target.value); ctx.output(k, ctx.state[k].toFixed(2)); ctx.draw(); } });
    },
};

// ------------------------------------------------------------------ figure 9: the KL-regularised optimum and DPO's implicit reward
const KLTOY = {
    names: ['Short, correct', 'Correct, explained', 'Hedged', 'Long, flattering', 'Off-topic', 'Exploit'],
    ref: [0.30, 0.28, 0.17, 0.12, 0.10, 0.03],
    r: [1.0, 1.5, 0.4, 1.7, -1.0, 3.0],
};
function klOpt(beta) {
    const w = KLTOY.ref.map((p, i) => Math.log(p) + KLTOY.r[i] / beta), pi = softmax(w);
    const m = Math.max(...w), logZ = m + Math.log(KLTOY.ref.reduce((a, p, i) => a + Math.exp(Math.log(p) + KLTOY.r[i] / beta - m), 0));
    const kl = pi.reduce((a, p, i) => a + (p > 0 ? p * Math.log(p / KLTOY.ref[i]) : 0), 0);
    const er = pi.reduce((a, p, i) => a + p * KLTOY.r[i], 0);
    return { pi, kl, er, logZ };
}
const klfig = {
    state: () => ({ lb: 0 }),  // log10(beta)
    controls: st => range('lb', 'KL weight β', -1.3, 1, 0.01, st.lb, (10 ** st.lb).toFixed(2)),
    render(st, narrow) {
        const beta = 10 ** st.lb, o = klOpt(beta), W = narrow ? 380 : 760, K = KLTOY.names.length;
        let s = '';
        // (a) policy versus reference
        const ax = narrow ? 128 : 136, aw = narrow ? 190 : 210, ay = 36, row = 30;
        s += T(0, 16, 'Reference π' + SUB('ref') + ' (outline) and optimal policy π* (bars)', { size: 12.5, cls: 'pf-h' });
        KLTOY.names.forEach((nm, i) => {
            const y = ay + i * row;
            s += T(ax - 10, y + 14, nm, { size: 12.5, anchor: 'end' }) + T(ax - 10, y + 27, 'r = ' + KLTOY.r[i].toFixed(1), { size: 10.5, anchor: 'end', cls: 'pf-m' });
            s += R(ax, y + 4, aw, 16, C.grid, 'rx="3"') + R(ax, y + 4, aw * o.pi[i], 16, i === 5 ? C.ochre : C.teal, 'rx="3"');
            s += R(ax, y + 4, aw * KLTOY.ref[i], 16, 'none', `rx="3" stroke="${C.navy}" stroke-width="1.3" stroke-dasharray="3 3"`);
            s += T(ax + aw + 6, y + 17, pct(o.pi[i]), { size: 12 });
        });
        // (b) frontier: expected reward against KL as beta varies
        const bx = narrow ? 50 : 470, by = narrow ? ay + K * row + 46 : 36, bw = narrow ? 300 : 270, bh = narrow ? 130 : 110;
        const F = frame(bx, by, bw, bh, [0, 3.6], [0.6, 3.0]);
        s += axes(F, { xt: [0, 1, 2, 3], yt: [1, 2, 3], xl: 'KL(π* ‖ π' + SUB('ref') + ')', yl: 'Expected reward', fy: v => v.toFixed(0) });
        const curve = [];
        for (let lb = 1.3; lb >= -1.6; lb -= 0.02) { const q = klOpt(10 ** lb); curve.push([F.sx(Math.min(q.kl, 3.6)), F.sy(clamp(q.er, 0.6, 3))]); }
        s += P(curve, C.navy, 1.8, 'opacity=".75"');
        s += `<circle cx="${n1(F.sx(Math.min(o.kl, 3.6)))}" cy="${n1(F.sy(clamp(o.er, 0.6, 3)))}" r="6" fill="${C.teal}" stroke="#fff" stroke-width="2"/>`;
        // (c) implicit reward: beta log(pi*/pi_ref) = r - beta log Z
        const cy = narrow ? by + bh + 80 : by + bh + 76, cw = bw, ch = narrow ? 120 : 110;
        const G = frame(bx, cy, cw, ch, [-0.5, K - 0.5], [-5, 3.5]);
        s += axes(G, { xt: [], yt: [-4, -2, 0, 2], yl: 'True reward (outline), implicit reward (bars)', zero: true });
        const bwid = G.w / K * 0.5;
        KLTOY.names.forEach((nm, i) => {
            const imp = beta * Math.log(o.pi[i] / KLTOY.ref[i]), x = G.sx(i);
            const y1 = G.sy(Math.max(0, imp)), y2 = G.sy(Math.min(0, Math.max(imp, -5)));
            s += R(x - bwid / 2, y1, bwid, y2 - y1, C.teal, 'opacity=".85"');
            const t1 = G.sy(Math.max(0, KLTOY.r[i])), t2 = G.sy(Math.min(0, KLTOY.r[i]));
            s += R(x - bwid / 2, t1, bwid, t2 - t1, 'none', `stroke="${C.navy}" stroke-width="1.3" stroke-dasharray="3 3"`);
            s += T(x, G.y + G.h + 15, String(i + 1), { size: 11, anchor: 'middle', cls: 'pf-m' });
        });
        const H = cy + ch + 30;
        return {
            svg: svg(W, H, 'Toy example of the KL-regularised optimal policy: bars for six replies, the reward-versus-KL trade-off curve, and the implicit reward.', s),
            say: `β = ${beta.toFixed(2)}: expected reward ${o.er.toFixed(2)} at KL ${o.kl.toFixed(2)} nats; the exploit reply gets ${pct(o.pi[5])}. Implicit reward β log(π*/π_ref) equals the true reward minus the same constant β log Z = ${(beta * o.logZ).toFixed(2)} for every reply.`,
        };
    },
    bind(ctx) {
        ctx.controls.addEventListener('input', e => { if (e.target.dataset.k) { ctx.state.lb = Number(e.target.value); ctx.output('lb', (10 ** ctx.state.lb).toFixed(2)); ctx.draw(); } });
    },
};

// ------------------------------------------------------------------ figure 10: GRPO group-relative advantages
const GRPO_WRONG = ['418', '398', '4008', '308', '406', '428'];
function grpoGroup(index, G, p) {
    const r = rng(7919 * index + 17), out = [];
    for (let i = 0; i < G; i++) {
        const ok = r() < p, wrong = GRPO_WRONG[Math.floor(r() * GRPO_WRONG.length)];
        out.push({ ans: ok ? '408' : wrong, reward: ok ? 1 : 0 });
    }
    const mean = out.reduce((a, o) => a + o.reward, 0) / G;
    const sd = Math.sqrt(out.reduce((a, o) => a + (o.reward - mean) ** 2, 0) / G);
    out.forEach(o => { o.adv = sd > 0 ? (o.reward - mean) / sd : 0; });
    return { out, mean, sd };
}
const grpo = {
    state: () => ({ index: 2, G: 8, p: 0.5 }),
    controls: st => '<span class="pt-seg" role="group" aria-label="Group size">' + [4, 8, 16].map(v => `<button type="button" data-g="${v}" aria-pressed="${v === st.G}">G = ${v}</button>`).join('') + '</span>' +
        range('p', 'Chance an answer is right', 0, 1, 0.05, st.p, pct(st.p)) + '<button type="button" data-sample>Sample a new group</button>',
    render(st, narrow) {
        const { out, mean, sd } = grpoGroup(st.index, st.G, st.p), W = narrow ? 380 : 760, G = st.G;
        let s = R(0, 0, W, 34, C.soft, 'rx="6"') + T(12, 22, `Prompt: What is 17 × 24?   Verifier: reward 1 if the final answer is 408, else 0.`, { size: narrow ? 11 : 13 });
        const amax = 3;
        let H;
        if (!narrow) {
            const x0 = 60, cw = (W - x0 - 10) / G, top = 58;
            s += T(0, top + 18, 'answer', { size: 11, cls: 'pf-m' }) + T(0, top + 40, 'reward', { size: 11, cls: 'pf-m' }) + T(0, top + 120, 'advantage', { size: 11, cls: 'pf-m' });
            const F = frame(x0, top + 58, W - x0 - 10, 124, [0, 1], [-amax, amax]);
            s += L(F.x, F.sy(0), F.x + F.w, F.sy(0), '#b9c0ca');
            out.forEach((o, i) => {
                const cx = x0 + (i + 0.5) * cw, ok = o.reward === 1, col = o.adv > 0 ? C.teal : o.adv < 0 ? C.ochre : C.gray;
                s += R(cx - cw * 0.42, top, cw * 0.84, 28, ok ? C.tealTint : C.ochreTint, 'rx="5"') + T(cx, top + 19, (ok ? '✓ ' : '✗ ') + o.ans, { size: G > 8 ? 10.5 : 13, anchor: 'middle', fill: ok ? C.tealInk : C.ochreInk });
                s += T(cx, top + 46, String(o.reward), { size: 13, anchor: 'middle', cls: 'pf-strong' });
                const y1 = F.sy(Math.max(0, o.adv)), y2 = F.sy(Math.min(0, o.adv));
                s += R(cx - cw * 0.3, y1, cw * 0.6, Math.max(y2 - y1, 1), col, 'rx="2"');
                s += T(cx, o.adv >= 0 ? y1 - 5 : y2 + 14, (o.adv > 0 ? '+' : '') + o.adv.toFixed(2), { size: G > 8 ? 10 : 12, anchor: 'middle' });
            });
            H = top + 200;
        } else {
            const top = 50, row = G > 8 ? 22 : 30, mid = 250, half = 110;
            s += T(4, top, 'answer', { size: 11, cls: 'pf-m' }) + T(108, top, 'r', { size: 11, cls: 'pf-m' }) + T(mid, top, 'advantage', { size: 11, anchor: 'middle', cls: 'pf-m' });
            s += L(mid, top + 6, mid, top + 8 + G * row, '#b9c0ca');
            out.forEach((o, i) => {
                const y = top + 10 + i * row, ok = o.reward === 1, col = o.adv > 0 ? C.teal : o.adv < 0 ? C.ochre : C.gray;
                s += R(4, y, 86, row - 5, ok ? C.tealTint : C.ochreTint, 'rx="4"') + T(10, y + row / 2 + 2, (ok ? '✓ ' : '✗ ') + o.ans, { size: 12, fill: ok ? C.tealInk : C.ochreInk });
                s += T(108, y + row / 2 + 2, String(o.reward), { size: 12, cls: 'pf-strong' });
                const w = half * o.adv / amax;
                s += R(Math.min(mid, mid + w), y + 3, Math.max(Math.abs(w), 1), row - 11, col, 'rx="2"');
                s += T(o.adv >= 0 ? mid + Math.max(w, 0) + 4 : mid + w - 4, y + row / 2 + 2, (o.adv > 0 ? '+' : '') + o.adv.toFixed(2), { size: 11, anchor: o.adv >= 0 ? 'start' : 'end' });
            });
            H = top + 16 + G * row;
        }
        const none = sd === 0;
        return {
            svg: svg(W, H, 'A group of sampled answers with their rewards and group-relative advantages.', s),
            say: `Group ${st.index}: ${out.filter(o => o.reward).length} of ${G} correct; mean reward ${mean.toFixed(2)}, standard deviation ${sd.toFixed(2)}. ` +
                (none ? 'Every answer got the same reward, so every advantage is 0 and this group gives no learning signal.' : 'Correct answers get a positive advantage and wrong ones a negative advantage; each token of an answer shares its answer’s advantage.'),
        };
    },
    bind(ctx) {
        ctx.controls.addEventListener('click', e => {
            const g = e.target.closest('[data-g]');
            if (g) { ctx.state.G = Number(g.dataset.g); ctx.controls.querySelectorAll('[data-g]').forEach(b => b.setAttribute('aria-pressed', String(b === g))); ctx.draw(); }
            else if (e.target.closest('[data-sample]')) { ctx.state.index++; ctx.draw(); }
        });
        ctx.controls.addEventListener('input', e => { if (e.target.dataset.k) { ctx.state.p = Number(e.target.value); ctx.output('p', pct(ctx.state.p)); ctx.draw(); } });
    },
};

const FIGS = { timeline, paris, bt, discount, mctd, bandit, gae, ppo, kl: klfig, grpo };

// ------------------------------------------------------------------ page behaviour (same patterns as the GeoAFT microsite)
function syncHeaderOffset() {
    const header = document.getElementById('header');
    if (!root || !header) return;
    const h = header.classList.contains('nav-hidden') ? 0 : Math.round(header.getBoundingClientRect().height) || 62;
    document.querySelectorAll('.pt').forEach(el => el.style.setProperty('--pt-header', h + 'px'));
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
function revealOnScroll() {
    const targets = document.querySelectorAll('.pt [data-reveal]');
    if (!targets.length || REDUCED || !('IntersectionObserver' in window)) return;
    document.querySelectorAll('.pt').forEach(el => el.classList.add('pt-anim'));
    targets.forEach(t => { if (t.dataset.reveal === 'rise') [...t.children].forEach((c, i) => c.style.setProperty('--i', i)); });
    const io = new IntersectionObserver(entries => entries.forEach(e => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        e.target.classList.add('is-in');
    }), { threshold: 0.15 });
    targets.forEach(t => io.observe(t));
}
function heroFade() {
    const hero = document.querySelector('.pt-overview .pt-hero, .pt-guide-head');
    if (!hero || REDUCED) return;
    const update = () => {
        const pinned = getComputedStyle(hero).position === 'sticky';
        const p = pinned ? clamp(window.scrollY / (hero.offsetHeight * 0.6), 0, 1) : 0;
        hero.style.opacity = (1 - p).toFixed(3);
        hero.style.transform = p ? `scale(${(1 - 0.04 * p).toFixed(4)})` : '';
        hero.style.visibility = p === 1 ? 'hidden' : '';
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
}
function readingProgress() {
    const page = document.querySelector('.pt-guide');
    if (!page) return;
    const bar = document.createElement('div');
    bar.className = 'pt-progress';
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
    if (header && 'MutationObserver' in window) new MutationObserver(syncHeaderOffset).observe(header, { attributes: true, attributeFilter: ['class'] });
    trackSections(document.querySelector('.pt-guide-toc'));
    revealOnScroll();
    readingProgress();
    heroFade();
    document.querySelectorAll('[data-pt-hero]').forEach(fig => {
        try { initHero(fig); } catch (err) { console.warn('Hero figure unavailable; showing the static figure.', err); }
    });
    document.querySelectorAll('[data-pt-fig]').forEach(fig => {
        const spec = FIGS[fig.dataset.ptFig];
        try { if (spec) mount(fig, spec); } catch (err) { console.warn(`Figure ${fig.dataset.ptFig} unavailable; showing the static figure.`, err); }
    });
}

export { FIGS, heroAt, heroSVG, HERO };
