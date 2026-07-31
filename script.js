const CONFIG = {
    gameDuration: 10,
    gravity: 0.7,
    friction: 0.96,
    subSteps: 10,
    segmentLength: 25,
    thickness: 24,
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
    width: 0,
    height: 0
};

const canvas = document.getElementById('effect-canvas');
const ctx = canvas.getContext('2d');
const gameContainer = document.getElementById('game-container');
const tapArea = document.getElementById('tap-area');

// --- 物理クラス ---
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

        const r = CONFIG.thickness / 2;
        if (this.y > h - r) { this.y = h - r; this.oldY = this.y + vy * 0.3; }
        if (this.x < r) this.x = r;
        if (this.x > w - r) this.x = w - r;
    }
}

class PooTrain {
    constructor(x, y, count) {
        this.nodes = [];
        for (let i = 0; i <= count; i++) this.nodes.push(new Node(x, y - i * 5));
        const fx = (Math.random() - 0.5) * 20;
        const fy = 10 + Math.random() * 15;
        this.nodes.forEach(n => { n.oldX -= fx; n.oldY -= fy; });
    }
    update(w, h) {
        this.nodes.forEach(n => n.update(w, h));
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
        const r = CONFIG.thickness / 2;
        ctx.fillStyle = '#6D4C41';
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
            ctx.restore();
        }
    }
}

class Particle {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.vx = (Math.random() - 0.5) * 10;
        this.vy = (Math.random() - 0.5) * 10;
        this.life = 1.0;
    }
    update() { this.x += this.vx; this.y += this.vy; this.vy += 0.5; this.life -= 0.03; }
    draw() {
        ctx.fillStyle = `rgba(109, 76, 65, ${this.life})`;
        ctx.beginPath(); ctx.arc(this.x, this.y, 6, 0, Math.PI * 2); ctx.fill();
    }
}

// --- 管理ロジック ---

function resize() {
    const rect = gameContainer.getBoundingClientRect();
    state.width = rect.width;
    state.height = rect.height;
    // Canvasの解像度を物理ピクセルに合わせつつ、CSSサイズを固定
    const dpr = window.devicePixelRatio || 1;
    canvas.width = state.width * dpr;
    canvas.height = state.height * dpr;
    ctx.scale(dpr, dpr);
}

function getSpawnPos() {
    const rect = tapArea.getBoundingClientRect();
    const containerRect = gameContainer.getBoundingClientRect();
    return {
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top + rect.height / 2
    };
}

function startGame() {
    state.score = 0; state.timeLeft = CONFIG.gameDuration;
    state.isPlaying = true; state.trains = []; state.particles = [];
    document.getElementById('score-val').innerText = '0';
    showScreen('game');
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(`screen-${id}`).classList.add('active');
}

tapArea.addEventListener('pointerdown', (e) => {
    if (!state.isPlaying) return;
    state.score++;
    document.getElementById('score-val').innerText = state.score;

    const pos = getSpawnPos();
    const el = document.createElement('div');
    el.className = 'score-up';
    el.innerText = '+1';
    el.style.left = `${pos.x}px`; el.style.top = `${pos.y - 20}px`;
    gameContainer.appendChild(el);
    setTimeout(() => el.remove(), 500);

    gameContainer.classList.add('shake');
    setTimeout(() => gameContainer.classList.remove('shake'), 50);

    for (let i = 0; i < 3; i++) state.particles.push(new Particle(pos.x, pos.y));
});

function endGame() {
    state.isPlaying = false;
    const pos = getSpawnPos();
    const tCount = Math.max(1, Math.min(20, Math.floor(state.score / 15)));
    const sPerT = Math.min(12, Math.floor(state.score / (tCount + 1)) + 2);

    for (let i = 0; i < tCount; i++) {
        setTimeout(() => {
            state.trains.push(new PooTrain(pos.x, pos.y, sPerT));
            for (let j = 0; j < 5; j++) state.particles.push(new Particle(pos.x, pos.y));
        }, i * 150);
    }

    if (state.score > state.highScore) {
        state.highScore = state.score;
        localStorage.setItem('unching_highscore', state.highScore);
    }
    document.getElementById('final-score').innerText = state.score;
    document.getElementById('rank-name').innerText = CONFIG.titles[Math.min(CONFIG.titles.length - 1, Math.floor(state.score / 20))];
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

    ctx.clearRect(0, 0, state.width, state.height);
    state.trains.forEach(tr => { tr.update(state.width, state.height); tr.draw(); });
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
