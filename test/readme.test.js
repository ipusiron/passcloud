const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const { processText } = require('../js/core/text-processor.js');
const sample = processText(fs.readFileSync(path.join(root, 'sample/passcloud_sample_1000.txt'), 'utf8'));

const { normalize } = require('../js/core/stems.js');
const { calculateStatistics } = require('../js/core/stats-data.js');
const { calculateHeatmapData } = require('../js/core/heatmap-data.js');
const { analyzePartialMatches } = require('../js/core/partial-data.js');
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');

function table(header, count) {
    const lines = readme.split(/\r?\n/);
    const start = lines.indexOf(header);
    assert.ok(start >= 0, header);
    const rows = [];
    for (let i = start + 2; lines[i]?.startsWith('|'); i++) {
        rows.push(lines[i].split('|').slice(1, -1).map(cell => cell.trim()));
    }
    assert.equal(rows.length, count, header);
    return rows;
}

test('README normalization and statistics tables are recalculated', () => {
    for (const [word, stem] of table('| 入力 | 語幹推定の結果 |', 4)) assert.equal(normalize(word), stem);
    const stats = calculateStatistics(sample.wordList, sample.originalLineCount);
    const keys = ['totalPasswords', 'uniquePasswords', 'duplicateRate', 'avgLength', 'minLength', 'maxLength',
        'numericOnly', 'alphaOnly', 'alphaNumeric', 'withSpecial', 'sequential', 'keyboard', 'years'];
    table('| 統計項目 | 値 |', 13).forEach(([, value], i) => {
        assert.equal(Number(value.replace('%', '')), Number(stats[keys[i]] ?? stats.patterns[keys[i]]));
    });
    assert.deepEqual(table('| Top10順位 | パスワード | 出現回数 | 割合 |', 10),
        stats.top10.map((item, i) => [String(i + 1), item.password, String(item.count), item.percentage + '%']));
    assert.deepEqual(table('| 長さ | 延べ出現回数 | 割合 |', 7),
        stats.lengthDistribution.map(item => [String(item.length), String(item.count), item.percentage + '%']));
});

test('README heatmap and partial match tables are recalculated', () => {
    const heat = calculateHeatmapData(sample.wordList, sample.originalLineCount);
    const rows = table('| 長さ | 1 | 2-3 | 4-5 | 6-10 | 11-20 | 21-50 | 51-100 | 100+ |', 8);
    assert.deepEqual(rows.map(row => row.map(Number)), heat.matrix.map((row, i) => [heat.lengths[i], ...row]));
    assert.ok(readme.includes('最も多い長さは' + heat.mostCommonLength + '文字（延べ' + heat.mostCommonLengthCount + '回）'));
    assert.ok(readme.includes('最頻出の頻度帯は' + heat.mostCommonFreqRange));
    assert.ok(readme.includes('最大セル値は' + heat.maxCount + '、除外は' + heat.excludedUnique + '種類'));
    const partial = analyzePartialMatches(sample.wordList);
    assert.deepEqual(table('| 部分一致の語句 | 出現回数 |', 10), partial.slice(0, 10).map(([s, n]) => [s, String(n)]));
    assert.ok(readme.includes('抽出語句は' + partial.length + '件、総出現回数は' + partial.reduce((n, row) => n + row[1], 0) + '回'));
});

test('README metadata structure, fixed values and image references', () => {
    const metadata = readme.match(/^<!--\r?\n---\r?\n([\s\S]*?)\r?\n---\r?\n-->/)?.[1];
    assert.ok(metadata);
    assert.deepEqual([...metadata.matchAll(/^([a-z_]+):/gm)].map(match => match[1]), [
        'id', 'slug', 'title', 'subtitle_ja', 'subtitle_en', 'description_ja', 'description_en',
        'category_ja', 'category_en', 'difficulty', 'tags', 'repo_url', 'demo_url', 'hub'
    ]);
    for (const key of ['category_ja', 'category_en', 'tags']) {
        assert.match(metadata, new RegExp('^' + key + ':\\r?\\n  - ', 'm'));
    }
    for (const value of ['id: day019', 'slug: passcloud', 'title: "PassCloud"', 'hub: true',
        'repo_url: "https://github.com/ipusiron/passcloud"', 'demo_url: "https://ipusiron.github.io/passcloud/"']) {
        assert.ok(metadata.split(/\r?\n/).includes(value));
    }
    const pictures = source => [...source.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)]
        .map(match => match[1]).filter(src => !/^https?:/.test(src));
    const images = pictures(readme);
    assert.deepEqual(images, ['assets/screenshot2.png', 'assets/screenshot3.png',
        'assets/screenshot4.png', 'assets/screenshot5.png']);
    // 英語版が和文の画面を使い回すと、言語の切り替えを画像で示せない。英語版は assets/en/ だけを指す。
    const imagesEn = pictures(fs.readFileSync(path.join(root, 'README.en.md'), 'utf8'));
    assert.deepEqual(imagesEn, ['assets/en/screenshot.png', 'assets/en/screenshot2.png',
        'assets/en/screenshot3.png', 'assets/en/screenshot4.png']);
    for (const src of [...images, ...imagesEn]) assert.ok(fs.existsSync(path.join(root, src)), src);
});

