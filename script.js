/**
 * THE うんちんぐすたいる - 物理拘束強化版
 */

const CONFIG = {
    gameDuration: 10,
    gravity: 0.7,
    friction: 0.96,
    bounce: 0.3,
    subSteps: 12,      // 物理演算の反復回数（これが多いほど分離しない）
    segmentDist: 10,   // 節の間の長さ
    thickness: 22,     // 太さ
    titles: []
};

// 称号データ生成
const rawTitles = ["赤ちゃん", "よちよち", "おむつ卒業", "トイレの練習生", "一人前のきばり", "快便ルーキー", "どっさり見習い", "ブリブリ平民", "黄金の右尻", "排出力の目覚め", "トイレの用心棒", "スッキリ騎士", "ウォシュレットの友", "便座の支配者", "紙を惜しまぬ者", "残便感ゼロ", "疾風怒濤の排出", "茶色の閃光", "マグナム・プープ", "プリッツ・マスター", "全自動きばり機", "大陸の創造主", "トイレの賢者", "聖なる排便", "不屈の肛門", "流星の如く", "重力への挑戦者", "ブリリアント・ベン", "ミラクル・ドロップ", "黄金郷の門番", "運の極み", "排出王", "ケツの錬金術師", "茶色い宝石職人", "無限の残便", "トイレを壊し者", "銀河鉄道の夜（トイレ）", "便意の魔術師", "ハイパー・スクワット", "音速のきばり", "伝説のウンチスト", "神の領域のきばり", "終焉の排出", "真実のトイレ", "宇宙の深淵なるベン", "概念としてのウンチ", "ビッグバン・プープ", "超越者", "次元の裂け目の尻", "トイレとの合一", "THE うんちんぐすたいる"];
for(let i=0; i<=50; i++) CONFIG.titles.push({ score: i * 20, name: rawTitles[i] || "神" });

let state = {
    score: 0,
    highScore: localStorage.getItem('unching_highscore') || 0,
    timeLeft: 0,
    isPlaying: false,
    chains: [],
    particles: [],
    lastTime: 0
};

const canvas = document.getElementById('effect-canvas');
const ctx = canvas.getContext('2d');
const gameContainer = document.getElementById('game-container');

// --- 物理エンジン部分 ---

class Node {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.oldX = x; this.oldY = y;
    }
}

class Chain {
    constructor(x, y, segments) {
        this.nodes = [];
        for (let i = 0; i < segments; i++) {
            this.nodes.push(new Node(x, y + i));
        }
        // 初速（排出インパクト）
        const angle = (Math.PI / 2) + (Math.random() - 0.5) * 0.5; // ほぼ真下
        const force = 15 + Math.random() * 15;
        this.nodes.forEach((n, i) => {
            n.oldX -= Math.cos(angle) * force * (1 - i/segments);
            n.oldY -= Math.sin(angle) * force * (1 - i/segments);
        });
    }

    update() {
        // 1. 積分（移動）
        this.nodes.forEach(n => {
            const vx = (n.x - n.oldX) * CONFIG.friction;
            const vy = (n.y - n.oldY) * CONFIG.friction;
            n.oldX = n.x; n.oldY = n.y;
            n.x += vx;
            n.y += vy + CONFIG.gravity;
        });

        // 2. 拘束解決（サブステップ実行で絶対分離させない）
        for (let s = 0; s < CONFIG.subSteps; s++) {
            for (let i = 0; i < this.nodes.length - 1; i++) {
                const n1 = this.nodes[i];
                const n2 = this.nodes[i+1];
                const dx = n2.x - n1.x;
                const dy = n2.y - n1.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                const error = (dist - CONFIG.segmentDist) / dist;
                
                // 振り子的な連結維持
                n1.x += dx * error * 0.5;
                n1.y += dy * error * 0.5;
                n2.x -= dx * error * 0.5;
                n2.y -= dy * error * 0.5;
            }
            
            // 地面・壁の衝突もサブステップ内で処理（めり込み防止）
            this.nodes.forEach(n => {
                if (n.y > canvas.height - 10) n.y = canvas.height - 10;
                if (n.x < 10) n.x = 10;
                if (n.x > canvas.width - 10) n.x = canvas.width - 10;
            });
        }
    }

