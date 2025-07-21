// 部分一致ワードクラウド分析モジュール
class PartialAnalysis {
    constructor(wordList) {
        this.wordList = wordList;
        this.canvas = null;
        this.canvasSetup = null;
        this.partialData = [];
    }

    // 部分一致ワードクラウドを描画
    draw() {
        document.querySelectorAll('.viewPanel').forEach(p => p.style.display = 'none');
        const panel = document.getElementById('partialView');
        panel.style.display = 'block';
        
        if (this.wordList.length === 0) {
            panel.innerHTML = '<p style="text-align: center; margin-top: 50px;">データがありません。ファイルを選択して分析を実行してください。</p>';
            return;
        }
        
        // 部分一致分析を実行
        this.partialData = this._analyzePartialMatches();
        
        if (this.partialData.length === 0) {
            panel.innerHTML = this._getNoDataHTML();
            return;
        }
        
        // HTMLを生成
        const html = this._generateHTML();
        panel.innerHTML = html;
        
        // ワードクラウドを描画
        setTimeout(() => {
            this._drawPartialWordCloud();
        }, 100);
    }

    // 部分一致分析を実行
    _analyzePartialMatches() {
        const extractedPhrases = {};
        const stemUsage = {};
        
        // 各パスワードを処理
        this.wordList.forEach(([password, count]) => {
            const lowerPassword = password.toLowerCase();
            const processedStems = new Set();
            
            // 各語幹でチェック
            knownStems.forEach(stem => {
                if (lowerPassword.includes(stem)) {
                    stemUsage[stem] = (stemUsage[stem] || 0) + count;
                    
                    // すべての出現位置を検索
                    let searchIndex = 0;
                    while (searchIndex < lowerPassword.length) {
                        const index = lowerPassword.indexOf(stem, searchIndex);
                        if (index === -1) break;
                        
                        const key = `${stem}-${index}`;
                        if (processedStems.has(key)) {
                            searchIndex = index + 1;
                            continue;
                        }
                        processedStems.add(key);
                        
                        // 前の部分（接頭語）
                        if (index > 0) {
                            const prefix = lowerPassword.substring(0, index);
                            if (prefix.length > 0 && prefix.length <= 8 && PassCloudUtils.isValidPhrase(prefix)) {
                                extractedPhrases[prefix] = (extractedPhrases[prefix] || 0) + count;
                            }
                        }
                        
                        // 後の部分（接尾語）
                        const endIndex = index + stem.length;
                        if (endIndex < lowerPassword.length) {
                            const suffix = lowerPassword.substring(endIndex);
                            if (suffix.length > 0 && suffix.length <= 8 && PassCloudUtils.isValidPhrase(suffix)) {
                                extractedPhrases[suffix] = (extractedPhrases[suffix] || 0) + count;
                            }
                        }
                        
                        searchIndex = index + stem.length;
                    }
                }
            });
        });
        
        // 使用された語幹をログ出力
        const usedStemsList = Object.entries(stemUsage)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        console.log('Most used stems:', usedStemsList);
        
        // 配列に変換してソート
        const sortedPhrases = Object.entries(extractedPhrases)
            .filter(([phrase, count]) => {
                return phrase.length > 0 && 
                       count > 1 && 
                       !knownStems.includes(phrase) && 
                       !PassCloudUtils.isSingleChar(phrase);
            })
            .sort((a, b) => b[1] - a[1])
            .slice(0, 200);
        
        console.log('Partial match analysis:', {
            totalExtracted: Object.keys(extractedPhrases).length,
            filteredCount: sortedPhrases.length,
            top10: sortedPhrases.slice(0, 10)
        });
        
        return sortedPhrases;
    }

    // データなしのHTML
    _getNoDataHTML() {
        return `
            <div class="partial-container">
                <h2>🧩 部分一致ワードクラウド</h2>
                <p style="text-align: center; margin-top: 50px; color: var(--text-secondary);">
                    分析対象となる部分一致語句が見つかりませんでした。<br>
                    パスワードリストに共通語幹（pass, admin, 123など）が含まれていない可能性があります。
                </p>
            </div>
        `;
    }

    // HTMLを生成
    _generateHTML() {
        const totalOccurrences = this.partialData.reduce((sum, [_, count]) => sum + count, 0);
        
        return `
            <div class="partial-container">
                <h2>🧩 部分一致ワードクラウド</h2>
                <p class="partial-description">
                    共通語幹（pass, admin, 123など）と組み合わせて使われる語句を可視化します。<br>
                    推測しやすいパスワードパターンの把握に役立ちます。
                </p>
                <div class="partial-info">
                    <span>✅ 自動語幹検出：上位50語を使用</span>
                    <span>｜</span>
                    <span>抽出された語句数：${this.partialData.length}</span>
                    <span>｜</span>
                    <span>総出現回数：${totalOccurrences.toLocaleString()}</span>
                </div>
                <div id="partialCloudCanvas-container" style="width: 100%; height: 600px; position: relative;">
                    <canvas id="partialCloudCanvas" style="width: 100%; height: 100%;"></canvas>
                </div>
            </div>
        `;
    }

    // 部分一致ワードクラウドを描画
    _drawPartialWordCloud() {
        this.canvas = document.getElementById('partialCloudCanvas');
        if (!this.canvas) {
            console.error('Partial cloud canvas not found!');
            return;
        }
        
        this.canvasSetup = PassCloudUtils.setupCanvas(this.canvas);
        if (!this.canvasSetup) {
            setTimeout(() => this._drawPartialWordCloud(), 100);
            return;
        }

        const { ctx, rect } = this.canvasSetup;
        
        try {
            const isDarkMode = PassCloudUtils.isDarkMode();
            const options = this._getPartialWordCloudOptions(isDarkMode);
            
            // 背景を描画
            this._drawBackground(ctx, rect, isDarkMode);
            
            // WordCloudを描画
            WordCloud(this.canvas, options);
            
            console.log('Partial WordCloud drawn successfully with', this.partialData.length, 'phrases');
        } catch (error) {
            console.error('Partial WordCloud error:', error);
            this._drawError(ctx, rect, error.message);
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
        
        return {
            list: this.partialData,
            gridSize: 6,
            weightFactor: function(size) {
                return Math.pow(size, 0.8) * 8;
            },
            fontFamily: '"Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif',
            fontWeight: 'bold',
            color: function(word, weight, fontSize) {
                const colors = isDarkMode ? colorSchemes.dark : colorSchemes.light;
                const index = Math.floor((1 - fontSize / 60) * colors.length);
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
                    this.canvas.title = `"${item[0]}": ${item[1]}回出現`;
                } else {
                    this.canvas.style.cursor = 'default';
                    this.canvas.title = '';
                }
            },
            click: (item, dimension, event) => {
                if (item) {
                    console.log('Partial phrase clicked:', item[0], 'Count:', item[1]);
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
        ctx.fillText('エラー: ' + errorMessage, rect.width / 2, rect.height / 2);
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
        if (this.canvas) {
            this.canvas.style.cursor = 'default';
            this.canvas.title = '';
        }
    }
}