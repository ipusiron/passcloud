'use strict';

const PassCloudPartial = (() => {
    const { knownStems } = typeof module !== "undefined" && module.exports
        ? require('./stems.js') : PassCloudStems;

    // 有効な語句かどうかを判定
    function isValidPhrase(phrase) {
        if (phrase.trim().length === 0) return false;
        if (/^[^a-z0-9]+$/i.test(phrase)) return false;
        if (isSingleChar(phrase)) return false;
        return true;
    }

    // 単一文字の繰り返しかどうかを判定
    function isSingleChar(str) {
        if (str.length === 0) return false;
        const firstChar = str[0];
        return str.split('').every(char => char === firstChar);
    }


    // 部分一致分析を実行
    function analyzePartialMatches(wordList) {
        const extractedPhrases = Object.create(null);

        // 各パスワードを処理
        wordList.forEach(([password, count]) => {
            const lowerPassword = password.toLowerCase();
            const processedStems = new Set();

            // 各語幹でチェック
            knownStems.forEach(stem => {
                if (lowerPassword.includes(stem)) {

                    // すべての出現位置を検索
                    let searchIndex = 0;
                    while (searchIndex < lowerPassword.length) {
                        const index = lowerPassword.indexOf(stem, searchIndex);
                        if (index === -1) break;

                        const key = `${stem}-${index}`;
                        if (processedStems.has(key)) {
                            searchIndex = index + 1;
                            continue;
                        }
                        processedStems.add(key);

                        // 前の部分（接頭語）
                        if (index > 0) {
                            const prefix = lowerPassword.substring(0, index);
                            if (prefix.length > 0 && prefix.length <= 8 && isValidPhrase(prefix)) {
                                extractedPhrases[prefix] = (extractedPhrases[prefix] || 0) + count;
                            }
                        }

                        // 後の部分（接尾語）
                        const endIndex = index + stem.length;
                        if (endIndex < lowerPassword.length) {
                            const suffix = lowerPassword.substring(endIndex);
                            if (suffix.length > 0 && suffix.length <= 8 && isValidPhrase(suffix)) {
                                extractedPhrases[suffix] = (extractedPhrases[suffix] || 0) + count;
                            }
                        }

                        searchIndex = index + stem.length;
                    }
                }
            });
        });

        // 配列に変換してソート
        const sortedPhrases = Object.entries(extractedPhrases)
            .filter(([phrase, count]) => {
                return phrase.length > 0 &&
                       count > 1 &&
                       !knownStems.includes(phrase) &&
                       !isSingleChar(phrase);
            })
            .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
            .slice(0, 200);


        return sortedPhrases;
    }


    return { analyzePartialMatches };
})();

if (typeof module !== "undefined" && module.exports) {
    module.exports = PassCloudPartial;
}
