// ワードクラウド分析モジュール
class WordCloudAnalysis {
    constructor(wordList) {
        this.wordList = wordList;
        this.canvas = null;
        this.canvasSetup = null;
        this.retryCount = 0;
        this.retryTimer = null;
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
        
        return {
            list: sortedWordList,
            gridSize: 6,
            weightFactor: 5,
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
                if (item) {
                    this.canvas.style.cursor = 'pointer';
                    this.canvas.title = I18n.t('cloud.hover',
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
        this.retryCount = 0;
        if (this.canvas) {
            this.canvas.style.cursor = 'default';
            this.canvas.title = '';
        }
    }
}
