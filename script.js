/**
 * THE うんちんぐすたいる
 * 商用品質メインロジック
 */

const CONFIG = {
    gameDuration: 10,
    gravity: 0.25,
    friction: 0.98,
    bounce: 0.7,
    maxParticles: 100,
    maxCapsules: 200
};

const RANKS = [
    "赤ちゃん", "よちよち", "おむつ卒業", "トイレトレーニング中", "自立への第一歩",
    "快便の使者", "安定した軌道", "熟練のキバリ", "黄金の残光", "腹圧の魔術師",
    "規格外の排出力", "流線型の美学", "重力に抗う者", "括約筋の騎士", "スムーズ・オペレーター",
    "鋼鉄の腸内環境", "疾風怒濤の放出", "黄金郷の門番", "大地の咆哮", "聖なる一撃",
    "音速の貴公子", "弾丸の如く", "無尽蔵のエネルギー", "伝説の幕開け", "究極の排泄道",
    "悟りの境地", "黄金比の体現", "宇宙の塵", "銀河の瞬き", "流星群の源",
    "大気圏突破", "時空の歪み", "量子排泄", "暗黒物質の生成", "特異点の観測者",
    "次元を超越せし者", "万物の創造主", "全知全能の腸", "運命の導き", "終わらない宴",
    "破滅と再生の神", "無限の連撃", "黄金の神話", "最終兵器", "滅びの予兆",
    "絶対君主", "天上天下唯我独尊", "究極生命体", "排泄王", "伝説の完遂者",
    "THE うんちんぐすたいる"
];

class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 8 + 4;
        this.vx = (Math.random() - 0.5) * 10;
        this.vy = Math.random() * 5 + 2;
        this.color = "#8b4513";
        this.opacity = 1;
        this.life = 1.0;
    }

    update() {
        this.x += this.vx + Math.sin(Date.now() * 0.01) * 2;
        this.y += this.vy;
        this.life -= 0.02;
        this.opacity = Math.max(0, this.life);
    }

    draw(ctx) {
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}

class Capsule {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 40;
        this.vx = (Math.random() - 0.5) * 15;
        this.vy = Math.random() * 10 + 5;
        this.rotation = Math.random() * Math.PI * 2;
        this.vRotation = (Math.random() - 0.5) * 0.2;
        this.color = "#d2691e";
        this.grounded = false;
    }

    update(canvasHeight) {
        if (!this.grounded) {
            this.vy += CONFIG.gravity;
            this.x += this.vx;
            this.y += this.vy;
            this.rotation += this.vRotation;

            if (this.y + this.height/2 > canvasHeight) {
                this.y = canvasHeight - this.height/2;
                this.vy *= -CONFIG.bounce;
                this.vx *= CONFIG.friction;
                if (Math.abs(this.vy) < 1) {
                    this.vy = 0;
                    this.vRotation = 0;
                    this.grounded = true;
                }
            }
            // 壁バウンド
            if (this.x < 0 || this.x > window.innerWidth) this.vx *= -1;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        // カプセル描画 (丸+長方形+丸)
        ctx.fillStyle = this.color;
        ctx.beginPath();
        const r = this.width / 2;
        ctx.arc(0, -this.height / 2 + r, r, Math.PI, 0);
        ctx.lineTo(r, this.height / 2 - r);
        ctx.arc(0, this.height / 2 - r, r, 0, Math.PI);
        ctx.lineTo(-r, -this.height / 2 + r);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#5d2e0c";
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.restore();
    }
}

const Game = {
    score: 0,
    highScore: 0,
    timeLeft: 0,
    state: 'TITLE', // TITLE, PLAYING, ENDING, RESULT
    particles: [],
    capsules: [],
    lastTapTime: 0,

    init() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.highScore = localStorage.getItem('unchi_highscore') || 0;
        
        window.addEventListener('resize', () => this.resize());
        this.resize();

        // イベント登録
        document.getElementById('btn-start').addEventListener('click', () => this.start());
        document.getElementById('btn-retry').addEventListener('click', () => this.start());
        
        const tapZone = document.getElementById('tap-zone');
        const handleTap = (e) => {
            e.preventDefault();
            if (this.state === 'PLAYING') this.tap();
        };
        tapZone.addEventListener('touchstart', handleTap, { passive: false });
        tapZone.addEventListener('mousedown', handleTap);

        this.updateHUD();
        this.loop();
    },

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    },

    start() {
        this.score = 0;
        this.timeLeft = CONFIG.gameDuration;
        this.particles = [];
        this.capsules = [];
        this.switchScreen('screen-game');
        this.state = 'PLAYING';
        this.updateHUD();
    },

    tap() {
        this.score++;
        this.updateHUD();
        this.createTapEffect();
        this.shakeScreen();

        // タップ中にパーティクル生成
        for (let i = 0; i < 3; i++) {
            this.particles.push(new Particle(window.innerWidth / 2, 250));
        }
        if (this.particles.length > CONFIG.maxParticles) this.particles.shift();
    },

    createTapEffect() {
        const effect = document.createElement('div');
        effect.className = 'score-up';
        effect.innerText = '+1';
        effect.style.left = (window.innerWidth / 2 + (Math.random() - 0.5) * 100) + 'px';
        effect.style.top = '250px';
        document.getElementById('screen-game').appendChild(effect);
        setTimeout(() => effect.remove(), 500);
    },

    shakeScreen() {
        const container = document.getElementById('game-container');
        container.classList.add('shake');
        clearTimeout(this.shakeTimer);
        this.shakeTimer = setTimeout(() => container.classList.remove('shake'), 100);
    },

    updateHUD() {
        document.getElementById('time-val').innerText = this.timeLeft.toFixed(1);
        document.getElementById('score-val').innerText = this.score;
        document.getElementById('high-score-val').innerText = this.highScore;
    },

    endGame() {
        this.state = 'ENDING';
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('unchi_highscore', this.highScore);
        }

        // 排出演出用カプセル生成
        const count = Math.min(this.score, CONFIG.maxCapsules);
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                this.capsules.push(new Capsule(window.innerWidth / 2, 250));
            }, i * 20);
        }

        setTimeout(() => {
            this.showResult();
        }, Math.max(2000, count * 20 + 1000));
    },

    showResult() {
        this.state = 'RESULT';
        document.getElementById('final-score').innerText = this.score;
        document.getElementById('final-best').innerText = this.highScore;
        
        // 称号決定
        let rankIdx = Math.floor(this.score / 20);
        if (rankIdx >= RANKS.length) rankIdx = RANKS.length - 1;
        document.getElementById('rank-text').innerText = RANKS[rankIdx];

        this.switchScreen('screen-result');
    },

    switchScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
    },

    loop() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.state === 'PLAYING') {
            this.timeLeft -= 1 / 60;
            if (this.timeLeft <= 0) {
                this.timeLeft = 0;
                this.endGame();
            }
            this.updateHUD();
        }

        // パーティクル更新
        this.particles.forEach((p, i) => {
            p.update();
            p.draw(this.ctx);
            if (p.life <= 0) this.particles.splice(i, 1);
        });

        // カプセル更新
        this.capsules.forEach(c => {
            c.update(this.canvas.height);
            c.draw(this.ctx);
        });

        requestAnimationFrame(() => this.loop());
    }
};

// 起動
window.onload = () => Game.init();
