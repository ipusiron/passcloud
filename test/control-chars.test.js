const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const { processText } = require('../js/core/text-processor.js');
const { calculateStatistics } = require('../js/core/stats-data.js');
const { analyzePartialMatches } = require('../js/core/partial-data.js');

// utils.js はクラス宣言なので、vm の同じコンテキストの中から呼ぶ。
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(root, 'js/utils.js'), 'utf8'), context);
const visibleText = vm.runInContext('(text) => PassCloudUtils.visibleText(text)', context);

// RLO で拡張子や語尾を偽装する古典的な形。視覚順は pass + password になる。
const RLO = '\u202E';
const POP = '\u202C';
const DISGUISED = 'pass' + RLO + 'drowssap' + POP;
// 表示に残っていてはいけない文字（双方向制御・ゼロ幅・制御文字）。
const INVISIBLE = /[\u0000-\u001F\u007F-\u009F\u00AD\u061C\u180E\u200B-\u200F\u2028\u2029\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF\uFFF9-\uFFFB]/;

test('every invisible character becomes a visible codepoint', () => {
    const cases = [
        ['\u202E', '[U+202E]'], ['\u202D', '[U+202D]'], ['\u202C', '[U+202C]'],
        ['\u202A', '[U+202A]'], ['\u202B', '[U+202B]'], ['\u2066', '[U+2066]'],
        ['\u2069', '[U+2069]'], ['\u200E', '[U+200E]'], ['\u200F', '[U+200F]'],
        ['\u061C', '[U+061C]'], ['\u200B', '[U+200B]'], ['\u200D', '[U+200D]'],
        ['\u2060', '[U+2060]'], ['\uFEFF', '[U+FEFF]'], ['\u00AD', '[U+00AD]'],
        ['\u0000', '[U+0000]'], ['\u0009', '[U+0009]'], ['\u007F', '[U+007F]'],
        ['\u2028', '[U+2028]'], ['\uFFF9', '[U+FFF9]']
    ];
    for (const [character, shown] of cases) assert.equal(visibleText(character), shown);
    for (const [character] of cases) assert.ok(!INVISIBLE.test(visibleText('a' + character + 'b')));
});

test('an ordinary password is passed through untouched', () => {
    for (const password of ['password123', '1qaz2wsx', 'P@ssw0rd!', 'ninja', '', 'パスワード',
        'a b', 'a\u00A0b', '\uD83D\uDE00', '\uD83D\uDC69\u200D\uD83D\uDCBB']) {
        const shown = visibleText(password);
        assert.equal(shown.replace(/\[U\+[0-9A-F]{4}\]/g, ''), password.replace(INVISIBLE, ''));
    }
    assert.equal(visibleText('password123'), 'password123');
    // ゼロ幅接合子だけは見えるようになる（絵文字の合字は崩れるが、入力の検証が優先する）。
    assert.equal(visibleText('\uD83D\uDC69\u200D\uD83D\uDCBB'), '\uD83D\uDC69[U+200D]\uD83D\uDCBB');
});

test('the disguised password is shown as it is stored, not as it is drawn', () => {
    assert.equal(visibleText(DISGUISED), 'pass[U+202E]drowssap[U+202C]');
    // 置き換えたあとに双方向制御が1文字も残らない＝視覚順と保存順が一致する。
    assert.ok(!INVISIBLE.test(visibleText(DISGUISED)));
    // もとの文字列は変えない。長さの集計は保存されているとおりに数える。
    assert.equal(DISGUISED.length, 14);
    const sample = processText([DISGUISED, DISGUISED, 'ninja'].join('\n'));
    const stats = calculateStatistics(sample.wordList, sample.originalLineCount);
    assert.equal(stats.top10[0].password, DISGUISED);
    assert.equal(stats.maxLength, 14);
    assert.equal(visibleText(stats.top10[0].password), 'pass[U+202E]drowssap[U+202C]');
});

