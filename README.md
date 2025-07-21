# PassCloud

PassCloud は、流出したパスワードリストや辞書ファイルを対象に、ワードクラウドで可視化するツールです。パスワードの傾向を視覚的に分析できます。

## 🔧 機能
- ワードクラウドによる頻出パスワード可視化
- 統計情報表示（ユニーク数・最長・平均など）
- 長さ × 頻度のヒートマップ表示
- 語幹推定モード（ON/OFF）
- よく使われる語幹と組み合わされる語の分析パネル

## 📁 サンプルファイル
- `sample/passcloud_sample_1000.txt` を読み込んで試すことができます。

## 🚀 使い方
1. `index.html` をブラウザで開く
2. パスワードリストをアップロード or 貼り付け
3. 表示切替タブでワードクラウド／統計／ヒートマップなどを閲覧

## 🔧 出現頻度上位5000行の生成方法（rockyou.txtを使用）

以下のコマンドで、流出パスワード辞書 `rockyou.txt`（重複あり）から出現頻度上位5000行を抽出できます。

```bash
# 1. パスワードをソートして、出現数をカウント
sort rockyou.txt | uniq -c | sort -nr > freq_sorted.txt

# 2. 上位5000件のみを抽出（頻度付き）
head -n 5000 freq_sorted.txt > top5000_with_freq.txt

# 3. 頻度部分を削除してパスワードだけに整形（PassCloud用）
awk '{$1=""; print substr($0,2)}' top5000_with_freq.txt > passcloud_sample_top5000.txt
```

## 📄 ライセンス
MIT License
