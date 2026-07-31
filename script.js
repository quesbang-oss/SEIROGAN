/**
 * THE うんちんぐすたいる - プロ仕様完全版
 */

const CONFIG = {
    gameDuration: 10,
    gravity: 0.6,
    friction: 0.95,
    bounce: 0.4,
    segmentDist: 12, // 連結の間隔
    pooWidth: 24,    // 太さ
    titles: []
};

// 称号データ生成
const rawTitles = [
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
for(let i=0; i<=50; i++) {
    CONFIG.titles.push({ score: i * 20, name: rawTitles[i] || "神" });
}

let state = {
    currentScreen: 'title',
    score: 0,
    highScore: 0,
    timeLeft: 0,
    isPlaying: false,
    pooChains: [], // 連結オブジェクト
    particles: [],
    lastTime: 0
};

const canvas = document.getElementById('effect-canvas');
const ctx = canvas.getContext('2d');
const screens = {
    title: document.getElementById('screen-title'),
    game: document.getElementById('screen-game'),
    result: document.getElementById('screen-result')
};
const scoreVal = document.getElementById('score-val');
const timeLeftVal = document.getElementById('time-left');
const gameContainer = document.getElementById('game-container');

// --- 物理クラス ---

class PooNode {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.oldX = x;
        this.oldY = y;
    }
}

class PooChain {
    constructor(startX, startY, length) {
        this.nodes = [];
        this.length = Math.max(3, Math.floor(length / 2)); // スコアに応じた長さ
        this.color = '#795548';
        this.chaosOffset = Math.random() * 1000;
        
        for (let i = 0; i < this.length; i++) {
            // 最初は少しずつ下にずらして生成
            this.nodes.push(new PooNode(startX + (Math.random()-0.5)*10, startY + i * 2));
        }
        
        // 初速（排出の勢い）
        const forceX = (Math.random() - 0.5) * 30;
        const forceY = 15 + Math.random() * 20;
        this.nodes.forEach(n => {
            n.oldX -= forceX;
            n.oldY -= forceY;
        });
    }

    update() {
        // 各ノードの移動 (Verlet積分)
        for (let i = 0; i < this.nodes.length; i++) {
            let n = this.nodes[i];
            let vx = (n.x - n.oldX) * CONFIG.friction;
            let vy = (n.y - n.oldY) * CONFIG.friction;
            
            // カオスな揺れ
            vx += Math.sin(Date.now() * 0.01 + this.chaosOffset + i) * 0.5;

            n.oldX = n.x;
            n.oldY = n.y;
            n.x += vx;
            n.y += vy + CONFIG.gravity;

            // 地面バウンド
            if (n.y > canvas.height - 10) {
                n.y = canvas.height - 10;
                n.oldY = n.y + vy * CONFIG.bounce;
            }
            // 壁
            if (n.x < 10) { n.x = 10; n.oldX = n.x + vx * CONFIG.bounce; }
            if (n.x > canvas.width - 10) { n.x = canvas.width - 10; n.oldX = n.x + vx * CONFIG.bounce; }
        }

        // 連結拘束（スティック）
        for (let j = 0; j < 5; j++) { // 精度のため5回反復
            for (let i = 0; i < this.nodes.length - 1; i++) {
                let n1 = this.nodes[i];
                let n2 = this.nodes[i + 1];
                let dx = n2.x - n1.x;
                let dy = n2.y - n1.y;
                let dist = Math.sqrt(dx * dx + dy * dy);
                let diff = (CONFIG.segmentDist - dist) / dist;
                let offsetX = dx * diff * 0.5;
                let offsetY = dy * diff * 0.5;
                n1.x -= offsetX;
                n1.y -= offsetY;
                n2.x += offsetX;
                n2.y += offsetY;
            }
        }
    }

    draw(ctx) {
        if (this.nodes.length < 2) return;

        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.strokeStyle = this.color;
        ctx.lineWidth = CONFIG.pooWidth;

        ctx.beginPath();
        ctx.moveTo(this.nodes[0].x, this.nodes[0].y);
        for (let i = 1; i < this.nodes.length; i++) {
            // ベジェ曲線で滑らかに連結
            const xc = (this.nodes[i].x + this.nodes[i - 1].x) / 2;
            const yc = (this.nodes[i].y + this.nodes[i - 1].y) / 2;
            ctx.quadraticCurveTo(this.nodes[i - 1].x, this.nodes[i - 1].y, xc, yc);
        }
        ctx.stroke();

        // テカリの演出
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = CONFIG.pooWidth / 3;
        ctx.stroke();
    }
}

