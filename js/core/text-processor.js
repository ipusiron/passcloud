'use strict';

// 入力は各行をtrimし、小文字へそろえる。空行は数えない。
const PassCloudText = (() => {
    function processText(text) {
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
        const freqMap = Object.create(null);
        for (const line of lines) {
            const word = line.trim().toLowerCase();
            freqMap[word] = (freqMap[word] || 0) + 1;
        }
        return {
            wordList: Object.entries(freqMap),
            originalLineCount: lines.length
        };
    }

    function colorIndex(weight, maxWeight, paletteLength) {
        if (!(maxWeight > 0)) return 0;
        const ratio = Math.min(Math.max(weight / maxWeight, 0), 1);
        const index = Math.floor((1 - ratio) * paletteLength);
        return Math.min(Math.max(index, 0), paletteLength - 1);
    }

    return { processText, colorIndex };
})();

if (typeof module !== "undefined" && module.exports) {
    module.exports = PassCloudText;
}
