// ヒートマップ分析モジュール
class HeatmapAnalysis {
    constructor(wordList, originalLineCount) {
        this.wordList = wordList;
        this.originalLineCount = originalLineCount;
        this.heatmapData = null;
    }

    // ヒートマップを描画
    draw() {
        document.querySelectorAll('.viewPanel').forEach(p => p.style.display = 'none');
        const panel = document.getElementById('heatmapView');
        panel.style.display = 'block';
        
        if (this.wordList.length === 0) {
            panel.innerHTML = '<p style="text-align: center; margin-top: 50px;">データがありません。ファイルを選択して分析を実行してください。</p>';
            return;
        }
        
        // ヒートマップデータを計算
        this.heatmapData = this._calculateHeatmapData();
        
        // デバッグ情報
        console.log('Heatmap Data:', {
            totalPasswords: this.heatmapData.totalPasswords,
            uniquePasswords: this.heatmapData.uniquePasswords,
            maxCount: this.heatmapData.maxCount,
            lengths: this.heatmapData.lengths,
            minLength: this.heatmapData.minLength,
            maxLength: this.heatmapData.maxLength,
            mostCommonLength: this.heatmapData.mostCommonLength,
            mostCommonLengthCount: this.heatmapData.mostCommonLengthCount,
            matrix: this.heatmapData.matrix
        });
        
        // HTMLを生成
        const html = this._generateHTML();
        panel.innerHTML = html;
        
        // ツールチップのイベントリスナーを追加
        setTimeout(() => {
            this._addHeatmapTooltips();
        }, 100);
    }

    // ヒートマップデータを計算
    _calculateHeatmapData() {
        const lengthFreqMap = {};
        let minLength = Infinity;
        let maxLength = 0;
        let maxFreq = 0;
        let totalPasswordCount = this.originalLineCount;
        
        // データを収集
        this.wordList.forEach(([password, count]) => {
            const len = password.length;
            minLength = Math.min(minLength, len);
            maxLength = Math.max(maxLength, len);
            maxFreq = Math.max(maxFreq, count);
            
            if (!lengthFreqMap[len]) {
                lengthFreqMap[len] = {};
            }
            
            const freqBand = this._getFrequencyBand(count);
            if (!lengthFreqMap[len][freqBand]) {
                lengthFreqMap[len][freqBand] = 0;
            }
            lengthFreqMap[len][freqBand]++;
        });
        
        // 頻度帯の定義
        const frequencyRanges = [
            { min: 1, max: 1, label: '1' },
            { min: 2, max: 3, label: '2-3' },
            { min: 4, max: 5, label: '4-5' },
            { min: 6, max: 10, label: '6-10' },
            { min: 11, max: 20, label: '11-20' },
            { min: 21, max: 50, label: '21-50' },
            { min: 51, max: 100, label: '51-100' },
            { min: 101, max: Infinity, label: '100+' }
        ];
        
        // 表示する長さの範囲を作成
        const displayMinLength = minLength;
        const displayMaxLength = Math.min(20, maxLength);
        const lengths = [];
        for (let i = displayMinLength; i <= displayMaxLength; i++) {
            lengths.push(i);
        }
        
        // 2次元マトリクスを作成
        const matrix = [];
        let maxCellCount = 0;
        let mostCommonLength = 0;
        let mostCommonLengthCount = 0;
        let freqRangeCounts = {};
        
        lengths.forEach(len => {
            const row = [];
            let lengthTotal = 0;
            
            frequencyRanges.forEach(range => {
                const key = `${range.min}-${range.max}`;
                const count = (lengthFreqMap[len] && lengthFreqMap[len][key]) || 0;
                row.push(count);
                maxCellCount = Math.max(maxCellCount, count);
                lengthTotal += count;
                
                if (!freqRangeCounts[range.label]) {
                    freqRangeCounts[range.label] = 0;
                }
                freqRangeCounts[range.label] += count;
            });
            
            if (lengthTotal > mostCommonLengthCount) {
                mostCommonLengthCount = lengthTotal;
                mostCommonLength = len;
            }
            
            matrix.push(row);
        });
        
        // 最頻出の頻度帯を特定
        let mostCommonFreqRange = '';
        let maxFreqRangeCount = 0;
        Object.entries(freqRangeCounts).forEach(([range, count]) => {
            if (count > maxFreqRangeCount) {
                maxFreqRangeCount = count;
                mostCommonFreqRange = range;
            }
        });
        
        // 実際のパスワード総数を計算
        let actualMostCommonLengthCount = 0;
        this.wordList.forEach(([password, count]) => {
            if (password.length === mostCommonLength) {
                actualMostCommonLengthCount += Math.floor(count);
            }
        });
        
        return {
            lengths,
            frequencyRanges,
            matrix,
            maxCount: maxCellCount,
            minLength: displayMinLength,
            maxLength: displayMaxLength,
            mostCommonLength,
            mostCommonLengthCount: actualMostCommonLengthCount,
            mostCommonFreqRange,
            totalPasswords: totalPasswordCount,
            uniquePasswords: this.wordList.length
        };
    }

