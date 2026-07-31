/**
 * THE うんちんぐすたいる - 究極エフェクト版
 */

const CONFIG = {
    duration: 10,
    gravity: 0.8,
    friction: 0.96,
    subSteps: 12,
    trainThickness: 28,
    segmentDist: 20,
    titles: ["赤ちゃん", "よちよち", "おむつ卒業", "トイレの練習生", "一人前のきばり", "快便ルーキー", "どっさり見習い", "ブリブリ平民", "黄金の右尻", "排出力の目覚め", "トイレの用心棒", "スッキリ騎士", "ウォシュレットの友", "便座の支配者", "紙を惜しまぬ者", "残便感ゼロ", "疾風怒濤の排出", "茶色の閃光", "マグナム・プープ", "プリッツ・マスター", "全自動きばり機", "大陸の創造主", "トイレの賢者", "聖なる排便", "不屈の肛門", "流星の如く", "重力への挑戦者", "ブリリアント・ベン", "ミラクル・ドロップ", "黄金郷の門番", "運の極み", "排出王", "ケツの錬金術師", "茶色い宝石職人", "無限の残便", "トイレを壊し者", "銀河鉄道の夜（トイレ）", "便意の魔術師", "ハイパー・スクワット", "音速のきばり", "伝説のウンチスト", "神の領域のきばり", "終焉の排出", "真実のトイレ", "宇宙の深淵なるベン", "概念としてのウンチ", "ビッグバン・プープ", "超越者", "次元の裂け目の尻", "トイレとの合一", "THE うんちんぐすたいる"]
};

let state = {
    score: 0,
    timeLeft: 0,
    isPlaying: false,
    objects: [], // ウンチトレインとパーティクルを統合管理
    lastTime: 0,
    dpr: window.devicePixelRatio || 1
};

const canvas = document.getElementById('effect-canvas');
const ctx = canvas.getContext('2d');
const gameContainer = document.getElementById('game-container');
const anus = document.getElementById('anus');

// --- 物理ノード ---
class Node {
    constructor(x, y) {
        this.x = x; this.y = y; this.px = x; this.py = y;
    }
    update(w, h) {
        let vx = (this.x - this.px) * CONFIG.friction;
        let vy = (this.y - this.py) * CONFIG.friction;
        this.px = this.x; this.py = this.y;
        this.x += vx;
        this.y += vy + CONFIG.gravity;

        // 地面衝突
        const r = CONFIG.trainThickness / 2;
        if (this.y > h - r) {
            this.y = h - r;
            this.py = this.y + vy * 0.3;
        }
        if (this.x < r) this.x = r;
        if (this.x > w - r) this.x = w - r;
    }
}

// --- 連結トレイン ---
class UnchingTrain {
    constructor(x, y, segments) {
        this.nodes = [];
        this.type = 'train';
        for (let i = 0; i < segments; i++) {
            this.nodes.push(new Node(x, y - i * 5));
        }
        // 排出パワー
        const angle = (Math.PI/2) + (Math.random()-0.5) * 0.8;
        const pwr = 15 + Math.random() * 20;
        this.nodes.forEach(n => {
            n.px -= Math.cos(angle) * pwr;
            n.py -= Math.sin(angle) * pwr;
        });
    }
    update(w, h) {
        this.nodes.forEach(n => n.update(w, h));
        for (let s = 0; s < CONFIG.subSteps; s++) {
            for (let i = 0; i < this.nodes.length - 1; i++) {
                let n1 = this.nodes[i], n2 = this.nodes[i+1];
                let dx = n2.x - n1.x, dy = n2.y - n1.y;
                let d = Math.sqrt(dx*dx + dy*dy);
                let err = (CONFIG.segmentDist - d) / d;
                n1.x -= dx * err * 0.5; n1.y -= dy * err * 0.5;
                n2.x += dx * err * 0.5; n2.y += dy * err * 0.5;
            }
        }
    }
    draw() {
        ctx.beginPath();
        ctx.lineWidth = CONFIG.trainThickness;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#795548';
        ctx.moveTo(this.nodes[0].x, this.nodes[0].y);
        for (let i = 1; i < this.nodes.length; i++) {
            const xc = (this.nodes[i].x + this.nodes[i-1].x) / 2;
            const yc = (this.nodes[i].y + this.nodes[i-1].y) / 2;
            ctx.quadraticCurveTo(this.nodes[i-1].x, this.nodes[i-1].y, xc, yc);
        }
        ctx.stroke();
        // ハイライト（ヌルヌル感）
        ctx.beginPath();
        ctx.lineWidth = CONFIG.trainThickness / 3;
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.moveTo(this.nodes[0].x - 3, this.nodes[0].y);
        for (let i = 1; i < this.nodes.length; i++) {
            ctx.lineTo(this.nodes[i].x - 3, this.nodes[i].y);
        }
        ctx.stroke();
    }
}

