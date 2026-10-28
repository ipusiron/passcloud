const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/theme-init.js'), 'utf8');

// theme-init.js を、保存値と OS 設定を差し替えた仮の window で動かし、<html> の data-theme を返す。
function run({ saved = null, prefersDark = false, storageThrows = false } = {}) {
    const attrs = {};
    const window = {
        localStorage: { getItem: () => { if (storageThrows) throw new Error('blocked'); return saved; } },
        matchMedia: () => ({ matches: prefersDark }),
        document: { documentElement: { setAttribute: (name, value) => { attrs[name] = value; } } }
    };
    vm.runInNewContext(source, { window });
    return attrs['data-theme'];
}

test('theme-init: without a saved value the theme is light, whatever the OS setting', () => {
    assert.equal(run({ prefersDark: false }), 'light');
    assert.equal(run({ prefersDark: true }), 'light');
});

test('theme-init: a saved dark or light is used', () => {
    assert.equal(run({ saved: 'dark', prefersDark: false }), 'dark');
    assert.equal(run({ saved: 'light', prefersDark: true }), 'light');
});

test('theme-init: an unexpected saved value falls back to light', () => {
    assert.equal(run({ saved: 'blue' }), 'light');
    assert.equal(run({ saved: 'Dark', prefersDark: true }), 'light');
});

test('theme-init: a blocked localStorage does not throw and gives light', () => {
    assert.equal(run({ storageThrows: true, prefersDark: true }), 'light');
});

test('theme-init: index.html loads it synchronously in <head>, after the stylesheet', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const head = html.slice(0, html.indexOf('</head>'));
    assert.ok(head.includes('<script src="js/theme-init.js"></script>'), 'theme-init.js is not in <head>');
    assert.ok(head.indexOf('css/main.css') < head.indexOf('js/theme-init.js'));
});
