const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
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

// --- 一時的な表示が言語の切り替えに追従するか ---
// canvas の title と body直下のツールチップは、再描画しても差し替わらない。
// 訳文を持たせるとその言語のまま残るので、キーと値から組み直せることを縛る。
function sandbox(name, globals) {
    const context = vm.createContext(Object.assign({}, globals));
    vm.runInContext(fs.readFileSync(path.join(root, 'js', name), 'utf8'), context);
    return context;
}

// 語彙ではなく「どのキーをいつ引いたか」を見るための差し替え。
function stubI18n() {
    const state = { lang: 'ja' };
    return { state, t: (key, values = {}) => state.lang + '|' + key + '|' + JSON.stringify(values) };
}

test('the canvas title is rebuilt from the key, not left in the previous language', () => {
    for (const [name, className, key] of [
        ['wordcloud-analysis.js', 'WordCloudAnalysis', 'cloud.hover'],
        ['partial-analysis.js', 'PartialAnalysis', 'partial.hover']
    ]) {
        const stub = stubI18n();
        const context = sandbox(name, { I18n: stub, document: {}, window: {} });
        const instance = vm.runInContext('new ' + className + '([])', context);
        instance.canvas = { title: '', style: {} };
        instance.hovered = { word: 'ninja', count: 29 };
        instance.renderHoverTitle();
        assert.equal(instance.canvas.title, 'ja|' + key + '|{"word":"ninja","count":29}', name);
        stub.state.lang = 'en';
        instance.renderHoverTitle();
        assert.equal(instance.canvas.title, 'en|' + key + '|{"word":"ninja","count":29}', name);
        instance.hovered = null;
        instance.renderHoverTitle();
        assert.equal(instance.canvas.title, '', name);
    }
});

test('the heatmap tooltip is rebuilt from the key for both the pointer and the keyboard', () => {
    const stub = stubI18n();
    const tooltip = { textContent: '', style: {} };
    const documentStub = { querySelector: selector => (selector === '.heatmap-tooltip' ? tooltip : null) };
    const context = sandbox('heatmap-analysis.js', { I18n: stub, document: documentStub, window: {} });
    const instance = vm.runInContext('new HeatmapAnalysis([], 0)', context);
    instance._rememberTooltip('hover', { length: 8, freq: '1', count: 3, percentage: '0.30' });
    assert.equal(tooltip.textContent,
        'ja|heatmap.tooltip|{"length":8,"freq":"1","count":3,"percentage":"0.30"}');
    // 言語を切り替えただけで、同じ値から訳し直せる。
    stub.state.lang = 'en';
    instance.renderTooltip();
    assert.equal(tooltip.textContent,
        'en|heatmap.tooltip|{"length":8,"freq":"1","count":3,"percentage":"0.30"}');
    // キーボードの focus は表示済みの aria-label を読み戻さず、同じ経路で組み直す。
    instance._rememberTooltip('cell', { length: 8, freq: '1', count: 3 });
    assert.equal(tooltip.textContent, 'en|heatmap.cellAria|{"length":8,"freq":"1","count":3}');
});

test('renderTexts rebuilds the transient text and no handler stores a translated string', () => {
    const main = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8');
    const body = main.split('renderTexts() {')[1].split('\n    }')[0];
    for (const call of ['this.wordCloudAnalysis?.renderHoverTitle()',
        'this.partialAnalysis?.renderHoverTitle()', 'this.heatmapAnalysis?.renderTooltip()']) {
        assert.ok(body.includes(call), call);
    }
    for (const name of ['wordcloud-analysis.js', 'partial-analysis.js']) {
        const source = fs.readFileSync(path.join(root, 'js', name), 'utf8');
        assert.doesNotMatch(source, /canvas\.title = I18n\.t\(/, name);
        assert.equal((source.match(/renderHoverTitle\(\)/g) || []).length, 2, name);
    }
    const heatmap = fs.readFileSync(path.join(root, 'js/heatmap-analysis.js'), 'utf8');
    assert.doesNotMatch(heatmap, /tooltip\.textContent = I18n\.t\(/);
    assert.doesNotMatch(heatmap, /getAttribute\('aria-label'\)/);
});


// --- 描き直してもキーボードの居場所を失わないか ---
// 言語やテーマを切り替えると draw() がセルを作り直す。ブラウザーでは、焦点のある要素が
// 外れると blur が飛び、body 直下のツールチップも閉じる。同じ振る舞いの最小のDOMを組み、
// 作り直したあとに同じセルへ置き直すことを縛る。
function fakeHeatmapDom() {
    const dom = { cells: [], tooltip: null };
    const body = { tagName: 'BODY', classList: { contains: () => false },
        appendChild: node => { dom.tooltip = node; } };
    dom.body = body;
    dom.activeElement = body;

    const makeCell = values => {
        const handlers = {};
        const cell = {
            tagName: 'TD', dataset: values, style: {},
            classList: { contains: name => name === 'heatmap-cell' },
            addEventListener(type, handler) { (handlers[type] = handlers[type] || []).push(handler); },
            focus() {
                dom.activeElement = cell;
                (handlers.focus || []).forEach(handler => handler({ target: cell }));
            },
            blur() {
                dom.activeElement = body;
                (handlers.blur || []).forEach(handler => handler({ target: cell }));
            },
            getBoundingClientRect: () => ({ left: 10, bottom: 20, width: 40, height: 20 })
        };
        return cell;
    };

    const main = { tagName: 'DIV', classList: { contains: name => name === 'heatmap-main' },
        focus() { dom.activeElement = main; } };
    dom.main = main;

    const content = {
        set innerHTML(html) {
            // 焦点のある要素が作り直されると、ブラウザーはフォーカスを body へ落とす。
            // セルには blur が飛び、tabindex だけのラッパーは黙って外れる。
            if (dom.cells.includes(dom.activeElement)) dom.activeElement.blur();
            else if (dom.activeElement === main) dom.activeElement = body;
            const cells = /data-length="(\d+)"[\s\S]*?data-freq="([^"]*)"[\s\S]*?data-count="(\d+)"/g;
            dom.cells = [...html.matchAll(cells)]
                .map(match => makeCell({ length: match[1], freq: match[2], count: match[3] }));
        },
        querySelector: selector => (selector === '.legend-gradient' ? { style: {} } : null),
        querySelectorAll: () => dom.cells
    };

    dom.document = {
        body,
        get activeElement() { return dom.activeElement; },
        getElementById: () => ({ querySelector: selector =>
            (selector === '.view-content' ? content : { hidden: false }) }),
        createElement: () => ({ className: '', textContent: '', style: {} }),
        querySelector: selector => {
            if (selector === '.heatmap-tooltip') return dom.tooltip;
            if (selector === '.heatmap-main') return main;
            return null;
        },
        querySelectorAll: selector => (selector === '.heatmap-cell' ? dom.cells : [])
    };
    return dom;
}