function walk(directory, prefix = '') {
    return fs.readdirSync(directory, { withFileTypes: true }).filter(entry => !['.git', '.claude'].includes(entry.name))
        .flatMap(entry => {
            const relative = prefix + entry.name + (entry.isDirectory() ? '/' : '');
            return [relative, ...(entry.isDirectory() ? walk(path.join(directory, entry.name), relative) : [])];
        });
}

function treeBlock(source, from, to, label) {
    const section = source.split(from)[1]?.split(to)[0];
    const block = section?.match(/\x60\x60\x60\r?\n([\s\S]*?)\r?\n\x60\x60\x60/)?.[1];
    assert.ok(block, label);
    return block;
}

// ツリー1枚から、並びを検めながらパスの一覧を組み直す。
function treePaths(block, label) {
    const lines = block.split(/\r?\n/);
    assert.equal(lines[0].split(/\s+# /)[0], 'passcloud/', label);
    const hashColumn = lines[0].indexOf('#');
    const stack = [], paths = [];
    for (const [i, line] of lines.entries()) {
        assert.match(line, /# \S.+/, label + ': ' + line);
        assert.equal(line.indexOf('#'), hashColumn, label + ': ' + line);
        if (!i) continue;
        const node = line.slice(0, hashColumn).trimEnd().match(/^([│ ]*)(?:├── |└── )(.+)$/);
        assert.ok(node, label + ': ' + line);
        const depth = node[1].length / 4;
        const name = node[2];
        paths.push(stack.slice(0, depth).join('') + name);
        if (name.endsWith('/')) stack[depth] = name;
    }
    return paths;
}

// 和文だけ検めると、ファイルを足したときに英語のツリーだけが黙って古くなる。
test('both README trees list every file and directory, with aligned explanations', () => {
    const readmeEn = fs.readFileSync(path.join(root, 'README.en.md'), 'utf8');
    const trees = [
        ['README.md', treeBlock(readme, '## 📁 ディレクトリー構造', '## 💻 動作環境', 'README.md')],
        ['README.en.md', treeBlock(readmeEn, '## 📁 Directory structure',
            '## 💻 Requirements', 'README.en.md')]
    ];
    const expected = walk(root).sort();
    for (const [label, block] of trees) {
        assert.deepEqual(treePaths(block, label).sort(), expected, label);
    }
    for (const relative of walk(path.join(root, 'js')).filter(name => name.endsWith('.js') && name !== 'wordcloud2.js')) {
        assert.doesNotMatch(fs.readFileSync(path.join(root, 'js', relative), 'utf8'), /console\.log/);
    }
});

test('ユースケースの「このツールならではの使い方」の数を計算部で再計算（日英）', () => {
  const readmeEn = fs.readFileSync(path.join(root, 'README.en.md'), 'utf8');
  const stats = calculateStatistics(sample.wordList, sample.originalLineCount);
  assert.deepEqual([stats.totalPasswords, stats.uniquePasswords, stats.duplicateRate], [1005, 67, '93.3']);
  assert.deepEqual(stats.top10.slice(0, 3).map((x) => [x.password, x.percentage]),
    [['ninja', '2.89'], ['pepper', '2.89'], ['batman', '2.79']]);
  assert.deepEqual([stats.numericOnly, stats.alphaOnly, stats.alphaNumeric, stats.withSpecial],
    ['14.2', '71.4', '13.9', '0.4']);
  assert.deepEqual([stats.patterns.sequential, stats.patterns.keyboard], ['20.1', '6.2']);
  for (const md of [readme, readmeEn]) {
    assert.ok(md.includes('1,005') && md.includes('67') && md.includes('93.3'));
    assert.ok(md.includes('2.89') && md.includes('14.2') && md.includes('71.4'));
  }
});
