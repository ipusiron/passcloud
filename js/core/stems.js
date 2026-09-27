'use strict';

const PassCloudStems = (() => {
    // 共通語幹リストの定義
    const knownStems = [
        // 一般的なパスワード語幹
        "pass", "password", "admin", "user", "root", "test", "demo", "guest",
        // 数字パターン
        "123", "111", "000", "1234", "12345", "321", "666", "777", "888", "999",
        // キーボードパターン
        "qwe", "qwerty", "asd", "asdf", "zxc", "abc",
        // 認証関連
        "login", "access", "secret", "master", "super", "manager",
        // 愛情・感情系
        "love", "iloveyou", "hate", "kiss", "baby", "angel",
        // 動物・生物
        "dragon", "monkey", "tiger", "bear", "cat", "dog",
        // キャラクター・ヒーロー
        "superman", "batman", "spider", "hero", "ninja",
        // スポーツ
        "football", "baseball", "soccer", "basket",
        // その他頻出語
        "welcome", "hello", "letmein", "trustno", "changeme",
        "default", "system", "security", "private", "public"
    ];


    // 末尾だけを取り除き、数字だけの語などは元の語を残す。
    function normalize(word) {
        const stripped = word.replace(/[^a-z]+$/i, '');
        return stripped.length > 0 ? stripped : word;
    }

    function stemWordList(wordList) {
        const frequencies = Object.create(null);
        wordList.forEach(([word, count]) => {
            const stem = normalize(word);
            frequencies[stem] = (frequencies[stem] || 0) + count;
        });
        return Object.entries(frequencies);
    }

    return { knownStems, normalize, stemWordList };
})();

if (typeof module !== "undefined" && module.exports) {
    module.exports = PassCloudStems;
}
