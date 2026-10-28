// theme-init - 最初の描画の前にテーマを決める。<head> で同期読み込みする。
//
// css/base.css の既定はライトで、ダークは <html> の data-theme="dark" で切り替える。
// 保存した選択の適用を </body> 直前の main.js で行うと、ライトで描いたあとに
// 保存したダークへ切り替わって見える。
//
// 保存した選択（localStorage の theme）が dark ならダーク、それ以外（未保存・
// 想定外の値）はライトにする（OS の設定には従わない）。
// localStorage が読めない環境でも落ちないよう try/catch で囲む。
(function (global) {
    'use strict';

    var theme = 'light';
    try {
        if (global.localStorage.getItem('theme') === 'dark') theme = 'dark';
    } catch (e) {
        // 使えない環境でもライトで続行
    }

    global.document.documentElement.setAttribute('data-theme', theme);
})(typeof window !== 'undefined' ? window : globalThis);
