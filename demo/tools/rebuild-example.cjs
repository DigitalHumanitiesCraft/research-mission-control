'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'example-data.json'), 'utf8'));
const source = fs.readFileSync(path.join(root, 'sources', 'demo-guide.md'), 'utf8');
const assets = require('./build-data.cjs')(data, source);
const manifestPath = path.join(root, 'export-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const names = manifest.files.map(item => item.file);
if (new Set(names).size !== names.length) throw new Error('Duplicate manifest member');
for (const name of [...names, ...assets.keys()]) {
  if (!/^[\w./-]+$/.test(name) || name.split('/').some(part => part === '..') || !path.resolve(root, name).startsWith(root + path.sep)) throw new Error('Unsafe package member');
}
for (const [name, value] of assets) {
  if (!names.includes(name)) throw new Error('New data asset needs an explicit manifest entry: ' + name);
  fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
  fs.writeFileSync(path.join(root, name), value);
}
for (const item of manifest.files) {
  const bytes = fs.readFileSync(path.join(root, item.file));
  item.sha256 = crypto.createHash('sha256').update(bytes).digest('hex'); item.bytes = bytes.length;
}
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log('Rebuilt the explicit synthetic data members and refreshed existing manifest hashes.');
