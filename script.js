let currentFile = null;
let wordList = [];

function updateFileInfo(name) {
    document.getElementById("fileInfo").textContent = `📄 読み込み対象: ${name}`;
}

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
    };
    reader.readAsText(currentFile);
}

function processText(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== "");
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
}

function normalize(word) {
    return word.replace(/[^a-z]/gi, '').replace(/[0-9]+$/, '');
}

function drawWordCloud() {
    document.querySelectorAll('.viewPanel').forEach(p => p.style.display = 'none');
    document.getElementById('cloudView').style.display = 'block';

    WordCloud(document.getElementById('cloudCanvas'), {
        list: wordList,
        gridSize: 10,
        weightFactor: 3,
        backgroundColor: '#fff',
        color: 'random-dark'
    });
}

function drawStats() {
    document.querySelectorAll('.viewPanel').forEach(p => p.style.display = 'none');
    const panel = document.getElementById('statsView');
    panel.style.display = 'block';
    panel.innerHTML = "<p>📊 統計情報（未実装）</p>";
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

function showLoading(message = "処理中です…") {
    const el = document.getElementById("loadingIndicator");
    el.textContent = "🔄 " + message;
    el.style.display = "block";
}
function hideLoading() {
    document.getElementById("loadingIndicator").style.display = "none";
}
