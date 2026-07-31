/**
 * THE うんちんぐすたいる - トレイン連結完成版
 */

const CONFIG = {
    gameDuration: 10.0,
    gravity: 0.5,
    friction: 0.98,
    subSteps: 15,          // 物理演算の精度（分離防止）
    segmentLength: 35,     // カプセルの長さ
    capsuleWidth: 26,      // カプセルの太さ
    titles: []
};

// 称号リスト (1000点以上まで20点刻みで定義)
const titlesData = [
    "赤ちゃん", "よちよち", "おむつ卒業", "トイレの練習生", "一人前のきばり",
    "快便ルーキー", "どっさり見習い", "ブリブリ平民", "黄金の右尻", "排出力の目覚め",
    "トイレの用心棒", "スッキリ騎士", "ウォシュレットの友", "便座の支配者", "紙を惜しまぬ者",
    "残便感ゼロ", "疾風怒濤の排出", "茶色の閃光", "マグナム・プープ", "プリッツ・マスター",
    "全自動きばり機", "大陸の創造主", "トイレの賢者", "聖なる排便", "不屈の肛門",
    "流星の如く", "重力への挑戦者", "ブリリアント・ベン", "ミラクル・ドロップ", "黄金郷の門番",
    "運の極み", "排出王", "ケツの錬金術師", "茶色い宝石職人", "無限の残便",
    "トイレを壊し者", "銀河鉄道の夜（トイレ）", "便意の魔術師", "ハイパー・スクワット", "音速のきばり",
    "伝説のウンチスト", "神の領域のきばり", "終焉の排出", "真実のトイレ", "宇宙の深淵なるベン",
    "概念としてのウンチ", "ビッグバン・プープ", "超越者", "次元の裂け目の尻", "トイレとの合一",
    "THE うんちんぐすたいる"
];
for(let i=0; i<=50; i++) CONFIG.titles.push({ score: i * 20, name: titlesData[i] || "究極体" });

let state = {
    score: 0,
    highScore: localStorage.getItem('unching_highscore') || 0,
    timeLeft: 0,
    isPlaying: false,
    trains: [],
    particles: [],
    lastTime: 0
};

const canvas = document.getElementById('effect-canvas');
const ctx = canvas.getContext('2d');
const gameContainer = document.getElementById('game-container');

// --- 物理ノード (連結点) ---
class Node {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.oldX = x; this.oldY = y;
    }
    update() {
    let vx = (this.x - this.oldX) * CONFIG.friction;
    let vy = (this.y - this.oldY) * CONFIG.friction;
    this.oldX = this.x; this.oldY = this.y;
    this.x += vx;
    this.y += vy + CONFIG.gravity;

    // 半径分（太さの半分）を考慮して跳ね返り判定
    const r = CONFIG.capsuleWidth / 2;
    if (this.y > canvas.height - r) {
        this.y = canvas.height - r;
        this.oldY = this.y + vy * 0.4; 
    }
    // 左右の端で画像が切れないように余裕を持たせる
    if (this.x < r) this.x = r;
    if (this.x > canvas.width - r) this.x = r; // ここは canvas.width - r が正解
}
}

// --- トレインクラス ---
class PooTrain {
    constructor(x, y, segmentCount) {
        this.nodes = []; // 連結点 (カプセルの接合部)
        this.segmentCount = segmentCount;

        // 連結点はセグメント数 + 1 必要
        for (let i = 0; i <= segmentCount; i++) {
            this.nodes.push(new Node(x, y - i * 5));
        }

        // 初速（排出の勢い）
        const forceX = (Math.random() - 0.5) * 20;
        const forceY = 15 + Math.random() * 15;
        this.nodes.forEach(n => {
            n.oldX -= forceX;
            n.oldY -= forceY;
        });
    }

    update() {
        // 1. 各点の移動
        this.nodes.forEach(n => n.update());

        // 2. 連結拘束 (電車のように頭と尻を繋ぐ)
        for (let s = 0; s < CONFIG.subSteps; s++) {
            for (let i = 0; i < this.nodes.length - 1; i++) {
                let n1 = this.nodes[i];
                let n2 = this.nodes[i + 1];
                let dx = n2.x - n1.x;
                let dy = n2.y - n1.y;
                let dist = Math.sqrt(dx * dx + dy * dy);
                let diff = (CONFIG.segmentLength - dist) / dist;
                let offsetX = dx * diff * 0.5;
                let offsetY = dy * diff * 0.5;
                n1.x -= offsetX;
                n1.y -= offsetY;
                n2.x += offsetX;
                n2.y += offsetY;
            }
            
            // 振り子のような動きを強化するため、先頭に少し揺らぎを与える
            this.nodes[0].x += Math.sin(Date.now() * 0.01) * 0.2;
        }
    }

