// 部分一致ワードクラウド分析モジュール
class PartialAnalysis {
    // こちらの minSize は10。出現1回の8pxが捨てられていたので、
    // minSize より大きく、出現2回の約14pxより小さい位置に置く。
    static MIN_FONT_SIZE = 12;

    constructor(wordList) {
        this.wordList = wordList;
        this.canvas = null;
        this.canvasSetup = null;
        this.partialData = [];
        this.retryCount = 0;
        this.retryTimer = null;
        // ホバー中の語句と件数。訳文ではなく値を覚える。
        this.hovered = null;
        // 描画の監視を外すための後始末。
        this.unwatch = null;
    }

    // キャンバスを保持し、メッセージだけを切り替える。
    draw() {
        const panel = document.getElementById('partialView');
        PassCloudUtils.showNoData(panel, this.wordList.length === 0);
        if (this.wordList.length === 0) return;

        this.partialData = this._analyzePartialMatches()
            .map(([phrase, count]) => [PassCloudUtils.visibleText(phrase), count]);
        const noMatches = this.partialData.length === 0;
        panel.querySelector('.no-matches').hidden = !noMatches;
        panel.querySelector('#partialCloudCanvas-container').hidden = noMatches;
        const total = this.partialData.reduce((sum, [, count]) => sum + count, 0);
        panel.querySelector('.partial-info').textContent = I18n.t('partial.info',
            { phrases: this.partialData.length, total: total.toLocaleString() });
        if (!noMatches) this._drawPartialWordCloud();
    }

    // 計算は純粋なロジックへ委譲する。
    _analyzePartialMatches() {
        return PassCloudPartial.analyzePartialMatches(this.wordList);
    }

    // 部分一致ワードクラウドを描画
    _drawPartialWordCloud() {
        this.canvas = document.getElementById('partialCloudCanvas');
        
        this.canvasSetup = PassCloudUtils.setupCanvas(this.canvas);
        if (!this.canvasSetup) {
            if (this.retryCount++ < 10) {
                this.retryTimer = setTimeout(() => this._drawPartialWordCloud(), 100);
            } else {
                PassCloudUtils.notify('status.partialAreaFailed');
            }
            return;
        }

        this.retryCount = 0;
        const { ctx, rect } = this.canvasSetup;
        
        try {
            const isDarkMode = PassCloudUtils.isDarkMode();
            const options = this._getPartialWordCloudOptions(isDarkMode);
            
            // 背景を描画
            this._drawBackground(ctx, rect, isDarkMode);
            
            // 何語句描けたかを数える。描く前に仕掛ける。
            this._watchDrawing(this.partialData.length);
            
            // WordCloudを描画
            WordCloud(this.canvas, options);
        } catch (error) {
            PassCloudUtils.notify('status.partialDrawFailed');
            this._drawError(ctx, rect, I18n.t('cloud.drawFailed'));
        }
    }

