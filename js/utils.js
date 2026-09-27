// 共通ユーティリティクラス
class PassCloudUtils {
    // 表示中の状態メッセージ（{ key, values }）と、ローディングの文言のキー。
    static statusState = null;
    static loadingKey = 'loading.processing';

    // 入力そのものを画面へ出す前に、目に見えない文字を可視の記号へ置き換える。
    // RLO（U+202E）のような双方向制御文字が残っていると、表示だけが並べ替わり、
    // 保存されている文字列とは違うパスワードに見える（例: pass+RLO+drowssap が
    // passpassword と読める）。長さ・件数の集計はもとの文字列のまま行う。
    static INVISIBLE = /[\u0000-\u001F\u007F-\u009F\u00AD\u061C\u180E\u200B-\u200F\u2028\u2029\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF\uFFF9-\uFFFB]/g;

    static visibleText(text) {
        return String(text).replace(PassCloudUtils.INVISIBLE, character =>
            '[U+' + character.codePointAt(0).toString(16).toUpperCase().padStart(4, '0') + ']');
    }

    // 入力文字列はtextContentで描画する。
    static element(tag, className = '', text = '') {
        const element = document.createElement(tag);
        element.className = className;
        element.textContent = text;
        return element;
    }

    static showNoData(panel, noData) {
        panel.querySelector('.no-data').hidden = !noData;
        panel.querySelector('.view-content').hidden = noData;
    }

    // 表示中のメッセージは訳文ではなくキーで覚える。言語を切り替えても消えず、訳し直される。
    static notify(key, values = {}) {
        PassCloudUtils.statusState = key ? { key, values } : null;
        PassCloudUtils.renderStatus();
    }

    static renderStatus() {
        const state = PassCloudUtils.statusState;
        const el = document.getElementById('statusMessage');
        if (el) el.textContent = state ? I18n.t(state.key, state.values) : '';
    }

    // ローディング表示制御
    static showLoading(key = 'loading.processing') {
        PassCloudUtils.loadingKey = key;
        PassCloudUtils.renderLoading();
        document.getElementById("loadingIndicator").hidden = false;
        this.notify(key);
    }

    static renderLoading() {
        const el = document.getElementById("loadingIndicator");
        if (el) el.textContent = "🔄 " + I18n.t(PassCloudUtils.loadingKey);
    }

    static hideLoading() {
        document.getElementById("loadingIndicator").hidden = true;
    }

    // Canvas設定関数
    static setupCanvas(canvas) {
        if (!canvas) {
            return null;
        }
        
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        
        if (!ctx || rect.width === 0 || rect.height === 0) {
            return null;
        }
        
        const scale = window.devicePixelRatio || 1;
        canvas.width = rect.width * scale;
        canvas.height = rect.height * scale;
        
        ctx.scale(scale, scale);
        ctx.textBaseline = 'alphabetic';
        ctx.textAlign = 'left';
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        return { ctx, rect, scale };
    }

    // ---- ワードクラウドのフォントサイズ ----
    // wordcloud2 は語ごとに、幅 ≒ (0.6×文字数 + 2)×fontSize、
    // 高さ = 3×fontSize のオフスクリーンcanvasを作り、
    // getImageData で形を読む（js/wordcloud2.js の getTextInfo）。
    // Chromeはこの面積が 2^28 px を超えると例外を出さずに
    // 中身を落とし（canvasが白紙になる）、さらに大きいと
    // getImageData が Out of memory を投げる。
    // 実測（Chrome・bold sans）: 258,120,000px は描け、276,156,000px は白紙、
    // 500,130,000px は読め、576,396,000px で例外。
    static CANVAS_AREA_LIMIT = 268435456;
    // 面積は見積もりなので、限界の8割で止める。
    static CANVAS_AREA_BUDGET = 0.8;
    // 1文字あたりの幅。実測の最大は0.583（bold sans、6～14文字）。
    static CHAR_WIDTH_RATIO = 0.6;

    // いちばん長い語を基準に、オフスクリーンcanvasが
    // 壊れない fontSize の上限を出す。
    // 描画領域の高さも上限に使う。wordcloud2 は高さ 3×fontSize の箱を
    // 作るので、高さを超えるサイズはどのみち shrinkToFit が縮める。
    // 実際に描けるのは高さの1/3までなので、高さそのものを上限に
    // 置け、3倍の余裕を残したまま巨大な中間canvasを避けられる。
    static maxFontSize(longestWord, areaHeight) {
        const box = 3 * (PassCloudUtils.CHAR_WIDTH_RATIO * Math.max(1, longestWord) + 2);
        const budget = PassCloudUtils.CANVAS_AREA_LIMIT * PassCloudUtils.CANVAS_AREA_BUDGET;
        const safe = Math.sqrt(budget / box);
        const drawable = Number(areaHeight) > 0 ? Number(areaHeight) : Infinity;
        return Math.floor(Math.min(safe, drawable));
    }

    // 出現回数から出した素のサイズを、上下で止める。
    // 下限を置かないと、出現1回の語が minSize 未満になって
    // 黙って描かれない。上限を置かないと canvas が壊れる。
    // ただし weight が1未満のときは素通しにする。shrinkToFit が
    // 3/4 ずつ掛けて呼び直してくるので、ここで下限を効かせると
    // putWord の再帰が終わらなくなる。
    static clampFontSize(weight, size, floor, ceiling) {
        if (weight < 1) return size;
        return Math.min(ceiling, Math.max(floor, size));
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
        return result;
    }
}
