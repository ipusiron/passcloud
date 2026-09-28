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
    // 作るので、高さを超えるサイズはどのみち描画領域に入らない。
    // 実際に描けるのは高さの1/3までなので、高さそのものを上限に
    // 置け、3倍の余裕を残したまま巨大な中間canvasを避けられる。
    static maxFontSize(longestWord, areaHeight) {
        const box = 3 * (PassCloudUtils.CHAR_WIDTH_RATIO * Math.max(1, longestWord) + 2);
        const budget = PassCloudUtils.CANVAS_AREA_LIMIT * PassCloudUtils.CANVAS_AREA_BUDGET;
        const safe = Math.sqrt(budget / box);
        const drawable = Number(areaHeight) > 0 ? Number(areaHeight) : Infinity;
        return Math.floor(Math.min(safe, drawable));
    }

    // 1行の文字の高さ（大文字の高さ）。実測の目安は fontSize の0.75倍。
    static INK_HEIGHT_RATIO = 0.75;

    // 語が実際に食う面積。
    // 箱（幅 (0.6×文字数+2)×fontSize、高さ 3×fontSize）は余白が大きいが、
    // wordcloud2 が場所取りに使うのは箱ではなく文字のインクの範囲である
    // （getTextInfo が getImageData で拾う occupied と bounds）。
    // 語どうしは箱の隙間に入れ子になるので、インクの側で見積もる。
    static wordInkArea(length, fontSize) {
        return PassCloudUtils.CHAR_WIDTH_RATIO * Math.max(1, length) *
            PassCloudUtils.INK_HEIGHT_RATIO * fontSize * fontSize;
    }

    // 描画領域の辺をいっぱいまで使わずに残す余白。
    // wordcloud2 は語の箱をグリッドの中心から外へ置いていくので、
    // 辺と同じ長さの語は端がはみ出して落ちる。落ちるのはいちばん大きい語、
    // つまりいちばん見せたい語なので、手前で止める。
    // 実測（Chrome・bold sans・描画領域600px高・語を1つだけ置いて各8回）:
    // password を95px（インク幅443px）は8/8描けたが、105px（490px）で3/8に落ちた。
    // 3文字の語でも境目は同じインク幅で、233px（407px）は12/12、283px（495px）は5/12だった。
    // 境目のインク幅は短いほうの辺の0.74～0.82倍にあたるので、0.7で止める。
    static WORD_FIT_MARGIN = 0.7;

    // その語が描画領域に置ける最大の fontSize。
    // putWord は語のインクの幅・高さが描画領域を超えたところで捨てる。
    // rotateRatio があって語は縦にも寝るため、短いほうの辺で見る。
    static wordFitSize(length, areaWidth, areaHeight) {
        const side = Math.min(Number(areaWidth), Number(areaHeight));
        if (!(side > 0)) return Infinity;
        return side * PassCloudUtils.WORD_FIT_MARGIN /
            (PassCloudUtils.CHAR_WIDTH_RATIO * Math.max(1, length));
    }

    // 出現回数を 0～1 に写す。パスワードの出現回数はべき分布で、
    // 上位1語が桁違いに多い。回数に比例させると上位が上限に張り付いて
    // 残りが下限へ潰れるので、対数で写す。
    // 最小出現の語が0、最頻出の語が1になる。
    static countRatio(count, minCount, maxCount) {
        if (!(maxCount > minCount)) return 1;
        const span = Math.log(maxCount) - Math.log(minCount);
        const ratio = (Math.log(Number(count)) - Math.log(minCount)) / span;
        return Math.min(1, Math.max(0, ratio));
    }

    // 出現回数の幅が何桁ひらいていれば、サイズを下限いっぱいまで広げてよいか。
    // countRatio は最小出現を0・最頻出を1へ引き延ばす min-max 正規化なので、
    // 絶対的な目盛りがない。出現回数の幅が狭いほど、わずかな差が極端に開く。
    // 実測（1,000／1,010／1,020／1,030／1,040回。幅はわずか4%）では、
    // 1,000回が8.00px、1,040回が140pxで、4%の差が17.5倍の見た目になっていた。
    static SPREAD_DECADE = 1;

    // 出現回数の幅の広がり（0～1）。1桁（10倍）以上ひらいていれば1、
    // そこから下は桁数に比例して0へ落ちる。
    // サイズの下端をどこまで下げるかに使い、比の小さい入力では
    // 全語が上端の近くに寄る（順位は保ったまま、差だけが控えめになる）。
    static countSpread(minCount, maxCount) {
        if (!(maxCount > minCount)) return 0;
        const decades = Math.log10(Number(maxCount) / Number(minCount));
        return Math.min(1, decades / PassCloudUtils.SPREAD_DECADE);
    }

    // 全語のインクの面積の合計を、描画領域の面積の何割まで許すか。
    // 語は矩形ではなく、wordcloud2 の配置は中心から外へ置いていく貪欲法なので、
    // 合計が領域と同じでも入りきらない。
    // 実測（描画領域1696×600px・各5回）で、入りきらない語が出ない最大の値を取った。
    //   0.3 → 同梱サンプル67語が5回とも67/67（インク13.7%）、
    //         重複なし400語も5回とも400/400（インク17.5%）
    //   0.35 → 重複なし400語が396/400まで落ちる
    //   0.4  → 383/400
    static CLOUD_AREA_FILL = 0.3;

    // 出現回数から fontSize を出す関数を作る。
    //
    // ねらいは「出現回数が多い語は必ず同じか大きく描かれる」こと（サイズの単調性）。
    // そのために、サイズを決めるのは出現回数だけにし、語ごとの都合では動かさない。
    //
    //   size(count) = floor + countShare(count) × (top − floor)
    //   countShare(count) = 1 − (1 − countRatio(count)) × countSpread(min, max)
    //
    // countSpread は出現回数の幅が1桁以上あれば1で、そのとき
    // countShare は countRatio そのもの（最小出現が floor、最頻出が top）になる。
    // 幅が1桁に満たない入力では countShare が上端へ寄り、
    // わずかな回数差が極端なサイズ差に化けるのを抑える。
    //
    // top は、次の3つを同時に満たす最大値を二分探索で決める。
    //   - 全語のインクの面積の合計が、描画領域の面積 × CLOUD_AREA_FILL に収まる
    //   - どの語も描画領域に収まる（wordFitSize）
    //   - いちばん長い語でもオフスクリーンcanvasが壊れない（maxFontSize）
    // 全語をひとつの top で決めるので、縮めても比は崩れない。
    // 語数が少なければ top は上がり、canvas が空白だらけにならない。
    static cloudFontSizer(list, areaWidth, areaHeight, floor, fill) {
        const budgetFill = fill === undefined ? PassCloudUtils.CLOUD_AREA_FILL : fill;
        const words = list.map(([word, count]) => [String(word).length, Number(count)]);
        let minCount = Infinity;
        let maxCount = 0;
        let longest = 1;
        for (const [length, count] of words) {
            if (count < minCount) minCount = count;
            if (count > maxCount) maxCount = count;
            if (length > longest) longest = length;
        }
        if (!(minCount > 0)) minCount = 1;
        if (!(maxCount >= minCount)) maxCount = minCount;

        const safe = PassCloudUtils.maxFontSize(longest, areaHeight);
        const spread = PassCloudUtils.countSpread(minCount, maxCount);
        const share = count =>
            1 - (1 - PassCloudUtils.countRatio(count, minCount, maxCount)) * spread;
        const shares = words.map(([length, count]) => [length, share(count)]);
        const area = Number(areaWidth) * Number(areaHeight);
        const budget = area > 0 ? area * budgetFill : Infinity;
        const fits = top => {
            let used = 0;
            for (const [length, share] of shares) {
                const size = floor + share * (top - floor);
                if (size > PassCloudUtils.wordFitSize(length, areaWidth, areaHeight)) return false;
                used += PassCloudUtils.wordInkArea(length, size);
                if (used > budget) return false;
            }
            return true;
        };

        let low = floor;
        let high = Math.max(floor, safe);
        if (fits(high)) {
            low = high;
        } else {
            for (let step = 0; step < 40; step += 1) {
                const mid = (low + high) / 2;
                if (fits(mid)) low = mid; else high = mid;
            }
        }
        const top = low;

        return count => {
            const value = Number(count);
            // 最小出現を下回る値は、shrinkToFit を戻したときの保険。
            // 下限より下へ落として、putWord の呼び直しが必ず終わるようにする。
            if (!(value >= minCount)) return floor * Math.max(0, value) / minCount;
            return Math.min(safe, floor + share(value) * (top - floor));
        };
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
