let currentFile = null;
let wordList = [];
let originalLineCount = 0; // 元のファイルの行数を保持

// Dark mode functionality
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
    
    // Redraw word cloud if it exists
    if (wordList.length > 0 && document.querySelector("#tabs button.active").dataset.tab === "cloud") {
        drawWordCloud();
    }
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('.theme-icon');
    icon.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function updateFileInfo(name) {
    document.getElementById("fileInfo").textContent = `📄 読み込み対象: ${name}`;
}

// Initialize theme on page load
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    
    // Set up file input handlers
    document.getElementById("dropZone").addEventListener("click", () => {
        document.getElementById("fileInput").click();
    });

    document.getElementById("fileInput").addEventListener("change", (e) => {
        currentFile = e.target.files[0];
        updateFileInfo(currentFile.name);
    });

    const dropZone = document.getElementById("dropZone");
    dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("dragover");
    });
    dropZone.addEventListener("dragleave", () => {
        dropZone.classList.remove("dragover");
    });
    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("dragover");
        currentFile = e.dataTransfer.files[0];
        updateFileInfo(currentFile.name);
    });
    
    // 語幹推定モードの変更時にワードクラウドを再描画
    document.getElementById('stemMode').addEventListener('change', () => {
        if (wordList.length > 0 && document.querySelector("#tabs button.active").dataset.tab === "cloud") {
            drawWordCloud();
        }
    });
    
    // Check if WordCloud is loaded
    setTimeout(function() {
        if (typeof WordCloud === 'undefined') {
            console.error('WordCloud library not loaded!');
            console.log('Checking alternative names...');
            if (typeof wordcloud !== 'undefined') {
                window.WordCloud = wordcloud;
                console.log('Found wordcloud, aliasing to WordCloud');
            } else {
                alert('WordCloudライブラリが読み込まれていません。ページを再読み込みしてください。');
            }
        } else {
            console.log('WordCloud library loaded successfully');
        }
    }, 1000);
});

function analyze() {
    if (!currentFile) {
        alert("ファイルが選択されていません。");
        return;
    }

    showLoading("ファイル読み込み中…");

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        showLoading("分析中…");
        processText(text);

        const activeMode = document.querySelector("#tabs button.active").dataset.tab;
        
        // Wait for DOM update before drawing
        setTimeout(() => {
            if (activeMode === "cloud") {
                drawWordCloud();
            } else if (activeMode === "stats") {
                drawStats();
            } else if (activeMode === "heatmap") {
                drawHeatmap();
            } else if (activeMode === "partial") {
                drawPartial();
            }
            hideLoading();
        }, 100);
    };
    reader.readAsText(currentFile);
}

function processText(text) {
    console.log('Processing text, length:', text.length);
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== "");
    console.log('Found', lines.length, 'lines');
    
    // 元のファイルの行数を保存
    originalLineCount = lines.length;
    
    const freqMap = {};

    for (let line of lines) {
        let word = line.trim().toLowerCase();
        freqMap[word] = (freqMap[word] || 0) + 1;
    }

    // 語幹推定を適用しない生データを保存
    wordList = Object.entries(freqMap).map(([word, count]) => [word, count]);
    console.log('Created wordList with', wordList.length, 'unique words');
    const sortedList = [...wordList].sort((a, b) => b[1] - a[1]);
    console.log('Top 5 words:', sortedList.slice(0, 5));
    
    // パスワードの長さ分布を確認
    const lengthDistribution = {};
    wordList.forEach(([word, count]) => {
        const len = word.length;
        if (!lengthDistribution[len]) {
            lengthDistribution[len] = 0;
        }
        lengthDistribution[len] += count;
    });
    console.log('Length distribution:', lengthDistribution);
}

function normalize(word) {
    return word.replace(/[^a-z]/gi, '').replace(/[0-9]+$/, '');
}