    draw() {
        for (let i = 0; i < this.nodes.length - 1; i++) {
            let n1 = this.nodes[i];
            let n2 = this.nodes[i + 1];
            
            // カプセル描画 (丸 + 長方形 + 丸)
            let angle = Math.atan2(n2.y - n1.y, n2.x - n1.x);
            let dist = CONFIG.segmentLength;

            ctx.save();
            ctx.translate(n1.x, n1.y);
            ctx.rotate(angle);

            ctx.fillStyle = '#6D4C41';
            const r = CONFIG.capsuleWidth / 2;

            // 本体
            ctx.beginPath();
            ctx.arc(0, 0, r, Math.PI/2, Math.PI * 1.5); // 前の丸
            ctx.lineTo(dist, -r);
            ctx.arc(dist, 0, r, Math.PI * 1.5, Math.PI / 2); // 後ろの丸
            ctx.closePath();
            ctx.fill();

            // 光沢
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.beginPath();
            ctx.ellipse(dist/2, -r/2.5, dist/2.2, r/4, 0, 0, Math.PI*2);
            ctx.fill();

            ctx.restore();
        }
    }
}

class Particle {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.vx = (Math.random()-0.5)*12;
        this.vy = (Math.random()-0.5)*12;
        this.life = 1.0;
        this.size = Math.random()*10 + 3;
    }
    update() {
        this.x += this.vx; this.y += this.vy;
        this.vy += 0.4; this.life -= 0.03;
    }
    draw() {
        ctx.fillStyle = `rgba(121, 85, 72, ${this.life})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI*2);
        ctx.fill();
    }
}

// --- システム ---

function resize() {
    // 親要素のサイズを正確に取得してCanvasに反映
    const rect = gameContainer.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    // 高解像度ディスプレイ（Retina等）でのボケ防止
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
}

function startGame() {
    state.score = 0;
    state.timeLeft = CONFIG.gameDuration;
    state.isPlaying = true;
    state.trains = [];
    state.particles = [];
    document.getElementById('score-val').innerText = '0';
    showScreen('game');
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(`screen-${id}`).classList.add('active');
}

document.querySelector('.tap-area').addEventListener('pointerdown', (e) => {
    if (!state.isPlaying) return;
    state.score++;
    document.getElementById('score-val').innerText = state.score;

    // シェイク
    gameContainer.classList.add('shake');
    setTimeout(() => gameContainer.classList.remove('shake'), 50);

    // 数字エフェクト
    const el = document.createElement('div');
    el.className = 'score-up';
    el.innerText = '+1';
    el.style.left = `${e.clientX}px`; el.style.top = `${e.clientY}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 600);

    // おしり沈み込み
    document.getElementById('butt-target').style.transform = 'scale(0.85) translateY(15px)';
    setTimeout(() => document.getElementById('butt-target').style.transform = 'scale(1)', 60);

    // パーティクル
    for(let i=0; i<4; i++) state.particles.push(new Particle(canvas.width/2, canvas.height/2 - 20));
});

function endGame() {
    state.isPlaying = false;
    
    // 排出：電車のように連結された塊を生成
    // スコア20点につき1本の長いトレインにする
    const trainCount = Math.max(1, Math.floor(state.score / 20));
    const segmentsPerTrain = Math.min(15, Math.ceil(state.score / trainCount));

    for (let i = 0; i < trainCount; i++) {
        setTimeout(() => {
            state.trains.push(new PooTrain(canvas.width/2, canvas.height/2 - 20, segmentsPerTrain));
        }, i * 300);
    }

    if (state.score > state.highScore) {
        state.highScore = state.score;
        localStorage.setItem('unching_highscore', state.highScore);
    }

    let rank = CONFIG.titles.find(t => state.score < t.score)?.name || "THE うんちんぐすたいる";
    document.getElementById('final-score').innerText = state.score;
    document.getElementById('rank-name').innerText = rank;
    document.getElementById('result-high-score').innerText = state.highScore;

    setTimeout(() => showScreen('result'), 2500);
}

function loop(t) {
    const dt = (t - state.lastTime) / 1000;
    state.lastTime = t;

    if (state.isPlaying) {
        state.timeLeft -= dt;
        if (state.timeLeft <= 0) { state.timeLeft = 0; endGame(); }
        document.getElementById('time-left').innerText = state.timeLeft.toFixed(1);
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    state.trains.forEach(tr => { tr.update(); tr.draw(); });
    for (let i = state.particles.length - 1; i >= 0; i--) {
        state.particles[i].update();
        state.particles[i].draw();
        if (state.particles[i].life <= 0) state.particles.splice(i, 1);
    }

    requestAnimationFrame(loop);
}

window.addEventListener('load', () => {
    resize();
    document.getElementById('title-high-score').innerText = state.highScore;
    requestAnimationFrame(loop);
});
window.addEventListener('resize', resize);
document.getElementById('btn-start').addEventListener('click', startGame);
document.getElementById('btn-retry').addEventListener('click', startGame);