    // 部分一致ワードクラウドオプション
    _getPartialWordCloudOptions(isDarkMode) {
        const colorSchemes = {
            dark: [
                '#FF69B4', '#00CED1', '#FFD700', '#FF4500', '#00FF7F',
                '#FF1493', '#00FFFF', '#ADFF2F', '#FF00FF', '#FFA500',
                '#87CEEB', '#DDA0DD', '#F0E68C', '#98FB98', '#F08080'
            ],
            light: [
                '#8B008B', '#008B8B', '#B8860B', '#FF4500', '#228B22',
                '#C71585', '#4682B4', '#556B2F', '#8B0000', '#FF8C00',
                '#6B8E23', '#8B008B', '#D2691E', '#2E8B57', '#DC143C'
            ]
        };
        
        const counts = new Map(this.partialData);
        const tally = this.partialData.map(([, count]) => count);
        const minCount = Math.min(...tally);
        const maxCount = Math.max(...tally);
        const rect = this.canvasSetup?.rect ?? { width: 0, height: 0 };
        // shape: 'diamond' は置ける範囲が長方形のおよそ半分なので、
        // 面積の予算もその割合まで落とす。
        const fontSize = PassCloudUtils.cloudFontSizer(this.partialData, rect.width, rect.height,
            PartialAnalysis.MIN_FONT_SIZE, PassCloudUtils.CLOUD_AREA_FILL / 2);
        return {
            list: this.partialData.map(([word, count]) => [word, count]),
            gridSize: PassCloudUtils.CLOUD_GRID,
            weightFactor: fontSize,
            fontFamily: '"Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif',
            fontWeight: 'bold',
            // 色はもとの出現回数から引く。サイズと同じ対数の目盛りを使う。
            color: function(word) {
                const colors = isDarkMode ? colorSchemes.dark : colorSchemes.light;
                const share = PassCloudUtils.countRatio(counts.get(word) ?? minCount,
                    minCount, maxCount);
                const index = PassCloudText.colorIndex(share, 1, colors.length);
                return colors[Math.min(Math.max(index, 0), colors.length - 1)];
            },
            rotateRatio: 0.35,
            rotationSteps: 3,
            backgroundColor: isDarkMode ? '#1a1a1a' : '#fafafa',
            drawOutOfBound: false,
            // 本体のクラウドと同じ理由で切る（shrinkToFit は順位を壊す）。
            shrinkToFit: false,
            minSize: 10,
            ellipticity: 0.7,
            shuffle: true,
            shape: 'diamond',
            hover: (item, dimension, event) => {
                this.hovered = item ? { word: item[0], count: counts.get(item[0]) } : null;
                this.canvas.style.cursor = item ? 'pointer' : 'default';
                this.renderHoverTitle();
            }
        };
    }

    // 背景を描画
    _drawBackground(ctx, rect, isDarkMode) {
        // 背景をクリア
        if (isDarkMode) {
            ctx.fillStyle = '#1a1a1a';
        } else {
            ctx.fillStyle = '#fafafa';
        }
        ctx.fillRect(0, 0, rect.width, rect.height);
        
        // グリッドパターンを追加
        PassCloudUtils.drawGridPattern(ctx, rect, isDarkMode);
        
        // 装飾的なグラデーション背景
        if (isDarkMode) {
            const gradient = ctx.createRadialGradient(
                rect.width / 2, rect.height / 2, 0,
                rect.width / 2, rect.height / 2, Math.max(rect.width, rect.height) / 2
            );
            gradient.addColorStop(0, 'rgba(255, 105, 180, 0.05)');
            gradient.addColorStop(0.5, 'rgba(0, 206, 209, 0.03)');
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, rect.width, rect.height);
        }
    }

    // エラー表示
    _drawError(ctx, rect, errorMessage) {
        ctx.fillStyle = '#ff0000';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(I18n.t('cloud.errorPrefix', { message: errorMessage }),
            rect.width / 2, rect.height / 2);
    }

    // データ更新
    updateData(wordList) {
        this.wordList = wordList;
    }

    // wordcloud2 は語句ごとに wordclouddrawn を送る。描けた数を数え、
    // 1語句も描けなかったときと欠けたときに理由を出す。
    _watchDrawing(total) {
        this._stopWatching();
        const canvas = this.canvas;
        let drawn = 0;
        const onDrawn = event => { if (event.detail.drawn) drawn += 1; };
        const onStop = () => {
            this._stopWatching();
            if (drawn === 0) PassCloudUtils.notify('status.partialNothingDrawn');
            else if (drawn < total) PassCloudUtils.notify('status.partialPartlyDrawn', { drawn, total });
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
        this.canvas.title = this.hovered ? I18n.t('partial.hover', this.hovered) : '';
    }

    // 再描画
    redraw() {
        if (this.wordList.length > 0) {
            this.draw();
        }
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
