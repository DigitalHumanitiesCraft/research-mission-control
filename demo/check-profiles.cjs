'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'example-data.json'), 'utf8'));
const source = fs.readFileSync(path.join(__dirname, 'sources/demo-guide.md'), 'utf8');
const build = require('./tools/build-data.cjs');
const assets = build(data, source);
const index = JSON.parse(assets.get('profiles/index.json'));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const runtime = fs.readFileSync(path.join(__dirname, 'demo-runtime.js'), 'utf8');
function harness(query, values = new Map(), blocked = false) {
  class Storage {
    getItem(key) { if (blocked) throw new Error('storage blocked'); return values.get(String(key)) ?? null; }
    setItem(key, value) { if (blocked) throw new Error('storage blocked'); values.set(String(key), String(value)); }
    removeItem(key) { if (blocked) throw new Error('storage blocked'); values.delete(String(key)); }
  }
  const calls = [], origin = 'https://example.invalid/portable/demo/';
  const scope = { URL, URLSearchParams, Storage, localStorage: new Storage(), sessionStorage: new Storage(),
    location: new URL(origin + 'research.html' + query),
    document: { currentScript: { src: origin + 'demo-runtime.js' }, addEventListener() {} },
    window: { MISSION_CONTROL_DEMO_PROFILES: index, fetch: async (input, options) => {
      const url = new URL(String(input), scope.location);
      calls.push({ url, options });
      const text = assets.get(url.pathname.slice('/portable/demo/'.length));
      return { ok: text !== undefined, json: async () => JSON.parse(text), text: async () => text };
    } } };
  scope.history = { state: { original: true }, pushState(state, title, url) { this.state = state; scope.location = new URL(url); }, replaceState(state, title, url) { this.state = state; scope.location = new URL(url); } };
  vm.runInNewContext(runtime, scope);
  return { scope, calls, values, fetch: scope.window.fetch, demo: scope.window.MISSION_CONTROL_DEMO };
}
test('profiles change actual source placement while retaining every authored byte, identity and relation', () => {
  assert.deepEqual(index.profiles.map(profile => profile.id), ['project-folder', 'linked-notes', 'shared-sources']);
  assert.equal(index.defaultProfile, 'project-folder');
  const rootMap = JSON.parse(assets.get('source-map.json'));
  const placements = [];
  for (const profile of index.profiles) {
    const map = JSON.parse(assets.get(profile.prefix + 'source-map.json'));
    assert.deepEqual(Object.keys(map).sort(), Object.keys(rootMap).sort());
    for (const [id, file] of Object.entries(map)) {
      const document = JSON.parse(assets.get(file));
      assert.equal(document.path, id);
      assert.equal(document.text, JSON.parse(assets.get(rootMap[id])).text);
      assert.equal(document.revision, hash(document.text));
      assert.equal(profile.sources.find(source => source.id === id).storagePath, file);
    }
    placements.push(map['demo-guide']);
    for (const file of ['data.js', 'mission-control/data/lab-lanes-data.js', 'mission-control/data/projekte-data.js', 'research-paths.js', 'demo-assets/operator-sessions.json', 'demo-assets/relations.json']) assert.equal(assets.get(profile.prefix + file), assets.get(file), file);
    const coverage = JSON.parse(assets.get(profile.prefix + 'demo-assets/coverage.json'));
    assert.equal(coverage.profile, profile.id);
    assert.deepEqual(coverage.vault.links, JSON.parse(assets.get('demo-assets/coverage.json')).vault.links);
    assert.ok(coverage.vault.documents.every(document => document.id === document.path && map[document.id] === document.storagePath));
  }
  assert.equal(new Set(placements).size, 3);
});
test('runtime selects URL profile before reads and confines all known GET/HEAD APIs to its assets', async () => {
  for (const profile of index.profiles) {
    const h = harness('?profile=' + profile.id + '&lang=de#view=context&source=demo-guide&bezug=demo-atlas');
    assert.equal(h.demo.profile, profile.id);
    assert.ok(h.calls[0].url.pathname.endsWith(profile.prefix + 'source-map.json'));
    const response = await h.fetch('/api/source?path=demo-guide');
    assert.equal((await response.json()).text, source);
    for (const endpoint of ['research', 'work', 'agent-work', 'operator-sessions', 'relations', 'progress']) {
      await h.fetch('/api/' + endpoint, { method: 'HEAD' });
      assert.ok(h.calls.at(-1).url.pathname.includes('/' + profile.prefix + 'demo-assets/'));
      assert.equal(h.calls.at(-1).options.method, 'HEAD');
    }
    for (const [lane, task, expected] of [
      ['demo-research', 'DEMO-COMPARE', data.DEMO.acceptanceReview],
      ['demo-curation', 'DEMO-LABEL', data.DEMO.workshopReview],
    ]) {
      const response = await h.fetch('/api/acceptance-review?' + new URLSearchParams({ lane, kennung: task }));
      assert.deepEqual(await response.json(), expected);
      assert.ok(h.calls.at(-1).url.pathname.includes('/' + profile.prefix + 'demo-assets/'));
    }
    await h.fetch('/portable/demo/mission-control/briefings/current.json');
    assert.ok(h.calls.at(-1).url.pathname.endsWith(profile.prefix + 'mission-control/briefings/current.json'));
    const link = new URL(h.demo.sourceHref('demo-sources/demo-research.md', 'Current Report'));
    assert.equal(link.searchParams.get('profile'), profile.id);
    assert.equal(new URLSearchParams(link.hash.slice(1)).get('source'), 'demo-sources/demo-research.md');
    h.scope.history.pushState({ retained: true }, '', 'mission-control/projekte.html?projekt=demo-exhibit&lang=de#exact-return');
    assert.equal(h.scope.location.searchParams.get('profile'), profile.id);
    assert.equal(h.scope.location.searchParams.get('projekt'), 'demo-exhibit');
    assert.equal(h.scope.location.hash, '#exact-return');
    assert.equal(h.scope.history.state.retained, true);
  }
});
test('notes and language stay profile-scoped without reading private application keys', () => {
  const values = new Map([['leitstand-private', 'do not touch'], ['mission-control-demo-answer', 'legacy authored default note']]);
  const folder = harness('?profile=project-folder', values);
  assert.equal(folder.scope.localStorage.getItem('mission-control-demo-answer'), 'legacy authored default note');
  assert.equal(values.has('mission-control-demo-answer'), false, 'legacy demo draft migrates once so reset cannot resurrect it');
  folder.scope.localStorage.setItem('mission-control-demo-answer', 'folder note');
  folder.scope.localStorage.setItem('mission-control-demo-language', 'de');
  const notes = harness('?profile=linked-notes', values);
  assert.equal(notes.scope.localStorage.getItem('mission-control-demo-answer'), null);
  notes.scope.localStorage.setItem('mission-control-demo-answer', 'notes note');
  notes.scope.localStorage.setItem('mission-control-demo-language', 'en');
  assert.equal(harness('?profile=project-folder', values).scope.localStorage.getItem('mission-control-demo-answer'), 'folder note');
  assert.equal(harness('?profile=project-folder', values).scope.localStorage.getItem('mission-control-demo-language'), 'de');
  assert.equal(harness('?profile=linked-notes', values).scope.localStorage.getItem('mission-control-demo-answer'), 'notes note');
  assert.equal(values.get('leitstand-private'), 'do not touch');
});
test('blocked storage, unknown or repeated profiles retain a canonical readable URL fallback', async () => {
  const blocked = harness('?profile=shared-sources&lang=de#view=context&source=demo-guide', new Map(), true);
  assert.equal(blocked.demo.profile, 'shared-sources');
  assert.equal(new URL(blocked.demo.sourceHref('demo-guide')).searchParams.get('lang'), 'de', 'late reader links retain actual language when storage is blocked');
  blocked.scope.history.pushState({}, '', 'research.html?lang=en#source=demo-guide');
  assert.equal(blocked.scope.location.searchParams.get('lang'), 'en', 'valid explicit destination language wins');
  const foreign = harness('?profile=linked-notes&lang=de');
  foreign.scope.history.pushState({}, '', 'https://foreign.invalid/read');
  assert.equal(foreign.scope.location.search, '', 'foreign targets are not decorated');
  assert.equal((await (await blocked.fetch('/api/source?path=demo-guide')).json()).text, source);
  for (const query of ['?profile=unknown', '?profile=linked-notes&profile=shared-sources']) {
    const h = harness(query + '&lang=de#source=demo-guide');
    assert.equal(h.demo.profile, 'project-folder');
    assert.deepEqual(h.scope.location.searchParams.getAll('profile'), ['project-folder']);
    assert.equal(h.scope.location.searchParams.get('lang'), 'de');
    assert.equal(h.scope.location.hash, '#source=demo-guide');
    assert.equal((await (await h.fetch('/api/source?path=demo-guide')).json()).revision, data.DEMO.sourceRevision);
  }
});
test('profiles cannot enable writes, native protocols, traversal or unknown sources', async () => {
  const h = harness('?profile=linked-notes');
  for (const [url, options] of [['/api/source?path=../private'], ['/api/source?path=__proto__'], ['/api/source?path=missing'], ['/api/start', { method: 'POST' }], ['https://foreign.invalid/'], ['obsidian://open?vault=private'], ['/portable/private.json']]) await assert.rejects(h.fetch(url, options));
  assert.equal(h.calls.length, 1);
  assert.equal(h.demo.sourceHref('javascript:alert(1)'), '');
});
test('published inputs alone rebuild every profile member deterministically', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mc-demo-profiles-'));
  const files = new Map(assets);
  files.set('example-data.json', JSON.stringify(data)); files.set('sources/demo-guide.md', source);
  for (const name of ['build-data.cjs', 'knowledge-profiles.cjs', 'rebuild-example.cjs']) files.set('tools/' + name, fs.readFileSync(path.join(__dirname, 'tools', name), 'utf8'));
  const manifest = { schema: 'mission-control-demo-export-1', files: [...files].map(([file,value]) => ({ file, sha256: hash(value), bytes: Buffer.byteLength(value), license: 'MIT' })) };
  for (const [file,value] of files) { fs.mkdirSync(path.dirname(path.join(root,file)), { recursive: true }); fs.writeFileSync(path.join(root,file),value); }
  fs.writeFileSync(path.join(root,'export-manifest.json'), JSON.stringify(manifest,null,2));
  execFileSync(process.execPath, [path.join(root,'tools/rebuild-example.cjs')], { cwd: root, encoding: 'utf8' });
  const rebuilt = JSON.parse(fs.readFileSync(path.join(root,'export-manifest.json'),'utf8'));
  for (const item of rebuilt.files) { assert.equal(fs.readFileSync(path.join(root,item.file),'utf8'), files.get(item.file)); assert.equal(item.sha256, hash(files.get(item.file))); }
});
