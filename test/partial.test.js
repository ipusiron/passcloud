const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const { processText } = require('../js/core/text-processor.js');
const sample = processText(fs.readFileSync(path.join(root, 'sample/passcloud_sample_1000.txt'), 'utf8'));

const { knownStems } = require('../js/core/stems.js');
const { analyzePartialMatches } = require('../js/core/partial-data.js');

test('61 unique fixed stems and sample partial matches', () => {
    assert.equal(knownStems.length, 61);
    assert.equal(new Set(knownStems).size, 61);
    const data = analyzePartialMatches(sample.wordList);
    assert.equal(data.length, 19);
    assert.ok(data.every(([, count]) => Number.isInteger(count)));
    assert.equal(data.reduce((sum, [, count]) => sum + count, 0), 343);
    assert.deepEqual(data.slice(0, 10), [
        ['45', 26], ['ver', 24], ['45678', 22], ['5678', 22], ['678', 22],
        ['man', 22], ['rty', 20], ['456789', 19], ['56789', 19], ['6789', 19]
    ]);
});

test('boundary fixture: 4 phrases and 851 occurrences', () => {
    const data = analyzePartialMatches([['123456', 300], ['password', 150], ['qwerty', 101], ['rare', 1], ['a'.repeat(25), 1]]);
    assert.deepEqual(data, [['456', 300], ['56', 300], ['word', 150], ['rty', 101]]);
    assert.equal(data.reduce((sum, [, count]) => sum + count, 0), 851);
    assert.deepEqual(analyzePartialMatches([]), []);
});
