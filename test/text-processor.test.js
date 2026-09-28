const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const { processText } = require('../js/core/text-processor.js');
const sample = processText(fs.readFileSync(path.join(root, 'sample/passcloud_sample_1000.txt'), 'utf8'));

const { normalize, knownStems, stemWordList } = require('../js/core/stems.js');
const { colorIndex } = require('../js/core/text-processor.js');

test('sample: 1005 lines, 67 unique, maximum 29; integer counts sum to lines', () => {
    assert.equal(sample.originalLineCount, 1005);
    assert.equal(sample.wordList.length, 67);
    assert.equal(Math.max(...sample.wordList.map(([, count]) => count)), 29);
    assert.ok(sample.wordList.every(([, count]) => Number.isInteger(count)));
    assert.equal(sample.wordList.reduce((sum, [, count]) => sum + count, 0), 1005);
});

test('input boundaries preserve trim and lowercase semantics', () => {
    for (const text of ['', '\n\r\n  \n']) {
        assert.deepEqual(processText(text), { wordList: [], originalLineCount: 0 });
    }
    assert.deepEqual(processText(' A \r\na\n B\r\n'), { wordList: [['a', 2], ['b', 1]], originalLineCount: 3 });
    assert.deepEqual(processText('世界\n😀\n😀'), { wordList: [['世界', 1], ['😀', 2]], originalLineCount: 3 });
    assert.deepEqual(processText('One'), { wordList: [['one', 1]], originalLineCount: 1 });
    assert.deepEqual(processText('__proto__\nconstructor').wordList, [['__proto__', 1], ['constructor', 1]]);
});

test('eight normalization examples and sample stemming', () => {
    const examples = [
        ['password123', 'password'], ['p4ssw0rd', 'p4ssw0rd'], ['123456', '123456'], ['abc123def', 'abc123def'],
        ['pass!!', 'pass'], ['qwerty', 'qwerty'], ['iloveyou2', 'iloveyou'], ['ninja1', 'ninja']
    ];
    for (const [input, expected] of examples) assert.equal(normalize(input), expected);
    const stems = stemWordList(sample.wordList);
    assert.equal(stems.length, 61);
    assert.ok(stems.every(([word]) => word !== ''));
    assert.equal(new Map(stems).get('password'), 39);
    assert.equal(new Map(stems).get('qwerty'), 37);
    for (const [word, count] of [['ninja', 29], ['pepper', 29], ['batman', 28]]) {
        assert.equal(new Map(stems).get(word), count);
    }
    assert.equal(knownStems.length, 61);
});

test('color indices clamp correctly above 100 and above maximum', () => {
    for (const [weight, expected] of [[1, 14], [2, 13], [5, 12], [10, 9], [29, 0], [100, 0], [5000, 0]]) {
        assert.equal(colorIndex(weight, 29, 15), expected);
    }
    for (const [weight, expected] of [[1, 14], [29, 13], [100, 10], [101, 9], [300, 0]]) {
        assert.equal(colorIndex(weight, 300, 15), expected);
    }
    assert.equal(colorIndex(1, 0, 15), 0);
    for (let weight = -10; weight <= 10000; weight++) {
        const index = colorIndex(weight, 300, 15);
        assert.ok(index >= 0 && index < 15 && Number.isInteger(index));
    }
});

test('drawing options deep-copy tuples even when shrinkToFit mutates them', () => {
    const vm = require('node:vm');
    const context = vm.createContext({ PassCloudText: { colorIndex } });
    // フォントサイズの上下限を utils.js が持つので、本物を読み込む。
    for (const file of ['utils.js', 'wordcloud-analysis.js', 'partial-analysis.js']) {
        vm.runInContext(fs.readFileSync(path.join(root, 'js', file), 'utf8'), context);
    }
    const source = Object.freeze([Object.freeze(['example', 300])]);
    context.source = source;
    vm.runInContext(`
        const cloud = new WordCloudAnalysis(source);
        const options = cloud._getWordCloudOptions(source.map(([word, count]) => [word, count]), {}, false);
        options.list[0][1] *= 0.75;
        const partial = new PartialAnalysis(source);
        partial.partialData = source;
        const partialOptions = partial._getPartialWordCloudOptions(false);
        partialOptions.list[0][1] *= 0.75;
    `, context);
    assert.equal(source[0][1], 300);
});

test('canvas retries stop after ten retries and show a generic message', () => {
    const vm = require('node:vm');
    for (const [file, className, method] of [
        ['wordcloud-analysis.js', 'WordCloudAnalysis', 'draw'],
        ['partial-analysis.js', 'PartialAnalysis', '_drawPartialWordCloud']
    ]) {
        const timers = [], messages = [];
        let attempts = 0;
        const context = vm.createContext({
            document: { getElementById: () => null },
            setTimeout: callback => { timers.push(callback); },
            PassCloudUtils: { showNoData() {}, setupCanvas() { attempts++; return null; }, notify: message => messages.push(message) }
        });
        vm.runInContext(fs.readFileSync(path.join(root, 'js', file), 'utf8'), context);
        vm.runInContext('new ' + className + '([["example", 1]]).' + method + '()', context);
        while (timers.length) {
            assert.ok(attempts <= 11);
            timers.shift()();
        }
        assert.equal(attempts, 11);
        assert.equal(messages.length, 1);
        assert.doesNotMatch(messages[0], /example/);
    }
});