test('the phrases pulled out around a stem are shown the same way', () => {
    const wordList = processText(['pass' + RLO + 'word12', 'pass' + RLO + 'word12'].join('\n')).wordList;
    const phrases = analyzePartialMatches(wordList);
    assert.ok(phrases.length > 0);
    for (const [phrase] of phrases) {
        if (!INVISIBLE.test(phrase)) continue;
        assert.ok(!INVISIBLE.test(visibleText(phrase)), phrase);
    }
    // 期待値はリテラルで書く。両辺を同じ式で組み立てると、visibleText が何もしなくても通ってしまう。
    assert.deepEqual(phrases, [[RLO + 'word12', 2]]);
    assert.deepEqual(phrases.map(([phrase, count]) => [visibleText(phrase), count]),
        [['[U+202E]word12', 2]]);
});

test('every place that prints the input runs it through visibleText', () => {
    const sites = {
        'js/stats-analysis.js': /cell\.textContent = PassCloudUtils\.visibleText\(/,
        'js/wordcloud-analysis.js': /\.map\(\(\[word, count\]\) => \[PassCloudUtils\.visibleText\(word\), count\]\)/,
        'js/partial-analysis.js': /\.map\(\(\[phrase, count\]\) => \[PassCloudUtils\.visibleText\(phrase\), count\]\)/,
        'js/main.js': /I18n\.t\('file\.loaded', \{ name: PassCloudUtils\.visibleText\(/
    };
    for (const [file, pattern] of Object.entries(sites)) {
        assert.match(fs.readFileSync(path.join(root, file), 'utf8'), pattern, file);
    }
    // 生のパスワードを textContent へ直接入れていないこと。
    assert.doesNotMatch(fs.readFileSync(path.join(root, 'js/stats-analysis.js'), 'utf8'),
        /textContent = this\.stats\.top10/);
    // ヒートマップは長さと件数しか出さないので、入力の文字列に触れない。
    const heatmap = fs.readFileSync(path.join(root, 'js/heatmap-analysis.js'), 'utf8');
    assert.doesNotMatch(heatmap, /password|\.wordList\[/);
});

test('the pure core never learns about the display layer', () => {
    for (const name of fs.readdirSync(path.join(root, 'js/core'))) {
        const source = fs.readFileSync(path.join(root, 'js/core', name), 'utf8');
        assert.doesNotMatch(source, /visibleText|INVISIBLE|unicode-bidi/);
    }
});

test('the cells that print the input are pinned to logical order in CSS', () => {
    const stats = fs.readFileSync(path.join(root, 'css/stats.css'), 'utf8');
    assert.match(stats, /\.password \{[^}]*direction: ltr;[^}]*unicode-bidi: bidi-override;[^}]*\}/);
    const base = fs.readFileSync(path.join(root, 'css/base.css'), 'utf8');
    assert.match(base, /\.file-info \{[^}]*direction: ltr;[^}]*unicode-bidi: bidi-override;[^}]*\}/);
});

// ヘルプが約束する内容と、visibleText() が実際に置き換える文字を突き合わせる。
// 文言のほうが広くても狭くても落ちるので、同じずれが二度と通らない。

// 文言が名指しする符号位置。U+XXXX 単体と、U+XXXX〜U+XXXX / U+XXXX-U+XXXX の範囲を拾う。
function namedCodePoints(sentence) {
    const named = new Set();
    for (const match of sentence.matchAll(/U\+([0-9A-F]{4})(?:\s*[〜-]\s*U\+([0-9A-F]{4}))?/g)) {
        const from = parseInt(match[1], 16);
        const to = match[2] ? parseInt(match[2], 16) : from;
        for (let cp = from; cp <= to; cp++) named.add(cp);
    }
    return named;
}

// 正規表現を写し取らず、visibleText() を1文字ずつ通した実測で集める。
function replacedCodePoints() {
    const replaced = new Set();
    for (let cp = 0; cp <= 0xFFFF; cp++) {
        const character = String.fromCharCode(cp);
        if (visibleText(character) !== character) replaced.add(cp);
    }
    return replaced;
}

