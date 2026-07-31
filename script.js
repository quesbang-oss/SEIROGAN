/**
 * THE うんちんぐすたいる - ゲームロジック
 */

const CONFIG = {
    gameDuration: 10,
    gravity: 0.25,
    friction: 0.98,
    bounce: 0.7,
    particleColor: '#8D6E63',
    titles: []
};

// 称号の生成 (20点刻み 1000点以上まで)
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
    CONFIG.titles.push({ score: i * 20, name: rawTitles[i] || "究極の存在" });
}

// 状態管理
let state = {
    currentScreen: 'title',
    score: 0,
    highScore: 0,
    timeLeft: 0,
    isPlaying: false,
    capsules: [],
    particles: [],
    lastTime: 0
};

// DOM要素
const canvas = document.getElementById('effect-canvas');
const ctx = canvas.getContext('2d');
const screens = {
    title: document.getElementById('screen-title'),
    game: document.getElementById('screen-game'),
    result: document.getElementById('screen-result')
};
const scoreVal = document.getElementById('score-val');
const timeLeftVal = document.getElementById('time-left');
const finalScore = document.getElementById('final-score');
const rankName = document.getElementById('rank-name');
const titleHighScore = document.getElementById('title-high-score');
const resultHighScore = document.getElementById('result-high-score');
const buttTarget = document.getElementById('butt-target');
const gameContainer = document.getElementById('game-container');

// 初期化
window.addEventListener('load', () => {
    resize();
    loadHighScore();
    requestAnimationFrame(gameLoop);
});

window.addEventListener('resize', resize);

function resize() {
    canvas.width = gameContainer.clientWidth;
    canvas.height = gameContainer.clientHeight;
}

function loadHighScore() {
    state.highScore = localStorage.getItem('unching_highscore') || 0;
    titleHighScore.innerText = state.highScore;
    resultHighScore.innerText = state.highScore;
}

function saveHighScore() {
    if (state.score > state.highScore) {
        state.highScore = state.score;
        localStorage.setItem('unching_highscore', state.highScore);
        titleHighScore.innerText = state.highScore;
        resultHighScore.innerText = state.highScore;
    }
}

// 画面遷移
function showScreen(screenName) {
    Object.keys(screens).forEach(key => {
        screens[key].classList.remove('active');
    });
    screens[screenName].classList.add('active');
    state.currentScreen = screenName;
}

// 物理オブジェクト：カプセル
class Capsule {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = 30 + Math.random() * 20;
        this.h = this.w * 0.4;
        this.vx = (Math.random() - 0.5) * 15;
        this.vy = Math.random() * -10 - 5;
        this.angle = Math.random() * Math.PI * 2;
        this.va = (Math.random() - 0.5) * 0.3;
        this.color = '#795548';
        this.life = 1.0;
        this.chaosFactor = Math.random() * 0.2;
    }

    update() {
        this.vy += CONFIG.gravity;
        this.x += this.vx;
        this.y += this.vy;
        
        // カオスな揺れ
        this.vx += Math.sin(Date.now() * 0.01 + this.chaosFactor) * 0.5;
        this.angle += this.va;
        this.va *= 0.99;

        // 床バウンド
        if (this.y + this.h > canvas.height) {
            this.y = canvas.height - this.h;
            this.vy *= -CONFIG.bounce;
            this.vx *= CONFIG.friction;
        }
        // 壁バウンド
        if (this.x < 0 || this.x + this.w > canvas.width) {
            this.vx *= -CONFIG.bounce;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        // カプセル描画 (円＋長方形＋円)
        ctx.fillStyle = this.color;
        const r = this.h / 2;
        ctx.beginPath();
        ctx.arc(-this.w/2 + r, 0, r, Math.PI/2, Math.PI * 1.5);
        ctx.lineTo(this.w/2 - r, -r);
        ctx.arc(this.w/2 - r, 0, r, Math.PI * 1.5, Math.PI / 2);
        ctx.closePath();
        ctx.fill();
        
        // 光沢
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath();
        ctx.ellipse(-this.w/4, -r/3, this.w/4, r/4, 0, 0, Math.PI*2);
        ctx.fill();

        ctx.restore();
    }
}

