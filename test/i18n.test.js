const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const I18n = require('../js/i18n.js');

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const uiNames = fs.readdirSync(path.join(root, 'js'))
    .filter(name => name.endsWith('.js') && !['wordcloud2.js', 'i18n.js'].includes(name));
const uiSources = uiNames.map(name => [name, fs.readFileSync(path.join(root, 'js', name), 'utf8')]);

// g フラグを付けると lastIndex が残り、ループの .test() が交互に false になる。
const JAPANESE = /[\u3040-\u30ff\u4e00-\u9fff]/;
// 和文のフォールバックを残す設計なので、英語の辞書に出てよい和文は切り替えボタンだけである。
const JAPANESE_IN_ENGLISH = ['app.langButton'];

function placeholders(value) {
    return [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
}

function htmlKeys() {
    const keys = new Map();
    for (const match of html.matchAll(/data-i18n(-[a-z-]+)?="([\w.]+)"/g)) {
        keys.set(match[2], (match[1] || '').replace(/^-/, '') || 'text');
    }
    return keys;
}

function scriptKeys() {
    const keys = new Set();
    for (const [, source] of uiSources) {
        for (const match of source.matchAll(/I18n\.t\(\s*'([\w.]+[\w])'/g)) keys.add(match[1]);
        for (const match of source.matchAll(/(?:notify|showLoading)\(\s*'([\w.]+[\w])'/g)) keys.add(match[1]);
        for (const match of source.matchAll(/loadingKey = '([\w.]+[\w])'/g)) keys.add(match[1]);
    }
    return keys;
}

function stripComments(source) {
    return source.split(/\r?\n/).map(line => line.replace(/\/\/.*$/, '')).join('\n');
}

test('the Japanese and English dictionaries share one key set', () => {
    const ja = Object.keys(I18n.ja).sort();
    const en = Object.keys(I18n.en).sort();
    assert.deepEqual(ja, en);
    assert.equal(ja.length, new Set(ja).size);
    assert.ok(ja.length >= 166, String(ja.length));
});

test('every substitution name matches between the two languages', () => {
    for (const key of Object.keys(I18n.ja)) {
        assert.deepEqual(placeholders(I18n.en[key]), placeholders(I18n.ja[key]), key);
    }
});

test('every key the HTML points at exists, and none of them takes a substitution', () => {
    const keys = htmlKeys();
    assert.ok(keys.size >= 90, String(keys.size));
    for (const [key, attribute] of keys) {
        assert.ok(Object.hasOwn(I18n.ja, key), key);
        // apply() は t(key) を値なしで呼ぶので、差し込みつきのキーは {name} が画面に出てしまう。
        assert.deepEqual(placeholders(I18n.ja[key]), [], key + ' (' + attribute + ')');
        assert.deepEqual(placeholders(I18n.en[key]), [], key + ' (' + attribute + ')');
    }
});

test('every key the scripts call exists, and no dictionary key is dead', () => {
    const fromScripts = scriptKeys();
    for (const key of fromScripts) assert.ok(Object.hasOwn(I18n.ja, key), key);
    const used = new Set([...htmlKeys().keys(), ...fromScripts]);
    assert.deepEqual(Object.keys(I18n.ja).filter(key => !used.has(key)), []);
});

test('the English dictionary keeps no Japanese, and the listed exceptions really hold it', () => {
    for (const [key, value] of Object.entries(I18n.en)) {
        if (JAPANESE_IN_ENGLISH.includes(key)) continue;
        assert.ok(!JAPANESE.test(value), key + ': ' + value);
    }
    for (const key of JAPANESE_IN_ENGLISH) assert.ok(JAPANESE.test(I18n.en[key]), key);
    assert.equal(I18n.ja['app.langButton'], 'English');
    assert.equal(I18n.en['app.langButton'], '日本語');
});

test('t() fills substitutions and throws on an unknown key', () => {
    assert.equal(I18n.t('file.loaded', { name: 'rockyou.txt' }), '📄 読み込み対象: rockyou.txt');
    assert.equal(I18n.t('stats.chars', { length: 12 }), '12 文字');
    assert.equal(I18n.t('heatmap.rangeValue', { min: 5, max: 12 }), '5〜12文字');
    assert.equal(I18n.t('cloud.hover', { word: 'ninja', count: 29 }), 'ninja: 29回');
    // 知らない差し込みはリテラルのまま残し、知らないキーは投げる。
    assert.equal(I18n.t('stats.chars'), '{length} 文字');
    assert.throws(() => I18n.t('no.such.key'), /Unknown message: no\.such\.key/);
    // テストから setLanguage() を呼ばない（apply() が document を触るため）。英語は辞書を直接見る。
    assert.equal(I18n.en['stats.chars'].replace('{length}', '12'), '12 chars');
    assert.equal(I18n.language, 'ja');
});

test('no element that has children carries data-i18n', () => {
    for (const match of html.matchAll(/<(\w+)[^>]*\sdata-i18n="[^"]+"[^>]*>([\s\S]*?)<\/\1\s*>/g)) {
        assert.ok(!match[2].includes('<'), match[0].slice(0, 90));
    }
});

test('the Japanese kept in the HTML matches the ja dictionary exactly', () => {
    let bodies = 0;
    for (const match of html.matchAll(/<(\w+)[^>]*\sdata-i18n="([\w.]+)"[^>]*>([\s\S]*?)<\/\1\s*>/g)) {
        assert.equal(match[3].trim(), I18n.ja[match[2]], match[2]);
        bodies++;
    }
    assert.ok(bodies >= 55, String(bodies));
    let attributes = 0;
    for (const match of html.matchAll(/<[a-z][^>]*>/gi)) {
        const tag = match[0];
        for (const attribute of ['aria-label', 'title', 'placeholder', 'alt', 'content']) {
            const keyed = tag.match(new RegExp('data-i18n-' + attribute + '="([\\w.]+)"'));
            const raw = tag.match(new RegExp('(?<!data-i18n-)\\b' + attribute + '="([^"]*)"'));
            if (!keyed) {
                assert.ok(!raw || !JAPANESE.test(raw[1]), tag.slice(0, 90));
                continue;
            }
            assert.ok(raw, tag.slice(0, 90));
            assert.equal(raw[1], I18n.ja[keyed[1]], keyed[1]);
            attributes++;
        }
    }
    assert.equal(attributes, 16);
});

test('the only Japanese outside the dictionary is the bilingual noscript line', () => {
    const lines = html.replace(/<!--[\s\S]*?-->/g, '').split(/\r?\n/)
        .map(line => line.trim()).filter(line => JAPANESE.test(line) && !line.includes('data-i18n'));
    assert.deepEqual(lines, ['<noscript>このツールを使うには、ブラウザーのJavaScriptを有効にしてください。'
        + ' / Enable JavaScript in your browser to use this tool.</noscript>']);
    // 両言語を1つのテキストノードに置く（span で包むと noscript の中身を見るテストが落ちる）。
    const noscript = html.match(/<noscript>([^<]+)<\/noscript>/);
    assert.ok(noscript);
    assert.ok(noscript[1].includes('JavaScript'));
    assert.doesNotMatch(html, /ブラウザーー/);
});

test('the pure core keeps no wording and never reaches the dictionary', () => {
    for (const name of fs.readdirSync(path.join(root, 'js/core'))) {
        const source = fs.readFileSync(path.join(root, 'js/core', name), 'utf8');
        assert.doesNotMatch(source, /I18n/);
        for (const line of stripComments(source).split('\n')) {
            assert.ok(!JAPANESE.test(line), name + ': ' + line.trim());
        }
    }
});

test('the UI scripts hold no wording of their own and judge no state by displayed text', () => {
    for (const [name, source] of uiSources) {
        for (const line of stripComments(source).split('\n')) {
            assert.ok(!JAPANESE.test(line), name + ': ' + line.trim());
        }
        // 表示中の文字列との一致で状態を判定すると、言語を変えた瞬間に壊れる。
        assert.doesNotMatch(source, /textContent\s*===|\.title\s*===|textContent\s*\.\s*includes/);
        // 言語の保存は i18n.js だけが行う。
        assert.doesNotMatch(source, /passcloud-language/);
    }
});

test('the metadata is translated and i18n.js loads before every other script', () => {
    assert.equal((html.match(/data-i18n-content=/g) || []).length, 8);
    for (const name of ['description', 'keywords', 'og:title', 'og:description', 'og:site_name',
        'og:locale', 'twitter:title', 'twitter:description']) {
        assert.match(html, new RegExp('<meta [^>]*"' + name + '"[^>]*data-i18n-content='), name);
    }
    const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(match => match[1]);
    assert.equal(scripts[0], 'js/i18n.js');
    assert.equal(scripts.length, 13);
    assert.ok(scripts.includes('js/main.js'));
});

test('the language toggle is wired to the id the probes press', () => {
    assert.match(html, /id="langToggle"/);
    const main = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8');
    assert.match(main, /getElementById\('langToggle'\)/);
    assert.match(main, /I18n\.setLanguage\(I18n\.language === 'ja' \? 'en' : 'ja'\)/);
    assert.match(main, /addEventListener\('languagechange'/);
    assert.match(main, /I18n\.init\(\)/);
    // 状態で変わらない属性だけを data-i18n-<attr> に任せる。テーマのアイコンは絵文字なので訳さない。
    assert.doesNotMatch(html, /id="themeToggle"[^>]*data-i18n="/);
    assert.match(html, /id="themeToggle"[\s\S]{0,120}?data-i18n-aria-label="app\.themeAria"/);
});

test('slots the scripts write hold no data-i18n of their own', () => {
    for (const id of ['fileInfo', 'loadingIndicator', 'statusMessage']) {
        const tag = html.match(new RegExp('<[a-z]+ id="' + id + '"[^>]*>'));
        assert.ok(tag, id);
        assert.doesNotMatch(tag[0], /data-i18n/, id);
    }
    for (const className of ['partial-info']) {
        const tag = html.match(new RegExp('<[a-z]+ class="' + className + '"[^>]*>'));
        assert.ok(tag, className);
        assert.doesNotMatch(tag[0], /data-i18n/, className);
    }
    // 起動直後にJSが書かないスロットに和文を残さない（render を1回呼ぶ設計にする）。
    assert.match(html, /<div id="loadingIndicator" class="loading" hidden><\/div>/);
    assert.match(fs.readFileSync(path.join(root, 'js/main.js'), 'utf8'), /PassCloudUtils\.renderLoading\(\)/);
});
