const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const { processText } = require('../js/core/text-processor.js');
const sample = processText(fs.readFileSync(path.join(root, 'sample/passcloud_sample_1000.txt'), 'utf8'));

const { calculateHeatmapData } = require('../js/core/heatmap-data.js');

test('sample: complete heatmap matrix and summary', () => {
    const data = calculateHeatmapData(sample.wordList, 1005);
    assert.deepEqual(data.lengths, [5, 6, 7, 8, 9, 10, 11, 12]);
    assert.equal(data.maxCount, 14);
    assert.equal(data.mostCommonLength, 6);
    assert.equal(data.mostCommonLengthCount, 509);
    assert.equal(data.mostCommonFreqRange, '11-20');
    assert.equal(data.excludedUnique, 0);
    assert.equal(data.excludedOccurrences, 0);
    assert.deepEqual(data.matrix, [
        [0, 0, 0, 0, 2, 3, 0, 0], [0, 0, 0, 0, 14, 11, 0, 0], [0, 0, 0, 0, 4, 1, 0, 0],
        [3, 0, 0, 0, 7, 5, 0, 0], [6, 0, 0, 0, 3, 0, 0, 0], [6, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0], [2, 0, 0, 0, 0, 0, 0, 0]
    ]);
});

test('boundary fixture excludes long words before choosing length range', () => {
    const fixture = processText([
        ...Array(300).fill('123456'), ...Array(150).fill('password'), ...Array(101).fill('qwerty'), 'rare', 'a'.repeat(25)
    ].join('\n'));
    const data = calculateHeatmapData(fixture.wordList, 553);
    assert.deepEqual(data.lengths, [4, 5, 6, 7, 8]);
    assert.equal(data.maxCount, 2);
    assert.equal(data.mostCommonFreqRange, '100+');
    assert.equal(data.excludedUnique, 1);
    assert.equal(data.excludedOccurrences, 1);
    assert.deepEqual(data.matrix, [
        [1, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 2],
        [0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 1]
    ]);
});

test('all words outside display range and empty input are safe', () => {
    const data = calculateHeatmapData([['a'.repeat(25), 2], ['b'.repeat(30), 3]], 5);
    assert.deepEqual(data.matrix, []);
    assert.equal(data.excludedUnique, 2);
    assert.equal(data.excludedOccurrences, 5);
    assert.deepEqual(calculateHeatmapData([], 0).lengths, []);
});

test('A-7 exclusion clause: 21-character words are outside the display range', () => {
    const data = calculateHeatmapData([['a'.repeat(20), 1], ['b'.repeat(21), 2]], 3);
    assert.deepEqual(data.lengths, [20]);
    assert.equal(data.excludedUnique, 1);
    assert.equal(data.excludedOccurrences, 2);
});

test('A-7 inclusion clause: 21-character words determine the display range (specification conflict)', () => {
    // A-7 also says "21文字以下". Keep this literal expectation failing until the boundary is clarified.
    const data = calculateHeatmapData([['a'.repeat(21), 1]], 1);
    assert.deepEqual(data.lengths, [21]);
});
