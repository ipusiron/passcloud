const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

function collect(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        if (['.git', '.claude', 'assets'].includes(entry.name)) return [];
        const full = path.join(directory, entry.name);
        return entry.isDirectory() ? collect(full) : [full];
    });
}
test('readable source line lengths and non-minified file sizes', () => {
    for (const file of collect(root)) {
        if (!/\.(js|css|html)$/.test(file) || file.endsWith('wordcloud2.js')) continue;
        const limit = file.endsWith('.html') ? 250 : 160;
        fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, index) => {
            assert.ok(line.length <= limit, `${path.relative(root, file)}:${index + 1}: ${line.length} > ${limit}`);
        });
    }
    for (const [file, minimum] of Object.entries({
        'index.html': 180, 'js/main.js': 250, 'js/utils.js': 100, 'js/wordcloud-analysis.js': 100,
        'js/stats-analysis.js': 180, 'js/heatmap-analysis.js': 200, 'js/partial-analysis.js': 140,
        'css/base.css': 300, 'js/core/stats-data.js': 100, 'js/core/heatmap-data.js': 100
    })) {
        assert.ok(fs.readFileSync(path.join(root, file), 'utf8').split('\n').length >= minimum, file);
    }
});
