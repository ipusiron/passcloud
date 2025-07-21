// メインアプリケーションクラス
class PassCloudApp {
    constructor() {
        this.currentFile = null;
        this.wordList = [];
        this.originalLineCount = 0;
        
        // 分析モジュールの初期化
        this.wordCloudAnalysis = null;
        this.partialAnalysis = null;
        this.statsAnalysis = null;
        this.heatmapAnalysis = null;
        
        this.init();
    }

    // アプリケーション初期化
    init() {
        this.initTheme();
        this.setupEventListeners();
        this.checkWordCloudLibrary();
    }

    // テーマ関連の初期化
    initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon(savedTheme);
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        this.updateThemeIcon(newTheme);
        
        // 現在のビューを再描画
        this.redrawCurrentView();
    }

    updateThemeIcon(theme) {
        const icon = document.querySelector('.theme-icon');
        if (icon) {
            icon.textContent = theme === 'dark' ? '☀️' : '🌙';
        }
    }

    // イベントリスナーの設定
    setupEventListeners() {
        // テーマトグルボタン
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }
        
        // ファイル選択関連
        this.setupFileHandlers();
        
        // 語幹推定モードの変更
        const stemMode = document.getElementById('stemMode');
        if (stemMode) {
            stemMode.addEventListener('change', () => {
                if (this.wordList.length > 0 && 
                    document.querySelector("#tabs button.active").dataset.tab === "cloud") {
                    this.wordCloudAnalysis?.redraw();
                }
            });
        }
    }

    // ファイル処理関連のイベントハンドラー
    setupFileHandlers() {
        const dropZone = document.getElementById("dropZone");
        const fileInput = document.getElementById("fileInput");
        
        if (dropZone && fileInput) {
            dropZone.addEventListener("click", () => {
                fileInput.click();
            });

            fileInput.addEventListener("change", (e) => {
                this.currentFile = e.target.files[0];
                this.updateFileInfo(this.currentFile.name);
            });

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
                this.currentFile = e.dataTransfer.files[0];
                this.updateFileInfo(this.currentFile.name);
            });
        }
    }

    // ファイル情報更新
    updateFileInfo(name) {
        const fileInfo = document.getElementById("fileInfo");
        if (fileInfo) {
            fileInfo.textContent = `📄 読み込み対象: ${name}`;
        }
    }

    // WordCloudライブラリの確認
    checkWordCloudLibrary() {
        setTimeout(() => {
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
    }

    // 分析実行
    analyze() {
        if (!this.currentFile) {
            alert("ファイルが選択されていません。");
            return;
        }

        PassCloudUtils.showLoading("ファイル読み込み中…");

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            PassCloudUtils.showLoading("分析中…");
            this.processText(text);

            const activeMode = document.querySelector("#tabs button.active").dataset.tab;
            
            // DOM更新を待ってから描画
            setTimeout(() => {
                this.drawCurrentMode(activeMode);
                PassCloudUtils.hideLoading();
            }, 100);
        };
        reader.readAsText(this.currentFile);
    }

    // テキスト処理
    processText(text) {
        const result = PassCloudUtils.processText(text);
        this.wordList = result.wordList;
        this.originalLineCount = result.originalLineCount;
        
        // 分析モジュールのデータを更新
        this.updateAnalysisModules();
        
        // パスワードの長さ分布を確認
        const lengthDistribution = {};
        this.wordList.forEach(([word, count]) => {
            const len = word.length;
            if (!lengthDistribution[len]) {
                lengthDistribution[len] = 0;
            }
            lengthDistribution[len] += count;
        });
        console.log('Length distribution:', lengthDistribution);
    }

    // 分析モジュールのデータ更新
    updateAnalysisModules() {
        // 分析モジュールの初期化/更新
        if (!this.wordCloudAnalysis) {
            this.wordCloudAnalysis = new WordCloudAnalysis(this.wordList);
        } else {
            this.wordCloudAnalysis.updateData(this.wordList);
        }

        if (!this.partialAnalysis) {
            this.partialAnalysis = new PartialAnalysis(this.wordList);
        } else {
            this.partialAnalysis.updateData(this.wordList);
        }

        if (!this.statsAnalysis) {
            this.statsAnalysis = new StatsAnalysis(this.wordList, this.originalLineCount);
        } else {
            this.statsAnalysis.updateData(this.wordList, this.originalLineCount);
        }

        if (!this.heatmapAnalysis) {
            this.heatmapAnalysis = new HeatmapAnalysis(this.wordList, this.originalLineCount);
        } else {
            this.heatmapAnalysis.updateData(this.wordList, this.originalLineCount);
        }
    }

    // 現在のモードを描画
    drawCurrentMode(mode) {
        switch (mode) {
            case 'cloud':
                this.wordCloudAnalysis?.draw();
                break;
            case 'partial':
                this.partialAnalysis?.draw();
                break;
            case 'stats':
                this.statsAnalysis?.draw();
                break;
            case 'heatmap':
                this.heatmapAnalysis?.draw();
                break;
        }
    }

    // ビュー切り替え
    switchView(mode) {
        // 既存のツールチップを削除
        const existingTooltip = document.querySelector('.heatmap-tooltip');
        if (existingTooltip) {
            existingTooltip.remove();
        }
        
        document.querySelectorAll('.viewPanel').forEach(p => p.style.display = 'none');
        document.querySelectorAll('#tabs button').forEach(btn => btn.classList.remove('active'));
        
        const targetButton = document.querySelector(`#tabs button[data-tab="${mode}"]`);
        if (targetButton) {
            targetButton.classList.add('active');
        }
        
        const targetView = document.getElementById(mode + 'View');
        if (targetView) {
            targetView.style.display = 'block';
        }

        // 語幹推定オプションの表示制御
        const stemOption = document.getElementById("stemOption");
        if (stemOption) {
            stemOption.style.display = (mode === "cloud") ? "inline-block" : "none";
        }

        // データがある場合のみ描画
        if (this.wordList.length > 0) {
            this.drawCurrentMode(mode);
        } else {
            // データがない場合のメッセージ表示
            if (targetView) {
                targetView.innerHTML = '<p style="text-align: center; margin-top: 50px;">データがありません。ファイルを選択して分析を実行してください。</p>';
            }
        }
    }

    // 現在のビューを再描画
    redrawCurrentView() {
        if (this.wordList.length > 0) {
            const activeMode = document.querySelector("#tabs button.active")?.dataset.tab;
            if (activeMode) {
                this.drawCurrentMode(activeMode);
            }
        }
    }

    // クリーンアップ
    cleanup() {
        this.wordCloudAnalysis?.cleanup();
        this.partialAnalysis?.cleanup();
        this.heatmapAnalysis?.cleanup();
    }
}

// アプリケーションのインスタンス
let passCloudApp = null;

// DOM読み込み完了時の初期化
document.addEventListener('DOMContentLoaded', () => {
    passCloudApp = new PassCloudApp();
});

// グローバル関数（既存のHTMLから呼び出されるため）
function analyze() {
    passCloudApp?.analyze();
}

function switchView(mode) {
    passCloudApp?.switchView(mode);
}

// ページ離脱時のクリーンアップ
window.addEventListener('beforeunload', () => {
    passCloudApp?.cleanup();
});