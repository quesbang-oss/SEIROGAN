/**
 * THE うんちんぐすたいる - 座標バグ修正版
 */

const CONFIG = {
    gameDuration: 10.0,
    gravity: 0.8,
    friction: 0.96,
    subSteps: 15,
    segmentLength: 30,
    capsuleWidth: 26,
    titles: ["赤ちゃん", "よちよち", "おむつ卒業", "トイレの練習生", "一人前のきばり", "快便ルーキー", "どっさり見習い", "ブリブリ平民", "黄金の右尻", "排出力の目覚め", "トイレの用心棒", "スッキリ騎士", "ウォシュレットの友", "便座の支配者", "紙を惜しまぬ者", "残便感ゼロ", "疾風怒濤の排出", "茶色の閃光", "マグナム・プープ", "プリッツ・マスター", "全自動きばり機", "大陸の創造主", "トイレの賢者", "聖なる排便", "不屈の肛門", "流星の如く", "重力への挑戦者", "ブリリアント・ベン", "ミラクル・ドロップ", "黄金郷の門番", "運の極み", "排出王", "ケツの錬金術師", "茶色い宝石職人", "無限の残便", "トイレを壊し者", "銀河鉄道の夜（トイレ）", "便意の魔術師", "ハイパー・スクワット", "音速のきばり", "伝説のウンチスト", "神の領域のきばり", "終焉の排出", "真実のトイレ", "宇宙の深淵なるベン", "概念としてのウンチ", "ビッグバン・プープ", "超越者", "次元の裂け目の尻", "トイレとの合一", "THE うんちんぐすたいる"]
};

let state = {
    score: 0,
    highScore: localStorage.getItem('unching_highscore') || 0,
    timeLeft: 0,
    isPlaying: false,
    trains: [],
    particles: [],
    lastTime: 0,
    dpr: window.devicePixelRatio || 1,
    canvasW: 0,
    canvasH: 0
};

const canvas = document.getElementById('effect-canvas');
const ctx = canvas.getContext('2d');
const gameContainer = document.getElementById('game-container');
const tapArea = document.getElementById('tap-area');

// --- 物理ノード ---
class Node {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.oldX = x; this.oldY = y;
    }
    update(w, h) {
        let vx = (this.x - this.oldX) * CONFIG.friction;
        let vy = (this.y - this.oldY) * CONFIG.friction;
        this.oldX = this.x; this.oldY = this.y;
        this.x += vx;
        this.y += vy + CONFIG.gravity;

        const r = CONFIG.capsuleWidth / 2;
        if (this.y > h - r) { this.y = h - r; this.oldY = this.y + vy * 0.4; }
        if (this.x < r) this.x = r;
        if (this.x > w - r) this.x = w - r;
    }
}

// --- 連結トレイン ---
class PooTrain {
    constructor(x, y, count) {
        this.nodes = [];
        this.chaos = Math.random() * 10;
        for (let i = 0; i <= count; i++) {
            this.nodes.push(new Node(x, y - i * 5));
        }
        // 排出の勢い
        const fx = (Math.random() - 0.5) * 30;
        const fy = 10 + Math.random() * 20;
        this.nodes.forEach(n => { n.oldX -= fx; n.oldY -= fy; });
    }
    update(w, h) {
        this.nodes.forEach(n => n.update(w, h));
        // カオスな振り子運動（先頭を少し揺らす）
        this.nodes[0].x += Math.sin(Date.now() * 0.02 + this.chaos) * 0.5;

        for (let s = 0; s < CONFIG.subSteps; s++) {
            for (let i = 0; i < this.nodes.length - 1; i++) {
                let n1 = this.nodes[i], n2 = this.nodes[i + 1];
                let dx = n2.x - n1.x, dy = n2.y - n1.y;
                let dist = Math.sqrt(dx * dx + dy * dy);
                let diff = (CONFIG.segmentLength - dist) / dist;
                n1.x -= dx * diff * 0.5; n1.y -= dy * diff * 0.5;
                n2.x += dx * diff * 0.5; n2.y += dy * diff * 0.5;
            }
        }
    }
    draw() {
        const r = CONFIG.capsuleWidth / 2;
        ctx.fillStyle = '#795548';
        for (let i = 0; i < this.nodes.length - 1; i++) {
            let n1 = this.nodes[i], n2 = this.nodes[i + 1];
            let angle = Math.atan2(n2.y - n1.y, n2.x - n1.x);
            let d = CONFIG.segmentLength + 2;
            ctx.save();
            ctx.translate(n1.x, n1.y);
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.arc(d, 0, r, 0, Math.PI * 2);
            ctx.rect(0, -r, d, r * 2);
            ctx.fill();
            // ハイライト
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            ctx.fillRect(0, -r/2, d, r/3);
            ctx.restore();
            ctx.fillStyle = '#795548'; // 色戻し
        }
    }
}

