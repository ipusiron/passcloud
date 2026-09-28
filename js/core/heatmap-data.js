'use strict';

const PassCloudHeatmap = (() => {
    // ヒートマップデータを計算
    function calculateHeatmapData(wordList, originalLineCount) {
        const lengthFreqMap = {};
        let minLength = Infinity;
        let maxLength = 0;
        let excludedUnique = 0;
        let excludedOccurrences = 0;
        let totalPasswordCount = originalLineCount;

        // データを収集
        wordList.forEach(([password, count]) => {
            const len = password.length;
            if (len >= 21) {
                excludedUnique++;
                excludedOccurrences += count;
                return;
            }
            minLength = Math.min(minLength, len);
            maxLength = Math.max(maxLength, len);

            if (!lengthFreqMap[len]) {
                lengthFreqMap[len] = {};
            }

            const freqBand = getFrequencyBand(count);
            if (!lengthFreqMap[len][freqBand]) {
                lengthFreqMap[len][freqBand] = 0;
            }
            lengthFreqMap[len][freqBand]++;
        });

        // 頻度帯の定義
        const frequencyRanges = [
            { min: 1, max: 1, label: '1' },
            { min: 2, max: 3, label: '2-3' },
            { min: 4, max: 5, label: '4-5' },
            { min: 6, max: 10, label: '6-10' },
            { min: 11, max: 20, label: '11-20' },
            { min: 21, max: 50, label: '21-50' },
            { min: 51, max: 100, label: '51-100' },
            { min: 101, max: Infinity, label: '100+' }
        ];

        // 表示する長さの範囲を作成
        const displayMinLength = minLength === Infinity ? 0 : minLength;
        const displayMaxLength = Math.min(20, maxLength);
        const lengths = [];
        for (let i = displayMinLength; i > 0 && i <= displayMaxLength; i++) {
            lengths.push(i);
        }

        // 2次元マトリクスを作成
        const matrix = [];
        let maxCellCount = 0;
        let mostCommonLength = 0;
        let mostCommonLengthCount = 0;
        let freqRangeCounts = {};

        lengths.forEach(len => {
            const row = [];
            let lengthTotal = 0;

            frequencyRanges.forEach(range => {
                const key = `${range.min}-${range.max}`;
                const count = (lengthFreqMap[len] && lengthFreqMap[len][key]) || 0;
                row.push(count);
                maxCellCount = Math.max(maxCellCount, count);
                lengthTotal += count;

                if (!freqRangeCounts[range.label]) {
                    freqRangeCounts[range.label] = 0;
                }
                freqRangeCounts[range.label] += count;
            });

            if (lengthTotal > mostCommonLengthCount) {
                mostCommonLengthCount = lengthTotal;
                mostCommonLength = len;
            }

            matrix.push(row);
        });

        // 最頻出の頻度帯を特定
        let mostCommonFreqRange = '';
        let maxFreqRangeCount = 0;
        Object.entries(freqRangeCounts).forEach(([range, count]) => {
            if (count > maxFreqRangeCount) {
                maxFreqRangeCount = count;
                mostCommonFreqRange = range;
            }
        });

        // 実際のパスワード総数を計算
        let actualMostCommonLengthCount = 0;
        wordList.forEach(([password, count]) => {
            if (password.length === mostCommonLength) {
                actualMostCommonLengthCount += count;
            }
        });

        return {
            excludedUnique,
            excludedOccurrences,
            lengths,
            frequencyRanges,
            matrix,
            maxCount: maxCellCount,
            minLength: displayMinLength,
            maxLength: displayMaxLength,
            mostCommonLength,
            mostCommonLengthCount: actualMostCommonLengthCount,
            mostCommonFreqRange,
            totalPasswords: totalPasswordCount,
            uniquePasswords: wordList.length
        };
    }

    // 頻度帯を決定
    function getFrequencyBand(count) {
        if (count === 1) return '1-1';
        if (count <= 3) return '2-3';
        if (count <= 5) return '4-5';
        if (count <= 10) return '6-10';
        if (count <= 20) return '11-20';
        if (count <= 50) return '21-50';
        if (count <= 100) return '51-100';
        return '101-Infinity';
    }


    return { calculateHeatmapData };
})();

if (typeof module !== "undefined" && module.exports) {
    module.exports = PassCloudHeatmap;
}