function heatmapOnFakeDom() {
    const stub = stubI18n();
    const dom = fakeHeatmapDom();
    const context = sandbox('heatmap-analysis.js', {
        I18n: stub, document: dom.document,
        window: { scrollY: 0, innerWidth: 1280, innerHeight: 800 },
        PassCloudUtils: { showNoData() {}, isDarkMode: () => false },
        PassCloudHeatmap: require('../js/core/heatmap-data.js')
    });
    const instance = vm.runInContext('new HeatmapAnalysis([], 0)', context);
    instance.updateData([['ninja', 12], ['password', 3], ['qwerty', 1], ['dragon', 1]], 17);
    instance.draw();
    return { stub, dom, instance };
}

const seatOf = cell => cell.dataset.length + '/' + cell.dataset.freq;

test('the heatmap puts the keyboard back in the same cell after a redraw', () => {
    const { stub, dom, instance } = heatmapOnFakeDom();
    const chosen = dom.cells.find(cell => Number(cell.dataset.count) > 0);
    assert.ok(chosen);
    chosen.focus();
    assert.equal(dom.activeElement, chosen);
    assert.equal(dom.tooltip.style.display, 'block');
    const seat = seatOf(chosen);

    stub.state.lang = 'en';
    instance.draw();
    instance.renderTooltip();

    // セルは作り直されている（同じオブジェクトのままなら、この試験は何も見ていない）。
    assert.ok(!dom.cells.includes(chosen));
    assert.notEqual(dom.activeElement, dom.body);
    assert.ok(dom.cells.includes(dom.activeElement));
    assert.equal(seatOf(dom.activeElement), seat);
    // ツールチップも開いたまま、文言だけが訳し直される。
    assert.equal(dom.tooltip.style.display, 'block');
    assert.match(dom.tooltip.textContent, /^en\|heatmap\.cellAria\|/);
    assert.ok(dom.tooltip.textContent.includes('"length":"' + chosen.dataset.length + '"'));
});

test('a redraw never grabs the focus that was outside the grid', () => {
    const { stub, dom, instance } = heatmapOnFakeDom();
    // どこにもフォーカスが無いなら、描き直しても body のまま。
    stub.state.lang = 'en';
    instance.draw();
    assert.equal(dom.activeElement, dom.body);

    // ラッパーに居るときは、セルを掴まずラッパーへ戻す。
    dom.main.focus();
    stub.state.lang = 'ja';
    instance.draw();
    assert.equal(dom.activeElement, dom.main);
});

// 隠れたタブに前の言語のDOMが残るのは、開いたときに必ず描き直すから許される。
// その前提が崩れたら、切り替え直後に古い言語が画面へ出る。
test('opening a hidden tab always redraws it, so only the active tab follows the language', () => {
    const main = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8');
    const switchView = main.split('switchView(mode) {')[1].split('\n    }')[0];
    assert.ok(switchView.includes('if (this.wordList.length > 0) {'));
    assert.ok(switchView.includes('this.drawCurrentMode(mode);'));
    // 再描画はアクティブなタブだけを見る。ここで4タブを回すと切り替えが秒単位になる。
    const redraw = main.split('redrawCurrentView() {')[1].split('\n    }')[0];
    assert.ok(redraw.includes('#tabs button.active'));
    assert.equal((redraw.match(/drawCurrentMode\(/g) || []).length, 1);
});