class Particle {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.vx = (Math.random()-0.5)*15;
        this.vy = (Math.random()-0.5)*15;
        this.life = 1.0;
        this.size = Math.random()*12 + 4;
    }
    update() {
        this.x += this.vx; this.y += this.vy;
        this.vy += 0.5; this.life -= 0.03;
    }
    draw() {
        ctx.fillStyle = `rgba(121, 85, 72, ${this.life})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI*2);
        ctx.fill();
    }
}

// --- コアロジック ---

function resize() {
    const rect = gameContainer.getBoundingClientRect();
    state.canvasW = rect.width;
    state.canvasH = rect.height;
    // 高解像度対応
    canvas.width = state.canvasW * state.dpr;
    canvas.height = state.canvasH * state.dpr;
    canvas.style.width = state.canvasW + 'px';
    canvas.style.height = state.canvasH + 'px';
}

function getButtPosition() {
    const rect = tapArea.getBoundingClientRect();
    const containerRect = gameContainer.getBoundingClientRect();
    return {
        x: (rect.left + rect.width / 2) - containerRect.left,
        y: (rect.top + rect.height / 2) - containerRect.top
    };
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(`screen-${id}`).classList.add('active');
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

// タップ（連打）イベント
tapArea.addEventListener('pointerdown', (e) => {
    if (!state.isPlaying) return;
    state.score++;
    document.getElementById('score-val').innerText = state.score;
    
    const pos = getButtPosition();

    // 加算数字演出
    const el = document.createElement('div');
    el.className = 'score-up';
    el.innerText = '+1';
    el.style.left = `${pos.x}px`; el.style.top = `${pos.y}px`;
    gameContainer.appendChild(el);
    setTimeout(() => el.remove(), 500);

    // シェイク＆おしり沈み
    gameContainer.classList.add('shake');
    document.getElementById('butt-target').style.transform = 'scale(0.8) translateY(15px)';
    setTimeout(() => {
        gameContainer.classList.remove('shake');
        document.getElementById('butt-target').style.transform = 'scale(1)';
    }, 50);

    // 排出パーティクル
    for(let i=0; i<5; i++) state.particles.push(new Particle(pos.x, pos.y));
});

function endGame() {
    state.isPlaying = false;
    const pos = getButtPosition();
    
    // 排出開始
    const tCount = Math.max(1, Math.min(20, Math.floor(state.score / 15)));
    const sPerT = Math.min(15, Math.ceil(state.score / (tCount + 1)) + 3);

    for (let i = 0; i < tCount; i++) {
        setTimeout(() => {
            state.trains.push(new PooTrain(pos.x, pos.y, sPerT));
            // 排出中もパーティクル
            for(let j=0; j<5; j++) state.particles.push(new Particle(pos.x, pos.y));
        }, i * 150);
    }

    if (state.score > state.highScore) {
        state.highScore = state.score;
        localStorage.setItem('unching_highscore', state.highScore);
    }
    
    document.getElementById('final-score').innerText = state.score;
    document.getElementById('rank-name').innerText = CONFIG.titles[Math.min(CONFIG.titles.length-1, Math.floor(state.score/20))];
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

    // 描画
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.scale(state.dpr, state.dpr); // 論理ピクセルで描画できるようにスケール

    // トレイン更新・描画
    state.trains.forEach(tr => {
        tr.update(state.canvasW, state.canvasH);
        tr.draw();
    });

    // パーティクル更新・描画
    for (let i = state.particles.length - 1; i >= 0; i--) {
        state.particles[i].update();
        state.particles[i].draw();
        if (state.particles[i].life <= 0) state.particles.splice(i, 1);
    }

    ctx.restore();
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
