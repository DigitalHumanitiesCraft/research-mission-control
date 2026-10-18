'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const runtime = fs.readFileSync(process.env.DEMO_RUNTIME_FILE || path.join(__dirname, '..', 'demo-runtime.js'), 'utf8');
function harness(map = { 'demo-guide': 'demo-assets/source.json' }) {
  const calls = [];
  const scope = { URL, URLSearchParams, Object, location: new URL('https://demo.invalid/method/demo/mission-control/projekte.html?projekt=demo-atlas'),
    document: { currentScript: { src: 'https://demo.invalid/method/demo/demo-runtime.js' }, addEventListener() {} },
    window: { fetch: async (url, options) => { calls.push({ url: String(url), options }); return { ok: true, json: async () => map }; } } };
  vm.runInNewContext(runtime, scope);
  return { fetch: scope.window.fetch, calls, sourceHref: scope.window.MISSION_CONTROL_DEMO.sourceHref };
}
test('static sources use explicit own map entries inside the package', async () => {
  const h = harness(); await h.fetch('/api/source?path=demo-guide');
  assert.equal(h.calls.length, 2); assert.equal(h.calls[1].url, 'https://demo.invalid/method/demo/demo-assets/source.json');
  const address = new URL(h.sourceHref('demo-guide', 'Beispielergebnis'));
  const query = new URLSearchParams(address.hash.slice(1));
  assert.equal(query.get('anchor'), 'beispielergebnis'); assert.equal(query.get('bezug'), 'demo-atlas');
});
test('unknown and inherited source keys cannot become reads', async () => {
  const h = harness();
  for (const key of ['unknown', '__proto__', 'constructor', 'toString']) await assert.rejects(h.fetch('/api/source?path=' + key));
  assert.equal(h.calls.length, 1);
});
test('unsafe map paths and invalid map types stop before a source read', async () => {
  for (const map of [null, [], { 'demo-guide': 42 }, ...['../private.json', '/private.json', 'https://outside.invalid/private.json', 'sources/.hidden.json', 'sources//file.json', 'sources\\file.json', 'source.json?key=1'].map(file => ({ 'demo-guide': file }))]) {
    const h = harness(map); await assert.rejects(h.fetch('/api/source?path=demo-guide')); assert.equal(h.calls.length, 1);
  }
});
test('writes, foreign origins, outside paths and unknown task identities never reach native fetch', async () => {
  const h = harness();
  for (const [url, options] of [['/api/answers', { method: 'POST' }], ['https://outside.invalid/source.json'], ['/private.json'], ['/api/acceptance-review?lane=other&kennung=DEMO-COMPARE']]) await assert.rejects(h.fetch(url, options));
  assert.equal(h.calls.length, 1);
});
