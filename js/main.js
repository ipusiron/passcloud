// メインアプリケーションクラス
class PassCloudApp {
    constructor() {
        this.currentFile = null;
        this.currentFileName = '';
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
        this.setupLanguage();
        PassCloudUtils.renderLoading();
        this.checkWordCloudLibrary();
    }

    // テーマ関連の初期化
    initTheme() {
        let savedTheme = 'light';
        try {
            savedTheme = localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
        } catch {
            // 保存先が使えなくても、テーマは画面内で切り替えられる。
        }
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon(savedTheme);
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        try {
            localStorage.setItem('theme', newTheme);
        } catch {
            // テーマの永続化だけを省略する。
        }
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
        document.getElementById('analyzeButton').addEventListener('click', () => this.analyze());
        const tabs = [...document.querySelectorAll('#tabs button')];
        tabs.forEach((tab, index) => {
            tab.addEventListener('click', () => this.switchView(tab.dataset.tab));
            tab.addEventListener('keydown', event => {
                const movements = { ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index + tabs.length - 1) % tabs.length,
                    Home: 0, End: tabs.length - 1 };
                if (!(event.key in movements)) return;
                event.preventDefault();
                const next = tabs[movements[event.key]];
                this.switchView(next.dataset.tab);
                next.focus();
            });
        });

