// ヒートマップ分析モジュール
class HeatmapAnalysis {
    constructor(wordList, originalLineCount) {
        this.wordList = wordList;
        this.originalLineCount = originalLineCount;
        this.heatmapData = null;
        // 表示中のツールチップ。訳文ではなく種別と値を覚える。
        this.tooltipState = null;
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
                <h2>${I18n.t('heatmap.heading')}</h2>
                <p class="heatmap-description">
                    ${I18n.t('heatmap.desc1')}<br>
                    ${I18n.t('heatmap.desc2')}
                </p>
                
                <div class="heatmap-wrapper">
                    ${this.heatmapData.lengths.length
                        ? this._generateMainContent(isDarkMode)
                        : `<p>${I18n.t('heatmap.empty')}</p>`}
                    ${this._generateLegend(isDarkMode)}
                </div>
                ${this._generateSummary()}
            </div>
        `;
    }

    // メインコンテンツを生成
    _generateMainContent(isDarkMode) {
        return `
            <div class="heatmap-main" tabindex="0" aria-label="${I18n.t('heatmap.mainAria')}">
                <table class="heatmap-grid" aria-label="${I18n.t('heatmap.gridAria')}">
                    <thead><tr>
                        <th scope="col">${I18n.t('heatmap.colLength')}</th>
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
                <div class="legend-title">${I18n.t('heatmap.legendTitle1')}<br>${I18n.t('heatmap.legendTitle2')}</div>
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
                        ? `<p>${I18n.t('heatmap.excluded', { unique: this.heatmapData.excludedUnique,
                            occurrences: this.heatmapData.excludedOccurrences })}</p>`
                        : ''}
                    <h3>${I18n.t('heatmap.summaryHeading')}</h3>
                    <div class="heatmap-stat-item">
                        <span>${I18n.t('heatmap.totalLabel')}</span>
                        <span>${this.heatmapData.totalPasswords.toLocaleString()}</span>
                    </div>
                    <div class="heatmap-stat-item">
                        <span>${I18n.t('heatmap.uniqueLabel')}</span>
                        <span>${this.heatmapData.uniquePasswords.toLocaleString()}</span>
                    </div>
                    <div class="heatmap-stat-item">
                        <span>${I18n.t('heatmap.commonLengthLabel')}</span>
                        <span>${I18n.t('heatmap.commonLengthValue',
                            { length: this.heatmapData.mostCommonLength,
                                count: this.heatmapData.mostCommonLengthCount.toLocaleString() })}</span>
                    </div>
                    <div class="heatmap-stat-item">
                        <span>${I18n.t('heatmap.commonBandLabel')}</span>
                        <span>${this.heatmapData.mostCommonFreqRange}</span>
                    </div>
                    <div class="heatmap-stat-item">
                        <span>${I18n.t('heatmap.rangeLabel')}</span>
                        <span>${I18n.t('heatmap.rangeValue', { min: this.heatmapData.minLength,
                            max: this.heatmapData.maxLength })}</span>
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
            html += `<tr><th scope="row">${I18n.t('heatmap.rowLength',
                { length: reversedLengths[i] })}</th>`;
            row.forEach((count, j) => {
                const percentage = totalCells > 0 ? ((count / totalCells) * 100).toFixed(2) : 0;
                html += `
                    <td class="heatmap-cell" tabindex="0"
                         aria-label="${I18n.t('heatmap.cellAria', { length: reversedLengths[i],
                             freq: this.heatmapData.frequencyRanges[j].label, count })}"
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
                    this._rememberTooltip('hover', { length, freq, count, percentage });
                    tooltip.style.display = 'block';
                }
            });
            
            cell.addEventListener('focus', () => {
                this._rememberTooltip('cell', { length: cell.dataset.length,
                    freq: cell.dataset.freq, count: cell.dataset.count });
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

    // ツールチップは body 直下にあり、セルを作り直しても
    // 差し替わらない。訳文ではなく種別と値を覚えておき、
    // 言語を切り替えたら renderTooltip() が訳し直す。
    _rememberTooltip(kind, values) {
        this.tooltipState = { kind, values };
        this.renderTooltip();
    }

    renderTooltip() {
        const tooltip = document.querySelector('.heatmap-tooltip');
        const state = this.tooltipState;
        if (!tooltip || !state) return;
        tooltip.textContent = state.kind === 'cell'
            ? I18n.t('heatmap.cellAria', state.values)
            : I18n.t('heatmap.tooltip', state.values);
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
