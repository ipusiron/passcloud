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
            cell.textContent = this.stats.top10[index].password;
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
                <h2>📊 パスワード統計情報</h2>
                
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
                <h3>基本統計</h3>
                <div class="stat-item">
                    <span class="stat-label">総パスワード数:</span>
                    <span class="stat-value">${this.stats.totalPasswords.toLocaleString()}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">ユニークパスワード数:</span>
                    <span class="stat-value">${this.stats.uniquePasswords.toLocaleString()}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">重複率:</span>
                    <span class="stat-value">${this.stats.duplicateRate}%</span>
                </div>
            </div>
        `;
    }

    // 長さ統計カード
    _generateLengthStatsCard() {
        return `
            <div class="stat-card">
                <h3>長さ統計</h3>
                <div class="stat-item">
                    <span class="stat-label">平均長:</span>
                    <span class="stat-value">${this.stats.avgLength}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">最短:</span>
                    <span class="stat-value">${this.stats.minLength} 文字</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">最長:</span>
                    <span class="stat-value">${this.stats.maxLength} 文字</span>
                </div>
            </div>
        `;
    }

    // 文字種別カード
    _generateCharTypeCard() {
        return `
            <div class="stat-card">
                <h3>文字種別</h3>
                <div class="stat-item">
                    <span class="stat-label">数字のみ:</span>
                    <span class="stat-value">${this.stats.numericOnly}%</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">英字のみ:</span>
                    <span class="stat-value">${this.stats.alphaOnly}%</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">英数字混在:</span>
                    <span class="stat-value">${this.stats.alphaNumeric}%</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">特殊文字含む:</span>
                    <span class="stat-value">${this.stats.withSpecial}%</span>
                </div>
            </div>
        `;
    }

    // Top 10セクション
    _generateTop10Section() {
        return `
            <div class="stats-section">
                <h3>🏆 Top 10 パスワード</h3>
                <div class="top-passwords">
                    <table aria-label="パスワード出現頻度上位10件">
                        <thead>
                            <tr>
                                <th scope="col">順位</th>
                                <th scope="col">パスワード</th>
                                <th scope="col">出現回数</th>
                                <th scope="col">割合</th>
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
                <h3>📏 長さ別分布</h3>
                <div class="length-distribution">
                    ${this.stats.lengthDistribution.map(item => `
                        <div class="dist-row">
                            <span class="dist-label">${item.length}文字:</span>
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
                <h3>🔍 パターン分析</h3>
                <div class="pattern-analysis">
                    <div class="pattern-item">
                        <span class="pattern-label">連続数字 (123, 111等):</span>
                        <span class="pattern-value">${this.stats.patterns.sequential}%</span>
                    </div>
                    <div class="pattern-item">
                        <span class="pattern-label">キーボード配列 (qwerty等):</span>
                        <span class="pattern-value">${this.stats.patterns.keyboard}%</span>
                    </div>
                    <div class="pattern-item">
                        <span class="pattern-label">年号含む (2023, 1990等):</span>
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