function drawWordCloud() {
    console.log('drawWordCloud called, wordList length:', wordList.length);
    
    if (wordList.length === 0) {
        console.log('No data to display');
        return;
    }
    
    document.querySelectorAll('.viewPanel').forEach(p => p.style.display = 'none');
    document.getElementById('cloudView').style.display = 'block';

    const canvas = document.getElementById('cloudCanvas');
    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }
    
    // 高解像度ディスプレイ対応
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    if (rect.width === 0 || rect.height === 0) {
        console.error('Canvas has zero size!');
        setTimeout(() => drawWordCloud(), 100);
        return;
    }
    
    // Canvas のサイズを設定（高解像度対応）
    const scale = window.devicePixelRatio || 1;
    canvas.width = rect.width * scale;
    canvas.height = rect.height * scale;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    
    // スケールを適用
    ctx.scale(scale, scale);
    
    // テキストレンダリングの品質向上
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    
    // アンチエイリアシングを有効化
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    console.log('Canvas size:', canvas.width, 'x', canvas.height, 'Scale:', scale);
    
    try {
        // 語幹推定モードのチェック
        const stemMode = document.getElementById('stemMode').checked;
        let displayWordList = wordList;
        
        if (stemMode) {
            // 語幹推定を適用したリストを作成
            const stemmedFreqMap = {};
            wordList.forEach(([word, count]) => {
                const stemmedWord = normalize(word);
                stemmedFreqMap[stemmedWord] = (stemmedFreqMap[stemmedWord] || 0) + count;
            });
            displayWordList = Object.entries(stemmedFreqMap).map(([word, count]) => [word, count]);
            console.log('Applied stemming, new list length:', displayWordList.length);
        }
        
        console.log('Calling WordCloud with', displayWordList.length, 'words');
        // Sort wordList by frequency (descending) for better placement
        const sortedWordList = [...displayWordList].sort((a, b) => b[1] - a[1]);
        
        const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
        
        // 改善されたカラーパレット（より鮮明な色）
        const colorSchemes = {
            dark: [
                '#00FFFF', '#FF1493', '#00FF7F', '#FFD700', '#FF69B4',
                '#00CED1', '#FF4500', '#ADFF2F', '#FF00FF', '#1E90FF',
                '#FFA500', '#32CD32', '#BA55D3', '#F0E68C', '#87CEEB'
            ],
            light: [
                '#000080', '#8B0000', '#006400', '#FF4500', '#4B0082',
                '#2F4F4F', '#DC143C', '#008B8B', '#9400D3', '#B22222',
                '#228B22', '#4682B4', '#D2691E', '#9932CC', '#8B4513'
            ]
        };
        
        // WordCloud オプション（改善版）
        const options = {
            list: sortedWordList,
            gridSize: 6,
            weightFactor: 5,
            fontFamily: '"Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif',
            fontWeight: 'bold',
            color: function(word, weight) {
                const colors = isDarkMode ? colorSchemes.dark : colorSchemes.light;
                // 重要度に応じて色を選択（上位の単語ほど配列の前の色を使用）
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
            hover: function(item, dimension, event) {
                if (item) {
                    canvas.style.cursor = 'pointer';
                    canvas.title = `${item[0]}: ${item[1]}回`;
                } else {
                    canvas.style.cursor = 'default';
                    canvas.title = '';
                }
            },
            click: function(item, dimension, event) {
                if (item) {
                    console.log('Password:', item[0], 'Count:', item[1]);
                }
            }
        };
        
        console.log('WordCloud options:', options);
        
        // 背景をクリア＆設定
        if (isDarkMode) {
            ctx.fillStyle = '#1a1a1a';
        } else {
            ctx.fillStyle = '#fafafa';
        }
        ctx.fillRect(0, 0, rect.width, rect.height);
        
        // サブトルなグリッドパターンを追加
        ctx.strokeStyle = isDarkMode ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)';
        ctx.lineWidth = 1;
        const gridSize = 50;
        
        // 垂直線
        for (let x = 0; x <= rect.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, rect.height);
            ctx.stroke();
        }
        
        // 水平線
        for (let y = 0; y <= rect.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(rect.width, y);
            ctx.stroke();
        }
        
        // Call WordCloud
        WordCloud(canvas, options);
        
        console.log('WordCloud called successfully');
    } catch (error) {
        console.error('WordCloud error:', error);
        ctx.fillStyle = '#ff0000';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('エラー: ' + error.message, rect.width / 2, rect.height / 2);
    }
}

