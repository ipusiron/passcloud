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
