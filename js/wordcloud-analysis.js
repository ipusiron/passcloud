// ワードクラウド分析モジュール
class WordCloudAnalysis {
    // wordcloud2 は fontSize <= minSize の語を描かない。minSize は6なので、
    // 出現1回の5pxは捨てられていた。出現2回の10pxより小さく、
    // minSize よりは大きい位置まで持ち上げる（並びは崩さない）。
    static MIN_FONT_SIZE = 8;

    constructor(wordList) {
        this.wordList = wordList;
        this.canvas = null;
        this.canvasSetup = null;
        this.retryCount = 0;
        this.retryTimer = null;
        // ホバー中の語と件数。訳文ではなく値を覚える。
        this.hovered = null;
        // 描画の監視を外すための後始末。
        this.unwatch = null;
    }

    // ワードクラウドを描画
    draw() {
        
        if (this.wordList.length === 0) {
            return;
        }
        
        PassCloudUtils.showNoData(document.getElementById('cloudView'), false);

        this.canvas = document.getElementById('cloudCanvas');
        this.canvasSetup = PassCloudUtils.setupCanvas(this.canvas);
        
        if (!this.canvasSetup) {
            if (this.retryCount++ < 10) {
                this.retryTimer = setTimeout(() => this.draw(), 100);
            } else {
                PassCloudUtils.notify('status.cloudAreaFailed');
            }
            return;
        }

        this.retryCount = 0;
        const { ctx, rect } = this.canvasSetup;
        
        try {
            // 語幹推定モードのチェック
            const stemMode = document.getElementById('stemMode').checked;
            let displayWordList = this.wordList;
            
            if (stemMode) {
                displayWordList = this._applyStemming();
            }
            const sortedWordList = displayWordList
                .map(([word, count]) => [PassCloudUtils.visibleText(word), count])
                .sort((a, b) => b[1] - a[1]);
            
            const isDarkMode = PassCloudUtils.isDarkMode();
            const options = this._getWordCloudOptions(sortedWordList, rect, isDarkMode);
            
            // 背景を設定
            this._drawBackground(ctx, rect, isDarkMode);
            
            // 何語描けたかを数える。描く前に仕掛ける。
            this._watchDrawing(sortedWordList.length);
            
            // WordCloud を描画
            WordCloud(this.canvas, options);
        } catch (error) {
            PassCloudUtils.notify('status.cloudDrawFailed');
            this._drawError(ctx, rect, I18n.t('cloud.drawFailed'));
        }
    }

    // 語幹推定を適用
    _applyStemming() {
        return PassCloudStems.stemWordList(this.wordList);
    }

    // WordCloudオプションを取得
    _getWordCloudOptions(sortedWordList, rect, isDarkMode) {
        const colorSchemes = PassCloudUtils.getColorScheme(isDarkMode);
        const maxWeight = sortedWordList.reduce((max, [, count]) => Math.max(max, count), 0);
        const counts = new Map(sortedWordList);
        // 上限は、いちばん長い語でもオフスクリーンcanvasが
        // 壊れないところに置く。普通のリストではこの上限に当たらない。
        const longest = sortedWordList.reduce((max, [word]) => Math.max(max, word.length), 1);
        const ceiling = PassCloudUtils.maxFontSize(longest, rect.height);
        
        return {
            list: sortedWordList,
            gridSize: 6,
            weightFactor: weight => PassCloudUtils.clampFontSize(weight, weight * 5,
                WordCloudAnalysis.MIN_FONT_SIZE, ceiling),
            fontFamily: '"Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif',
            fontWeight: 'bold',
            color: function(word, weight) {
                const colors = isDarkMode ? colorSchemes.dark : colorSchemes.light;
                const index = PassCloudText.colorIndex(weight, maxWeight, colors.length);
                return colors[index];
            },
            rotateRatio: 0.5,
            rotationSteps: 2,
            backgroundColor: isDarkMode ? '#1a1a1a' : '#fafafa',
            drawOutOfBound: false,
            shrinkToFit: true,
            minSize: 6,
            ellipticity: 0.65,
            shuffle: false,
            shape: 'square',
            hover: (item, dimension, event) => {
                this.hovered = item ? { word: item[0], count: counts.get(item[0]) } : null;
                this.canvas.style.cursor = item ? 'pointer' : 'default';
                this.renderHoverTitle();
            }
        };
    }

    // 背景を描画
    _drawBackground(ctx, rect, isDarkMode) {
        // 背景をクリア＆設定
        if (isDarkMode) {
            ctx.fillStyle = '#1a1a1a';
        } else {
            ctx.fillStyle = '#fafafa';
        }
        ctx.fillRect(0, 0, rect.width, rect.height);
        
        // グリッドパターンを追加
        PassCloudUtils.drawGridPattern(ctx, rect, isDarkMode);
    }

    // エラー表示
    _drawError(ctx, rect, errorMessage) {
        ctx.fillStyle = '#ff0000';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(I18n.t('cloud.errorPrefix', { message: errorMessage }),
            rect.width / 2, rect.height / 2);
    }

    // wordcloud2 は語ごとに wordclouddrawn を送る。描けた数を数え、
    // 1語も描けなかったときと欠けたときに理由を出す。
    // これがないと、canvasが白紙でも status は完了のままになる。
    _watchDrawing(total) {
        this._stopWatching();
        const canvas = this.canvas;
        let drawn = 0;
        const onDrawn = event => { if (event.detail.drawn) drawn += 1; };
        const onStop = () => {
            this._stopWatching();
            if (drawn === 0) PassCloudUtils.notify('status.cloudNothingDrawn');
            else if (drawn < total) PassCloudUtils.notify('status.cloudPartlyDrawn', { drawn, total });
        };
        this.unwatch = () => {
            canvas.removeEventListener('wordclouddrawn', onDrawn);
            canvas.removeEventListener('wordcloudstop', onStop);
            this.unwatch = null;
        };
        canvas.addEventListener('wordclouddrawn', onDrawn);
        canvas.addEventListener('wordcloudstop', onStop);
    }

    _stopWatching() {
        if (this.unwatch) this.unwatch();
    }

    // canvasの title は再描画で差し替わらないので、
    // 言語を切り替えたらここから組み直す。
    renderHoverTitle() {
        if (!this.canvas) return;
        this.canvas.title = this.hovered ? I18n.t('cloud.hover', this.hovered) : '';
    }

    // 再描画（テーマ変更時など）
    redraw() {
        if (this.wordList.length > 0) {
            this.draw();
        }
    }

    // データ更新
    updateData(wordList) {
        this.wordList = wordList;
    }

    // クリーンアップ
    cleanup() {
        clearTimeout(this.retryTimer);
        this._stopWatching();
        this.retryCount = 0;
        this.hovered = null;
        if (this.canvas) {
            this.canvas.style.cursor = 'default';
            this.canvas.title = '';
        }
    }
}