    draw() {
        ctx.beginPath();
        ctx.lineWidth = CONFIG.thickness;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#6D4C41';
        
        ctx.moveTo(this.nodes[0].x, this.nodes[0].y);
        for (let i = 1; i < this.nodes.length; i++) {
            // 滑らかに補完
            const xc = (this.nodes[i].x + this.nodes[i-1].x) / 2;
            const yc = (this.nodes[i].y + this.nodes[i-1].y) / 2;
            ctx.quadraticCurveTo(this.nodes[i-1].x, this.nodes[i-1].y, xc, yc);
        }
        ctx.stroke();

        // 照り返し（ヌルヌル感）
        ctx.beginPath();
        ctx.lineWidth = CONFIG.thickness / 2.5;
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.moveTo(this.nodes[0].x - 2, this.nodes[0].y);
        for (let i = 1; i < this.nodes.length; i++) {
            ctx.lineTo(this.nodes[i].x - 2, this.nodes[i].y);
        }
        ctx.stroke();
    }
}

class Particle {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.vx = (Math.random()-0.5)*10;
        this.vy = (Math.random()-0.5)*10;
        this.life = 1.0;
        this.size = Math.random()*8 + 2;
    }
    update() {
        this.x += this.vx; this.y += this.vy;
        this.vy += 0.5; this.life -= 0.03;
    }
    draw() {
        ctx.fillStyle = `rgba(109, 76, 65, ${this.life})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI*2);
        ctx.fill();
    }
}

// --- ゲーム管理 ---

function resize() {
    canvas.width = gameContainer.clientWidth;
    canvas.height = gameContainer.clientHeight;
}

function startGame() {
    state.score = 0;
    state.timeLeft = CONFIG.gameDuration;
    state.isPlaying = true;
    state.chains = [];
    state.particles = [];
    document.getElementById('score-val').innerText = '0';
    showScreen('game');
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(`screen-${id}`).classList.add('active');
}

function tapEffect(x, y) {
    const el = document.createElement('div');
    el.className = 'score-up';
    el.innerText = '+1';
    el.style.left = `${x}px`; el.style.top = `${y}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 500);

    gameContainer.classList.add('shake');
    setTimeout(() => gameContainer.classList.remove('shake'), 50);
}

document.querySelector('.tap-area').addEventListener('pointerdown', (e) => {
    if (!state.isPlaying) return;
    state.score++;
    document.getElementById('score-val').innerText = state.score;
    tapEffect(e.clientX, e.clientY);
    
    // 排出パーティクル
    for(let i=0; i<3; i++) state.particles.push(new Particle(canvas.width/2, canvas.height/2));
});

function endGame() {
    state.isPlaying = false;
    
    // 排出：スコアに応じて「絶対に分離しない長い塊」を出す
    const count = Math.min(15, Math.ceil(state.score / 15));
    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            const segments = Math.min(25, Math.floor(state.score / 10) + 5);
            state.chains.push(new Chain(canvas.width/2, canvas.height/2, segments));
        }, i * 200);
    }

    if (state.score > state.highScore) {
        state.highScore = state.score;
        localStorage.setItem('unching_highscore', state.highScore);
    }

    let rank = CONFIG.titles.find(t => state.score < t.score)?.name || "THE うんちんぐすたいる";
    document.getElementById('final-score').innerText = state.score;
    document.getElementById('rank-name').innerText = rank;
    document.getElementById('result-high-score').innerText = state.highScore;

    setTimeout(() => showScreen('result'), 2000);
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

    state.chains.forEach(c => { c.update(); c.draw(); });
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
