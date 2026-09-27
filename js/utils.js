// 共通ユーティリティクラス
class PassCloudUtils {
    // 入力文字列はtextContentで描画する。
    static element(tag, className = '', text = '') {
        const element = document.createElement(tag);
        element.className = className;
        element.textContent = text;
        return element;
    }

    static showNoData(panel, noData) {
        panel.querySelector('.no-data').hidden = !noData;
        panel.querySelector('.view-content').hidden = noData;
    }

    static notify(message) {
        document.getElementById('statusMessage').textContent = message;
    }

    // ローディング表示制御
    static showLoading(message = "処理中です…") {
        const el = document.getElementById("loadingIndicator");
        el.textContent = "🔄 " + message;
        el.hidden = false;
        this.notify(message);
    }

    static hideLoading() {
        document.getElementById("loadingIndicator").hidden = true;
    }

    // Canvas設定関数
    static setupCanvas(canvas) {
        if (!canvas) {
            return null;
        }
        
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        
        if (!ctx || rect.width === 0 || rect.height === 0) {
            return null;
        }
        
        const scale = window.devicePixelRatio || 1;
        canvas.width = rect.width * scale;
        canvas.height = rect.height * scale;
        
        ctx.scale(scale, scale);
        ctx.textBaseline = 'alphabetic';
        ctx.textAlign = 'left';
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        return { ctx, rect, scale };
    }

    // グリッドパターン描画
    static drawGridPattern(ctx, rect, isDarkMode) {
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
    }

    // ダークモード判定
    static isDarkMode() {
        return document.documentElement.getAttribute('data-theme') === 'dark';
    }

    // カラーパレット取得
    static getColorScheme(isDarkMode) {
        return {
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
    }

    // バーの色を取得
    static getBarColor(percentage, isDarkMode) {
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

    // デバウンス関数
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // パフォーマンス測定
    static measurePerformance(name, func) {
        const start = performance.now();
        const result = func();
        const end = performance.now();
        return result;
    }
}
