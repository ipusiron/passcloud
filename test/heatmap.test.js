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
    // 表示範囲は20文字まで。21文字以上は除外して件数だけサマリーに出す。
    // 監査A-7の原文は「21文字以上のパスワードが警告なくヒートマップから除外される」で、
    // 求めているのは除外の明示であって、表示範囲を広げることではない。
    // 実装（heatmap-data.js の len >= 21 と Math.min(20, maxLength)）も参照実装も同じ振る舞いである。
    // 実装プロンプト day019_passcloud_codex.md の「21文字以下の語だけで範囲を決める」は
    // 「20文字以下」の書き間違いだった。同じ行に「21文字以上は除外」と並んでおり両立しない。
    // 2026-09-28に確定し、この誤記から生まれていた包含節のテストを削除した。境界はここで固定する。
    const data = calculateHeatmapData([['a'.repeat(20), 1], ['b'.repeat(21), 2]], 3);
    assert.deepEqual(data.lengths, [20]);
    assert.equal(data.excludedUnique, 1);
    assert.equal(data.excludedOccurrences, 2);
});

test('A-7 boundary: a 21-character word alone leaves nothing to display', () => {
    // 21文字だけのとき、表示できる長さが無いことを固定する（旧・包含節テストの置き換え）
    const data = calculateHeatmapData([['a'.repeat(21), 1]], 1);
    assert.deepEqual(data.lengths, []);
    assert.equal(data.excludedUnique, 1);
    assert.equal(data.excludedOccurrences, 1);
});
