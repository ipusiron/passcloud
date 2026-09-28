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
        const counts = new Map(sortedWordList);
        const tally = sortedWordList.map(([, count]) => count);
        const minCount = Math.min(...tally);
        const maxCount = Math.max(...tally);
        // サイズは出現回数だけで決める。描画領域に合わせて全語をまとめて
        // 縮めるので、出現回数の順位とサイズの順位がずれない。
        const fontSize = PassCloudUtils.cloudFontSizer(sortedWordList, rect.width, rect.height,
            WordCloudAnalysis.MIN_FONT_SIZE);

        return {
            list: sortedWordList,
            gridSize: PassCloudUtils.CLOUD_GRID,
            weightFactor: fontSize,
            fontFamily: '"Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif',
            fontWeight: 'bold',
            // 色も出現回数から引く。wordcloud2 が渡す weight ではなく、
            // もとの回数を語から引き直す。サイズと同じ対数の目盛りを使うので、
            // べき分布でも色が最下位のひとつへ固まらない。
            color: function(word) {
                const colors = isDarkMode ? colorSchemes.dark : colorSchemes.light;
                const share = PassCloudUtils.countRatio(counts.get(word) ?? minCount,
                    minCount, maxCount);
                return colors[PassCloudText.colorIndex(share, 1, colors.length)];
            },
            rotateRatio: 0.5,
            rotationSteps: 2,
            backgroundColor: isDarkMode ? '#1a1a1a' : '#fafafa',
            drawOutOfBound: false,
            // shrinkToFit は入りきらない語だけを 3/4 ずつ縮めて置き直す。
            // 大きい語ほど何度も縮むので、出現回数の順位が逆転する
            // （実測: letmein 5,000回が250.6px、password 20,000回が100.4px）。
            // 先に面積を合わせるこちらの決め方とは両立しないため切る。
            // 入りきらなかった語は縮めずに省き、status へ件数を出す。
            shrinkToFit: false,
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
