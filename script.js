let currentFile = null;
let wordList = [];

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
    
    const stemMode = document.getElementById('stemMode').checked;
    const freqMap = {};

    for (let line of lines) {
        let word = line.trim().toLowerCase();
        if (stemMode) {
            word = normalize(word);
        }
        freqMap[word] = (freqMap[word] || 0) + 1;
    }

    wordList = Object.entries(freqMap).map(([word, count]) => [word, count]);
    console.log('Created wordList with', wordList.length, 'unique words');
    const sortedList = [...wordList].sort((a, b) => b[1] - a[1]);
    console.log('Top 5 words:', sortedList.slice(0, 5));
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
        console.log('Calling WordCloud with', wordList.length, 'words');
        // Sort wordList by frequency (descending) for better placement
        const sortedWordList = [...wordList].sort((a, b) => b[1] - a[1]);
        
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
    `;
    
    panel.innerHTML = html;
}

function drawHeatmap() {
    document.querySelectorAll('.viewPanel').forEach(p => p.style.display = 'none');
    const panel = document.getElementById('heatmapView');
    panel.style.display = 'block';
    panel.innerHTML = "<p>🔥 ヒートマップ（未実装）</p>";
}

function drawPartial() {
    document.querySelectorAll('.viewPanel').forEach(p => p.style.display = 'none');
    const panel = document.getElementById('partialView');
    panel.style.display = 'block';
    panel.innerHTML = "<p>🧩 部分一致ワードクラウド（未実装）</p>";
}

function switchView(mode) {
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
    const totalPasswords = wordList.reduce((sum, [_, count]) => sum + count, 0);
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
        totalLength += len * count;
        minLength = Math.min(minLength, len);
        maxLength = Math.max(maxLength, len);
        
        // 長さ別カウント
        if (!lengthMap[len]) lengthMap[len] = 0;
        lengthMap[len] += count;
        
        // 文字種別判定
        const hasNumeric = /\d/.test(password);
        const hasAlpha = /[a-zA-Z]/.test(password);
        const hasSpecial = /[^a-zA-Z0-9]/.test(password);
        
        if (hasNumeric && !hasAlpha && !hasSpecial) numericOnly += count;
        else if (hasAlpha && !hasNumeric && !hasSpecial) alphaOnly += count;
        else if (hasAlpha && hasNumeric && !hasSpecial) alphaNumeric += count;
        else if (hasSpecial) withSpecial += count;
        
        // パターン判定
        if (hasSequentialPattern(password)) sequential += count;
        if (hasKeyboardPattern(password)) keyboard += count;
        if (hasYearPattern(password)) years += count;
    });
    
    // Top 10
    const top10 = wordList
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([password, count]) => ({
            password,
            count,
            percentage: ((count / totalPasswords) * 100).toFixed(2)
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