        // テーマトグルボタン
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }
        
        // ヘルプボタン
        const helpButton = document.getElementById('helpButton');
        if (helpButton) {
            helpButton.addEventListener('click', () => this.showHelpModal());
        }
        
        // ヘルプモーダル関連
        this.setupHelpModal();
        
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

    // 言語の切り替えボタンを配線する。
    setupLanguage() {
        const langToggle = document.getElementById('langToggle');
        if (langToggle) {
            langToggle.addEventListener('click',
                () => I18n.setLanguage(I18n.language === 'ja' ? 'en' : 'ja'));
        }
        document.addEventListener('languagechange', () => this.renderTexts());
    }

    // 言語を切り替えても再分析はしない。いま持っている結果を描き直すだけにする。
    renderTexts() {
        PassCloudUtils.renderStatus();
        PassCloudUtils.renderLoading();
        this.updateFileInfo(this.currentFileName);
        this.redrawCurrentView();
    }

    // ファイル処理関連のイベントハンドラー
    setupFileHandlers() {
        const dropZone = document.getElementById("dropZone");
        const fileInput = document.getElementById("fileInput");
        
        if (dropZone && fileInput) {
            dropZone.addEventListener("click", () => {
                fileInput.click();
            });

            dropZone.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    fileInput.click();
                }
            });

            fileInput.addEventListener("change", (e) => {
                if (!e.target.files || e.target.files.length === 0) return;
                this.selectFile(e.target.files[0]);
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
                if (!e.dataTransfer || !e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
                this.selectFile(e.dataTransfer.files[0]);
            });
        }
    }

    // 拡張子、MIME、サイズを読み込み前に検証する。
    selectFile(file) {
        if (!/\.txt$/i.test(file.name) || !file.type.startsWith('text/')) {
            this.currentFile = null;
            this.updateFileInfo('');
            PassCloudUtils.notify('status.invalidType');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            this.currentFile = null;
            this.updateFileInfo('');
            PassCloudUtils.notify('status.tooLarge');
            return;
        }
        this.currentFile = file;
        this.updateFileInfo(file.name);
        PassCloudUtils.notify('status.fileSelected');
    }

    // ファイル情報更新
    updateFileInfo(name) {
        this.currentFileName = name || '';
        const fileInfo = document.getElementById("fileInfo");
        if (fileInfo) {
            fileInfo.textContent = this.currentFileName
                ? I18n.t('file.loaded', { name: this.currentFileName })
                : '';
        }
    }

    // WordCloudライブラリの確認
    checkWordCloudLibrary() {
        if (typeof WordCloud !== 'function') {
            PassCloudUtils.notify('status.libraryMissing');
        }
    }

    // 分析実行
    analyze() {
        if (!this.currentFile) {
            PassCloudUtils.notify('status.noFile');
            return;
        }

        PassCloudUtils.showLoading('loading.reading');

        const button = document.getElementById('analyzeButton');
        if (button.disabled) return;
        button.disabled = true;
        const finish = () => {
            PassCloudUtils.hideLoading();
            button.disabled = false;
        };
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            PassCloudUtils.showLoading('loading.analyzing');
            try {
                this.processText(text);
            } catch {
                finish();
                PassCloudUtils.notify('status.processFailed');
                return;
            }

            const activeMode = document.querySelector("#tabs button.active").dataset.tab;
            
            // DOM更新を待ってから描画
            setTimeout(() => {
                try {
                    this.drawCurrentMode(activeMode);
                    if (this.wordList.length === 0) PassCloudUtils.notify('status.empty');
                    else PassCloudUtils.notify('status.done');
                } finally {
                    finish();
                }
            }, 100);
        };
        reader.onerror = () => {
            finish();
            PassCloudUtils.notify('status.readFailed');
        };
        reader.onabort = reader.onerror;
        try {
            reader.readAsText(this.currentFile, 'UTF-8');
        } catch {
            reader.onerror();
        }
    }

    // テキスト処理
    processText(text) {
        const result = PassCloudText.processText(text);
        this.wordList = result.wordList;
        this.originalLineCount = result.originalLineCount;
        
        // 分析モジュールのデータを更新
        this.updateAnalysisModules();
        
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
        const panel = document.getElementById(mode + 'View');
        PassCloudUtils.showNoData(panel, this.wordList.length === 0);
        if (this.wordList.length === 0) return;
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
        document.querySelectorAll('.heatmap-tooltip').forEach(tooltip => tooltip.remove());
        this.wordCloudAnalysis?.cleanup();
        this.partialAnalysis?.cleanup();
        
        document.querySelectorAll('.viewPanel').forEach(p => p.hidden = true);
        document.querySelectorAll('#tabs button').forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-selected', 'false');
            btn.tabIndex = -1;
        });
        
        const targetButton = document.querySelector(`#tabs button[data-tab="${mode}"]`);
        if (targetButton) {
            targetButton.classList.add('active');
            targetButton.setAttribute('aria-selected', 'true');
            targetButton.tabIndex = 0;
        }
        
        const targetView = document.getElementById(mode + 'View');
        if (targetView) {
            targetView.hidden = false;
        }

        // 語幹推定オプションの表示制御
        const stemOption = document.getElementById("stemOption");
        if (stemOption) {
            stemOption.hidden = mode !== "cloud";
        }

        // データがある場合のみ描画
        if (this.wordList.length > 0) {
            this.drawCurrentMode(mode);
        } else {
            // データがない場合のメッセージ表示
            if (targetView) {
                PassCloudUtils.showNoData(targetView, true);
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

    // ヘルプモーダル関連の設定
    setupHelpModal() {
        const helpModal = document.getElementById('helpModal');
        const helpModalClose = document.getElementById('helpModalClose');
        const modalOverlay = helpModal?.querySelector('.modal-overlay');
        
        // 閉じるボタン
        if (helpModalClose) {
            helpModalClose.addEventListener('click', () => this.hideHelpModal());
        }
        
        // オーバーレイクリック
        if (modalOverlay) {
            modalOverlay.addEventListener('click', () => this.hideHelpModal());
        }
        
        helpModal.addEventListener('keydown', event => {
            if (event.key !== 'Tab') return;
            const focusable = [...helpModal.querySelectorAll('button, a[href], input, select, [tabindex="0"]')];
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        });

        // ESCキーで閉じる
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && helpModal && !helpModal.hidden) {
                this.hideHelpModal();
            }
        });
    }

    // ヘルプモーダルを表示
    showHelpModal() {
        const helpModal = document.getElementById('helpModal');
        if (helpModal) {
            this.modalReturnFocus = document.activeElement;
            helpModal.hidden = false;
            document.getElementById('helpModalClose').focus();
            helpModal.classList.remove('closing');
            // スクロール位置をリセット
            const modalBody = helpModal.querySelector('.modal-body');
            if (modalBody) {
                modalBody.scrollTop = 0;
            }
            // ボディのスクロールを無効化
            document.body.style.overflow = 'hidden';
        }
    }

    // ヘルプモーダルを非表示
    hideHelpModal() {
        const helpModal = document.getElementById('helpModal');
        if (helpModal) {
            helpModal.hidden = true;
            document.body.style.overflow = '';
            this.modalReturnFocus?.focus();
        }
    }

    // クリーンアップ
    cleanup() {
        this.wordCloudAnalysis?.cleanup();
        this.partialAnalysis?.cleanup();
        this.heatmapAnalysis?.cleanup();
        
        // ボディのスクロールを復元（念のため）
        document.body.style.overflow = '';
    }
}

// アプリケーションのインスタンス
let passCloudApp = null;

// DOM読み込み完了時の初期化
document.addEventListener('DOMContentLoaded', () => {
    I18n.init();
    passCloudApp = new PassCloudApp();
});

// ページ離脱時のクリーンアップ
window.addEventListener('beforeunload', () => {
    passCloudApp?.cleanup();
});
