// 統計情報分析モジュール
class StatsAnalysis {
    constructor(wordList, originalLineCount) {
        this.wordList = wordList;
        this.originalLineCount = originalLineCount;
        this.stats = null;
    }

    // 統計情報を描画
    draw() {
        document.querySelectorAll('.viewPanel').forEach(p => p.style.display = 'none');
        const panel = document.getElementById('statsView');
        panel.style.display = 'block';
        
        if (this.wordList.length === 0) {
            panel.innerHTML = '<p style="text-align: center; margin-top: 50px;">データがありません。ファイルを選択して分析を実行してください。</p>';
            return;
        }
        
        // 統計データを計算
        this.stats = this._calculateStatistics();
        
        // HTMLを生成
        const html = this._generateHTML();
        panel.innerHTML = html;
    }

    // 統計情報を計算
    _calculateStatistics() {
        const totalPasswords = this.originalLineCount;
        const uniquePasswords = this.wordList.length;
        
        // 長さ統計
        let totalLength = 0;
        let minLength = Infinity;
        let maxLength = 0;
        const lengthMap = {};
        
        // 文字種別統計
        let numericOnly = 0;
        let alphaOnly = 0;
        let alphaNumeric = 0;
        let withSpecial = 0;
        
        // パターン統計
        let sequential = 0;
        let keyboard = 0;
        let years = 0;
        
        this.wordList.forEach(([password, count]) => {
            const len = password.length;
            const intCount = Math.floor(count);
            totalLength += len * intCount;
            minLength = Math.min(minLength, len);
            maxLength = Math.max(maxLength, len);
            
            // 長さ別カウント
            if (!lengthMap[len]) lengthMap[len] = 0;
            lengthMap[len] += intCount;
            
            // 文字種別判定
            const hasNumeric = /\d/.test(password);
            const hasAlpha = /[a-zA-Z]/.test(password);
            const hasSpecial = /[^a-zA-Z0-9]/.test(password);
            
            if (hasNumeric && !hasAlpha && !hasSpecial) numericOnly += intCount;
            else if (hasAlpha && !hasNumeric && !hasSpecial) alphaOnly += intCount;
            else if (hasAlpha && hasNumeric && !hasSpecial) alphaNumeric += intCount;
            else if (hasSpecial) withSpecial += intCount;
            
            // パターン判定
            if (PassCloudUtils.hasSequentialPattern(password)) sequential += intCount;
            if (PassCloudUtils.hasKeyboardPattern(password)) keyboard += intCount;
            if (PassCloudUtils.hasYearPattern(password)) years += intCount;
        });
        
        // Top 10
        const top10 = this.wordList
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([password, count]) => ({
                password,
                count: Math.floor(count),
                percentage: ((Math.floor(count) / totalPasswords) * 100).toFixed(2)
            }));
        
        // 長さ分布
        const lengthDistribution = Object.entries(lengthMap)
            .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
            .map(([length, count]) => ({
                length: parseInt(length),
                count,
                percentage: ((count / totalPasswords) * 100).toFixed(1)
            }));
        
        return {
            totalPasswords,
            uniquePasswords,
            duplicateRate: (((totalPasswords - uniquePasswords) / totalPasswords) * 100).toFixed(1),
            avgLength: (totalLength / totalPasswords).toFixed(1),
            minLength,
            maxLength,
            numericOnly: ((numericOnly / totalPasswords) * 100).toFixed(1),
            alphaOnly: ((alphaOnly / totalPasswords) * 100).toFixed(1),
            alphaNumeric: ((alphaNumeric / totalPasswords) * 100).toFixed(1),
            withSpecial: ((withSpecial / totalPasswords) * 100).toFixed(1),
            top10,
            lengthDistribution,
            patterns: {
                sequential: ((sequential / totalPasswords) * 100).toFixed(1),
                keyboard: ((keyboard / totalPasswords) * 100).toFixed(1),
                years: ((years / totalPasswords) * 100).toFixed(1)
            }
        };
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
                    <table>
                        <thead>
                            <tr>
                                <th>順位</th>
                                <th>パスワード</th>
                                <th>出現回数</th>
                                <th>割合</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.stats.top10.map((item, index) => `
                                <tr>
                                    <td class="rank">${index + 1}</td>
                                    <td class="password">${PassCloudUtils.escapeHtml(item.password)}</td>
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
                                <div class="dist-bar" style="width: ${item.percentage}%; background: ${PassCloudUtils.getBarColor(item.percentage, isDarkMode)}"></div>
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