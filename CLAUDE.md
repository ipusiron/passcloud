# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**PassCloud** is a client-side web application for analyzing and visualizing password lists and dictionary files. It helps security professionals understand password patterns through visual analysis (word clouds, partial match analysis, statistics, and heatmaps).

## Development Commands

**No build process required** - this is a static web application.

```bash
# Dependency-free tests (Node 22+)
npm test

# Serve locally
python -m http.server 8000

# Test with sample file
sample/passcloud_sample_1000.txt
```

## Architecture

### File Structure

```
passcloud/                             # アプリケーションのルート
├── .github/                           # GitHub の設定
│   └── workflows/                     # GitHub Actions のワークフロー
│       └── test.yml                   # push と pull_request で npm test を実行する
├── assets/                            # スクリーンショットとフォント
│   ├── en/                            # 英語UIの画面（README.en.md から参照する）
│   │   ├── screenshot.png             # ワードクラウドのタブ（ライトテーマ）
│   │   ├── screenshot2.png            # 部分一致ワードクラウドのタブ（ダークテーマ）
│   │   ├── screenshot3.png            # 統計情報のタブ（基本統計・Top10）
│   │   └── screenshot4.png            # 長さ×頻度ヒートマップのタブ（ダークテーマ）
│   ├── fonts/                         # 自前ホストする Web フォント（外部への接続をなくすため）
│   │   ├── OFL-Orbitron.txt           # Orbitron の SIL Open Font License 1.1
│   │   ├── OFL-SpaceMono.txt          # Space Mono の SIL Open Font License 1.1
│   │   ├── orbitron-700-latin.woff2   # 見出し用 Orbitron Bold（latin サブセット）
│   │   ├── spacemono-400-latin.woff2  # 本文用 Space Mono Regular（latin サブセット）
│   │   └── spacemono-700-latin.woff2  # 本文用 Space Mono Bold（latin サブセット）
│   ├── screenshot.png                 # 旧版の画面（改修前。README からは参照していない）
│   ├── screenshot2.png                # ワードクラウドのタブ（ライトテーマ）
│   ├── screenshot3.png                # 部分一致ワードクラウドのタブ（ダークテーマ）
│   ├── screenshot4.png                # 統計情報のタブ（基本統計・Top10）
│   └── screenshot5.png                # 長さ×頻度ヒートマップのタブ（ダークテーマ）
├── css/                               # スタイルシート（main.css が他を読み込む）
│   ├── base.css                       # 配色の CSS 変数・フォント定義・共通レイアウト
│   ├── heatmap.css                    # 長さ×頻度ヒートマップの見た目
│   ├── main.css                       # 各 CSS を読み込む入口
│   ├── modal.css                      # ヘルプモーダルとヘッダーボタンの見た目
│   ├── partial.css                    # 部分一致ワードクラウドの見た目
│   ├── stats.css                      # 統計情報の見た目
│   └── wordcloud.css                  # ワードクラウドの canvas まわりの見た目
├── js/                                # アプリケーションのスクリプト
│   ├── core/                          # 画面に依存しない純粋なロジック（Node のテストから読む）
│   │   ├── heatmap-data.js            # 長さ×頻度のマトリクスと除外件数を計算する
│   │   ├── partial-data.js            # 語幹に前後する語句を抽出して数える
│   │   ├── stats-data.js              # 件数・長さ・文字種別・パターンの統計を計算する
│   │   ├── stems.js                   # 既知の語幹 61 語と語幹推定（末尾の数字・記号の除去）
│   │   └── text-processor.js          # 入力テキストを [パスワード, 出現回数] に畳む
│   ├── heatmap-analysis.js            # ヒートマップの描画とツールチップ
│   ├── i18n.js                        # 画面の文言の日英辞書と、切り替え・保存・適用
│   ├── main.js                        # 画面の組み立て・ファイル入力・タブ切り替え・テーマ
│   ├── partial-analysis.js            # 部分一致ワードクラウドの描画
│   ├── stats-analysis.js              # 統計情報の描画
│   ├── utils.js                       # 画面まわりの共通処理（canvas 設定・配色・ローディング）
│   ├── wordcloud-analysis.js          # ワードクラウドの描画
│   └── wordcloud2.js                  # wordcloud2.js 本体（同梱。手を加えない）
├── sample/                            # 動作確認用のサンプル
│   └── passcloud_sample_1000.txt      # 1,005 行・67 種類のパスワードリスト
├── test/                              # node --test で動く自動テスト（依存なし）
│   ├── contrast.test.js               # 配色が WCAG 4.5:1 以上かを検証する
│   ├── control-chars.test.js          # 制御文字の可視化と、入力を出す箇所を検証する
│   ├── format.test.js                 # 1 行に詰め込んだファイルがないかを検証する
│   ├── heatmap.test.js                # ヒートマップのマトリクスと除外件数を検証する
│   ├── html.test.js                   # index.html の CSP・meta・id・属性を静的に検証する
│   ├── i18n.test.js                   # 日英の辞書と HTML の訳し忘れを検証する
│   ├── partial.test.js                # 部分一致の抽出結果と件数を検証する
│   ├── readme.test.js                 # README の表と数値をコードで再計算して突き合わせる
│   ├── stats.test.js                  # 統計の数値と Top10 の並びを検証する
│   ├── text-processor.test.js         # 取り込みと語幹推定の境界値を検証する
│   └── wordcloud-scale.test.js        # フォントサイズの上下限と、描けなかったときの知らせを検証する
├── .gitignore                         # Git の除外設定
├── .nojekyll                          # GitHub Pages の Jekyll 処理を無効にする
├── CLAUDE.md                          # AI 向けの開発ガイド（構成と守ること）
├── LICENSE                            # 本ツールの MIT ライセンス
├── README.en.md                       # 英語版のドキュメント
├── README.md                          # 本ドキュメント
├── index.html                         # 画面のマークアップ
└── package.json                       # npm test の定義（依存パッケージなし）
```