const hex = cp => 'U+' + cp.toString(16).toUpperCase().padStart(4, '0');
const listed = set => [...set].sort((a, b) => a - b).map(hex);

// ヘルプが並べる分類と、それぞれが受け持つ範囲。ここを全部重ねると実態と一致するはずである。
const CLASSES = [
    { ja: '双方向制御文字（RLO＝U+202E など）', en: 'Bidirectional controls such as RLO (U+202E)',
        ranges: [[0x061C, 0x061C], [0x200E, 0x200F], [0x202A, 0x202E], [0x2066, 0x2069]] },
    { ja: 'ゼロ幅文字', en: 'zero-width characters',
        ranges: [[0x180E, 0x180E], [0x200B, 0x200D], [0x2060, 0x2064], [0xFEFF, 0xFEFF]] },
    { ja: '制御文字', en: 'control characters', ranges: [[0x0000, 0x001F], [0x007F, 0x009F]] },
    { ja: 'ソフトハイフン', en: 'the soft hyphen', ranges: [[0x00AD, 0x00AD]] },
    { ja: '行区切りと段落区切り', en: 'the line and paragraph separators', ranges: [[0x2028, 0x2029]] },
    { ja: 'その他の書式文字', en: 'the remaining format characters',
        ranges: [[0x206A, 0x206F], [0xFFF9, 0xFFFB]] }
];

// 分類の並びは文の一部なので、includes ではなく区切りで切り出して突き合わせる。
// 「制御文字」は「双方向制御文字」の一部でもあり、includes だと抜け落ちても通ってしまう。
function listedClasses(sentence, language) {
    if (language === 'ja') return sentence.split('を[U+202E]')[0].split('、');
    return sentence.split(' are shown as [U+202E]')[0].split(', ')
        .map(name => name.replace(/^and /, ''));
}

test('the help names every class that is replaced, in both languages', () => {
    const I18n = require('../js/i18n.js');
    for (const language of ['ja', 'en']) {
        assert.deepEqual(listedClasses(I18n[language]['help.inputControlBody'], language),
            CLASSES.map(item => item[language]), language);
    }
    // 分類の受け持ちをすべて重ねると、実際に置き換わる文字と過不足なく一致する。
    const covered = new Set();
    for (const { ranges } of CLASSES) {
        for (const [from, to] of ranges) for (let cp = from; cp <= to; cp++) covered.add(cp);
    }
    assert.deepEqual(listed(covered), listed(replacedCodePoints()));
});

test('the ranges the help prints are exactly the ranges that are replaced', () => {
    const I18n = require('../js/i18n.js');
    const replaced = listed(replacedCodePoints());
    assert.equal(replaced.length, 99);
    for (const language of ['ja', 'en']) {
        // 辞書の一行がそのまま仕様になる。範囲を足し忘れても、書きすぎても落ちる。
        assert.deepEqual(listed(namedCodePoints(I18n[language]['help.inputControlRangeBody'])),
            replaced, language);
    }
    // READMEの約束も同じ集合であること（前の弾ではヘルプだけを直して食い違った）。
    for (const [name, marker] of [['README.md', '- 置き換える範囲は'], ['README.en.md', '- The replaced ranges are ']]) {
        const line = fs.readFileSync(path.join(root, name), 'utf8').split(/\r?\n/)
            .find(text => text.startsWith(marker));
        assert.ok(line, name + ': ' + marker);
        assert.deepEqual(listed(namedCodePoints(line)), replaced, name);
    }
});

test('the help explains the substitution in both languages', () => {
    const I18n = require('../js/i18n.js');
    for (const dictionary of [I18n.ja, I18n.en]) {
        assert.ok(dictionary['help.inputControlLabel']);
        assert.match(dictionary['help.inputControlBody'], /U\+202E/);
        assert.match(dictionary['help.inputControlBody'], /\[U\+202E\]/);
    }
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    assert.match(html, /data-i18n="help\.inputControlLabel"/);
    assert.match(html, /data-i18n="help\.inputControlBody"/);
});
