// Optional browser regression check. Supply a Playwright package directory when
// it is not installed locally; no production dependency is required.
const { chromium } = require(process.argv[2] || 'playwright');
const assert = require('node:assert/strict');
const origin = process.env.QRS_TEST_ORIGIN || 'http://127.0.0.1:8765';

(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage();
    const failures = [];
    page.on('pageerror', error => failures.push(error.message));
    page.on('response', response => {
        if (response.url().startsWith(origin) && response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
    });
    async function visit(route) {
        await page.goto(origin + route, { waitUntil: 'networkidle' });
        await page.waitForTimeout(200);
    }
    async function fits() {
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Horizontal overflow: ' + page.url());
    }
    const projects = ['ai-native-workflow', 'frtbtrace', 'geoaft', 'geoattention', 'policyattention', 'riskhedge', 'softrank', 'hedgefidelity', 'decisionrank', 'ntuinfo-com', 'alphaallocator', 'cffa-2026'];
    for (const width of [390, 1280]) {
        console.log(`Checking ${width}px layouts`);
        await page.setViewportSize({ width, height: 900 });
        await visit('/people/');
        assert.equal(await page.locator('#academy-container').count(), 0);
        assert.equal(await page.locator('#researchers-container a.person-directory-card').count(), 2);
        assert.equal(await page.locator('#officers-container a.person-directory-card').count(), 4);
        assert.match(await page.locator('#officers-container').innerText(), /Wang Zimeng/);
        const profileLinks = await page.locator('a.person-directory-card').evaluateAll(links => links.map(a => a.href));
        assert.equal(profileLinks.length, new Set(profileLinks).size);
        assert.equal(await page.locator('#researchers-section .academy-directory-link').count(), 1);
        assert(!await page.locator('#researchers-container').innerText().then(t => /Xinyue Wu|Yizhe Chia/.test(t)));
        await fits();
        await visit('/projects/');
        assert.equal(await page.locator('.project-full-card h3 a').count(), 12);
        for (const pid of projects) assert.equal(await page.locator(`.project-full-card h3 a[href="${pid}/"]`).count(), 1);
        await fits();
        for (const pid of projects) {
            await visit(`/projects/${pid}/`);
            if (!['ntuinfo-com', 'alphaallocator', 'cffa-2026'].includes(pid)) {
                assert.match(await page.locator('.project-team').innerText(), /Lead:/);
                assert(!/None currently listed/.test(await page.locator('main').innerText()));
                assert.equal(await page.getByRole('heading', { name: 'Authors', exact: true }).count(), 0);
            }
            await fits();
        }
        await visit('/research-academy/');
        assert.equal(await page.getByRole('link', { name: 'Apply to QRS Research Academy' }).getAttribute('href'), 'https://forms.cloud.microsoft/r/hX0YN2Nvsz');
        await fits();
        await visit('/research-academy/members/');
        if (process.argv[3]) await page.screenshot({ path: `${process.argv[3]}/academy-${width}.png`, fullPage: true });
        const destinations = await page.locator('h3 a').evaluateAll(links => links.map(a => new URL(a.href).pathname));
        assert.deepEqual(new Set(destinations), new Set(['/yz/', '/jn/', '/people/xiaotong-li/', '/people/shufang-chen/', '/people/wang-zimeng/', '/people/xinyue-wu/', '/people/jingshu-liu/', '/people/yizhe-chia/']));
        assert(!/Promoted to QRS Researcher/.test(await page.locator('main').innerText()));
        await fits();
        for (const route of destinations) {
            await visit(route);
            await page.locator('#person-profile .academy-history').waitFor();
            assert.match(await page.locator('#person-profile').innerText(), /2026 Fall #[12]/);
            assert(!/Promoted to QRS Researcher/.test(await page.locator('#person-profile').innerText()));
            assert.equal(await page.getByRole('heading', { name: 'Projects', exact: true }).count(), 0);
            if (route === '/people/yizhe-chia/') assert.match(await page.locator('.profile-projects').innerText(), /Projects: AI Native Workflow/);
            await fits();
        }
    }
    await visit('/publications/');
    assert.equal(await page.locator('.publication-entry').count(), 6);
    assert.equal(await page.locator('.publication-entry').filter({ hasText: 'The Approximation Rank of Softmax Attention' }).count(), 1);
    assert.equal(await page.getByRole('link', { name: '[arXiv]', exact: true }).count(), 1);
    for (const entry of await page.locator('.publication-entry').all()) {
        assert.equal(await entry.locator('.publication-venue a').first().innerText(), '[Project]');
        assert.equal(await entry.locator('.publication-venue a').first().locator('strong').count(), 1);
    }
    await page.getByLabel('Types', { exact: true }).selectOption('workshop');
    assert.equal(await page.locator('.publication-entry').count(), 5);
    await page.getByRole('button', { name: 'Clear filters' }).click();
    assert.equal(await page.locator('.publication-entry').count(), 6);
    await page.getByRole('searchbox').fill('SoftRank');
    assert.equal(await page.locator('.publication-entry').count(), 1);
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await visit('/');
    assert.equal(await page.locator('#home-projects .home-card').count(), 2);
    assert.equal(await page.locator('#home-publications .home-card').count(), 2);
    for (const id of ['quick-links', 'home-events-section', 'home-service-section', 'home-ntu-section']) assert.equal(await page.locator('#' + id).count(), 0);
    await visit('/programmes/');
    assert.equal(await page.getByRole('link', { name: 'Apply to QRS Research Academy' }).count(), 1);
    assert.equal(await page.getByRole('link', { name: /^Programme detail/ }).getAttribute('href'), '../research-academy/');
    await fits();
    await visit('/tw/');
    assert.equal(new URL(page.url()).pathname, '/ntu-tw/');
    for (const [old, current] of [['attention-geometry', 'geoattention'], ['approximation-rank-softmax-attention', 'softrank']]) {
        await visit(`/projects/${old}/`);
        assert.equal(new URL(page.url()).pathname, `/projects/${current}/`);
        await visit(`/projects/#project-${old}`);
        await page.waitForURL(`**/projects/${current}/`);
    }
    // Campus previews share the data and must resolve dynamic profile/project links.
    await visit('/nus/people/');
    await page.locator('#researchers-container a').first().waitFor();
    assert.equal(await page.locator('#researchers-container a').count(), 2);
    await page.locator('#researchers-container a').first().click();
    await page.locator('#person-profile .person-name').waitFor();
    assert(new URL(page.url()).pathname.startsWith('/nus/'));
    await visit('/nus/projects/#project-attention-geometry');
    await page.waitForURL('**/nus/projects/geoattention/');
    await visit('/ntu-tw/research-academy/members/');
    assert.equal(await page.locator('h3 a').count(), 8);
    assert.deepEqual(failures, []);
    await browser.close();
    console.log('PASS: desktop/mobile directory, 12 project pages, Academy, 8 profiles, cohort links, redirects, branch previews, no overflow or browser errors.');
})().catch(error => { console.error(error); process.exit(1); });