class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 10 + 5;
        this.vx = (Math.random() - 0.5) * 15;
        this.vy = (Math.random() - 0.5) * 15;
        this.life = 1.0;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += CONFIG.gravity;
        this.life -= 0.02;
    }
    draw(ctx) {
        ctx.fillStyle = `rgba(141, 110, 99, ${this.life})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// --- システムロジック ---

function resize() {
    canvas.width = gameContainer.clientWidth;
    canvas.height = gameContainer.clientHeight;
}

function loadHighScore() {
    state.highScore = localStorage.getItem('unching_highscore') || 0;
    document.getElementById('title-high-score').innerText = state.highScore;
    document.getElementById('result-high-score').innerText = state.highScore;
}

function startGame() {
    state.score = 0;
    state.timeLeft = CONFIG.gameDuration;
    state.pooChains = [];
    state.particles = [];
    state.isPlaying = true;
    scoreVal.innerText = '0';
    showScreen('game');
}

function showScreen(name) {
    Object.keys(screens).forEach(s => screens[s].classList.remove('active'));
    screens[name].classList.add('active');
}

function createScoreEffect(x, y) {
    const el = document.createElement('div');
    el.className = 'score-up';
    el.innerText = '+1';
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 600);
}

// タップイベント
document.querySelector('.tap-area').addEventListener('pointerdown', (e) => {
    if (!state.isPlaying) return;
    
    state.score++;
    scoreVal.innerText = state.score;

    // シェイク
    gameContainer.classList.add('shake');
    setTimeout(() => gameContainer.classList.remove('shake'), 50);

    // おしりアクション
    document.getElementById('butt-target').style.transform = 'scale(0.8) translateY(20px)';
    setTimeout(() => {
        document.getElementById('butt-target').style.transform = 'scale(1)';
    }, 50);

    createScoreEffect(e.clientX, e.clientY);

    // 排出パーティクル
    for(let i=0; i<5; i++) {
        state.particles.push(new Particle(canvas.width/2, canvas.height/2));
    }
});

function endGame() {
    state.isPlaying = false;
    
    // 排出演出：スコアに応じて「連結したブツ」を生成
    // スコアが多いほど、本数が増え、一本あたりの長さも伸びる
    const numChains = Math.min(10, Math.ceil(state.score / 10));
    for (let i = 0; i < numChains; i++) {
        setTimeout(() => {
            const len = Math.min(30, Math.ceil(state.score / 5));
            state.pooChains.push(new PooChain(canvas.width / 2, canvas.height / 2, len));
        }, i * 150);
    }

    // ハイスコア更新
    if (state.score > state.highScore) {
        state.highScore = state.score;
        localStorage.setItem('unching_highscore', state.highScore);
    }

    // 称号
    let rank = CONFIG.titles[0].name;
    for (const t of CONFIG.titles) {
        if (state.score >= t.score) rank = t.name;
    }

    document.getElementById('final-score').innerText = state.score;
    document.getElementById('rank-name').innerText = rank;
    document.getElementById('result-high-score').innerText = state.highScore;

    setTimeout(() => showScreen('result'), 2000);
}

function gameLoop(time) {
    const dt = time - state.lastTime;
    state.lastTime = time;

    if (state.isPlaying) {
        state.timeLeft -= dt / 1000;
        if (state.timeLeft <= 0) {
            state.timeLeft = 0;
            endGame();
        }
        timeLeftVal.innerText = state.timeLeft.toFixed(1);
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 連結ブツの更新・描画
    state.pooChains.forEach(chain => {
        chain.update();
        chain.draw(ctx);
    });

    // パーティクルの更新・描画
    for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.update();
        p.draw(ctx);
        if (p.life <= 0) state.particles.splice(i, 1);
    }

    requestAnimationFrame(gameLoop);
}

// 起動
window.addEventListener('load', () => {
    resize();
    loadHighScore();
    requestAnimationFrame(gameLoop);
});
window.addEventListener('resize', resize);

document.getElementById('btn-start').addEventListener('click', startGame);
document.getElementById('btn-retry').addEventListener('click', startGame);