    // 頻度帯を決定
    _getFrequencyBand(count) {
        if (count === 1) return '1-1';
        if (count <= 3) return '2-3';
        if (count <= 5) return '4-5';
        if (count <= 10) return '6-10';
        if (count <= 20) return '11-20';
        if (count <= 50) return '21-50';
        if (count <= 100) return '51-100';
        return '101-Infinity';
    }

    // HTMLを生成
    _generateHTML() {
        const isDarkMode = PassCloudUtils.isDarkMode();
        
        return `
            <div class="heatmap-container">
                <h2>🔥 長さ×頻度ヒートマップ</h2>
                <p class="heatmap-description">
                    パスワードの長さと出現頻度の関係を可視化します。<br>
                    色が濃いほど、その長さ・頻度の組み合わせに該当するユニークなパスワードが多いことを示します。
                </p>
                
                <div class="heatmap-wrapper">
                    ${this._generateYAxis()}
                    ${this._generateMainContent(isDarkMode)}
                    ${this._generateLegend(isDarkMode)}
                </div>
                ${this._generateSummary()}
            </div>
        `;
    }

    // Y軸を生成
    _generateYAxis() {
        // ヒートマップと同じ順序（大きい値から小さい値へ）で表示
        const reversedLengths = [...this.heatmapData.lengths].reverse();
        return `
            <div class="heatmap-y-axis">
                <div class="y-axis-label">パスワードの長さ（文字数）</div>
                <div class="y-axis-values-wrapper">
                    <div class="y-axis-values">
                        ${reversedLengths.map((len, index) => 
                            `<div class="y-value">${len}</div>`
                        ).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    // メインコンテンツを生成
    _generateMainContent(isDarkMode) {
        return `
            <div class="heatmap-main">
                <div class="heatmap-grid">
                    ${this._generateHeatmapGrid(isDarkMode)}
                </div>
                
                <div class="heatmap-x-axis">
                    <div class="x-axis-values">
                        ${this.heatmapData.frequencyRanges.map(range => `<div class="x-value">${range.label}</div>`).join('')}
                    </div>
                    <div class="x-axis-label">出現頻度</div>
                </div>
            </div>
        `;
    }

    // 凡例を生成
    _generateLegend(isDarkMode) {
        return `
            <div class="heatmap-legend">
                <div class="legend-title">ユニーク<br>パスワード数</div>
                <div class="legend-scale">
                    <div class="legend-max">${this.heatmapData.maxCount}</div>
                    <div class="legend-gradient" style="background: ${this._getLegendGradient(isDarkMode)}"></div>
                    <div class="legend-min">0</div>
                </div>
            </div>
        `;
    }

    // サマリーを生成
    _generateSummary() {
        return `
            <div class="heatmap-summary-wrapper">
                <div class="heatmap-stat-card">
                    <h4>📊 分析サマリー</h4>
                    <div class="heatmap-stat-item">
                        <span>総パスワード数:</span>
                        <span>${this.heatmapData.totalPasswords.toLocaleString()}</span>
                    </div>
                    <div class="heatmap-stat-item">
                        <span>ユニークパスワード数:</span>
                        <span>${this.heatmapData.uniquePasswords.toLocaleString()}</span>
                    </div>
                    <div class="heatmap-stat-item">
                        <span>最も多い長さ:</span>
                        <span>${this.heatmapData.mostCommonLength}文字 (${this.heatmapData.mostCommonLengthCount.toLocaleString()}個)</span>
                    </div>
                    <div class="heatmap-stat-item">
                        <span>最頻出の頻度帯:</span>
                        <span>${this.heatmapData.mostCommonFreqRange}</span>
                    </div>
                    <div class="heatmap-stat-item">
                        <span>分析対象範囲:</span>
                        <span>${this.heatmapData.minLength}〜${this.heatmapData.maxLength}文字</span>
                    </div>
                </div>
            </div>
        `;
    }

    // ヒートマップグリッドを生成
    _generateHeatmapGrid(isDarkMode) {
        let html = '';
        
        // 全セルの合計を計算
        let totalCells = 0;
        this.heatmapData.matrix.forEach(row => {
            row.forEach(count => {
                totalCells += count;
            });
        });
        
        // マトリクスを逆順にして表示
        const reversedMatrix = [...this.heatmapData.matrix].reverse();
        const reversedLengths = [...this.heatmapData.lengths].reverse();
        
        reversedMatrix.forEach((row, i) => {
            html += '<div class="heatmap-row">';
            row.forEach((count, j) => {
                const color = this._getHeatmapColor(count, this.heatmapData.maxCount, isDarkMode);
                const percentage = totalCells > 0 ? ((count / totalCells) * 100).toFixed(2) : 0;
                const opacity = count === 0 ? '0.3' : '1';
                html += `
                    <div class="heatmap-cell" 
                         style="background-color: ${color}; opacity: ${opacity};"
                         data-length="${reversedLengths[i]}"
                         data-freq="${this.heatmapData.frequencyRanges[j].label}"
                         data-count="${count}"
                         data-percentage="${percentage}">
                    </div>
                `;
            });
            html += '</div>';
        });
        
        return html;
    }

    // ヒートマップの色を取得
    _getHeatmapColor(value, maxValue, isDarkMode) {
        if (value === 0) {
            return isDarkMode ? '#2a2a2a' : '#e0e0e0';
        }
        
        const ratio = value / maxValue;
        
        if (isDarkMode) {
            // ダークモード: 青→シアン→マゼンタ→赤
            if (ratio < 0.25) {
                const r = 0;
                const g = Math.floor(ratio * 4 * 255);
                const b = 255;
                return `rgb(${r}, ${g}, ${b})`;
            } else if (ratio < 0.5) {
                const r = Math.floor((ratio - 0.25) * 4 * 255);
                const g = 255;
                const b = 255 - Math.floor((ratio - 0.25) * 4 * 255);
                return `rgb(${r}, ${g}, ${b})`;
            } else if (ratio < 0.75) {
                const r = 255;
                const g = 255 - Math.floor((ratio - 0.5) * 4 * 255);
                const b = Math.floor((ratio - 0.5) * 4 * 255);
                return `rgb(${r}, ${g}, ${b})`;
            } else {
                const r = 255;
                const g = 0;
                const b = 255 - Math.floor((ratio - 0.75) * 4 * 255);
                return `rgb(${r}, ${g}, ${b})`;
            }
        } else {
            // ライトモード: 青→緑→黄→赤
            if (ratio < 0.25) {
                const r = 0;
                const g = Math.floor(ratio * 4 * 128);
                const b = 255 - Math.floor(ratio * 4 * 127);
                return `rgb(${r}, ${g}, ${b})`;
            } else if (ratio < 0.5) {
                const r = Math.floor((ratio - 0.25) * 4 * 255);
                const g = 128 + Math.floor((ratio - 0.25) * 4 * 127);
                const b = 128 - Math.floor((ratio - 0.25) * 4 * 128);
                return `rgb(${r}, ${g}, ${b})`;
            } else if (ratio < 0.75) {
                const r = 255;
                const g = 255 - Math.floor((ratio - 0.5) * 4 * 127);
                const b = 0;
                return `rgb(${r}, ${g}, ${b})`;
            } else {
                const r = 255 - Math.floor((ratio - 0.75) * 4 * 55);
                const g = 128 - Math.floor((ratio - 0.75) * 4 * 128);
                const b = 0;
                return `rgb(${r}, ${g}, ${b})`;
            }
        }
    }

    // レジェンドのグラデーションを取得
    _getLegendGradient(isDarkMode) {
        if (isDarkMode) {
            return 'linear-gradient(to bottom, #ff0000, #ff00ff, #00ffff, #0000ff, #1a1a1a)';
        } else {
            return 'linear-gradient(to bottom, #cc0000, #ff0000, #ffff00, #00ff00, #0000ff, #f5f5f5)';
        }
    }

    // ヒートマップのツールチップを追加
    _addHeatmapTooltips() {
        const cells = document.querySelectorAll('.heatmap-cell');
        const tooltip = document.createElement('div');
        tooltip.className = 'heatmap-tooltip';
        document.body.appendChild(tooltip);
        
        cells.forEach(cell => {
            cell.addEventListener('mouseenter', (e) => {
                const length = e.target.dataset.length;
                const freq = e.target.dataset.freq;
                const count = e.target.dataset.count;
                const percentage = e.target.dataset.percentage;
                
                if (count > 0) {
                    tooltip.innerHTML = `
                        <strong>${length}文字のパスワード</strong><br>
                        出現頻度: ${freq}回<br>
                        該当数: ${count}種類<br>
                        全体に占める割合: ${percentage}%
                    `;
                    tooltip.style.display = 'block';
                }
            });
            
            cell.addEventListener('mousemove', (e) => {
                const tooltipRect = tooltip.getBoundingClientRect();
                const windowWidth = window.innerWidth;
                const windowHeight = window.innerHeight;
                
                let left = e.pageX + 10;
                let top = e.pageY + 10;
                
                // 画面端での調整
                if (left + tooltipRect.width > windowWidth) {
                    left = e.pageX - tooltipRect.width - 10;
                }
                
                if (top + tooltipRect.height > windowHeight) {
                    top = e.pageY - tooltipRect.height - 10;
                }
                
                tooltip.style.left = left + 'px';
                tooltip.style.top = top + 'px';
            });
            
            cell.addEventListener('mouseleave', () => {
                tooltip.style.display = 'none';
            });
        });
    }

    // データ更新
    updateData(wordList, originalLineCount) {
        this.wordList = wordList;
        this.originalLineCount = originalLineCount;
        this.heatmapData = null;
    }

    // 再描画
    redraw() {
        if (this.wordList.length > 0) {
            this.draw();
        }
    }

    // クリーンアップ
    cleanup() {
        const existingTooltip = document.querySelector('.heatmap-tooltip');
        if (existingTooltip) {
            existingTooltip.remove();
        }
    }
}