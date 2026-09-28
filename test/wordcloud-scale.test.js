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
const library = fs.readFileSync(path.join(root, 'js/wordcloud2.js'), 'utf8');

// 画面での描画領域。幅は1カラムのレイアウトで実測した値。
const AREA = { width: 1291, height: 600 };

// wordcloud2 の getTextInfo が語ごとに作るオフスクリーンcanvasの面積。
// 幅 ≒ (0.6×文字数 + 2)×fontSize、高さ = 3×fontSize。
function offscreenArea(length, fontSize) {
    return 3 * fontSize * fontSize * (Utils.CHAR_WIDTH_RATIO * Math.max(1, length) + 2);
}

function cloudOptions(list, rect = AREA) {
    const cloud = vm.runInContext('new WordCloudAnalysis([])', cloudContext());
    return cloud._getWordCloudOptions(list, rect, false);
}

test('wordcloud2 still drops a word whose size does not clear minSize', () => {
    // この一式は getTextInfo の足切りが「fontSize <= minSize」であることに乗っている。
    // 同梱ライブラリーを差し替えたら、ここが落ちて気づける。
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

test('the size scale is logarithmic, not proportional to the count', () => {
    // パスワードの出現回数はべき分布である。回数に比例させると、
    // 上位1語が上限に張り付いて残りが下限へ潰れる。
    // 最小出現が0、最頻出が1、その間は対数で割りつける。
    assert.equal(Utils.countRatio(1, 1, 20000), 0);
    assert.equal(Utils.countRatio(20000, 1, 20000), 1);
    // 出現回数が10倍になるたびに、同じだけ持ち上がる。
    const step = Utils.countRatio(10, 1, 10000) - Utils.countRatio(1, 1, 10000);
    for (const [low, high] of [[1, 10], [10, 100], [100, 1000], [1000, 10000]]) {
        const got = Utils.countRatio(high, 1, 10000) - Utils.countRatio(low, 1, 10000);
        assert.ok(Math.abs(got - step) < 1e-9, low + '→' + high + ': ' + got);
    }
    // 比例だと、同じ並びで 20000 が1に対して 120 は 0.006 しかない。
    // 対数なら真ん中あたりに来るので、中位の語が下限へ潰れない。
    assert.ok(Utils.countRatio(120, 1, 20000) > 0.4);
    // 全語が同じ回数のとき（重複を落とした辞書ファイル）は全員が最大。
    assert.equal(Utils.countRatio(1, 1, 1), 1);
});

test('a bigger count is never drawn smaller', () => {
    // このツールの主目的は「どれが突出して多いか」を見ることなので、
    // サイズの単調性が壊れたら機能として壊れている。
    const counts = [1, 2, 5, 20, 100, 120, 500, 2000, 5000, 12000, 20000];
    const list = counts.map(count => ['password', count]);
    const { weightFactor } = cloudOptions(list);
    for (let i = 1; i < counts.length; i += 1) {
        assert.ok(weightFactor(counts[i]) > weightFactor(counts[i - 1]),
            counts[i - 1] + '→' + counts[i] + ': ' +
            weightFactor(counts[i - 1]) + '→' + weightFactor(counts[i]));
    }
    // 文字数が違っても、サイズを決めるのは出現回数だけである。
    const mixed = [['a', 20000], ['qwertyuiop12345', 1200], ['abc', 5]];
    const options = cloudOptions(mixed);
    assert.ok(options.weightFactor(20000) > options.weightFactor(1200));
    assert.ok(options.weightFactor(1200) > options.weightFactor(5));
});

test('the size does not saturate at the top of the range', () => {
    // 直す前は fontSize = min(ceiling, max(8, count × 5)) で、
    // ceiling が描画領域の高さ600だった。出現120回から上はすべて600pxに張り付き、
    // そこから先は shrinkToFit の縮め方だけでサイズが決まっていた。
    const list = [['password', 20000], ['letmein', 5000], ['qwerty', 120]];
    const { weightFactor } = cloudOptions(list);
    assert.notEqual(weightFactor(120), weightFactor(20000));
    assert.notEqual(weightFactor(5000), weightFactor(20000));
    // 離れた回数どうしは、はっきり差がつく。
    assert.ok(weightFactor(20000) > weightFactor(120) * 1.5);
});

test('the most frequent word is the largest and the least frequent sits on the floor', () => {
    const list = [['password', 20000], ['letmein', 5000], ['ninja', 7], ['abc', 1]];
    const { weightFactor } = cloudOptions(list);
    assert.equal(weightFactor(1), WordCloudMinimum());
    const largest = weightFactor(20000);
    for (const [, count] of list) assert.ok(weightFactor(count) <= largest);
    assert.ok(largest > WordCloudMinimum());
});

function WordCloudMinimum() {
    return vm.runInContext('WordCloudAnalysis.MIN_FONT_SIZE', cloudContext());
}

// wordcloud2 は canvas.width / gridSize でマス目を数え、そのマス目にしか語を置かない。
// マス目と canvas の実寸がずれた分だけ、語が canvas の外へ出て切り落とされる。
function fakeCanvas(width, height) {
    const calls = [];
    const ctx = new Proxy({}, {
        get: (target, name) => {
            if (name in target) return target[name];
            return (...args) => calls.push([String(name), ...args]);
        },
        set: (target, name, value) => { target[name] = value; return true; }
    });
    return {
        calls,
        getContext: () => ctx,
        getBoundingClientRect: () => ({ width, height })
    };
}

test('the canvas is sized so that the wordcloud2 grid lands exactly on it', () => {
    const context = cloudContext();
    context.window.devicePixelRatio = 2;
    const Utils2 = vm.runInContext('PassCloudUtils', context);
    const grid = Utils2.CLOUD_GRID;
    assert.equal(grid, 6);
    for (const [width, height] of [[1291, 600], [1296, 600], [360, 560], [1120, 595]]) {
        const canvas = fakeCanvas(width, height);
        const setup = Utils2.setupCanvas(canvas);
        const label = width + 'x' + height;
        // devicePixelRatio でバッキングストアを広げない。広げると描画の座標系は
        // CSS ピクセルのままなのに、マス目だけが dpr 倍になる。
        assert.equal(canvas.width, Math.floor(width / grid) * grid, label);
        assert.equal(canvas.height, Math.floor(height / grid) * grid, label);
        // 辺が gridSize の倍数でないと、最後のマスが辺をまたいで語が切れる。
        assert.equal(canvas.width % grid, 0, label);
        assert.equal(canvas.height % grid, 0, label);
        assert.equal(setup.rect.width, canvas.width, label);
        assert.equal(setup.rect.height, canvas.height, label);
        assert.equal(setup.scale, 1, label);
        assert.deepEqual(canvas.calls.filter(call => call[0] === 'scale'), [], label);
    }
    // 描画領域が gridSize に満たなければ、まだ描けない扱いにする。
    assert.equal(Utils2.setupCanvas(fakeCanvas(4, 600)), null);
    assert.equal(Utils2.setupCanvas(fakeCanvas(600, 0)), null);
    assert.equal(Utils2.setupCanvas(null), null);
});

test('both clouds hand wordcloud2 the same grid the canvas was sized for', () => {
    for (const name of ['wordcloud-analysis.js', 'partial-analysis.js']) {
        const source = fs.readFileSync(path.join(root, 'js', name), 'utf8');
        // 数値を直接書くと、setupCanvas の切り下げと静かにずれる。
        assert.match(source, /gridSize: PassCloudUtils\.CLOUD_GRID,/, name);
    }
});

test('the spread of the sizes follows how many decades the counts span', () => {
    // countRatio は最小出現を0・最頻出を1へ引き延ばす min-max 正規化なので、
    // それだけだと絶対的な目盛りがない。回数の幅が狭いほど差が誇張される。
    assert.equal(Utils.countSpread(1, 1), 0);
    assert.equal(Utils.countSpread(1, 10), 1);
    assert.equal(Utils.countSpread(1, 20000), 1);
    assert.equal(Utils.countSpread(1000, 10000), 1);
    // 1桁に満たない幅は、桁数に比例して0へ落ちる。
    assert.ok(Math.abs(Utils.countSpread(1, 100) - 1) < 1e-12);
    assert.ok(Math.abs(Utils.countSpread(100, 1000) - 1) < 1e-12);
    assert.ok(Math.abs(Utils.countSpread(1000, 1040) - Math.log10(1.04)) < 1e-12);
    assert.ok(Utils.countSpread(1000, 1040) < 0.02);
    // 幅が広がるほど単調に増える。
    let last = -1;
    for (const max of [1000, 1100, 1500, 2000, 5000, 9000, 10000, 40000]) {
        const got = Utils.countSpread(1000, max);
        assert.ok(got >= last, max + ': ' + got);
        last = got;
    }
});

test('counts that differ by a few percent do not differ by an order of magnitude in size', () => {
    // 実測（直す前）: 出現1,000回が8.00px、1,040回が140px。
    // 回数の幅は4%しかないのに、見た目は17.5倍ひらいていた。
    const counts = [1000, 1010, 1020, 1030, 1040];
    const list = counts.map((count, i) => ['word' + i, count]);
    const { weightFactor } = cloudOptions(list);
    const sizes = counts.map(count => weightFactor(count));
    // 単調性は保つ。
    for (let i = 1; i < sizes.length; i += 1) {
        assert.ok(sizes[i] > sizes[i - 1], counts[i - 1] + '→' + counts[i]);
    }
    // 回数の比が1.04なので、サイズの比も1桁どころか1.5倍にも届かない。
    assert.ok(Math.max(...sizes) / Math.min(...sizes) < 1.5,
        'ratio: ' + (Math.max(...sizes) / Math.min(...sizes)));
    // それでいて canvas は空白だらけにならない（下端ではなく上端へ寄せるため）。
    let ink = 0;
    for (const [word, count] of list) ink += Utils.wordInkArea(word.length, weightFactor(count));
    const budget = AREA.width * AREA.height * Utils.CLOUD_AREA_FILL;
    assert.ok(ink <= budget + 1e-6, String(ink));
    assert.ok(ink > budget * 0.9, String(ink));
});

test('one word that is far longer than the rest does not shrink the whole cloud', () => {
    // top を実際に取るのは最頻出の語だけである。その語だけが桁違いに長いと、
    // その語に合わせた top でほかの語まで巻き添えで縮む。
    // 実測（直す前）: 30文字の語が最頻出だと canvas のインクが0.70%しかなかった。
    assert.equal(Utils.lengthOutlier([2, 3, 6, 8, 30]), 12);
    assert.equal(Utils.lengthOutlier([6, 8]), 14);
    assert.equal(Utils.lengthOutlier([]), Infinity);
    const list = [['a'.repeat(30), 100], ['password', 50], ['qwerty', 20], ['abc123', 5], ['xy', 1]];
    const { weightFactor } = cloudOptions(list);
    // ほかの語は、自分の描画領域の上限まで戻る。
    assert.ok(Math.abs(weightFactor(50) - Utils.wordFitSize(8, AREA.width, AREA.height)) < 0.01,
        String(weightFactor(50)));
    assert.ok(weightFactor(50) > 80, String(weightFactor(50)));
    assert.ok(weightFactor(20) > 60, String(weightFactor(20)));
    // 単調性は保つ。最頻出の語はいちばん大きいままである。
    const counts = [1, 5, 20, 50, 100];
    for (let i = 1; i < counts.length; i += 1) {
        assert.ok(weightFactor(counts[i]) > weightFactor(counts[i - 1]),
            counts[i - 1] + '→' + counts[i]);
    }
    // 長すぎる語のぶんは、描画領域に収まる大きさまでしか面積を見込まない。
    let ink = 0;
    for (const [word, count] of list) {
        ink += Utils.wordInkArea(word.length, Math.min(weightFactor(count),
            Utils.wordFitSize(word.length, AREA.width, AREA.height)));
    }
    assert.ok(ink <= AREA.width * AREA.height * Utils.CLOUD_AREA_FILL + 1e-6, String(ink));
});

test('when every word is long, none of them is sacrificed', () => {
    // 語長が似ていれば外れ値はない。全語が描画領域に収まるところで止める。
    const list = Array.from({ length: 40 }, (_, i) => ['w'.repeat(28 + (i % 3)), 40 - i]);
    const { weightFactor } = cloudOptions(list);
    for (const [word, count] of list) {
        assert.ok(weightFactor(count) <= Utils.wordFitSize(word.length, AREA.width, AREA.height) + 1e-9,
            word.length + '/' + count + ': ' + weightFactor(count));
    }
});

test('counts that span more than a decade keep the sizes they had', () => {
    // 幅の広い入力の見え方は変えない。実測の値をそのまま置く。
    const list = [['passwd', 20000], ['qwerty', 2000], ['letmei', 500],
        ['dragon', 120], ['ninjas', 20], ['abcdef', 1]];
    const { weightFactor } = cloudOptions(list);
    const expected = [[20000, 116.67], [2000, 91.40], [500, 76.19],
        [120, 60.53], [20, 40.87], [1, 8.00]];
    for (const [count, size] of expected) {
        assert.ok(Math.abs(weightFactor(count) - size) < 0.01,
            count + ': ' + weightFactor(count) + ' != ' + size);
    }
    // 最頻出の語は、その語が描画領域に置ける上限まで届いている。
    assert.ok(Math.abs(weightFactor(20000) - Utils.wordFitSize(6, AREA.width, AREA.height)) < 1e-9);
});

test('the sizes fit the drawing area and stay inside the area budget', () => {
    const sample = processText(fs.readFileSync(path.join(root, 'sample/passcloud_sample_1000.txt'), 'utf8'));
    const list = sample.wordList.map(([word, count]) => [word, count]);
    const { weightFactor } = cloudOptions(list);
    let ink = 0;
    for (const [word, count] of list) {
        const size = weightFactor(count);
        assert.ok(size <= Utils.wordFitSize(word.length, AREA.width, AREA.height) + 1e-9,
            word + ': ' + size);
        ink += Utils.wordInkArea(word.length, size);
    }
    assert.ok(ink <= AREA.width * AREA.height * Utils.CLOUD_AREA_FILL + 1e-6, String(ink));
    // 予算を使い切る側にも寄っている（語数が少ないときに空白だらけにならない）。
    assert.ok(ink > AREA.width * AREA.height * Utils.CLOUD_AREA_FILL * 0.9, String(ink));
});

test('fewer words are drawn larger, and the ratios between them do not change', () => {
    // 全語をひとつの係数で決めるので、語数が減ればサイズは上がり、
    // 同じ出現回数の組み合わせなら比は変わらない。
    const counts = [1, 2, 5, 10, 50];
    const few = counts.map((count, i) => ['word' + i, count]);
    const many = Array.from({ length: 300 }, (_, i) => ['word' + i, counts[i % counts.length]]);
    const bigger = cloudOptions(few).weightFactor;
    const smaller = cloudOptions(many).weightFactor;
    assert.ok(bigger(50) > smaller(50));
    assert.ok(bigger(10) > smaller(10));
    // 下限からの持ち上がり幅の比が、2つの回数の間で一致する。
    const floor = WordCloudMinimum();
    const ratio = (factor, count) => (factor(count) - floor) / (factor(50) - floor);
    for (const count of counts) {
        assert.ok(Math.abs(ratio(bigger, count) - ratio(smaller, count)) < 1e-9,
            count + ': ' + ratio(bigger, count) + ' vs ' + ratio(smaller, count));
    }
});

test('neither cloud lets wordcloud2 shrink a word behind our back', () => {
    // wordcloud2 は入りきらない語だけ weight に 3/4 を掛けて置き直す。
    // 大きい語ほど何度も縮むので、出現回数の順位とサイズの順位がずれる。
    // 実測: letmein 5,000回が250.6px、password 20,000回が100.4px。
    // weight を書き換えるのはこの1か所だけなので、切っておけば
    // weightFactor に渡る値は必ずもとの出現回数になる。
    assert.match(library,
        /if \(settings\.shrinkToFit\) \{\r?\n\s*if \(Array\.isArray\(item\)\) \{\r?\n\s*item\[1\] = item\[1\] \* 3 \/ 4/);
    assert.equal((library.match(/item\[1\] = /g) || []).length, 1);
    for (const name of ['wordcloud-analysis.js', 'partial-analysis.js']) {
        const source = fs.readFileSync(path.join(root, 'js', name), 'utf8');
        assert.match(source, /shrinkToFit: false/, name);
    }
});

test('the scale still lets putWord finish if shrinkToFit is switched back on', () => {
    // shrinkToFit は weight に 3/4 を掛けて putWord を呼び直す。最小出現を
    // 下回った weight にも下限を効かせると、サイズが下がらず再帰が終わらない。
    const { weightFactor } = cloudOptions([['password', 29], ['ninja', 1]]);
    let weight = 1;
    let steps = 0;
    while (weightFactor(weight) > 6 && steps < 200) {
        weight *= 3 / 4;
        steps += 1;
    }
    assert.ok(steps < 200, 'shrinkToFit would not terminate: ' + weight);
});

test('the colour of a word comes from its own count, not from the weight passed back', () => {
    // 直す前は wordcloud2 が渡す weight を、縮む前の最大値と比べていた。
    // top_20000 では password の最終 weight が 20.07 に対して最大が 20000 なので、
    // 5語すべてが最下位の色になっていた。
    const context = cloudContext();
    const seen = [];
    context.PassCloudText = { colorIndex: (weight, max, length) => { seen.push([weight, max]); return 0; } };
    const cloud = vm.runInContext('new WordCloudAnalysis([])', context);
    const list = [['password', 20000], ['123456', 12000], ['letmein', 5000], ['dragon', 1200]];
    const options = cloud._getWordCloudOptions(list, AREA, false);
    // 縮んだあとの weight を渡されても、色は語から引き直す。
    options.color('password', 20.07);
    options.color('dragon', 3.1);
    assert.deepEqual(seen.map(([, max]) => max), [1, 1]);
    assert.ok(seen[0][0] > seen[1][0], JSON.stringify(seen));
    assert.equal(seen[0][0], 1);
    assert.equal(seen[1][0], Utils.countRatio(1200, 1200, 20000));
});

test('every word reaches a size that wordcloud2 actually draws', () => {
    const list = [['password', 29], ['ninja', 2], ['a', 1], ['qwertyuiop1234', 1]];
    const options = cloudOptions(list);
    for (const [word, count] of list) {
        assert.ok(options.weightFactor(count) > options.minSize, word + '/' + count);
    }
    assert.ok(options.weightFactor(1) < options.weightFactor(2));
});

test('the partial-match cloud is sized the same way', () => {
    const partial = vm.runInContext('new PartialAnalysis([])', cloudContext());
    partial.partialData = [['word12', 22], ['abc', 2], ['zzz', 1]];
    partial.canvasSetup = { rect: { width: 1120, height: 600 } };
    const options = partial._getPartialWordCloudOptions(false);
    for (const [word, count] of partial.partialData) {
        assert.ok(options.weightFactor(count) > options.minSize, word + '/' + count);
    }
    assert.ok(options.weightFactor(22) > options.weightFactor(2));
    assert.ok(options.weightFactor(2) > options.weightFactor(1));
    // 菱形に置くので、面積の予算は長方形の半分にする。
    let ink = 0;
    for (const [word, count] of partial.partialData) {
        ink += Utils.wordInkArea(word.length, options.weightFactor(count));
    }
    assert.ok(ink <= 1120 * 600 * Utils.CLOUD_AREA_FILL / 2 + 1e-6, String(ink));
});

test('no word of the bundled sample is dropped for being too small', () => {
    const sample = processText(fs.readFileSync(path.join(root, 'sample/passcloud_sample_1000.txt'), 'utf8'));
    const list = sample.wordList.map(([word, count]) => [word, count]);
    const options = cloudOptions(list);
    // 直す前は、出現1回の17語がここで落ちて黙って消えていた。
    assert.equal(list.filter(([, count]) => count === 1).length, 17);
    assert.deepEqual(list.filter(([, count]) => options.weightFactor(count) <= options.minSize), []);
    // 出現回数の順にサイズが並ぶ（同じ回数どうしは同じ大きさ）。
    const sorted = [...list].sort((a, b) => a[1] - b[1]);
    for (let i = 1; i < sorted.length; i += 1) {
        assert.ok(options.weightFactor(sorted[i][1]) >= options.weightFactor(sorted[i - 1][1]),
            sorted[i - 1][1] + '→' + sorted[i][1]);
    }
    // 重複を落としたリスト（全語が出現1回）でも全滅しない。
    const unique = list.map(([word]) => [word, 1]);
    const uniqueOptions = cloudOptions(unique);
    assert.deepEqual(unique.filter(([, count]) => uniqueOptions.weightFactor(count) <= uniqueOptions.minSize), []);
    // しかも下限に張り付かず、描画領域に合わせて持ち上がる。
    assert.ok(uniqueOptions.weightFactor(1) > WordCloudMinimum());
});

test('both clouds size the words from the count and say so when nothing could be drawn', () => {
    for (const name of ['wordcloud-analysis.js', 'partial-analysis.js']) {
        const source = fs.readFileSync(path.join(root, 'js', name), 'utf8');
        // 素の定数に戻すと、また上下の両端で壊れる。
        assert.doesNotMatch(source, /weightFactor: \d/, name);
        assert.match(source, /PassCloudUtils\.cloudFontSizer\(/, name);
        // 色も出現回数から引く。wordcloud2 が渡す weight は使わない。
        assert.match(source, /PassCloudUtils\.countRatio\(/, name);
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
    // 0件になる現実的な引き金は「長い語が描画領域に収まらない」ことである。
    // 語数の多さは0件の理由にならない（下限を割り込む語がないため）。
    assert.match(I18n.ja['status.cloudNothingDrawn'], /描画領域に収まらない長さ/);
    assert.match(I18n.en['status.cloudNothingDrawn'], /too long for the drawing area/);
    assert.match(I18n.ja['status.partialNothingDrawn'], /描画領域に収まらない長さ/);
    assert.match(I18n.en['status.partialNothingDrawn'], /too long for the drawing area/);
});
