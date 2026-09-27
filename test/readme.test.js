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
    const images = [...readme.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map(match => match[1]).filter(src => !/^https?:/.test(src));
    assert.deepEqual(images, ['assets/screenshot2.png', 'assets/screenshot3.png', 'assets/screenshot4.png']);
    for (const src of images) assert.ok(fs.existsSync(path.join(root, src)), src);
});

function walk(directory, prefix = '') {
    return fs.readdirSync(directory, { withFileTypes: true }).filter(entry => !['.git', '.claude'].includes(entry.name))
        .flatMap(entry => {
            const relative = prefix + entry.name + (entry.isDirectory() ? '/' : '');
            return [relative, ...(entry.isDirectory() ? walk(path.join(directory, entry.name), relative) : [])];
        });
}

test('README tree lists every file and directory, with aligned explanations', () => {
    const section = readme.split('## 📁 ディレクトリー構造')[1]?.split('## 💻 動作環境')[0];
    const block = section?.match(/\x60\x60\x60\r?\n([\s\S]*?)\r?\n\x60\x60\x60/)?.[1];
    assert.ok(block);
    const lines = block.split(/\r?\n/);
    assert.equal(lines[0].split(/\s+# /)[0], 'passcloud/');
    const hashColumn = lines[0].indexOf('#');
    const stack = [], paths = [];
    for (const [i, line] of lines.entries()) {
        assert.match(line, /# \S.+/);
        assert.equal(line.indexOf('#'), hashColumn, line);
        if (!i) continue;
        const node = line.slice(0, hashColumn).trimEnd().match(/^([│ ]*)(?:├── |└── )(.+)$/);
        assert.ok(node, line);
        const depth = node[1].length / 4;
        const name = node[2];
        const relative = stack.slice(0, depth).join('') + name;
        paths.push(relative);
        if (name.endsWith('/')) stack[depth] = name;
    }
    assert.deepEqual(paths.sort(), walk(root).sort());
    for (const relative of walk(path.join(root, 'js')).filter(name => name.endsWith('.js') && name !== 'wordcloud2.js')) {
        assert.doesNotMatch(fs.readFileSync(path.join(root, 'js', relative), 'utf8'), /console\.log/);
    }
});
