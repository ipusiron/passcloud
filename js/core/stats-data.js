'use strict';

const PassCloudStats = (() => {
    // パターン検出関数
    function hasSequentialPattern(password) {
        const patterns = ['123', '234', '345', '456', '567', '678', '789', '890',
                         '111', '222', '333', '444', '555', '666', '777', '888', '999', '000',
                         'abc', 'bcd', 'cde', 'def', 'efg', 'fgh', 'ghi', 'hij', 'ijk',
                         'jkl', 'klm', 'lmn', 'mno', 'nop', 'opq', 'pqr', 'qrs', 'rst',
                         'stu', 'tuv', 'uvw', 'vwx', 'wxy', 'xyz'];
        return patterns.some(pattern => password.toLowerCase().includes(pattern));
    }

    function hasKeyboardPattern(password) {
        const patterns = ['qwerty', 'qwertz', 'azerty', 'qwer', 'asdf', 'zxcv',
                         'qaz', 'wsx', 'edc', 'rfv', 'tgb', 'yhn', 'ujm',
                         'wasd', 'asd', 'zxc'];
        return patterns.some(pattern => password.toLowerCase().includes(pattern));
    }

    function hasYearPattern(password) {
        return /19\d{2}|20\d{2}/.test(password);
    }



    // 統計情報を計算
    function calculateStatistics(wordList, originalLineCount) {
        const totalPasswords = originalLineCount;
        const uniquePasswords = wordList.length;

        // 長さ統計
        let totalLength = 0;
        let minLength = wordList.length ? Infinity : 0;
        let maxLength = 0;
        const lengthMap = {};

        // 文字種別統計
        let numericOnly = 0;
        let alphaOnly = 0;
        let alphaNumeric = 0;
        let withSpecial = 0;

        // パターン統計
        let sequential = 0;
        let keyboard = 0;
        let years = 0;

        wordList.forEach(([password, count]) => {
            const len = password.length;
            const countValue = count;
            totalLength += len * countValue;
            minLength = Math.min(minLength, len);
            maxLength = Math.max(maxLength, len);

            // 長さ別カウント
            if (!lengthMap[len]) lengthMap[len] = 0;
            lengthMap[len] += countValue;

            // 文字種別判定
            const hasNumeric = /\d/.test(password);
            const hasAlpha = /[a-zA-Z]/.test(password);
            const hasSpecial = /[^a-zA-Z0-9]/.test(password);

            if (hasNumeric && !hasAlpha && !hasSpecial) numericOnly += countValue;
            else if (hasAlpha && !hasNumeric && !hasSpecial) alphaOnly += countValue;
            else if (hasAlpha && hasNumeric && !hasSpecial) alphaNumeric += countValue;
            else if (hasSpecial) withSpecial += countValue;

            // パターン判定
            if (hasSequentialPattern(password)) sequential += countValue;
            if (hasKeyboardPattern(password)) keyboard += countValue;
            if (hasYearPattern(password)) years += countValue;
        });

        // Top 10
        const top10 = [...wordList]
            .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
            .slice(0, 10)
            .map(([password, count]) => ({
                password,
                count: count,
                percentage: ((count / (totalPasswords || 1)) * 100).toFixed(2)
            }));

        // 長さ分布
        const lengthDistribution = Object.entries(lengthMap)
            .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
            .map(([length, count]) => ({
                length: parseInt(length),
                count,
                percentage: ((count / (totalPasswords || 1)) * 100).toFixed(1)
            }));

        return {
            totalPasswords,
            uniquePasswords,
            duplicateRate: (((totalPasswords - uniquePasswords) / (totalPasswords || 1)) * 100).toFixed(1),
            avgLength: (totalLength / (totalPasswords || 1)).toFixed(1),
            minLength,
            maxLength,
            numericOnly: ((numericOnly / (totalPasswords || 1)) * 100).toFixed(1),
            alphaOnly: ((alphaOnly / (totalPasswords || 1)) * 100).toFixed(1),
            alphaNumeric: ((alphaNumeric / (totalPasswords || 1)) * 100).toFixed(1),
            withSpecial: ((withSpecial / (totalPasswords || 1)) * 100).toFixed(1),
            top10,
            lengthDistribution,
            patterns: {
                sequential: ((sequential / (totalPasswords || 1)) * 100).toFixed(1),
                keyboard: ((keyboard / (totalPasswords || 1)) * 100).toFixed(1),
                years: ((years / (totalPasswords || 1)) * 100).toFixed(1)
            }
        };
    }


    return { calculateStatistics };
})();

if (typeof module !== "undefined" && module.exports) {
    module.exports = PassCloudStats;
}
