// 統計情報分析モジュール
class StatsAnalysis {
    constructor(wordList, originalLineCount) {
        this.wordList = wordList;
        this.originalLineCount = originalLineCount;
        this.stats = null;
    }

    // 統計情報を描画
    draw() {
        const panel = document.getElementById('statsView');
        PassCloudUtils.showNoData(panel, this.wordList.length === 0);
        
        if (this.wordList.length === 0) {
            return;
        }
        
        // 統計データを計算
        this.stats = this._calculateStatistics();
        
        // HTMLを生成
        const html = this._generateHTML();
        const content = panel.querySelector('.view-content');
        content.innerHTML = html;
        content.querySelectorAll('.password').forEach((cell, index) => {
            cell.textContent = PassCloudUtils.visibleText(this.stats.top10[index].password);
        });
        content.querySelectorAll('.dist-bar').forEach((bar, index) => {
            const percentage = this.stats.lengthDistribution[index].percentage;
            bar.style.width = percentage + '%';
            bar.style.backgroundColor = PassCloudUtils.getBarColor(percentage, PassCloudUtils.isDarkMode());
        });
    }

    // DOM非依存の集計を呼び出す。
    _calculateStatistics() {
        return PassCloudStats.calculateStatistics(this.wordList, this.originalLineCount);
    }

    // HTMLを生成
    _generateHTML() {
        const isDarkMode = PassCloudUtils.isDarkMode();
        
        return `
            <div class="stats-container">
                <h2>${I18n.t('stats.heading')}</h2>
                
                <div class="stats-grid">
                    ${this._generateBasicStatsCard()}
                    ${this._generateLengthStatsCard()}
                    ${this._generateCharTypeCard()}
                </div>
                
                <div class="stats-wrapper">
                    ${this._generateTop10Section()}
                    ${this._generateLengthDistributionSection(isDarkMode)}
                    ${this._generatePatternAnalysisSection()}
                </div>
            </div>
        `;
    }

    // 基本統計カード
    _generateBasicStatsCard() {
        return `
            <div class="stat-card">
                <h3>${I18n.t('stats.basicCard')}</h3>
                <div class="stat-item">
                    <span class="stat-label">${I18n.t('stats.totalLabel')}</span>
                    <span class="stat-value">${this.stats.totalPasswords.toLocaleString()}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">${I18n.t('stats.uniqueLabel')}</span>
                    <span class="stat-value">${this.stats.uniquePasswords.toLocaleString()}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">${I18n.t('stats.duplicateLabel')}</span>
                    <span class="stat-value">${this.stats.duplicateRate}%</span>
                </div>
            </div>
        `;
    }

    // 長さ統計カード
    _generateLengthStatsCard() {
        return `
            <div class="stat-card">
                <h3>${I18n.t('stats.lengthCard')}</h3>
                <div class="stat-item">
                    <span class="stat-label">${I18n.t('stats.avgLabel')}</span>
                    <span class="stat-value">${this.stats.avgLength}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">${I18n.t('stats.minLabel')}</span>
                    <span class="stat-value">${I18n.t('stats.chars',
                        { length: this.stats.minLength })}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">${I18n.t('stats.maxLabel')}</span>
                    <span class="stat-value">${I18n.t('stats.chars',
                        { length: this.stats.maxLength })}</span>
                </div>
            </div>
        `;
    }

    // 文字種別カード
    _generateCharTypeCard() {
        return `
            <div class="stat-card">
                <h3>${I18n.t('stats.charTypeCard')}</h3>
                <div class="stat-item">
                    <span class="stat-label">${I18n.t('stats.numericOnly')}</span>
                    <span class="stat-value">${this.stats.numericOnly}%</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">${I18n.t('stats.alphaOnly')}</span>
                    <span class="stat-value">${this.stats.alphaOnly}%</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">${I18n.t('stats.alphaNumeric')}</span>
                    <span class="stat-value">${this.stats.alphaNumeric}%</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">${I18n.t('stats.withSpecial')}</span>
                    <span class="stat-value">${this.stats.withSpecial}%</span>
                </div>
            </div>
        `;
    }

    // Top 10セクション
    _generateTop10Section() {
        return `
            <div class="stats-section">
                <h3>${I18n.t('stats.top10Heading')}</h3>
                <div class="top-passwords">
                    <table aria-label="${I18n.t('stats.top10Aria')}">
                        <thead>
                            <tr>
                                <th scope="col">${I18n.t('stats.colRank')}</th>
                                <th scope="col">${I18n.t('stats.colPassword')}</th>
                                <th scope="col">${I18n.t('stats.colCount')}</th>
                                <th scope="col">${I18n.t('stats.colShare')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.stats.top10.map((item, index) => `
                                <tr>
                                    <td class="rank">${index + 1}</td>
                                    <td class="password"></td>
                                    <td class="count">${item.count.toLocaleString()}</td>
                                    <td class="percentage">${item.percentage}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // 長さ分布セクション
    _generateLengthDistributionSection(isDarkMode) {
        return `
            <div class="stats-section">
                <h3>${I18n.t('stats.distHeading')}</h3>
                <div class="length-distribution">
                    ${this.stats.lengthDistribution.map(item => `
                        <div class="dist-row">
                            <span class="dist-label">${I18n.t('stats.distLabel',
                                { length: item.length })}</span>
                            <div class="dist-bar-container">
                                <div class="dist-bar"></div>
                            </div>
                            <span class="dist-value">${item.count} (${item.percentage}%)</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // パターン分析セクション
    _generatePatternAnalysisSection() {
        return `
            <div class="stats-section">
                <h3>${I18n.t('stats.patternHeading')}</h3>
                <div class="pattern-analysis">
                    <div class="pattern-item">
                        <span class="pattern-label">${I18n.t('stats.patternSequential')}</span>
                        <span class="pattern-value">${this.stats.patterns.sequential}%</span>
                    </div>
                    <div class="pattern-item">
                        <span class="pattern-label">${I18n.t('stats.patternKeyboard')}</span>
                        <span class="pattern-value">${this.stats.patterns.keyboard}%</span>
                    </div>
                    <div class="pattern-item">
                        <span class="pattern-label">${I18n.t('stats.patternYears')}</span>
                        <span class="pattern-value">${this.stats.patterns.years}%</span>
                    </div>
                </div>
            </div>
        `;
    }

    // データ更新
    updateData(wordList, originalLineCount) {
        this.wordList = wordList;
        this.originalLineCount = originalLineCount;
        this.stats = null;
    }

    // 再描画
    redraw() {
        if (this.wordList.length > 0) {
            this.draw();
        }
    }

    // 統計データを取得（外部アクセス用）
    getStats() {
        if (!this.stats) {
            this.stats = this._calculateStatistics();
        }
        return this.stats;
    }
}
