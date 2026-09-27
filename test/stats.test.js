const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const { processText } = require('../js/core/text-processor.js');
const sample = processText(fs.readFileSync(path.join(root, 'sample/passcloud_sample_1000.txt'), 'utf8'));

const { calculateStatistics } = require('../js/core/stats-data.js');

test('all sample statistics and deterministic Top10', () => {
    const stats = calculateStatistics(sample.wordList, sample.originalLineCount);
    const { top10, lengthDistribution, ...rest } = stats;
    assert.deepEqual(rest, {
        totalPasswords: 1005, uniquePasswords: 67, duplicateRate: '93.3', avgLength: '6.7', minLength: 5, maxLength: 12,
        numericOnly: '14.2', alphaOnly: '71.4', alphaNumeric: '13.9', withSpecial: '0.4',
        patterns: { sequential: '20.1', keyboard: '6.2', years: '0.2' }
    });
    assert.deepEqual(top10.map(x => [x.password, x.count, x.percentage]), [
        ['ninja', 29, '2.89'], ['pepper', 29, '2.89'], ['batman', 28, '2.79'], ['donald', 28, '2.79'],
        ['admin', 27, '2.69'], ['shadow', 27, '2.69'], ['12345', 26, '2.59'], ['abc123', 26, '2.59'],
        ['summer', 25, '2.49'], ['1qaz2wsx', 24, '2.39']
    ]);
    assert.deepEqual(lengthDistribution.map(x => [x.length, x.count, x.percentage]), [
        [5, 110, '10.9'], [6, 509, '50.6'], [7, 89, '8.9'], [8, 228, '22.7'],
        [9, 61, '6.1'], [10, 6, '0.6'], [12, 2, '0.2']
    ]);
    const sum = ['numericOnly', 'alphaOnly', 'alphaNumeric', 'withSpecial'].reduce((n, key) => n + Number(stats[key]), 0);
    assert.ok(Math.abs(sum - 100) <= 0.100001);
});

test('statistics never mutate input and empty statistics are finite', () => {
    const original = JSON.stringify(sample.wordList);
    const one = calculateStatistics(sample.wordList, 1005);
    assert.deepEqual(calculateStatistics(sample.wordList, 1005), one);
    assert.equal(JSON.stringify(sample.wordList), original);
    const empty = calculateStatistics([], 0);
    assert.equal(empty.minLength, 0);
    assert.equal(empty.avgLength, '0.0');
});

test('553-line boundary fixture statistics', () => {
    const fixture = processText([
        ...Array(300).fill('123456'), ...Array(150).fill('password'), ...Array(101).fill('qwerty'), 'rare', 'a'.repeat(25)
    ].join('\n'));
    const stats = calculateStatistics(fixture.wordList, fixture.originalLineCount);
    for (const [key, value] of Object.entries({
        totalPasswords: 553, uniquePasswords: 5, duplicateRate: '99.1', avgLength: '6.6', minLength: 4, maxLength: 25,
        numericOnly: '54.2', alphaOnly: '45.8', alphaNumeric: '0.0', withSpecial: '0.0'
    })) assert.equal(stats[key], value, key);
});
