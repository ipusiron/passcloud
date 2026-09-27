const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const csp = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; "
    + "connect-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'";

test('strict local-only CSP, metadata, classic scripts, no inline attributes', () => {
    assert.ok(html.includes('content="' + csp + '"'));
    assert.doesNotMatch(html, /frame-ancestors|unsafe-inline|unsafe-eval|X-Frame-Options/);
    assert.match(html, /name="referrer" content="no-referrer"/);
    assert.match(html, /name="viewport" content="width=device-width, initial-scale=1"/);
    assert.match(html, /<noscript>/);
    assert.doesNotMatch(html, /\s(?:on[a-z]+|style)\s*=/i);
    assert.doesNotMatch(html, /type=["']module/);
    assert.doesNotMatch(html, /<(?:script|link|img)[^>]*(?:src|href)=["']https?:/);
    for (const id of ['cloudCanvas', 'partialCloudCanvas', 'fileInput', 'dropZone', 'analyzeButton',
        'helpModal', 'loadingIndicator', 'stemMode', 'statusMessage']) assert.ok(html.includes('id="' + id + '"'), id);
    assert.equal((html.match(/class="no-data"/g) || []).length, 4);
    assert.match(html, /role="dialog" aria-modal="true" aria-labelledby="helpTitle"/);
    assert.match(html, /role="button" tabindex="0"/);
    assert.match(html, /aria-live="polite"/);
    assert.equal((html.match(/role="tab"/g) || []).length, 4);
});

test('pure core, safe render source, no external CSS, dependency-free CI', () => {
    for (const name of fs.readdirSync(path.join(root, 'js/core'))) {
        const source = fs.readFileSync(path.join(root, 'js/core', name), 'utf8');
        assert.doesNotMatch(source, /document|window|localStorage|console/);
    }
    for (const name of fs.readdirSync(path.join(root, 'js')).filter(name => name.endsWith('.js') && name !== 'wordcloud2.js')) {
        const source = fs.readFileSync(path.join(root, 'js', name), 'utf8');
        assert.doesNotMatch(source, /console\.log|style\s*=\s*["']|alert\(/);
        assert.doesNotMatch(source, /Math\.floor\(count\)/);
    }
    for (const name of fs.readdirSync(path.join(root, 'css'))) {
        assert.doesNotMatch(fs.readFileSync(path.join(root, 'css', name), 'utf8'), /https?:/);
    }
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')),
        { name: 'passcloud', private: true, scripts: { test: 'node --test' } });
    const workflow = fs.readFileSync(path.join(root, '.github/workflows/test.yml'), 'utf8');
    for (const value of ['push', 'pull_request', 'contents: read', 'node-version: 22', 'npm test']) {
        assert.ok(workflow.includes(value), value);
    }
    assert.ok(fs.existsSync(path.join(root, '.nojekyll')));
    assert.ok(!fs.existsSync(path.join(root, 'css/heatmap-fixed.css')));
});

test('supplied font assets have exact hashes', () => {
    const { createHash } = require('node:crypto');
    const expected = {
        'orbitron-700-latin.woff2': 'ee6acc5ad5349018f9ca71fab8118144160e110838931874150a1ac3f97db38d',
        'spacemono-400-latin.woff2': 'fb4a81a2d0a893e5c38c394a7e716a1cef0b24610a0af49c96f6d529bd66bf2b',
        'spacemono-700-latin.woff2': '2d46bd159b53f55c41167a4f1540a074649464194fd1e416f5b4694a6c0f282c',
        'OFL-Orbitron.txt': 'ab609b0e110d622435ff337cdf233288556e011bbf9bd0550be98846c0630819',
        'OFL-SpaceMono.txt': '8e4ee42b2553e1e01504e61cb0d46d148cd8c9e5eacaa3622a7df2d4f2955b9f'
    };
    for (const [name, hash] of Object.entries(expected)) {
        const content = fs.readFileSync(path.join(root, 'assets/fonts', name));
        assert.equal(createHash('sha256').update(content).digest('hex'), hash);
    }
});
