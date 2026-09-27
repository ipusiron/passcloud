// ヒートマップ分析モジュール
class HeatmapAnalysis {
    constructor(wordList, originalLineCount) {
        this.wordList = wordList;
        this.originalLineCount = originalLineCount;
        this.heatmapData = null;
    }

    // ヒートマップを描画
    draw() {
        const panel = document.getElementById('heatmapView');
        PassCloudUtils.showNoData(panel, this.wordList.length === 0);
        
        if (this.wordList.length === 0) {
            return;
        }
        
        // ヒートマップデータを計算
        this.heatmapData = this._calculateHeatmapData();
        
        // HTMLを生成
        const html = this._generateHTML();
        const content = panel.querySelector('.view-content');
        content.innerHTML = html;
        const dark = PassCloudUtils.isDarkMode();
        content.querySelectorAll('.heatmap-cell').forEach(cell => {
            cell.style.backgroundColor = this._getHeatmapColor(Number(cell.dataset.count), this.heatmapData.maxCount, dark);
        });
        const gradient = content.querySelector('.legend-gradient');
        if (gradient) gradient.style.background = this._getLegendGradient(dark);
        
        // ツールチップのイベントリスナーを追加
        this._addHeatmapTooltips();
    }

    // 集計はDOM非依存のモジュールで行う。
    _calculateHeatmapData() {
        return PassCloudHeatmap.calculateHeatmapData(this.wordList, this.originalLineCount);
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
                    ${this.heatmapData.lengths.length ? this._generateMainContent(isDarkMode) : '<p>表示できる長さの語がありません。</p>'}
                    ${this._generateLegend(isDarkMode)}
                </div>
                ${this._generateSummary()}
            </div>
        `;
    }

    // メインコンテンツを生成
    _generateMainContent(isDarkMode) {
        return `
            <div class="heatmap-main" tabindex="0" aria-label="長さと出現頻度の表。横スクロールできます">
                <table class="heatmap-grid" aria-label="長さ別、出現頻度帯別のユニークパスワード数">
                    <thead><tr>
                        <th scope="col">長さ</th>
                        ${this.heatmapData.frequencyRanges.map(range => `<th scope="col">${range.label}</th>`).join('')}
                    </tr></thead>
                    <tbody>${this._generateHeatmapGrid(isDarkMode)}</tbody>
                </table>
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
                    <div class="legend-gradient"></div>
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
                    ${this.heatmapData.excludedUnique > 0
                        ? `<p>21文字以上: ${this.heatmapData.excludedUnique}種類・延べ${this.heatmapData.excludedOccurrences}回（表示対象外）</p>`
                        : ''}
                    <h3>📊 分析サマリー</h3>
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
            html += `<tr><th scope="row">${reversedLengths[i]}文字</th>`;
            row.forEach((count, j) => {
                const percentage = totalCells > 0 ? ((count / totalCells) * 100).toFixed(2) : 0;
                html += `
                    <td class="heatmap-cell" tabindex="0"
                         aria-label="${reversedLengths[i]}文字、頻度${this.heatmapData.frequencyRanges[j].label}回、${count}種類"
                         data-length="${reversedLengths[i]}"
                         data-freq="${this.heatmapData.frequencyRanges[j].label}"
                         data-count="${count}"
                         data-percentage="${percentage}">
                        <span class="heatmap-count">${count}</span>
                    </td>
                `;
            });
            html += '</tr>';
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
        const tooltip = document.querySelector('.heatmap-tooltip') || document.createElement('div');
        tooltip.className = 'heatmap-tooltip';
        document.body.appendChild(tooltip);
        
        cells.forEach(cell => {
            cell.addEventListener('mouseenter', (e) => {
                const length = e.target.dataset.length;
                const freq = e.target.dataset.freq;
                const count = e.target.dataset.count;
                const percentage = e.target.dataset.percentage;
                
                if (Number(count) > 0) {
                    tooltip.textContent = `${length}文字のパスワード／出現頻度: ${freq}回／該当数: ${count}種類／割合: ${percentage}%`;
                    tooltip.style.display = 'block';
                }
            });
            
            cell.addEventListener('focus', () => {
                tooltip.textContent = cell.getAttribute('aria-label');
                tooltip.style.display = 'block';
                const rect = cell.getBoundingClientRect();
                tooltip.style.left = Math.max(0, rect.left) + 'px';
                tooltip.style.top = (rect.bottom + window.scrollY + 5) + 'px';
            });
            cell.addEventListener('blur', () => { tooltip.style.display = 'none'; });
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
        document.querySelectorAll('.heatmap-tooltip').forEach(tooltip => tooltip.remove());
    }
}
