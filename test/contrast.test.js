const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

function luminance(hex) {
    let value = hex.slice(1);
    if (value.length === 3) value = value.split('').map(char => char + char).join('');
    const rgb = value.match(/../g).map(pair => parseInt(pair, 16) / 255)
        .map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function contrast(first, second) {
    const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
    return (values[0] + 0.05) / (values[1] + 0.05);
}
test('all text/background variable pairs including both gradient endpoints', () => {
    const css = fs.readFileSync(path.join(root, 'css/base.css'), 'utf8');
    const blocks = [css.match(/:root\s*\{([^}]+)\}/)[1], css.match(/\[data-theme="dark"\]\s*\{([^}]+)\}/)[1]];
    const pairs = [
        ['text-primary', 'bg-primary'], ['text-primary', 'bg-secondary'], ['text-primary', 'bg-button'],
        ['text-primary', 'bg-drop-zone'], ['text-secondary', 'bg-primary'], ['text-secondary', 'bg-secondary'],
        ['text-secondary', 'bg-drop-zone'], ['text-header', 'bg-header'], ['accent', 'bg-secondary'],
        ['accent', 'bg-drop-zone'], ['accent-on-gradient', 'accent'], ['accent-on-gradient', 'gradient-end'],
        ['accent-on-gradient', 'gradient-tab-end'], ['close-hover', 'bg-primary'], ['close-hover', 'bg-secondary']
    ];
    for (const [index, block] of blocks.entries()) {
        const variables = Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[\da-f]+)/gi)].map(m => [m[1], m[2]]));
        assert.equal(Object.keys(variables).length, 16);
        for (const [front, back] of pairs) {
            const ratio = contrast(variables[front], variables[back]);
            assert.ok(ratio >= 4.5, `${index}: ${front}/${back} = ${ratio}`);
        }
    }
});
