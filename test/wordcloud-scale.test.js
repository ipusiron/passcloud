const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const { processText } = require('../js/core/text-processor.js');

// utils.js と2つのクラウドを同じコンテキストに置く。画面は触らないので、
// document と I18n は呼ばれない前提の最小限で足りる。
function cloudContext() {
    const context = vm.createContext({
        document: {}, window: {}, I18n: { t: () => '' }, PassCloudText: { colorIndex: () => 0 }
    });
    for (const file of ['utils.js', 'wordcloud-analysis.js', 'partial-analysis.js']) {
        vm.runInContext(fs.readFileSync(path.join(root, 'js', file), 'utf8'), context);
    }
    return context;
}

const Utils = vm.runInContext('PassCloudUtils', cloudContext());

// wordcloud2 の getTextInfo が語ごとに作るオフスクリーンcanvasの面積。
// 幅 ≒ (0.6×文字数 + 2)×fontSize、高さ = 3×fontSize。
function offscreenArea(length, fontSize) {
    return 3 * fontSize * fontSize * (Utils.CHAR_WIDTH_RATIO * Math.max(1, length) + 2);
}

test('wordcloud2 still drops a word whose size does not clear minSize', () => {
    // この一式は getTextInfo の足切りが「fontSize <= minSize」であることに乗っている。
    // 同梱ライブラリーを差し替えたら、ここが落ちて気づける。
    const library = fs.readFileSync(path.join(root, 'js/wordcloud2.js'), 'utf8');
    assert.match(library, /if \(fontSize <= settings\.minSize\) \{\r?\n\s*return false/);
    assert.match(library, /sendEvent\('wordclouddrawn', true, \{/);
});

test('the upper clip keeps the offscreen canvas inside the measured limit', () => {
    // 実測（Chrome、bold sans）: 258,120,000px は描けたが 276,156,000px は
    // 例外なしで白紙になり、576,396,000px で getImageData が Out of memory を投げた。
    // 境目にあたる 2^28 = 268,435,456 を限界として使う。
    assert.equal(Utils.CANVAS_AREA_LIMIT, 268435456);
    assert.ok(Utils.CANVAS_AREA_BUDGET > 0 && Utils.CANVAS_AREA_BUDGET <= 1);
    for (const length of [1, 6, 8, 12, 20, 64, 200, 800, 4000]) {
        const ceiling = Utils.maxFontSize(length);
        assert.ok(ceiling >= 1, String(length));
        assert.ok(offscreenArea(length, ceiling) <= Utils.CANVAS_AREA_LIMIT,
            length + ': ' + offscreenArea(length, ceiling));
    }
    // 長い語ほど上限は小さくなる。
    assert.ok(Utils.maxFontSize(8) > Utils.maxFontSize(64));
    assert.ok(Utils.maxFontSize(64) > Utils.maxFontSize(4000));
    // 描画領域の高さも上限になる。高さ600pxの領域では600を超えない。
    assert.equal(Utils.maxFontSize(8, 600), 600);
    // 極端に長い語では、canvasの安全側の上限が先に効く。
    assert.ok(Utils.maxFontSize(4000, 600) < 600);
    // 高さが取れない場面（まだ描画領域が無いなど）では安全側だけで決める。
    assert.equal(Utils.maxFontSize(8, 0), Utils.maxFontSize(8));
});

test('the lower clip never blocks shrinkToFit from finishing', () => {
    // shrinkToFit は weight に 3/4 を掛けて putWord を呼び直す。1未満になったぶんに
    // 下限を効かせると、サイズが下がらなくなって再帰が終わらない。
    let weight = 1, steps = 0;
    while (Utils.clampFontSize(weight, weight * 5, 8, 600) > 6 && steps < 200) {
        weight *= 3 / 4;
        steps += 1;
    }
    assert.ok(steps < 200, 'shrinkToFit would not terminate: ' + weight);
    // 1未満は素通し、1以上は上下で止める。
    assert.equal(Utils.clampFontSize(0.75, 3.75, 8, 600), 3.75);
    assert.equal(Utils.clampFontSize(1, 5, 8, 600), 8);
    assert.equal(Utils.clampFontSize(29, 145, 8, 600), 145);
    assert.equal(Utils.clampFontSize(2000, 10000, 8, 600), 600);
});

test('every word reaches a size that wordcloud2 actually draws', () => {
    const cloud = vm.runInContext('new WordCloudAnalysis([])', cloudContext());
    const list = [['password', 29], ['ninja', 2], ['a', 1], ['qwertyuiop1234', 1]];
    const options = cloud._getWordCloudOptions(list, { width: 1291, height: 600 }, false);
    for (const [word, count] of list) {
        assert.ok(options.weightFactor(count) > options.minSize, word + '/' + count);
    }
    // 出現2回以上のサイズは、直す前とまったく同じ5倍のまま（並びを変えない）。
    for (const count of [2, 3, 29, 100]) assert.equal(options.weightFactor(count), count * 5);
    // 出現1回は捨てられず、しかも出現2回より小さいままにする。
    assert.ok(options.weightFactor(1) < options.weightFactor(2));
    // 出現回数がいくら多くても上限で止まる（ここが無いとcanvasが白紙になる）。
    assert.equal(options.weightFactor(100000), 600);
});

test('the partial-match cloud is clipped the same way', () => {
    const partial = vm.runInContext('new PartialAnalysis([])', cloudContext());
    partial.partialData = [['word12', 22], ['abc', 2], ['zzz', 1]];
    partial.canvasSetup = { rect: { width: 1120, height: 600 } };
    const options = partial._getPartialWordCloudOptions(false);
    for (const [word, count] of partial.partialData) {
        assert.ok(options.weightFactor(count) > options.minSize, word + '/' + count);
    }
    assert.equal(options.weightFactor(22), Math.pow(22, 0.8) * 8);
    assert.ok(options.weightFactor(1) < options.weightFactor(2));
    assert.equal(options.weightFactor(1000000), 600);
});

test('no word of the bundled sample is dropped for being too small', () => {
    const sample = processText(fs.readFileSync(path.join(root, 'sample/passcloud_sample_1000.txt'), 'utf8'));
    const list = sample.wordList.map(([word, count]) => [word, count]);
    const cloud = vm.runInContext('new WordCloudAnalysis([])', cloudContext());
    const options = cloud._getWordCloudOptions(list, { width: 1291, height: 600 }, false);
    // 直す前は、出現1回の17語がここで落ちて黙って消えていた。
    assert.equal(list.filter(([, count]) => count === 1).length, 17);
    assert.deepEqual(list.filter(([, count]) => options.weightFactor(count) <= options.minSize), []);
    // 出現2回以上のサイズは1つも変わらない。
    for (const [, count] of list) if (count > 1) assert.equal(options.weightFactor(count), count * 5);
    // 重複を落としたリスト（全語が出現1回）でも全滅しない。
    const unique = list.map(([word]) => [word, 1]);
    assert.deepEqual(unique.filter(([, count]) => options.weightFactor(count) <= options.minSize), []);
});

test('both clouds clip the size and say so when nothing could be drawn', () => {
    for (const name of ['wordcloud-analysis.js', 'partial-analysis.js']) {
        const source = fs.readFileSync(path.join(root, 'js', name), 'utf8');
        // 素の定数に戻すと、また上下の両端で壊れる。
        assert.doesNotMatch(source, /weightFactor: \d/, name);
        assert.match(source, /PassCloudUtils\.clampFontSize\(/, name);
        assert.match(source, /PassCloudUtils\.maxFontSize\(/, name);
        // 描けた数を数え、0件のときと欠けたときに理由を出す。
        assert.match(source, /addEventListener\('wordclouddrawn'/, name);
        assert.match(source, /addEventListener\('wordcloudstop'/, name);
        assert.match(source, /notify\('status\.\w+NothingDrawn'\)/, name);
        assert.match(source, /notify\('status\.\w+PartlyDrawn', \{ drawn, total \}\)/, name);
        // 監視は描き直しのたびに掛け直す。外し忘れると二重に数える。
        assert.match(source, /removeEventListener\('wordclouddrawn'/, name);
    }
    const I18n = require('../js/i18n.js');
    for (const dictionary of [I18n.ja, I18n.en]) {
        for (const key of ['status.cloudNothingDrawn', 'status.cloudPartlyDrawn',
            'status.partialNothingDrawn', 'status.partialPartlyDrawn']) {
            assert.ok(dictionary[key], key);
        }
    }
});
