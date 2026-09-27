// 画面に出る文言はすべてこの辞書に置く。UI側のスクリプトは言語ごとの文字列を持たない。
// js/core/ の集計ロジックは文言を持たないため、この辞書からは参照されない。
const I18n = (() => {
    const ja = {
        'app.title': 'PassCloud - パスワードのワードクラウド可視化ツール',
        'app.tagline': '流出パスワードや辞書ファイルをワードクラウドで可視化',
        'app.description':
            '流出パスワードや辞書ファイルをワードクラウド、統計情報、ヒートマップで可視化・分析するWebツール',
        'app.keywords': 'パスワード, ワードクラウド, 可視化, 統計, ヒートマップ, セキュリティ, 辞書ファイル',
        'app.siteName': 'PassCloud',
        'app.ogLocale': 'ja_JP',
        'app.langButton': 'English',
        'app.langAria': '言語を切り替える',
        'app.helpAria': 'ヘルプ',
        'app.themeAria': 'ダークモード切替',

        'tabs.aria': '分析結果の表示',
        'tabs.cloud': 'ワードクラウド',
        'tabs.partial': '部分一致ワードクラウド',
        'tabs.stats': '統計情報',
        'tabs.heatmap': '長さ×頻度ヒートマップ',

        'controls.stemMode': '語幹推定モード',
        'controls.analyze': '📊 分析実行',

        'drop.aria': 'テキストファイルを選択',
        'drop.line1': 'ここにパスワードリスト（.txt）をドラッグ＆ドロップ',
        'drop.line2': 'またはクリックして選択',

        'file.loaded': '📄 読み込み対象: {name}',

        'loading.processing': '処理中です…',
        'loading.reading': 'ファイル読み込み中…',
        'loading.analyzing': '分析中…',

        'status.invalidType': 'UTF-8のテキストファイル（.txt）を選択してください。',
        'status.tooLarge': 'ファイルが大きすぎます（上限10MB）',
        'status.fileSelected': 'ファイルを選択しました。「📊 分析実行」を押してください。',
        'status.libraryMissing': 'WordCloudライブラリーが読み込まれていません。ページを再読み込みしてください。',
        'status.noFile': 'ファイルが選択されていません。',
        'status.readFailed': 'ファイルを読み込めませんでした。選び直してください。',
        'status.processFailed': 'ファイルを処理できませんでした。UTF-8のテキストを確認してください。',
        'status.empty': '空行以外のデータがありません。',
        'status.done': '分析が完了しました。',
        'status.cloudAreaFailed': 'ワードクラウドの描画領域を用意できませんでした。',
        'status.cloudDrawFailed': 'ワードクラウドを描画できませんでした。',
        'status.partialAreaFailed': '部分一致ワードクラウドの描画領域を用意できませんでした。',
        'status.partialDrawFailed': '部分一致ワードクラウドを描画できませんでした。',

        'view.noData': 'データがありません。ファイルを選択して分析を実行してください。',

        'cloud.canvasAria': 'パスワードのワードクラウド',
        'cloud.hover': '{word}: {count}回',
        'cloud.drawFailed': '描画できませんでした',
        'cloud.errorPrefix': 'エラー: {message}',

        'partial.heading': '🧩 部分一致ワードクラウド',
        'partial.description': '固定の語幹に前後する語句を可視化します。',
        'partial.noMatches': '分析対象となる部分一致語句が見つかりませんでした。',
        'partial.canvasAria': '部分一致語句のワードクラウド',
        'partial.info': '固定の語幹リスト61語｜抽出された語句数：{phrases}｜総出現回数：{total}',
        'partial.hover': '"{word}": {count}回出現',

        'stats.heading': '📊 パスワード統計情報',
        'stats.basicCard': '基本統計',
        'stats.totalLabel': '総パスワード数:',
        'stats.uniqueLabel': 'ユニークパスワード数:',
        'stats.duplicateLabel': '重複率:',
        'stats.lengthCard': '長さ統計',
        'stats.avgLabel': '平均長:',
        'stats.minLabel': '最短:',
        'stats.maxLabel': '最長:',
        'stats.chars': '{length} 文字',
        'stats.charTypeCard': '文字種別',
        'stats.numericOnly': '数字のみ:',
        'stats.alphaOnly': '英字のみ:',
        'stats.alphaNumeric': '英数字混在:',
        'stats.withSpecial': '特殊文字含む:',
        'stats.top10Heading': '🏆 Top 10 パスワード',
        'stats.top10Aria': 'パスワード出現頻度上位10件',
        'stats.colRank': '順位',
        'stats.colPassword': 'パスワード',
        'stats.colCount': '出現回数',
        'stats.colShare': '割合',
        'stats.distHeading': '📏 長さ別分布',
        'stats.distLabel': '{length}文字:',
        'stats.patternHeading': '🔍 パターン分析',
        'stats.patternSequential': '連続数字 (123, 111等):',
        'stats.patternKeyboard': 'キーボード配列 (qwerty等):',
        'stats.patternYears': '年号含む (2023, 1990等):',

        'heatmap.heading': '🔥 長さ×頻度ヒートマップ',
        'heatmap.desc1': 'パスワードの長さと出現頻度の関係を可視化します。',
        'heatmap.desc2':
            '色が濃いほど、その長さ・頻度の組み合わせに該当するユニークなパスワードが多いことを示します。',
        'heatmap.empty': '表示できる長さの語がありません。',
        'heatmap.mainAria': '長さと出現頻度の表。横スクロールできます',
        'heatmap.gridAria': '長さ別、出現頻度帯別のユニークパスワード数',
        'heatmap.colLength': '長さ',
        'heatmap.legendTitle1': 'ユニーク',
        'heatmap.legendTitle2': 'パスワード数',
        'heatmap.rowLength': '{length}文字',
        'heatmap.cellAria': '{length}文字、頻度{freq}回、{count}種類',
        'heatmap.excluded': '21文字以上: {unique}種類・延べ{occurrences}回（表示対象外）',
        'heatmap.summaryHeading': '📊 分析サマリー',
        'heatmap.totalLabel': '総パスワード数:',
        'heatmap.uniqueLabel': 'ユニークパスワード数:',
        'heatmap.commonLengthLabel': '最も多い長さ:',
        'heatmap.commonLengthValue': '{length}文字 ({count}個)',
        'heatmap.commonBandLabel': '最頻出の頻度帯:',
        'heatmap.rangeLabel': '分析対象範囲:',
        'heatmap.rangeValue': '{min}〜{max}文字',
        'heatmap.tooltip':
            '{length}文字のパスワード／出現頻度: {freq}回／該当数: {count}種類／割合: {percentage}%',

        'help.title': '📖 PassCloud ヘルプ',
        'help.closeAria': 'ヘルプを閉じる',
        'help.cloudHeading': '🌥 ワードクラウド',
        'help.cloudBody':
            'パスワードリスト内で出現頻度の高い単語を、フォントサイズと色の濃淡で可視化します。'
            + 'よく使われているパターンが一目で把握できます。',
        'help.cloudStemLabel': '語幹推定モード',
        'help.cloudStemBody':
            'ONにすると、末尾の数字や記号を除去して正規化します（例：password123 → password）。空になる場合は元の語を保持',
        'help.cloudColorLabel': '色分け',
        'help.cloudColorBody': '出現頻度が高いほど大きく、濃い色で表示されます',
        'help.cloudHoverLabel': 'インタラクション',
        'help.cloudHoverBody': '単語にマウスカーソルを合わせると出現回数が表示されます',
        'help.partialHeading': '🧩 部分一致ワードクラウド',
        'help.partialBody':
            'よく使われる語幹（pass, admin, loveなど）に部分一致するパスワードを対象に、'
            + 'セットで使われている語句を抽出してワードクラウド表示します。',
        'help.partialStemsLabel': '語幹リスト',
        'help.partialStemsBody': '固定の語幹リスト61語を使用',
        'help.partialTargetLabel': '抽出対象',
        'help.partialTargetBody': '語幹の前後に付く語句（接頭語・接尾語）',
        'help.partialUseLabel': '用途',
        'help.partialUseBody': '推測しやすいパスワードパターンの把握',
        'help.statsHeading': '📊 統計情報',
        'help.statsBody': 'パスワードリスト全体の特徴を統計データとして数値で表示します。',
        'help.statsBasicLabel': '基本統計',
        'help.statsBasicBody': '総件数、ユニーク語数、重複率',
        'help.statsLengthLabel': '長さ統計',
        'help.statsLengthBody': '平均長、最短・最長文字数',
        'help.statsCharLabel': '文字種別',
        'help.statsCharBody': '数字のみ、英字のみ、英数字混在、特殊文字含む割合',
        'help.statsTopLabel': 'Top 10',
        'help.statsTopBody': '最頻出パスワードランキング',
        'help.statsPatternLabel': 'パターン分析',
        'help.statsPatternBody': '連続数字、キーボード配列、年号含有率',
        'help.heatHeading': '🔥 長さ×頻度ヒートマップ',
        'help.heatBody': 'パスワードの「長さ」と「出現頻度」の関係を2次元マトリクスで可視化します。',
        'help.heatRowLabel': '縦軸',
        'help.heatRowBody': '20文字以下の語から決定。21文字以上は除外件数を表示',
        'help.heatColLabel': '横軸',
        'help.heatColBody': '出現頻度の区間（1回、2-3回、4-5回...）',
        'help.heatColorLabel': '色の濃さ',
        'help.heatColorBody': 'その長さ・頻度に該当するユニークパスワード数',
        'help.heatTipLabel': 'ツールチップ',
        'help.heatTipBody': 'セルにカーソルを合わせると詳細情報を表示',
        'help.usageHeading': '📁 使用方法',
        'help.usageFileLabel': 'ファイル選択',
        'help.usageFileBody': 'パスワードリスト（.txtファイル）をドラッグ&ドロップまたはクリックで選択',
        'help.usageRunLabel': '分析実行',
        'help.usageRunBody': '「📊 分析実行」ボタンをクリック',
        'help.usageViewLabel': '結果確認',
        'help.usageViewBody': 'タブを切り替えて各分析結果を確認',
        'help.usageThemeLabel': 'テーマ切替',
        'help.usageThemeBody': '右上のボタンでライト/ダークモードを切替',
        'help.inputHeading': '📄 入力ファイル仕様',
        'help.inputFormatLabel': '形式',
        'help.inputFormatBody': 'UTF-8エンコードの.txtファイル',
        'help.inputStructLabel': '構造',
        'help.inputStructBody': '1行に1パスワード。前後の空白と空行を除き、大文字小文字を区別せずに集計',
        'help.inputSizeLabel': '推奨サイズ',
        'help.inputSizeBody': '10MB以下、最大10,000行程度を推奨（ブラウザー性能による）',
        'help.inputControlLabel': '制御文字',
        'help.inputControlBody':
            'RLO（U+202E）のような目に見えない制御文字は、[U+202E]の形に置き換えて表示します。'
            + '長さの統計はもとの文字列で数えます',
        'help.inputSampleLabel': 'サンプル',
        'help.inputSampleBody': 'sample/passcloud_sample_1000.txtで動作確認可能',
        'help.privacyHeading': '🔒 プライバシーとセキュリティ',
        'help.privacyClientLabel': '完全クライアント側処理',
        'help.privacyClientBody': 'アップロードされたファイルは外部サーバーに送信されません',
        'help.privacyMemoryLabel': 'メモリ上での処理',
        'help.privacyMemoryBody': 'データはブラウザーのメモリ内でのみ処理され、永続化されません',
        'help.privacyLocalLabel': 'ローカル実行',
        'help.privacyLocalBody': '外部への通信は行いません。同梱ファイルだけで動作します',
        'help.cautionHeading': '⚠️ 注意事項',
        'help.caution1': '大量のデータを処理する際は、ブラウザーの性能により処理時間が長くなる場合があります',
        'help.caution2': 'メモリ不足によりブラウザーがクラッシュする可能性があります',
        'help.caution3': 'このツールは教育・研究目的で作成されています',
        'help.caution4': 'パスワード分析は適切な権限の下で行ってください'
    };

    const en = {
        'app.title': 'PassCloud - Password Word Cloud Visualization Tool',
        'app.tagline': 'Visualize leaked password lists and dictionary files as word clouds',
        'app.description':
            'A web tool for visualizing and analyzing leaked passwords and dictionary files'
            + ' using word clouds, statistics, and heatmaps',
        'app.keywords': 'password, word cloud, visualization, statistics, heatmap, security, dictionary file',
        'app.siteName': 'PassCloud',
        'app.ogLocale': 'en_US',
        'app.langButton': '日本語',
        'app.langAria': 'Switch language',
        'app.helpAria': 'Help',
        'app.themeAria': 'Toggle dark mode',

        'tabs.aria': 'Analysis views',
        'tabs.cloud': 'Word cloud',
        'tabs.partial': 'Partial match',
        'tabs.stats': 'Statistics',
        'tabs.heatmap': 'Length x frequency',

        'controls.stemMode': 'Stem estimation mode',
        'controls.analyze': '📊 Run analysis',

        'drop.aria': 'Select a text file',
        'drop.line1': 'Drag and drop a password list (.txt) here',
        'drop.line2': 'or click to choose one',

        'file.loaded': '📄 Loaded file: {name}',

        'loading.processing': 'Processing…',
        'loading.reading': 'Reading the file…',
        'loading.analyzing': 'Analyzing…',

        'status.invalidType': 'Select a UTF-8 text file (.txt).',
        'status.tooLarge': 'The file is too large (10MB limit).',
        'status.fileSelected': 'The file is selected. Press the "📊 Run analysis" button.',
        'status.libraryMissing': 'The WordCloud library did not load. Please reload the page.',
        'status.noFile': 'No file is selected.',
        'status.readFailed': 'The file could not be read. Please choose it again.',
        'status.processFailed': 'The file could not be processed. Please check that it is UTF-8 text.',
        'status.empty': 'There is no data other than blank lines.',
        'status.done': 'The analysis is finished.',
        'status.cloudAreaFailed': 'The drawing area for the word cloud could not be prepared.',
        'status.cloudDrawFailed': 'The word cloud could not be drawn.',
        'status.partialAreaFailed': 'The drawing area for the partial-match word cloud could not be prepared.',
        'status.partialDrawFailed': 'The partial-match word cloud could not be drawn.',

        'view.noData': 'No data yet. Choose a file and run the analysis.',

        'cloud.canvasAria': 'Word cloud of the passwords',
        'cloud.hover': '{word}: {count} times',
        'cloud.drawFailed': 'Could not be drawn',
        'cloud.errorPrefix': 'Error: {message}',

        'partial.heading': '🧩 Partial-match word cloud',
        'partial.description': 'Shows the phrases that come before and after a fixed set of stems.',
        'partial.noMatches': 'No partial-match phrase was found to analyze.',
        'partial.canvasAria': 'Word cloud of the partial-match phrases',
        'partial.info': 'Fixed list of 61 stems | Extracted phrases: {phrases} | Total occurrences: {total}',
        'partial.hover': '"{word}": {count} occurrences',

        'stats.heading': '📊 Password statistics',
        'stats.basicCard': 'Basic',
        'stats.totalLabel': 'Total passwords:',
        'stats.uniqueLabel': 'Unique passwords:',
        'stats.duplicateLabel': 'Duplicate rate:',
        'stats.lengthCard': 'Length',
        'stats.avgLabel': 'Average:',
        'stats.minLabel': 'Shortest:',
        'stats.maxLabel': 'Longest:',
        'stats.chars': '{length} chars',
        'stats.charTypeCard': 'Character types',
        'stats.numericOnly': 'Digits only:',
        'stats.alphaOnly': 'Letters only:',
        'stats.alphaNumeric': 'Letters and digits:',
        'stats.withSpecial': 'With symbols:',
        'stats.top10Heading': '🏆 Top 10 passwords',
        'stats.top10Aria': 'The 10 most frequent passwords',
        'stats.colRank': 'Rank',
        'stats.colPassword': 'Password',
        'stats.colCount': 'Count',
        'stats.colShare': 'Share',
        'stats.distHeading': '📏 Distribution by length',
        'stats.distLabel': '{length} ch:',
        'stats.patternHeading': '🔍 Pattern analysis',
        'stats.patternSequential': 'Runs of digits or letters (123, 111, …):',
        'stats.patternKeyboard': 'Keyboard rows (qwerty, …):',
        'stats.patternYears': 'Contains a year (2023, 1990, …):',

        'heatmap.heading': '🔥 Length x frequency heatmap',
        'heatmap.desc1': 'Shows how password length relates to how often a password appears.',
        'heatmap.desc2':
            'A deeper colour means that more unique passwords fall into that length and frequency cell.',
        'heatmap.empty': 'No word falls inside the range of lengths that can be shown.',
        'heatmap.mainAria': 'Table of length by frequency. It scrolls sideways',
        'heatmap.gridAria': 'Unique password count per length and frequency band',
        'heatmap.colLength': 'Length',
        'heatmap.legendTitle1': 'Unique',
        'heatmap.legendTitle2': 'passwords',
        'heatmap.rowLength': '{length} ch',
        'heatmap.cellAria': '{length} characters, frequency {freq}, {count} unique',
        'heatmap.excluded': '21 characters or longer: {unique} unique, {occurrences} in total (not shown)',
        'heatmap.summaryHeading': '📊 Summary',
        'heatmap.totalLabel': 'Total passwords:',
        'heatmap.uniqueLabel': 'Unique passwords:',
        'heatmap.commonLengthLabel': 'Most common length:',
        'heatmap.commonLengthValue': '{length} chars ({count})',
        'heatmap.commonBandLabel': 'Most common band:',
        'heatmap.rangeLabel': 'Range analyzed:',
        'heatmap.rangeValue': '{min} to {max} chars',
        'heatmap.tooltip':
            '{length}-character passwords / frequency: {freq} / matches: {count} unique / share: {percentage}%',

        'help.title': '📖 PassCloud help',
        'help.closeAria': 'Close the help',
        'help.cloudHeading': '🌥 Word cloud',
        'help.cloudBody':
            'Draws the words that appear most often in the password list, using font size and colour depth.'
            + ' The patterns in common use stand out at a glance.',
        'help.cloudStemLabel': 'Stem estimation mode',
        'help.cloudStemBody':
            'When it is on, trailing digits and symbols are stripped to normalize each word'
            + ' (for example, password123 becomes password). A word that would become empty keeps its original form',
        'help.cloudColorLabel': 'Colouring',
        'help.cloudColorBody': 'The more often a word appears, the larger and the deeper in colour it is drawn',
        'help.cloudHoverLabel': 'Interaction',
        'help.cloudHoverBody': 'Point at a word to see how many times it appears',
        'help.partialHeading': '🧩 Partial-match word cloud',
        'help.partialBody':
            'Takes the passwords that contain one of the common stems (pass, admin, love and so on),'
            + ' extracts the phrases used together with the stem, and draws them as a word cloud.',
        'help.partialStemsLabel': 'Stem list',
        'help.partialStemsBody': 'Uses a fixed list of 61 stems',
        'help.partialTargetLabel': 'What is extracted',
        'help.partialTargetBody': 'The phrases attached before and after the stem (prefixes and suffixes)',
        'help.partialUseLabel': 'Purpose',
        'help.partialUseBody': 'Seeing which password patterns are easy to guess',
        'help.statsHeading': '📊 Statistics',
        'help.statsBody': 'Shows the character of the whole password list as numbers.',
        'help.statsBasicLabel': 'Basic',
        'help.statsBasicBody': 'Total count, unique count and duplicate rate',
        'help.statsLengthLabel': 'Length',
        'help.statsLengthBody': 'Average length, shortest and longest length',
        'help.statsCharLabel': 'Character types',
        'help.statsCharBody':
            'The share of digits only, letters only, letters mixed with digits, and entries with symbols',
        'help.statsTopLabel': 'Top 10',
        'help.statsTopBody': 'A ranking of the most frequent passwords',
        'help.statsPatternLabel': 'Pattern analysis',
        'help.statsPatternBody': 'Runs of digits, keyboard rows, and the share that contains a year',
        'help.heatHeading': '🔥 Length x frequency heatmap',
        'help.heatBody': 'Shows how password length relates to frequency, as a two-dimensional matrix.',
        'help.heatRowLabel': 'Vertical axis',
        'help.heatRowBody':
            'Decided from the words of 20 characters or fewer. Words of 21 characters or more are reported as a count',
        'help.heatColLabel': 'Horizontal axis',
        'help.heatColBody': 'Bands of frequency (1, 2-3, 4-5, and so on)',
        'help.heatColorLabel': 'Colour depth',
        'help.heatColorBody': 'The number of unique passwords in that length and frequency cell',
        'help.heatTipLabel': 'Tooltip',
        'help.heatTipBody': 'Point at a cell to see the details',
        'help.usageHeading': '📁 How to use it',
        'help.usageFileLabel': 'Choose a file',
        'help.usageFileBody': 'Drag and drop a password list (a .txt file), or click to choose one',
        'help.usageRunLabel': 'Run the analysis',
        'help.usageRunBody': 'Click the "📊 Run analysis" button',
        'help.usageViewLabel': 'Read the result',
        'help.usageViewBody': 'Switch tabs to read each analysis',
        'help.usageThemeLabel': 'Switch the theme',
        'help.usageThemeBody': 'Use the button at the top right to switch between light and dark mode',
        'help.inputHeading': '📄 Input file specification',
        'help.inputFormatLabel': 'Format',
        'help.inputFormatBody': 'A .txt file encoded in UTF-8',
        'help.inputStructLabel': 'Structure',
        'help.inputStructBody':
            'One password per line. Surrounding spaces and blank lines are dropped, and case is ignored',
        'help.inputSizeLabel': 'Recommended size',
        'help.inputSizeBody': 'Up to 10MB, and about 10,000 lines at most (it depends on the browser)',
        'help.inputControlLabel': 'Control characters',
        'help.inputControlBody':
            'An invisible control character such as RLO (U+202E) is shown as [U+202E].'
            + ' The length statistics still count the original string',
        'help.inputSampleLabel': 'Sample',
        'help.inputSampleBody': 'Load sample/passcloud_sample_1000.txt to try it out',
        'help.privacyHeading': '🔒 Privacy and security',
        'help.privacyClientLabel': 'Entirely on the client side',
        'help.privacyClientBody': 'The file you load is never sent to an external server',
        'help.privacyMemoryLabel': 'Held in memory only',
        'help.privacyMemoryBody': 'The data is processed in the memory of the browser and is never stored',
        'help.privacyLocalLabel': 'Runs locally',
        'help.privacyLocalBody': 'No external request is made. Everything runs from the bundled files',
        'help.cautionHeading': '⚠️ Cautions',
        'help.caution1': 'A large list can take a long time, depending on how fast the browser is',
        'help.caution2': 'The browser may crash if it runs out of memory',
        'help.caution3': 'This tool is built for education and research',
        'help.caution4': 'Analyze passwords only where you have permission to do so'
    };

    let language = 'ja';
    const STORAGE_KEY = 'passcloud-language';

    function t(key, values = {}) {
        const dict = language === 'en' ? en : ja;
        const message = dict[key];
        if (typeof message !== 'string') throw new Error('Unknown message: ' + key);
        return message.replace(/\{(\w+)\}/g,
            (whole, name) => (Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : whole));
    }

    function apply(root = document) {
        document.documentElement.lang = language;
        document.title = t('app.title');
        root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
        for (const attr of ['aria-label', 'title', 'placeholder', 'alt', 'content']) {
            root.querySelectorAll(`[data-i18n-${attr}]`)
                .forEach(el => el.setAttribute(attr, t(el.getAttribute(`data-i18n-${attr}`))));
        }
    }

    function setLanguage(value) {
        if (!['ja', 'en'].includes(value)) return;
        language = value;
        try {
            localStorage.setItem(STORAGE_KEY, value);
        } catch {
            // 保存先が使えなくても、言語は画面内で切り替えられる。
        }
        apply();
        document.dispatchEvent(new Event('languagechange'));
    }

    function init() {
        let saved = null;
        try {
            saved = localStorage.getItem(STORAGE_KEY);
        } catch {
            // 保存先が使えない環境では既定に従う。
        }
        let query = null;
        try {
            query = new URLSearchParams(location.search).get('lang');
        } catch {
            // file:// でクエリーが取れない環境では既定に従う。
        }
        const chosen = [query, saved].find(value => value === 'ja' || value === 'en');
        language = chosen || (/^ja\b/i.test(navigator.language || '') ? 'ja' : 'en');
        apply();
    }

    return { ja, en, t, apply, init, setLanguage, get language() { return language; } };
})();

if (typeof window !== 'undefined') window.I18n = I18n;
if (typeof module !== 'undefined' && module.exports) module.exports = I18n;