function drawStats() {
    document.querySelectorAll('.viewPanel').forEach(p => p.style.display = 'none');
    const panel = document.getElementById('statsView');
    panel.style.display = 'block';
    
    if (wordList.length === 0) {
        panel.innerHTML = '<p style="text-align: center; margin-top: 50px;">データがありません。ファイルを選択して分析を実行してください。</p>';
        return;
    }
    
    // 統計データを計算
    const stats = calculateStatistics();
    
    // HTMLを生成
    const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
    const html = `
        <div class="stats-container">
            <h2>📊 パスワード統計情報</h2>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>基本統計</h3>
                    <div class="stat-item">
                        <span class="stat-label">総パスワード数:</span>
                        <span class="stat-value">${stats.totalPasswords.toLocaleString()}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">ユニークパスワード数:</span>
                        <span class="stat-value">${stats.uniquePasswords.toLocaleString()}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">重複率:</span>
                        <span class="stat-value">${stats.duplicateRate}%</span>
                    </div>
                </div>
                
                <div class="stat-card">
                    <h3>長さ統計</h3>
                    <div class="stat-item">
                        <span class="stat-label">平均長:</span>
                        <span class="stat-value">${stats.avgLength}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">最短:</span>
                        <span class="stat-value">${stats.minLength} 文字</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">最長:</span>
                        <span class="stat-value">${stats.maxLength} 文字</span>
                    </div>
                </div>
                
                <div class="stat-card">
                    <h3>文字種別</h3>
                    <div class="stat-item">
                        <span class="stat-label">数字のみ:</span>
                        <span class="stat-value">${stats.numericOnly}%</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">英字のみ:</span>
                        <span class="stat-value">${stats.alphaOnly}%</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">英数字混在:</span>
                        <span class="stat-value">${stats.alphaNumeric}%</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">特殊文字含む:</span>
                        <span class="stat-value">${stats.withSpecial}%</span>
                    </div>
                </div>
            </div>
            
            <div class="stats-wrapper">
            
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
                            ${stats.top10.map((item, index) => `
                                <tr>
                                    <td class="rank">${index + 1}</td>
                                    <td class="password">${escapeHtml(item.password)}</td>
                                    <td class="count">${item.count.toLocaleString()}</td>
                                    <td class="percentage">${item.percentage}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="stats-section">
                <h3>📏 長さ別分布</h3>
                <div class="length-distribution">
                    ${stats.lengthDistribution.map(item => `
                        <div class="dist-row">
                            <span class="dist-label">${item.length}文字:</span>
                            <div class="dist-bar-container">
                                <div class="dist-bar" style="width: ${item.percentage}%; background: ${getBarColor(item.percentage, isDarkMode)}"></div>
                            </div>
                            <span class="dist-value">${item.count} (${item.percentage}%)</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="stats-section">
                <h3>🔍 パターン分析</h3>
                <div class="pattern-analysis">
                    <div class="pattern-item">
                        <span class="pattern-label">連続数字 (123, 111等):</span>
                        <span class="pattern-value">${stats.patterns.sequential}%</span>
                    </div>
                    <div class="pattern-item">
                        <span class="pattern-label">キーボード配列 (qwerty等):</span>
                        <span class="pattern-value">${stats.patterns.keyboard}%</span>
                    </div>
                    <div class="pattern-item">
                        <span class="pattern-label">年号含む (2023, 1990等):</span>
                        <span class="pattern-value">${stats.patterns.years}%</span>
                    </div>
                </div>
            </div>
                </div>
            </div>
        </div>
    `;
    
    panel.innerHTML = html;
}

function drawHeatmap() {
    document.querySelectorAll('.viewPanel').forEach(p => p.style.display = 'none');
    const panel = document.getElementById('heatmapView');
    panel.style.display = 'block';
    
    if (wordList.length === 0) {
        panel.innerHTML = '<p style="text-align: center; margin-top: 50px;">データがありません。ファイルを選択して分析を実行してください。</p>';
        return;
    }
    
    // ヒートマップデータを計算
    const heatmapData = calculateHeatmapData();
    
    // デバッグ情報
    console.log('Heatmap Data:', {
        totalPasswords: heatmapData.totalPasswords,
        uniquePasswords: heatmapData.uniquePasswords,
        maxCount: heatmapData.maxCount,
        lengths: heatmapData.lengths,
        minLength: heatmapData.minLength,
        maxLength: heatmapData.maxLength,
        mostCommonLength: heatmapData.mostCommonLength,
        mostCommonLengthCount: heatmapData.mostCommonLengthCount,
        matrix: heatmapData.matrix
    });
    
    // HTMLを生成
    const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
    const html = `
        <div class="heatmap-container">
            <h2>🔥 長さ×頻度ヒートマップ</h2>
            <p class="heatmap-description">
                パスワードの長さと出現頻度の関係を可視化します。<br>
                色が濃いほど、その長さ・頻度の組み合わせに該当するユニークなパスワードが多いことを示します。
            </p>
            
            <div class="heatmap-wrapper">
                <div class="heatmap-y-axis">
                    <div class="y-axis-label">パスワードの長さ（文字数）</div>
                    <div class="y-axis-values-wrapper">
                        <div class="y-axis-values">
                            ${heatmapData.lengths.slice().reverse().map(len => `<div class="y-value">${len}</div>`).join('')}
                        </div>
                    </div>
                </div>
                
                <div class="heatmap-main">
                    <div class="heatmap-grid">
                        ${generateHeatmapGrid(heatmapData, isDarkMode)}
                    </div>
                    
                    <div class="heatmap-x-axis">
                        <div class="x-axis-values">
                            ${heatmapData.frequencyRanges.map(range => `<div class="x-value">${range.label}</div>`).join('')}
                        </div>
                        <div class="x-axis-label">出現頻度</div>
                    </div>
                </div>
                
                <div class="heatmap-legend">
                    <div class="legend-title">ユニーク<br>パスワード数</div>
                    <div class="legend-scale">
                        <div class="legend-max">${heatmapData.maxCount}</div>
                        <div class="legend-gradient" style="background: ${getLegendGradient(isDarkMode)}"></div>
                        <div class="legend-min">0</div>
                    </div>
                </div>
            </div>
                <div class="heatmap-summary-wrapper">
                    <div class="heatmap-stat-card">
                        <h4>📊 分析サマリー</h4>
                        <div class="heatmap-stat-item">
                            <span>総パスワード数:</span>
                            <span>${heatmapData.totalPasswords.toLocaleString()}</span>
                        </div>
                        <div class="heatmap-stat-item">
                            <span>ユニークパスワード数:</span>
                            <span>${heatmapData.uniquePasswords.toLocaleString()}</span>
                        </div>
                        <div class="heatmap-stat-item">
                            <span>最も多い長さ:</span>
                            <span>${heatmapData.mostCommonLength}文字 (${heatmapData.mostCommonLengthCount.toLocaleString()}個)</span>
                        </div>
                        <div class="heatmap-stat-item">
                            <span>最頻出の頻度帯:</span>
                            <span>${heatmapData.mostCommonFreqRange}</span>
                        </div>
                        <div class="heatmap-stat-item">
                            <span>分析対象範囲:</span>
                            <span>${heatmapData.minLength}〜${heatmapData.maxLength}文字</span>
                        </div>
                    </div>
                </div>
        </div>
    `;
    
    panel.innerHTML = html;
    
    // ツールチップのイベントリスナーを追加
    setTimeout(() => {
        addHeatmapTooltips();
    }, 100);
}

function drawPartial() {
    document.querySelectorAll('.viewPanel').forEach(p => p.style.display = 'none');
    const panel = document.getElementById('partialView');
    panel.style.display = 'block';
    panel.innerHTML = "<p>🧩 部分一致ワードクラウド（未実装）</p>";
}

function switchView(mode) {
    // 既存のツールチップを削除
    const existingTooltip = document.querySelector('.heatmap-tooltip');
    if (existingTooltip) {
        existingTooltip.remove();
    }
    
    document.querySelectorAll('.viewPanel').forEach(p => p.style.display = 'none');
    document.querySelectorAll('#tabs button').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`#tabs button[data-tab="${mode}"]`).classList.add('active');
    document.getElementById(mode + 'View').style.display = 'block';

    document.getElementById("stemOption").style.display = (mode === "cloud") ? "inline-block" : "none";

    // Only draw if we have data
    if (wordList.length > 0) {
        if (mode === 'cloud') {
            drawWordCloud();
        } else if (mode === 'stats') {
            drawStats();
        } else if (mode === 'heatmap') {
            drawHeatmap();
        } else if (mode === 'partial') {
            drawPartial();
        }
    }
}

function showLoading(message = "処理中です…") {
    const el = document.getElementById("loadingIndicator");
    el.textContent = "🔄 " + message;
    el.style.display = "block";
}

function hideLoading() {
    document.getElementById("loadingIndicator").style.display = "none";
}

// HTMLエスケープ関数
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// バーの色を取得
function getBarColor(percentage, isDarkMode) {
    if (isDarkMode) {
        if (percentage > 20) return '#ff1493';
        if (percentage > 10) return '#ffd700';
        if (percentage > 5) return '#00ffff';
        return '#00ff00';
    } else {
        if (percentage > 20) return '#dc143c';
        if (percentage > 10) return '#ff8c00';
        if (percentage > 5) return '#4682b4';
        return '#228b22';
    }
}

// 統計情報を計算
function calculateStatistics() {
    const totalPasswords = originalLineCount; // 元のファイルの行数を使用
    const uniquePasswords = wordList.length;
    
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
    
    wordList.forEach(([password, count]) => {
        const len = password.length;
        const intCount = Math.floor(count); // 整数に変換
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
        if (hasSequentialPattern(password)) sequential += intCount;
        if (hasKeyboardPattern(password)) keyboard += intCount;
        if (hasYearPattern(password)) years += intCount;
    });
    
    // Top 10
    const top10 = wordList
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

// パターン検出関数
function hasSequentialPattern(password) {
    const patterns = ['123', '234', '345', '456', '567', '678', '789', '890',
                     '111', '222', '333', '444', '555', '666', '777', '888', '999', '000',
                     'abc', 'bcd', 'cde', 'def', 'efg', 'fgh', 'ghi', 'hij', 'ijk',
                     'jkl', 'klm', 'lmn', 'mno', 'nop', 'opq', 'pqr', 'qrs', 'rst',
                     'stu', 'tuv', 'uvw', 'vwx', 'wxy', 'xyz'];
    return patterns.some(pattern => password.toLowerCase().includes(pattern));
}

function hasKeyboardPattern(password) {
    const patterns = ['qwerty', 'qwertz', 'azerty', 'qwer', 'asdf', 'zxcv',
                     'qaz', 'wsx', 'edc', 'rfv', 'tgb', 'yhn', 'ujm',
                     'wasd', 'asd', 'zxc'];
    return patterns.some(pattern => password.toLowerCase().includes(pattern));
}

function hasYearPattern(password) {
    // 1900-2099の年号を検出
    return /19\d{2}|20\d{2}/.test(password);
}

// ヒートマップデータを計算
function calculateHeatmapData() {
    // 長さと頻度のマップを作成
    const lengthFreqMap = {};
    let minLength = Infinity;
    let maxLength = 0;
    let maxFreq = 0;
    let totalPasswordCount = originalLineCount; // 元のファイルの行数を使用
    
    // データを収集
    wordList.forEach(([password, count]) => {
        const len = password.length;
        minLength = Math.min(minLength, len);
        maxLength = Math.max(maxLength, len);
        maxFreq = Math.max(maxFreq, count);
        
        if (!lengthFreqMap[len]) {
            lengthFreqMap[len] = {};
        }
        
        // 頻度帯を決定
        const freqBand = getFrequencyBand(count);
        if (!lengthFreqMap[len][freqBand]) {
            lengthFreqMap[len][freqBand] = 0;
        }
        // ここではユニークなパスワード数をカウント（出現回数ではなく）
        lengthFreqMap[len][freqBand]++;
    });
    
    // 頻度帯の定義（より細かく分割）
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
    
    // 表示する長さの範囲を作成（実データの最小値から最大20文字まで）
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
        
        // その長さの総パスワード数（ユニーク数）
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
    
    // 実際のパスワード総数を計算（その長さのパスワードの出現回数の合計）
    let actualMostCommonLengthCount = 0;
    wordList.forEach(([password, count]) => {
        if (password.length === mostCommonLength) {
            actualMostCommonLengthCount += Math.floor(count); // 整数に変換
        }
    });
    
    // デバッグ情報を詳細に出力
    console.log('Heatmap calculation details:', {
        minLength,
        maxLength,
        displayMinLength,
        displayMaxLength,
        lengthFreqMap,
        mostCommonLength,
        actualMostCommonLengthCount
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
        uniquePasswords: wordList.length
    };
}

// 頻度帯を決定
function getFrequencyBand(count) {
    if (count === 1) return '1-1';
    if (count <= 3) return '2-3';
    if (count <= 5) return '4-5';
    if (count <= 10) return '6-10';
    if (count <= 20) return '11-20';
    if (count <= 50) return '21-50';
    if (count <= 100) return '51-100';
    return '101-Infinity';
}

// ヒートマップグリッドを生成
function generateHeatmapGrid(data, isDarkMode) {
    let html = '';
    
    // 全セルの合計を計算
    let totalCells = 0;
    data.matrix.forEach(row => {
        row.forEach(count => {
            totalCells += count;
        });
    });
    
    // マトリクスを逆順にして表示（Y軸の表示順序に合わせる）
    const reversedMatrix = [...data.matrix].reverse();
    const reversedLengths = [...data.lengths].reverse();
    
    reversedMatrix.forEach((row, i) => {
        html += '<div class="heatmap-row">';
        row.forEach((count, j) => {
            const color = getHeatmapColor(count, data.maxCount, isDarkMode);
            const percentage = totalCells > 0 ? ((count / totalCells) * 100).toFixed(2) : 0;
            const opacity = count === 0 ? '0.3' : '1';
            html += `
                <div class="heatmap-cell" 
                     style="background-color: ${color}; opacity: ${opacity};"
                     data-length="${reversedLengths[i]}"
                     data-freq="${data.frequencyRanges[j].label}"
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
function getHeatmapColor(value, maxValue, isDarkMode) {
    if (value === 0) {
        return isDarkMode ? '#2a2a2a' : '#e0e0e0';
    }
    
    // 値を0-1の範囲に正規化
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
function getLegendGradient(isDarkMode) {
    if (isDarkMode) {
        return 'linear-gradient(to bottom, #ff0000, #ff00ff, #00ffff, #0000ff, #1a1a1a)';
    } else {
        return 'linear-gradient(to bottom, #cc0000, #ff0000, #ffff00, #00ff00, #0000ff, #f5f5f5)';
    }
}

// ヒートマップのツールチップを追加
function addHeatmapTooltips() {
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
            
            // 画面右端での調整
            if (left + tooltipRect.width > windowWidth) {
                left = e.pageX - tooltipRect.width - 10;
            }
            
            // 画面下端での調整
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