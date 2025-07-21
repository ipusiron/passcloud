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

// 共通ユーティリティクラス
class PassCloudUtils {
    // HTMLエスケープ関数
    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 語幹推定関数
    static normalize(word) {
        return word.replace(/[^a-z]/gi, '').replace(/[0-9]+$/, '');
    }

    // ローディング表示制御
    static showLoading(message = "処理中です…") {
        const el = document.getElementById("loadingIndicator");
        el.textContent = "🔄 " + message;
        el.style.display = "block";
    }

    static hideLoading() {
        document.getElementById("loadingIndicator").style.display = "none";
    }

    // テキストファイル処理
    static processText(text) {
        console.log('Processing text, length:', text.length);
        const lines = text.split(/\r?\n/).filter(l => l.trim() !== "");
        console.log('Found', lines.length, 'lines');
        
        const freqMap = {};
        for (let line of lines) {
            let word = line.trim().toLowerCase();
            freqMap[word] = (freqMap[word] || 0) + 1;
        }

        const wordList = Object.entries(freqMap).map(([word, count]) => [word, count]);
        console.log('Created wordList with', wordList.length, 'unique words');
        
        return {
            wordList,
            originalLineCount: lines.length
        };
    }

    // パターン検出関数
    static hasSequentialPattern(password) {
        const patterns = ['123', '234', '345', '456', '567', '678', '789', '890',
                         '111', '222', '333', '444', '555', '666', '777', '888', '999', '000',
                         'abc', 'bcd', 'cde', 'def', 'efg', 'fgh', 'ghi', 'hij', 'ijk',
                         'jkl', 'klm', 'lmn', 'mno', 'nop', 'opq', 'pqr', 'qrs', 'rst',
                         'stu', 'tuv', 'uvw', 'vwx', 'wxy', 'xyz'];
        return patterns.some(pattern => password.toLowerCase().includes(pattern));
    }

    static hasKeyboardPattern(password) {
        const patterns = ['qwerty', 'qwertz', 'azerty', 'qwer', 'asdf', 'zxcv',
                         'qaz', 'wsx', 'edc', 'rfv', 'tgb', 'yhn', 'ujm',
                         'wasd', 'asd', 'zxc'];
        return patterns.some(pattern => password.toLowerCase().includes(pattern));
    }

    static hasYearPattern(password) {
        return /19\d{2}|20\d{2}/.test(password);
    }

    // 有効な語句かどうかを判定
    static isValidPhrase(phrase) {
        if (phrase.trim().length === 0) return false;
        if (/^[^a-z0-9]+$/i.test(phrase)) return false;
        if (this.isSingleChar(phrase)) return false;
        return true;
    }

    // 単一文字の繰り返しかどうかを判定
    static isSingleChar(str) {
        if (str.length === 0) return false;
        const firstChar = str[0];
        return str.split('').every(char => char === firstChar);
    }

    // Canvas設定関数
    static setupCanvas(canvas) {
        if (!canvas) {
            console.error('Canvas element not found!');
            return null;
        }
        
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        
        if (rect.width === 0 || rect.height === 0) {
            console.error('Canvas has zero size!');
            return null;
        }
        
        const scale = window.devicePixelRatio || 1;
        canvas.width = rect.width * scale;
        canvas.height = rect.height * scale;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        
        ctx.scale(scale, scale);
        ctx.textBaseline = 'alphabetic';
        ctx.textAlign = 'left';
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        return { ctx, rect, scale };
    }

    // グリッドパターン描画
    static drawGridPattern(ctx, rect, isDarkMode) {
        ctx.strokeStyle = isDarkMode ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)';
        ctx.lineWidth = 1;
        const gridSize = 50;
        
        // 垂直線
        for (let x = 0; x <= rect.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, rect.height);
            ctx.stroke();
        }
        
        // 水平線
        for (let y = 0; y <= rect.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(rect.width, y);
            ctx.stroke();
        }
    }

    // ダークモード判定
    static isDarkMode() {
        return document.documentElement.getAttribute('data-theme') === 'dark';
    }

    // カラーパレット取得
    static getColorScheme(isDarkMode) {
        return {
            dark: [
                '#00FFFF', '#FF1493', '#00FF7F', '#FFD700', '#FF69B4',
                '#00CED1', '#FF4500', '#ADFF2F', '#FF00FF', '#1E90FF',
                '#FFA500', '#32CD32', '#BA55D3', '#F0E68C', '#87CEEB'
            ],
            light: [
                '#000080', '#8B0000', '#006400', '#FF4500', '#4B0082',
                '#2F4F4F', '#DC143C', '#008B8B', '#9400D3', '#B22222',
                '#228B22', '#4682B4', '#D2691E', '#9932CC', '#8B4513'
            ]
        };
    }

    // バーの色を取得
    static getBarColor(percentage, isDarkMode) {
        if (isDarkMode) {
            if (percentage > 20) return '#ff1493';
            if (percentage > 10) return '#ffd700';
            if (percentage > 5) return '#00ffff';
            return '#00ff00';
        } else {
            if (percentage > 20) return '#dc143c';
            if (percentage > 10) return '#ff8c00';
            if (percentage > 5) return '#4682b4';
            return '#228b22';
        }
    }

    // デバウンス関数
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // パフォーマンス測定
    static measurePerformance(name, func) {
        const start = performance.now();
        const result = func();
        const end = performance.now();
        console.log(`${name} took ${end - start} milliseconds`);
        return result;
    }
}