// パーティクル
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 8 + 2;
        this.vx = (Math.random() - 0.5) * 10;
        this.vy = (Math.random() - 0.5) * 10;
        this.life = 1.0;
        this.decay = Math.random() * 0.02 + 0.01;
        this.sway = Math.random() * 0.1;
    }

    update() {
        this.x += this.vx + Math.sin(Date.now() * 0.05) * this.sway;
        this.y += this.vy;
        this.vy += CONFIG.gravity * 0.5;
        this.life -= this.decay;
    }

    draw(ctx) {
        ctx.fillStyle = `rgba(121, 85, 72, ${this.life})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ゲームループ
function gameLoop(timestamp) {
    const deltaTime = timestamp - state.lastTime;
    state.lastTime = timestamp;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (state.isPlaying) {
        updateTimer(deltaTime);
    }

    // パーティクル更新・描画
    for (let i = state.particles.length - 1; i >= 0; i--) {
        state.particles[i].update();
        state.particles[i].draw(ctx);
        if (state.particles[i].life <= 0) state.particles.splice(i, 1);
    }

    // カプセル更新・描画
    for (let i = state.capsules.length - 1; i >= 0; i--) {
        state.capsules[i].update();
        state.capsules[i].draw(ctx);
        // 結果画面以外では一定時間で消えるようにしても良いが、今回は出しっぱなしでカオスにする
        if (state.capsules.length > 300) state.capsules.shift(); 
    }

    requestAnimationFrame(gameLoop);
}

function updateTimer(dt) {
    state.timeLeft -= dt / 1000;
    if (state.timeLeft <= 0) {
        state.timeLeft = 0;
        endGame();
    }
    timeLeftVal.innerText = state.timeLeft.toFixed(1);
}

// ゲーム開始
document.getElementById('btn-start').addEventListener('click', startGame);
document.getElementById('btn-retry').addEventListener('click', startGame);

function startGame() {
    state.score = 0;
    state.timeLeft = CONFIG.gameDuration;
    state.isPlaying = true;
    state.capsules = [];
    state.particles = [];
    scoreVal.innerText = '0';
    showScreen('game');
}

// 連打処理
buttTarget.addEventListener('pointerdown', (e) => {
    if (!state.isPlaying) return;

    state.score++;
    scoreVal.innerText = state.score;

    // 演出：シェイク
    gameContainer.classList.add('shake');
    setTimeout(() => gameContainer.classList.remove('shake'), 50);

    // 演出：スコア加算数字
    createScoreEffect(e.clientX, e.clientY);

    // 演出：おしりの動き
    buttTarget.style.transform = 'scale(0.9) translateY(10px)';
    setTimeout(() => { buttTarget.style.transform = 'scale(1)'; }, 50);

    // 排出中パーティクル
    for(let i=0; i<3; i++) {
        state.particles.push(new Particle(canvas.width/2, canvas.height/2 + 50));
    }
});

function createScoreEffect(x, y) {
    const el = document.createElement('div');
    el.className = 'score-up';
    el.innerText = '+1';
    el.style.left = `${x - 20}px`;
    el.style.top = `${y - 40}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 500);
}

// ゲーム終了
function endGame() {
    state.isPlaying = false;
    saveHighScore();
    
    // 排出演出：スコア分だけカプセルを生成
    const count = Math.min(state.score, 500); // ブラウザ保護のため最大500個
    let delay = 0;
    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            state.capsules.push(new Capsule(canvas.width / 2, canvas.height / 2 + 50));
            // 排出中もパーティクルを出す
            state.particles.push(new Particle(canvas.width/2, canvas.height/2 + 50));
        }, i * 2);
    }

    // 称号決定
    let rank = CONFIG.titles[0].name;
    for (const t of CONFIG.titles) {
        if (state.score >= t.score) rank = t.name;
    }

    finalScore.innerText = state.score;
    rankName.innerText = rank;

    setTimeout(() => {
        showScreen('result');
    }, 1000);
}
