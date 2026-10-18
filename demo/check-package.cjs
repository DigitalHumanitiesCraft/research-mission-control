'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const base = process.env.DEMO_URL;
assert.ok(base, 'Set DEMO_URL to the static package URL, including its trailing slash.');
const screenshots = process.env.DEMO_SCREENSHOTS;
const retiredCollective = '.operator-coordination, #operator-coordination-scope, .operator-coordination-preview, [data-coordination-refresh], .operator-coordination-prompt, [data-chat-key*="coordination-briefing-"]';
const demo = JSON.parse(fs.readFileSync(path.join(__dirname, 'example-data.json'), 'utf8'));
const sourceText = fs.readFileSync(path.join(__dirname, 'sources/demo-guide.md'), 'utf8');
const output = __dirname;
const manifest = JSON.parse(fs.readFileSync(path.join(output, 'export-manifest.json'), 'utf8'));
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
const actualFiles = walk(output).map(file => path.relative(output, file).replaceAll('\\', '/')).sort();
assert.deepEqual(actualFiles, [...manifest.files.map(item => item.file), 'export-manifest.json'].sort());
for (const item of manifest.files) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(output, item.file))).digest('hex'), item.sha256, item.file);
assert.ok(!actualFiles.some(file => /fixture|ergebnis-editorial|synthetic-data.cjs/.test(file)));
const url = (file, lang) => { const address = new URL(file, base); address.searchParams.set('lang', lang); return address.href; };
const routes = [
  ['mission-control/index.html', '#brett .kachel'],
  ['mission-control/index.html?ansicht=fragen', '.chat-discussion'],
  ['mission-control/index.html?ansicht=wer', '#liste-instanzen > *'],
  ['mission-control/index.html?ansicht=frische', '#cols > *'],
  ['mission-control/index.html?ansicht=kalender', '#kalender'],
  ['mission-control/strategien.html', '#strategien article'],
  ['mission-control/projekte.html?projekt=demo-atlas', '#pj-titel'],
  ['mission-control/operatoren.html', '#operator-list tbody tr'],
  ['mission-control/operatoren.html?ansicht=fluss&projekt=demo-atlas&thema=weitere', '#projekt-auftraege'],
  ['mission-control/operatoren.html?ansicht=topologie&projekt=demo-atlas&thema=weitere', '#projekt-verbindungen'],
  ['mission-control/monitor.html', '.mo-review-need'],
  ['mission-control/abnahme.html?lane=demo-research&kennung=DEMO-COMPARE', '#entscheidung .chat-discussion'],
  ['mission-control/abnahme.html?lane=demo-curation&kennung=DEMO-LABEL', '#entscheidung .chat-discussion'],
  ['mission-control/ausfuehrung.html', '#agenten > *'],
  ['research.html', '#research-space > :visible'],
  ...['context', 'atlas', 'board', 'paths'].map(view => ['research.html#view=' + view, '#research-space > :visible']),
  ['research.html#view=paths&q=demo', '#research-space .path-heading'],
];
async function contextFor(browser, width, scheme, clipboard = true) {
  const context = await browser.newContext({ viewport: { width, height: 1050 }, colorScheme: scheme });
  const faults = [], reads = [];
  await context.route('**/*', route => {
    const request = route.request(), address = new URL(request.url()), scope = new URL(base);
    if (address.origin !== scope.origin || !address.pathname.startsWith(scope.pathname) || !['GET', 'HEAD'].includes(request.method()) || address.pathname.startsWith('/api/')) {
      faults.push('Unexpected network ' + request.method() + ' ' + address.href); return route.abort();
    }
    reads.push(address.pathname); return route.continue();
  });
  await context.addInitScript(({ scheme, clipboard }) => {
    if (!sessionStorage.getItem('demo-test-initialized')) {
      localStorage.setItem('mission-control-demo-farbschema', JSON.stringify(scheme));
      sessionStorage.setItem('demo-test-initialized', 'true');
    }
    window.demoCopied = '';
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => {
      if (!clipboard) throw new Error('Test clipboard unavailable'); window.demoCopied = text;
    } } });
    document.execCommand = () => false;
  }, { scheme, clipboard });
  context.on('requestfailed', request => {
    const failure = 'Request failed ' + request.url() + ': ' + request.failure()?.errorText;
    faults.push(failure); console.error(failure);
  });
  const page = await context.newPage();
  page.on('pageerror', error => { faults.push(error.message); console.error('Demo page error:', page.url(), error.stack); });
  page.on('response', response => { if (response.status() >= 400) faults.push('HTTP ' + response.status() + ' ' + response.url()); });
  return { context, page, faults, reads };
}
async function noOverflow(page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'page reflows: ' + page.url());
  assert.equal(await page.locator('a[href^="obsidian:"],a[href^="file:"]').count(), 0, 'no native/private destinations');
}
async function capture(page, name, fullPage = true) { if (screenshots) { fs.mkdirSync(screenshots, { recursive: true }); await page.screenshot({ path: path.join(screenshots, name + '.png'), fullPage }); } }
async function ready(page, route, lang, selector) {
  await page.goto(url(route, lang));
  try { await page.locator(selector).first().waitFor(); }
  catch (error) {
    console.error('Failed demo route:', JSON.stringify({ route, lang, url: page.url(), state: await page.evaluate(() => ({
      title: document.title, content: document.querySelector('main')?.innerText.slice(0, 1600), ready: document.readyState,
      scripts: [...document.scripts].map(script => script.src),
    })) }));
    await capture(page, 'failed-route-' + page.viewportSize().width + '-' + lang, false);
    throw error;
  }
  assert.equal(await page.locator('html').getAttribute('lang'), lang);
  if (route.includes('ansicht=fluss') || route.includes('ansicht=topologie')) {
    const address = new URL(page.url());
    assert.ok(address.pathname.endsWith('/projekte.html'));
    assert.equal(address.searchParams.get('projekt'), 'demo-atlas');
    assert.equal(address.searchParams.get('thema'), 'weitere');
    assert.equal(address.searchParams.has('ansicht'), false);
    assert.equal(address.hash, route.includes('ansicht=fluss') ? '#projekt-auftraege' : '#projekt-verbindungen');
  }
  await noOverflow(page);
}
async function copyPrompt(page, discussion) {
  await discussion.locator('.chat-expand').click();
  const text = await discussion.locator('.chat-prompt-text').innerText();
  await discussion.locator('.chat-prompt-copy').click();
  assert.equal(await page.evaluate(() => window.demoCopied), text);
  assert.ok(/Synthetic demo|Synthetische Demo/.test(text));
  return text;
}
async function profileContract(page, lang) {
  const registry = await page.evaluate(() => window.MISSION_CONTROL_DEMO_PROFILES);
  assert.equal(registry.schema, 'mission-control-demo-profiles-1');
  assert.ok(registry.profiles.length > 1, 'source organization offers genuine alternative layouts');
  const select = page.locator('#demo-profile');
  assert.deepEqual(await select.locator('option').evaluateAll(nodes => nodes.map(node => node.value)), registry.profiles.map(profile => profile.id));
  const originalProfile = await select.inputValue();
  const sourceDetails = page.locator('.demo-profile details');
  const openSourceDetails = async () => { if (!await sourceDetails.evaluate(node => node.open)) await sourceDetails.locator(':scope > summary').press('Enter'); };
  const projectBytes = await page.evaluate(() => JSON.stringify(window.PROJEKTE));
  const discussion = page.locator('.pj-project-conversation .chat-discussion').first();
  const note = discussion.locator('.chat-composition-note');
  const optional = page.locator('.pj-optional-project-conversation');
  if (await optional.count() && !await optional.evaluate(node => node.open)) await optional.locator(':scope > summary').press('Enter');
  if (!await discussion.locator('.chat-composer').evaluate(node => node.open)) await discussion.locator('.chat-composer > summary').press('Enter');
  await note.fill('Synthetic note scoped to the original source organization.');
  const logicalSources = registry.profiles[0].sources.map(source => [source.id, source.revision]);
  for (const profile of registry.profiles.filter(profile => profile.id !== originalProfile)) {
    assert.deepEqual(profile.sources.map(source => [source.id, source.revision]), logicalSources);
    assert.ok(profile.sources.every(source => source.storagePath.startsWith(profile.prefix)));
    assert.notDeepEqual(profile.sources.map(source => source.storagePath), registry.profiles.find(item => item.id === originalProfile).sources.map(source => source.storagePath));
    await openSourceDetails();
    await select.selectOption(profile.id);
    await page.waitForURL(address => address.searchParams.get('profile') === profile.id);
    await page.locator('#pj-titel').waitFor();
    assert.equal(new URL(page.url()).searchParams.get('projekt'), demo.DEMO.projectId);
    assert.equal(await page.locator('html').getAttribute('lang'), lang);
    assert.equal(await page.evaluate(() => JSON.stringify(window.PROJEKTE)), projectBytes);
    assert.equal(await note.inputValue(), '', 'a different layout does not borrow another profile’s note');
    await page.locator('.demo-profile details > summary').press('Enter');
    assert.deepEqual((await page.locator('.demo-profile code').allTextContents()).sort(), profile.sources.map(source => source.id + ' → ' + source.storagePath.split('/').at(-1)).sort());
    await page.locator('.pj-detail a[href*="source=demo-guide"]').first().press('Enter');
    const original = page.locator('#research-inspector .source-original').filter({ hasText: sourceText });
    await original.waitFor({ state: 'attached' }); assert.equal(await original.textContent(), sourceText);
    assert.equal(new URL(page.url()).searchParams.get('profile'), profile.id);
    await page.goBack(); await page.locator('#pj-titel').waitFor();
    await noOverflow(page);
  }
  await openSourceDetails();
  await select.selectOption(originalProfile);
  await page.waitForURL(address => address.searchParams.get('profile') === originalProfile);
  await page.locator('#pj-titel').waitFor();
  assert.equal(await note.inputValue(), 'Synthetic note scoped to the original source organization.');
  assert.equal(await page.evaluate(() => JSON.stringify(window.PROJEKTE)), projectBytes);
}
async function monitorEvidence(page, lang) {
  const entries = demo.MONITOR.evidenzlog;
  assert.ok(Array.isArray(entries) && entries.length, 'the authored scenario supplies an evidence log');
  await ready(page, 'mission-control/monitor.html', lang, '.mo-evidence');
  const summary = await page.locator('.mo-review-need').innerText();
  const original = await page.evaluate(() => JSON.stringify(window.MONITOR));
  const ids = () => page.locator('.mo-log-row').evaluateAll(nodes => nodes.map(node => node.dataset.logId));
  assert.deepEqual(await ids(), entries.map(entry => entry.id));
  for (const button of await page.locator('.mo-flow-stage').all()) {
    const stage = await button.getAttribute('data-stage');
    const expected = entries.filter(entry => entry.status !== 'geschlossen' && entry.stufe === stage);
    assert.equal(await button.locator('strong').textContent(), String(expected.length));
    await button.press('Enter');
    assert.equal(await page.locator('[data-stage="' + stage + '"]').getAttribute('aria-pressed'), 'true');
    assert.deepEqual(await ids(), expected.map(entry => entry.id));
    assert.equal(await page.locator('.mo-log-empty').count(), expected.length ? 0 : 1);
    await page.locator('.mo-log-reset').press('Enter');
    assert.equal(await page.locator('#mo-log-status').inputValue(), 'alle');
    assert.equal(await page.locator('.mo-flow-stage[aria-pressed=true]').count(), 0);
    assert.deepEqual(await ids(), entries.map(entry => entry.id));
  }
  for (const status of ['offen', 'in-arbeit', 'ungeprüft', 'geschlossen']) {
    await page.locator('#mo-log-status').selectOption(status);
    const expected = entries.filter(entry => entry.status === status);
    assert.deepEqual(await ids(), expected.map(entry => entry.id));
    assert.equal(await page.locator('.mo-log-empty').count(), expected.length ? 0 : 1);
  }
  await page.locator('.mo-log-reset').press('Enter');
  for (const entry of entries) {
    const row = page.locator('[data-log-id="' + entry.id + '"]');
    assert.equal(await row.locator('h4').textContent(), entry.titel);
    assert.equal(await row.locator('.mo-log-action').textContent(), entry.aktion);
    await row.locator('details > summary').press('Enter');
    assert.equal(await row.locator('details').evaluate(node => node.open), true);
    assert.equal(await row.locator('details p').first().textContent(), entry.beleg);
    assert.ok((await row.locator('details').innerText()).includes(entry.fassung));
  }
  assert.equal(await page.locator('.mo-review-need').innerText(), summary, 'filtering the log preserves the existing review summary');
  assert.equal(await page.evaluate(() => JSON.stringify(window.MONITOR)), original, 'filters do not mutate source observations');
  const guide = await page.evaluate(async id => (await fetch('/api/source?' + new URLSearchParams({ path: id }))).json(), demo.DEMO.sourceId);
  assert.equal(guide.text, sourceText); assert.equal(guide.revision, demo.DEMO.sourceRevision);
  await noOverflow(page); await capture(page, 'demo-monitor-evidence-' + page.viewportSize().width + '-' + lang, false);
}
async function requirementsComparison(page, lang) {
  await ready(page, 'mission-control/abnahme.html?lane=demo-research&kennung=DEMO-COMPARE', lang, '#vorstellung .ab-comparison-table');
  const expected = demo.DEMO.editorial.introductions.find(item => item.projectId === demo.DEMO.projectId);
  const table = page.locator('#vorstellung table.ab-comparison-table');
  assert.equal(await table.locator('caption').textContent(), expected.table.caption);
  assert.deepEqual(await table.locator('thead th[scope=col]').allTextContents(), expected.table.columns);
  assert.deepEqual(await table.locator('tbody tr').evaluateAll(rows => rows.map(row => [...row.children].map(cell => cell.textContent))), expected.table.rows);
  assert.equal(await table.locator('tbody th[scope=row]').count(), expected.table.rows.length);
  const columns = await table.locator('thead th').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().width));
  assert.ok(columns[1] > columns[0], 'the requirement text receives more width than its short identifier');
  assert.equal(await page.locator('#vorstellung .ab-auszuege blockquote').count(), expected.passages.length);
  for (const passage of expected.passages) assert.ok((await page.locator('#vorstellung').innerText()).includes(passage.text));
  assert.ok((await page.locator('#vorstellung').innerText()).includes(expected.boundary));
  const source = await page.evaluate(async path => { const response = await fetch('/api/source?' + new URLSearchParams({path})); return response.json(); }, expected.path);
  assert.equal(source.revision, expected.revision); assert.equal(source.text, sourceText);
  assert.ok(source.text.includes(expected.table.caption));
  await noOverflow(page);
}
async function workshopMaterials(page, lang) {
  await ready(page, 'mission-control/abnahme.html?lane=demo-curation&kennung=DEMO-LABEL', lang, '#vorstellung .ab-comparison-table');
  assert.ok((await page.locator('#ergebnis').innerText()).includes(demo.DEMO.workshopReview.ergebnis));
  assert.equal(demo.DEMO.workshopReview.answer, null, 'no fictional human acceptance is invented');
  const agenda = page.locator('#vorstellung .ab-comparison-table');
  await agenda.waitFor();
  assert.deepEqual(await agenda.locator('tbody th[scope=row]').allTextContents(), ['0–8', '8–18', '18–28', '28–40', '40–45', '45–60', '60–72', '72–82', '82–90']);
  await capture(page, 'demo-workshop-result-' + page.viewportSize().width + '-' + lang, false);
  const primarySource = page.locator('#vorstellung a[href*="source=demo-guide"]').first();
  const primaryQuery = new URLSearchParams(new URL(await primarySource.getAttribute('href'), page.url()).hash.slice(1));
  assert.equal(primaryQuery.get('source'), 'demo-guide');
  assert.equal(primaryQuery.get('anchor'), 'workshop-plan');
  assert.equal(primaryQuery.get('bezug'), 'demo-exhibit', 'the primary source retains its result project, not the shared guide default');
  const opened = page.waitForEvent('popup');
  await primarySource.press('Enter');
  const reader = await opened;
  await reader.locator('#research-linked-section').waitFor();
  await reader.locator('a[href*="projekte.html"][href*="demo-exhibit"]').first().press('Enter');
  await reader.locator('#pj-titel').waitFor();
  assert.equal(new URL(reader.url()).searchParams.get('projekt'), 'demo-exhibit');
  await reader.close();
  const completeTemplate = page.locator('.ab-vollvorlage');
  if (!await completeTemplate.evaluate(node => node.open)) await completeTemplate.locator(':scope > summary').press('Enter');
  assert.equal(await page.locator('#ergebnis .ab-ansehen a:visible').count(), 4, 'all complete workshop artifacts remain directly reachable');
  for (const [anchor, required] of [
    ['original-records', 'R5 Replacement material rule'],
    ['requirements-synthesis', 'RQ-08'],
    ['workshop-plan', '82–90'],
    ['workshop-worksheet', 'W5 Verification and revision'],
    ['model-handover', 'Next permitted action'],
    ['requirement-change', 'First local exercise'],
  ]) {
    const target = new URL('research.html', base);
    target.searchParams.set('lang', lang);
    target.hash = new URLSearchParams({ view: 'context', source: 'demo-guide', read: '1', bezug: 'demo-exhibit', anchor });
    await page.goto(target.href);
    const section = page.locator('#research-linked-section .source-original');
    await section.waitFor({ state: 'attached' });
    assert.ok((await section.textContent()).includes(required), 'complete linked artifact: ' + anchor);
    assert.equal(await page.locator('#research-inspector .source-original').filter({ hasText: sourceText }).textContent(), sourceText);
    const back = page.locator('a[href*="projekte.html"][href*="demo-exhibit"]').first();
    await back.press('Enter');
    await page.locator('#pj-titel').waitFor();
    assert.equal(new URL(page.url()).searchParams.get('projekt'), 'demo-exhibit');
    await noOverflow(page);
  }
}
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}) });
  try {
    for (const [width, scheme, lang] of [[1440, 'light', 'en'], [1440, 'dark', 'de'], [355, 'light', 'de'], [355, 'dark', 'en']]) {
      const { context, page, faults, reads } = await contextFor(browser, width, scheme);
      // A fresh browser defaults to English without test-injected language storage.
      await page.goto(new URL('mission-control/operatoren.html', base).href);
      await page.locator('#operator-list tbody tr').first().waitFor();
      assert.equal(await page.locator('html').getAttribute('lang'), 'en');
      assert.match(await page.locator('.demo-notice').innerText(), /fictional/i);
      for (const [route, selector] of routes) await ready(page, route, lang, selector);
      await ready(page, 'mission-control/projekte.html?projekt=demo-atlas', lang, '#pj-titel');
      const dates = await page.evaluate(() => ['2026-10-17', '2032-01-02'].map(today => window.LEITSTAND.kurzDatum('2026-10-17', today)));
      assert.deepEqual(dates, [lang === 'en' ? '17 Oct 2026' : '17.10.2026', lang === 'en' ? '17 Oct 2026' : '17.10.2026'], 'authored dates retain identity when the viewing day changes');
      const visibleProject = await page.locator('.pj-detail').innerText();
      assert.equal(visibleProject.split(demo.DEMO.acceptanceReview.ergebnis).length - 1, 1, 'the full report has one primary reading locus; expected output and current status have distinct meanings');
      const optionalConversation = page.locator('.pj-optional-project-conversation');
      if (await optionalConversation.count() && !await optionalConversation.evaluate(node => node.open)) await optionalConversation.locator(':scope > summary').press('Enter');
      const reportLines = await page.locator('.berichte .zeile > .name').evaluateAll(nodes => nodes.map(node => {
        const range = document.createRange(); range.selectNodeContents(node);
        return new Set([...range.getClientRects()].map(rect => Math.round(rect.y))).size;
      }));
      assert.ok(reportLines.length && reportLines.every(lines => lines <= 2), 'short report headings remain readable rather than wrapping character by character');
      const complete = await copyPrompt(page, page.locator('.chat-discussion').first());
      assert.ok(complete.includes(demo.PROJEKTE.projekte[0].titel), 'prompt retains this project context');
      assert.ok(complete.includes(demo.DEMO.sourceRevision));
      await capture(page, 'demo-project-' + width + '-' + lang);
      if (width === 1440) {
        await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
        await noOverflow(page); await capture(page, 'demo-project-zoom-' + lang);
        await page.evaluate(() => { document.documentElement.style.zoom = ''; });
      }
      const sourceLink = page.locator('.pj-detail a[href*="source=demo-guide"]').first();
      await sourceLink.press('Enter');
      const original = page.locator('#research-inspector .source-original').filter({ hasText: sourceText });
      await original.waitFor({ state: 'attached' });
      assert.equal(await original.textContent(), sourceText);
      await page.goBack(); await page.locator('#pj-titel').waitFor();
      assert.equal(new URL(page.url()).searchParams.get('projekt'), demo.DEMO.projectId);
      await profileContract(page, lang);
      await requirementsComparison(page, lang);
      await workshopMaterials(page, lang);
      await monitorEvidence(page, lang);
      const blocked = await page.evaluate(async () => {
        const messages = [];
        for (const target of ['/api/answers', '/api/start']) try { await fetch(target, { method: 'POST' }); } catch (error) { messages.push(error.message); }
        return messages;
      });
      assert.equal(blocked.length, 2); assert.ok(blocked.every(text => /Nothing was sent|nichts gesendet/.test(text)));
      await ready(page, 'mission-control/operatoren.html?briefing=all&briefing-open=1', lang, '#operator-list tbody tr');
      assert.equal(await page.locator(retiredCollective).count(), 0, 'legacy briefing parameters cannot recreate the retired collective UI');
      await page.waitForFunction(() => window.OPERATOR_SESSION_LOAD?.state === 'loaded');
      const active = demo.LAB_LANES.lanes.filter(lane => lane.state !== 'RETIRED');
      assert.equal(await page.locator('.op-ensemble-profile').count(), active.length);
      const expectedSessions = demo.DEMO.operatorSessions || demo.OPERATOR_SESSIONS;
      assert.ok(expectedSessions, 'synthetic session asset is part of the fixture contract');
      assert.deepEqual(await page.evaluate(() => window.OPERATOR_SESSIONS), expectedSessions);
      for (const lane of active) {
        const profile = page.locator('#ensemble-open-' + lane.key);
        await page.mouse.move(1, 1);
        await profile.focus();
        if (await profile.evaluate(node => node.parentElement.open)) await page.keyboard.press('Escape');
        await profile.press('Enter');
        const panel = page.locator('[data-session-detail-operator="' + lane.key + '"]');
        await panel.waitFor({ state: 'visible' });
        const config = expectedSessions.operators[lane.key]?.configurationObserved;
        if (config) {
          assert.ok((await panel.locator('.operator-session-essential').innerText()).includes(config.model));
          assert.equal(await panel.locator('.operator-session-date').count(), 1);
          await panel.locator('.operator-session-proof summary').press('Enter');
          assert.ok((await panel.innerText()).includes(config.turnId));
        }
        await noOverflow(page); await page.keyboard.press('Escape');
      }
      const reportOpener = page.locator('#operator-' + demo.DEMO.roleId + ' .op-report-open');
      await reportOpener.press('Enter');
      const report = page.locator('.op-report-dialog[open]'); await report.waitFor();
      assert.equal(await report.locator('.op-complete-report').textContent(), demo.BRIEFINGS.operators[demo.DEMO.roleId].originalReply.report);
      assert.ok((await report.innerText()).includes(demo.BRIEFINGS.operators[demo.DEMO.roleId].originalReply.previousQualitativeOriginal));
      await page.keyboard.press('Escape'); assert.equal(await reportOpener.evaluate(node => node === document.activeElement), true);
      const optional = page.locator('#operator-' + demo.DEMO.roleId + ' .op-optional-conversation');
      if (await optional.count() && !await optional.evaluate(node => node.open)) await optional.locator(':scope > summary').press('Enter');
      const discussion = page.locator('#operator-' + demo.DEMO.roleId + ' .chat-discussion').first();
      if (!await discussion.locator('.chat-composer').evaluate(node => node.open)) await discussion.locator('.chat-composer > summary').press('Enter');
      await discussion.locator('.chat-composition-note').fill('Synthetic personal note, not sent.');
      const choices = discussion.locator('.chat-context-item');
      assert.ok(await choices.count(), 'real synthetic report supplies a selectable context');
      await choices.first().click(); assert.equal(await choices.first().getAttribute('aria-pressed'), 'true');
      const prompt = await copyPrompt(page, discussion); assert.ok(prompt.includes('Synthetic personal note, not sent.'));
      for (const mode of ['fluss', 'topologie']) {
        await page.goto(url('mission-control/operatoren.html?ansicht=' + mode + '&projekt=demo-atlas&thema=weitere&von=operatoren', lang));
        const anchor = mode === 'fluss' ? 'projekt-auftraege' : 'projekt-verbindungen';
        await page.locator('#' + anchor).waitFor();
        const address = new URL(page.url());
        assert.ok(address.pathname.endsWith('/projekte.html'));
        assert.equal(address.searchParams.get('projekt'), 'demo-atlas');
        assert.equal(address.searchParams.get('thema'), 'weitere');
        assert.equal(address.searchParams.get('lang'), lang);
        assert.equal(address.searchParams.get('von'), 'operatoren');
        assert.equal(address.searchParams.has('ansicht'), false);
        assert.equal(address.hash, '#' + anchor);
        await page.waitForFunction(id => document.activeElement?.id === id, anchor);
        await page.locator('.pj-detail a[href*="source=demo-guide"]').first().press('Enter');
        const original = page.locator('#research-inspector .source-original').filter({ hasText: sourceText });
        await original.waitFor({ state: 'attached' }); assert.equal(await original.textContent(), sourceText);
        await page.goBack(); await page.locator('#' + anchor).waitFor();
        assert.equal(new URL(page.url()).searchParams.get('projekt'), 'demo-atlas');
        assert.equal(new URL(page.url()).searchParams.get('thema'), 'weitere');
        assert.equal(new URL(page.url()).hash, '#' + anchor);
        await page.goBack(); await page.locator('#operator-list').waitFor();
        assert.equal(await page.locator('#operator-' + demo.DEMO.roleId + ' .chat-composition-note').inputValue(), 'Synthetic personal note, not sent.');
        assert.equal(await page.locator('#operator-' + demo.DEMO.roleId + ' .chat-context-item').first().getAttribute('aria-pressed'), 'true');
      }
      assert.equal(await page.locator('#operator-' + demo.DEMO.roleId + ' .chat-composition-note').inputValue(), 'Synthetic personal note, not sent.');
      const nextLanguage = lang === 'en' ? 'de' : 'en';
      await page.locator('.app-settings > summary').press('Enter');
      await page.locator('.app-language select').selectOption(nextLanguage);
      await page.waitForFunction(value => window.UI_LANGUAGE?.language === value, nextLanguage);
      await page.locator('#operator-list').waitFor();
      assert.equal(await page.locator('#operator-' + demo.DEMO.roleId + ' .chat-composition-note').inputValue(), 'Synthetic personal note, not sent.');
      assert.equal(await page.locator(retiredCollective).count(), 0, 'language redraw does not restore any collective scope, preview, refresh or shared prompt');
      await capture(page, 'demo-operators-' + width + '-' + lang);
      await page.locator('#operator-list').scrollIntoViewIfNeeded();
      await capture(page, 'demo-rows-' + width + '-' + lang, false);
      await page.locator('.app-settings > summary').press('Enter');
      const settings = page.locator('.app-view-settings'); await settings.locator(':scope > summary').click();
      const calendar = settings.locator('input[data-view-key="kalender"]'); await calendar.uncheck();
      await ready(page, 'mission-control/index.html?ansicht=kalender', lang, '#kalender');
      assert.equal(await page.locator('[data-view="kalender"][data-hidden-current="true"], [data-subnav-key="kalender"][data-hidden-current="true"]').count(), 1);
      await page.getByRole('button', { name: lang === 'de' ? 'Demo zurücksetzen' : 'Reset demo', exact: true }).click();
      await page.waitForURL(address => !address.pathname.endsWith('kalender.html') && !address.searchParams.has('ansicht'));
      await page.locator('#brett .kachel').first().waitFor();
      assert.equal(await page.evaluate(() => localStorage.getItem('mission-control-demo-view-settings')), null);
      assert.ok(reads.some(file => file.endsWith('/demo-assets/operator-sessions.json')));
      assert.deepEqual(faults, []); await context.close();
      console.log('Passed all routes, sources, metadata, individual drafts, retired collective UI, language, history and settings:', width, scheme, lang);
    }
    const fallback = await contextFor(browser, 355, 'dark', false);
    await ready(fallback.page, 'mission-control/projekte.html?projekt=demo-atlas', 'en', '#pj-titel');
    const optionalFallback = fallback.page.locator('.pj-optional-project-conversation');
    if (await optionalFallback.count() && !await optionalFallback.evaluate(node => node.open)) await optionalFallback.locator(':scope > summary').press('Enter');
    await fallback.page.locator('.chat-prompt-copy').first().click();
    assert.match(await fallback.page.locator('.chat-prompt-status').first().innerText(), /manual/);
    assert.equal(await fallback.page.locator('.chat-prompt-details').first().isVisible(), true);
    assert.ok((await fallback.page.locator('.chat-prompt-text').first().innerText()).includes(demo.DEMO.sourceRevision));
    assert.deepEqual(fallback.faults, []); await fallback.context.close();
    const missing = await contextFor(browser, 355, 'light');
    await missing.context.route(address => address.pathname.endsWith('/demo-assets/source.json') || address.pathname.endsWith('/demo-guide.json'), route => route.abort());
    await missing.page.goto(new URL('research.html?lang=en#view=context&source=demo-guide&read=1', base).href);
    await missing.page.locator('#research-inspector .stoerung').waitFor();
    assert.equal(await missing.page.locator('#research-inspector .source-original').filter({ hasText: sourceText }).count(), 0);
    await noOverflow(missing.page); await missing.context.close();
    const empty = await contextFor(browser, 355, 'dark');
    await empty.context.route('**/mission-control/data/projekte-data.js', route => route.fulfill({ contentType: 'text/javascript', body: 'window.PROJEKTE={projekte:[]};' }));
    await ready(empty.page, 'mission-control/projekte.html?projekt=demo-atlas', 'en', '#projekte');
    await empty.page.waitForFunction(() => /No project/.test(document.getElementById('projekte').textContent));
    await noOverflow(empty.page); assert.deepEqual(empty.faults, []); await empty.context.close();
    console.log('Passed manual clipboard fallback and missing-source boundary; every emitted byte matches the manifest.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
