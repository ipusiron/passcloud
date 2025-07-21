// ワードクラウド分析モジュール
class WordCloudAnalysis {
    constructor(wordList) {
        this.wordList = wordList;
        this.canvas = null;
        this.canvasSetup = null;
    }

    // ワードクラウドを描画
    draw() {
        console.log('drawWordCloud called, wordList length:', this.wordList.length);
        
        if (this.wordList.length === 0) {
            console.log('No data to display');
            return;
        }
        
        document.querySelectorAll('.viewPanel').forEach(p => p.style.display = 'none');
        document.getElementById('cloudView').style.display = 'block';

        this.canvas = document.getElementById('cloudCanvas');
        this.canvasSetup = PassCloudUtils.setupCanvas(this.canvas);
        
        if (!this.canvasSetup) {
            setTimeout(() => this.draw(), 100);
            return;
        }

        const { ctx, rect } = this.canvasSetup;
        
        try {
            // 語幹推定モードのチェック
            const stemMode = document.getElementById('stemMode').checked;
            let displayWordList = this.wordList;
            
            if (stemMode) {
                displayWordList = this._applyStemming();
                console.log('Applied stemming, new list length:', displayWordList.length);
            }
            
            console.log('Calling WordCloud with', displayWordList.length, 'words');
            const sortedWordList = [...displayWordList].sort((a, b) => b[1] - a[1]);
            
            const isDarkMode = PassCloudUtils.isDarkMode();
            const options = this._getWordCloudOptions(sortedWordList, rect, isDarkMode);
            
            console.log('WordCloud options:', options);
            
            // 背景を設定
            this._drawBackground(ctx, rect, isDarkMode);
            
            // WordCloud を描画
            WordCloud(this.canvas, options);
            
            console.log('WordCloud called successfully');
        } catch (error) {
            console.error('WordCloud error:', error);
            this._drawError(ctx, rect, error.message);
        }
    }

    // 語幹推定を適用
    _applyStemming() {
        const stemmedFreqMap = {};
        this.wordList.forEach(([word, count]) => {
            const stemmedWord = PassCloudUtils.normalize(word);
            stemmedFreqMap[stemmedWord] = (stemmedFreqMap[stemmedWord] || 0) + count;
        });
        return Object.entries(stemmedFreqMap).map(([word, count]) => [word, count]);
    }

    // WordCloudオプションを取得
    _getWordCloudOptions(sortedWordList, rect, isDarkMode) {
        const colorSchemes = PassCloudUtils.getColorScheme(isDarkMode);
        
        return {
            list: sortedWordList,
            gridSize: 6,
            weightFactor: 5,
            fontFamily: '"Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif',
            fontWeight: 'bold',
            color: function(word, weight) {
                const colors = isDarkMode ? colorSchemes.dark : colorSchemes.light;
                const index = Math.floor((1 - weight / 100) * colors.length);
                return colors[Math.min(index, colors.length - 1)];
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
                    this.canvas.title = `${item[0]}: ${item[1]}回`;
                } else {
                    this.canvas.style.cursor = 'default';
                    this.canvas.title = '';
                }
            },
            click: (item, dimension, event) => {
                if (item) {
                    console.log('Password:', item[0], 'Count:', item[1]);
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
        ctx.fillText('エラー: ' + errorMessage, rect.width / 2, rect.height / 2);
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
        if (this.canvas) {
            this.canvas.style.cursor = 'default';
            this.canvas.title = '';
        }
    }
}