### Module Architecture

**PassCloudApp** (`js/main.js`) - Main orchestrator
- Manages application state (`currentFile`, `wordList`, `originalLineCount`)
- Initializes and coordinates four analysis modules
- Handles theme switching, file input, view switching

**PassCloudUtils** (`js/utils.js`) - Shared utilities
- Pure processing lives in `js/core/`, not in UI utilities.
- `setupCanvas()`: High-DPI canvas configuration
- `isDarkMode()`, `getColorScheme()`, `getBarColor()`: Theme-aware rendering
- Pattern detection is internal to `PassCloudStats` in `js/core/stats-data.js`.
- `PassCloudStems.knownStems`: exactly 61 fixed, unique stems.

**Analysis Modules** - Each follows the same interface:
- `constructor(wordList)` / `updateData(wordList)`
- `draw()` - Renders the visualization
- `cleanup()` - Removes event listeners/tooltips

### Language System
- Every string the user reads lives in `js/i18n.js` (`ja` and `en` hold the same key set).
- `I18n.apply()` fills `data-i18n` (text) and `data-i18n-<attr>` (`aria-label`, `title`,
  `placeholder`, `alt`, `content`), and sets `document.title` and `documentElement.lang`.
- Language stored in localStorage key `'passcloud-language'`; `?lang=ja|en` and
  `navigator.language` are the fallbacks, in that order.
- `#langToggle` flips the language; `PassCloudApp.renderTexts()` runs on `languagechange`
  and redraws the current view **without re-analyzing** (a cleared view must stay cleared).
- Never write a user-visible string straight into `textContent`. Add a key to both
  dictionaries and call `I18n.t(key, values)` instead.
- Never put `data-i18n` on an element that has children, on a slot the scripts write
  (`#fileInfo`, `#loadingIndicator`, `#statusMessage`, `.partial-info`), or on a key that
  takes a substitution: `apply()` calls `t(key)` with no values.
- Messages in flight are held as `{ key, values }` (`PassCloudUtils.statusState`), never as
  the translated string, so that switching the language re-translates them in place.

### Theme System
- CSS custom properties defined in `css/base.css`
- Theme stored in localStorage key `'theme'`
- Toggle via `data-theme` attribute on `<html>`
- Each analysis module reads `PassCloudUtils.isDarkMode()` for colors

### Canvas Rendering Pattern
All canvas-based modules use:
```javascript
const { ctx, rect, scale } = PassCloudUtils.setupCanvas(canvas);
// scale handles devicePixelRatio for retina displays
```

## Key Implementation Details

### Adding a New Analysis View
1. Create `js/[name]-analysis.js` with class following existing pattern
2. Add view panel in `index.html`: `<div id="[name]View" class="viewPanel">`
3. Add an ARIA tab button with data-tab="[name]"; setupEventListeners() binds its click and keyboard events.
4. Add CSS file and import in `css/main.css`
5. Initialize in `PassCloudApp.updateAnalysisModules()`
6. Add case in `PassCloudApp.drawCurrentMode()`

### Modifying Stem Analysis
- The fixed `knownStems` array lives in `js/core/stems.js`.
- Stems are used by both word cloud stemming mode and partial match analysis

### Color Schemes
- Dark mode: Cyan, magenta, neon colors for visibility
- Light mode: Navy, maroon, forest green for contrast
- Defined in `PassCloudUtils.getColorScheme()`

## Constraints
- Client-side only: No server communication
- UTF-8 `.txt` files, one password per line; maximum 10MB.
- Input is trimmed and lowercased; blank lines are excluded.
- Performance limit: ~10,000 lines recommended
- Japanese and English UI, switched at runtime; the wording lives only in `js/i18n.js`

- Keep classic scripts: file:// must work. Do not add ES module declarations.
- Core files must not reference DOM APIs, browser state, storage, or logging.
- Counts stay integer: deep-copy [word, count] tuples before passing to WordCloud.
- Keep wordcloud2.js, supplied assets/fonts files, old screenshot, and sample bytes unchanged.
- Do not construct password text with innerHTML. Use textContent.
- Anything the user typed or loaded (passwords, extracted phrases, file names) goes through
  `PassCloudUtils.visibleText()` before it reaches the screen. It rewrites bidi and other
  invisible characters as `[U+202E]`, so that what is drawn equals what is stored.
  Substitute at the moment of display only; every count and length stays on the raw string.
- Do not use inline style/event attributes. Dynamic numeric styles use CSSOM.
- External requests must stay at zero under HTTP and file://.
- Stemming removes only trailing non-letters, and retains the original if it would become empty.
- Top10 sorts by count descending and lexical value ascending for ties.
- Heatmap displays words of at most 20 characters and reports 21+ excluded unique/occurrence counts.
- README tables and all paths in its annotated directory tree are checked by npm test.
- README.md and README.en.md must stay in step; both list the same directory tree.
- Passwords, stems, frequency band labels and pattern examples are the tool's own I/O.
  They are never translated, and `js/core/` never learns about the dictionary.