// --- 小さなパーティクル ---
class PooBit {
    constructor(x, y) {
        this.type = 'bit';
        this.x = x; this.y = y;
        this.vx = (Math.random()-0.5) * 15;
        this.vy = (Math.random()-0.5) * 15;
        this.life = 1.0;
        this.size = Math.random() * 10 + 5;
    }
    update() {
        this.x += this.vx; this.y += this.vy;
        this.vy += CONFIG.gravity;
        this.life -= 0.02;
    }
    draw() {
        ctx.fillStyle = `rgba(121, 85, 72, ${this.life})`;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI*2); ctx.fill();
    }
}

// --- システム ---

function resize() {
    const rect = gameContainer.getBoundingClientRect();
    canvas.width = rect.width * state.dpr;
    canvas.height = rect.height * state.dpr;
    ctx.scale(state.dpr, state.dpr);
}

function getAnusPos() {
    const r = anus.getBoundingClientRect();
    const cr = gameContainer.getBoundingClientRect();
    return { x: r.left - cr.left + 5, y: r.top - cr.top + 5 };
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(`screen-${id}`).classList.add('active');
}

function spawnPoo(x, y, isBig = false) {
    if (isBig) {
        state.objects.push(new UnchingTrain(x, y, Math.min(20, 5 + Math.floor(state.score/10))));
    } else {
        state.objects.push(new PooBit(x, y));
    }
}

document.getElementById('tap-area').addEventListener('pointerdown', (e) => {
    if (!state.isPlaying) return;
    state.score++;
    document.getElementById('score-val').innerText = state.score;

    const pos = getAnusPos();
    
    // スコア数字
    const el = document.createElement('div');
    el.className = 'score-up';
    el.innerText = '+1';
    el.style.left = `${pos.x}px`; el.style.top = `${pos.y}px`;
    gameContainer.appendChild(el);
    setTimeout(() => el.remove(), 600);

    // 揺れ
    gameContainer.classList.add('shake');
    setTimeout(() => gameContainer.classList.remove('shake'), 50);

    // 連打中も小出しにパーティクル
    for(let i=0; i<3; i++) spawnPoo(pos.x, pos.y, false);
    // 10点ごとに中サイズのウンチを出す
    if(state.score % 10 === 0) spawnPoo(pos.x, pos.y, true);
});

function startGame() {
    state.score = 0;
    state.timeLeft = CONFIG.duration;
    state.isPlaying = true;
    state.objects = [];
    document.getElementById('score-val').innerText = '0';
    showScreen('game');
}

function endGame() {
    state.isPlaying = false;
    const pos = getAnusPos();
    
    // 最後に溜まった分を一気に連結排出！
    const finalCount = Math.min(15, Math.ceil(state.score / 15));
    for(let i=0; i<finalCount; i++) {
        setTimeout(() => {
            spawnPoo(pos.x, pos.y, true);
        }, i * 150);
    }

    const highScore = localStorage.getItem('unching_highscore') || 0;
    if (state.score > highScore) localStorage.setItem('unching_highscore', state.score);

    document.getElementById('final-score').innerText = state.score;
    document.getElementById('rank-name').innerText = CONFIG.titles[Math.min(CONFIG.titles.length-1, Math.floor(state.score/20))];
    document.getElementById('result-high-score').innerText = localStorage.getItem('unching_highscore');

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
    const w = canvas.width / state.dpr;
    const h = canvas.height / state.dpr;
    ctx.clearRect(0, 0, w, h);

    for (le
