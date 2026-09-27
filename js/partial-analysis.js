// 部分一致ワードクラウド分析モジュール
class PartialAnalysis {
    constructor(wordList) {
        this.wordList = wordList;
        this.canvas = null;
        this.canvasSetup = null;
        this.partialData = [];
        this.retryCount = 0;
        this.retryTimer = null;
    }

    // キャンバスを保持し、メッセージだけを切り替える。
    draw() {
        const panel = document.getElementById('partialView');
        PassCloudUtils.showNoData(panel, this.wordList.length === 0);
        if (this.wordList.length === 0) return;

        this.partialData = this._analyzePartialMatches();
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
        
        const maxWeight = Math.max(...this.partialData.map(([, count]) => count));
        const counts = new Map(this.partialData);
        return {
            list: this.partialData.map(([word, count]) => [word, count]),
            gridSize: 6,
            weightFactor: function(size) {
                return Math.pow(size, 0.8) * 8;
            },
            fontFamily: '"Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif',
            fontWeight: 'bold',
            color: function(word, weight, fontSize) {
                const colors = isDarkMode ? colorSchemes.dark : colorSchemes.light;
                const index = PassCloudText.colorIndex(weight, maxWeight, colors.length);
                return colors[Math.min(Math.max(index, 0), colors.length - 1)];
            },
            rotateRatio: 0.35,
            rotationSteps: 3,
            backgroundColor: isDarkMode ? '#1a1a1a' : '#fafafa',
            drawOutOfBound: false,
            shrinkToFit: true,
            minSize: 10,
            ellipticity: 0.7,
            shuffle: true,
            shape: 'diamond',
            hover: (item, dimension, event) => {
                if (item) {
                    this.canvas.style.cursor = 'pointer';
                    this.canvas.title = I18n.t('partial.hover',
                        { word: item[0], count: counts.get(item[0]) });
                } else {
                    this.canvas.style.cursor = 'default';
                    this.canvas.title = '';
                }
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

    // 再描画
    redraw() {
        if (this.wordList.length > 0) {
            this.draw();
        }
    }

    // クリーンアップ
    cleanup() {
        clearTimeout(this.retryTimer);
        this.retryCount = 0;
        if (this.canvas) {
            this.canvas.style.cursor = 'default';
            this.canvas.title = '';
        }
    }
}
