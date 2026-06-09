// 魔導貓跑酷遊戲腳本

// Hidden gameplay tuning (隱藏設定：藉由按住按鍵時間決定長跳或短跳)
const hiddenConfig = {
    jumpPower: 13.0,                 // 初始跳躍向上衝量 (第一下按下去的瞬發衝力)
    maxJumpHold: 200,                // 按住 Space 增加跳躍高度的最大時間 (ms)
    holdGravityMult: 0.3,            // 按住按鈕不放時的重力倍率 (大幅減弱重力以達到長跳飄浮感)
};

const runnerState = {
    gameStarted: false,
    gameOver: false,
    score: 0,
    speedMultiplier: 1,
    obstacles: [],
    lastSpawn: 0,
    spawnDelay: 0,
    playerY: 0,
    playerVelocity: 0,
    gravity: 0.86,
    jumpHoldStart: null,
    jumpKeyPressed: false,           // 記錄跳躍鍵目前是否被按住
    crouching: false,
    animationFrame: null,
    lastTime: null,
    lastDeathTime: 0,                // 記錄死亡時間，防止誤觸 Space 立即重開
};

const elements = {
    score: document.getElementById('score'),
    speed: document.getElementById('speed'),
    status: document.getElementById('game-status'),
    startBtn: document.getElementById('start-btn'),
    gameStage: document.querySelector('.game-stage'),
    player: document.getElementById('player'),
    obstacleLayer: document.getElementById('obstacle-layer'),
    // 新增排行榜相關元件
    nameModal: document.getElementById('name-modal'),
    modalScoreVal: document.getElementById('modal-score-val'),
    playerNameInput: document.getElementById('player-name-input'),
    submitScoreBtn: document.getElementById('submit-score-btn'),
    leaderboardModal: document.getElementById('leaderboard-modal'),
    closeLeaderboardBtn: document.getElementById('close-leaderboard-btn'),
    leaderboardBtn: document.getElementById('leaderboard-btn'),
    tabLocal: document.getElementById('tab-local'),
    tabGlobal: document.getElementById('tab-global'),
    leaderboardRows: document.getElementById('leaderboard-rows'),
    leaderboardLoading: document.getElementById('leaderboard-loading'),
};

const obstacleTypes = ['low', 'mid', 'high'];

// ==========================================
// 排行榜邏輯 (本地與全球儲存)
// ==========================================

const GLOBAL_DB_URL = 'https://kvdb.io/bobo_runner_db_9a7x/leaderboard';
let currentTab = 'local'; // 'local' 或 'global'
let currentScoreToSave = 0;

// 取得本地高分資料
function getLocalScores() {
    const data = localStorage.getItem('bobochen_runner_local_scores');
    return data ? JSON.parse(data) : [];
}

// 儲存本地高分資料
function saveLocalScore(name, score) {
    const scores = getLocalScores();
    const newEntry = {
        name: name || '神秘魔導士',
        score: Math.floor(score),
        date: new Date().toLocaleDateString('zh-TW')
    };
    scores.push(newEntry);
    scores.sort((a, b) => b.score - a.score);
    const top10 = scores.slice(0, 10);
    localStorage.setItem('bobochen_runner_local_scores', JSON.stringify(top10));
    return top10;
}

// 取得全球高分資料 (kvdb.io)
async function getGlobalScores() {
    try {
        const response = await fetch(GLOBAL_DB_URL);
        if (response.ok) {
            const data = await response.json();
            return Array.isArray(data) ? data : [];
        }
    } catch (e) {
        console.error('無法取得全球排行榜：', e);
    }
    return [];
}

// 儲存全球高分資料 (kvdb.io)
async function saveGlobalScore(name, score) {
    try {
        const currentScores = await getGlobalScores();
        const newEntry = {
            name: name || '神秘魔導士',
            score: Math.floor(score),
            date: new Date().toLocaleDateString('zh-TW')
        };
        currentScores.push(newEntry);
        currentScores.sort((a, b) => b.score - a.score);
        const top10 = currentScores.slice(0, 10);
        
        await fetch(GLOBAL_DB_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(top10)
        });
        return top10;
    } catch (e) {
        console.error('無法儲存全球排行榜：', e);
    }
    return null;
}

// 渲染排行榜表格
function renderLeaderboard(scores) {
    elements.leaderboardRows.innerHTML = '';
    
    if (scores.length === 0) {
        elements.leaderboardRows.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-sub);padding:20px 0;">尚無紀錄，等你來挑戰！</td></tr>`;
        return;
    }

    scores.forEach((entry, index) => {
        const rank = index + 1;
        let rankBadgeClass = 'rank-other';
        let rankText = rank;
        
        if (rank === 1) {
            rankBadgeClass = 'rank-badge rank-1';
        } else if (rank === 2) {
            rankBadgeClass = 'rank-badge rank-2';
        } else if (rank === 3) {
            rankBadgeClass = 'rank-badge rank-3';
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="${rankBadgeClass}">${rankText}</span></td>
            <td style="font-weight:600;color:#fff;">${escapeHTML(entry.name)}</td>
            <td style="font-family:monospace;font-weight:700;color:var(--accent-cyan);">${entry.score}</td>
            <td style="font-size:0.85rem;color:var(--text-sub);">${entry.date}</td>
        `;
        elements.leaderboardRows.appendChild(tr);
    });
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

// 更新排行榜顯示
async function updateLeaderboardView() {
    elements.leaderboardLoading.classList.add('active');
    elements.leaderboardRows.innerHTML = '';

    if (currentTab === 'local') {
        const scores = getLocalScores();
        elements.leaderboardLoading.classList.remove('active');
        renderLeaderboard(scores);
    } else {
        const scores = await getGlobalScores();
        elements.leaderboardLoading.classList.remove('active');
        renderLeaderboard(scores);
    }
}

// 檢查分數是否達到排行榜門檻 (大於 15 分即可登入)
function checkAndPromptHighScore(score) {
    if (score <= 15) return; // 低於 15 分就不記錄

    currentScoreToSave = score;
    elements.modalScoreVal.textContent = Math.floor(score);
    elements.nameModal.classList.add('active');
}

// 關閉輸入框
function closeNameModal() {
    elements.nameModal.classList.remove('active');
}

function createPlayerElements() {
    const body = document.createElement('div');
    body.className = 'body';
    const head = document.createElement('div');
    head.className = 'head';
    const earLeft = document.createElement('div');
    earLeft.className = 'ear-left';
    const earRight = document.createElement('div');
    earRight.className = 'ear-right';
    const hat = document.createElement('div');
    hat.className = 'hat';
    const legLeft = document.createElement('div');
    legLeft.className = 'leg leg-left';
    const legRight = document.createElement('div');
    legRight.className = 'leg leg-right';

    elements.player.appendChild(body);
    elements.player.appendChild(head);
    elements.player.appendChild(earLeft);
    elements.player.appendChild(earRight);
    elements.player.appendChild(hat);
    elements.player.appendChild(legLeft);
    elements.player.appendChild(legRight);
}

function getSpawnDelay() {
    // 基礎生成間隔隨分數增加而縮短：從一開始的 1900ms 縮短到最快 750ms
    const baseDelay = Math.max(750, 1900 - runnerState.score * 3.2);
    // 亂數間距也隨之減小，使高分時障礙物節奏更緊湊
    const randomVariance = Math.max(150, 400 - runnerState.score * 0.8);
    return baseDelay + Math.random() * randomVariance;
}

function resetGame() {
    runnerState.gameStarted = false;
    runnerState.gameOver = false;
    runnerState.score = 0;
    runnerState.speedMultiplier = 1;
    runnerState.lastSpawn = 0;
    runnerState.spawnDelay = getSpawnDelay();
    runnerState.playerY = 0;
    runnerState.playerVelocity = 0;
    runnerState.jumpHoldStart = null;
    runnerState.jumpKeyPressed = false;
    runnerState.crouching = false;
    runnerState.obstacles = [];
    runnerState.lastTime = null;

    elements.obstacleLayer.innerHTML = '';
    elements.player.classList.remove('jumping', 'dead', 'running', 'crouching');
    elements.player.style.removeProperty('--player-y');
    elements.player.style.animationDuration = '0.35s';
    updateScore();
    updateSpeed();
    setStatus('按 Space 開始遊戲');

    elements.startBtn.disabled = false;
    elements.startBtn.textContent = '開始遊戲 (Space)';
}

function updateScore() {
    elements.score.textContent = Math.floor(runnerState.score);
}

function updateSpeed() {
    if (elements.speed) {
        elements.speed.textContent = runnerState.speedMultiplier.toFixed(1) + 'x';
    }
}

function updateRunAnimation() {
    const duration = Math.max(0.18, 0.35 / runnerState.speedMultiplier);
    elements.player.style.animationDuration = `${duration}s`;
}

function setStatus(message, type = '') {
    elements.status.textContent = message;
    elements.status.className = 'game-status ' + type;
}

function startGame() {
    if (runnerState.gameOver) {
        const now = performance.now();
        if (now - runnerState.lastDeathTime < 1000) return; // 1s 死亡防誤觸冷卻
        resetGame();
    }
    if (runnerState.gameStarted) return;

    runnerState.gameStarted = true;
    elements.player.classList.add('running');
    setStatus('遊戲進行中，按 Space 跳躍');
    elements.startBtn.textContent = '跳躍 (Space)';
    elements.startBtn.blur(); // 移除按鈕焦點，防止 Space 重複觸發按鈕 click 事件
    runnerState.lastSpawn = 0;
    runnerState.spawnDelay = getSpawnDelay();
    runnerState.score = 0;
    runnerState.speedMultiplier = 1;
    updateScore();
    updateSpeed();
    updateRunAnimation();

    if (runnerState.animationFrame) {
        cancelAnimationFrame(runnerState.animationFrame);
    }
    runnerState.animationFrame = requestAnimationFrame(gameLoop);
}

function beginJumpHold() {
    if (!runnerState.gameStarted || runnerState.gameOver) return;
    if (runnerState.playerY < 0 || runnerState.crouching) return;
    if (runnerState.jumpHoldStart !== null) return;

    runnerState.jumpHoldStart = performance.now();
    runnerState.playerVelocity = -hiddenConfig.jumpPower;
    elements.player.classList.add('jumping');
}

function releaseJump() {
    if (!runnerState.gameStarted || runnerState.gameOver) return;
    runnerState.jumpHoldStart = null;
}

function duck() {
    if (!runnerState.gameStarted || runnerState.gameOver) return;
    if (runnerState.playerY < 0) return;
    runnerState.crouching = true;
    elements.player.classList.add('crouching');
}

function standUp() {
    if (!runnerState.crouching) return;
    runnerState.crouching = false;
    elements.player.classList.remove('crouching');
}

function getWeightedObstacleType() {
    const score = runnerState.score;
    let pool = [];

    if (score < 80) {
        // 第一階段 (新手期)：80% 低障礙物，20% 中障礙物，不出現高障礙物
        pool = ['low', 'low', 'low', 'low', 'low', 'low', 'low', 'low', 'mid', 'mid'];
    } else if (score < 180) {
        // 第二階段 (過渡期)：50% 低，35% 中，15% 高
        pool = ['low', 'low', 'low', 'low', 'low', 'mid', 'mid', 'mid', 'mid', 'high'];
    } else {
        // 第三階段 (高難度)：30% 低，40% 中，30% 高
        pool = ['low', 'low', 'low', 'mid', 'mid', 'mid', 'mid', 'high', 'high', 'high'];
    }

    // 防呆機制：若前一個障礙物是「高障礙物」(需要蹲下)，則下一個強制改為「低障礙物」，給玩家反應時間
    const lastType = runnerState.obstacles.length > 0 
        ? runnerState.obstacles[runnerState.obstacles.length - 1].type 
        : null;

    if (lastType === 'high') {
        return 'low';
    }

    return pool[Math.floor(Math.random() * pool.length)];
}

function spawnObstacle() {
    const obstacle = document.createElement('div');
    const type = getWeightedObstacleType(); // 使用動態權重發配障礙物
    obstacle.className = 'obstacle type-' + type;
    obstacle.style.left = '100%';

    let bottom = 92;
    if (type === 'low') {
        bottom = 92;
    } else if (type === 'mid') {
        bottom = 118;
    } else if (type === 'high') {
        bottom = 156; // 降低高度至 156px，確保一般站著的玩家會被撞到 (必須趴下躲避)
    }
    obstacle.style.bottom = `${bottom}px`;

    elements.obstacleLayer.appendChild(obstacle);
    const width = obstacle.getBoundingClientRect().width || 60;

    runnerState.obstacles.push({
        el: obstacle,
        x: elements.gameStage.clientWidth + width,
        type,
    });
}

function endGame() {
    runnerState.gameOver = true;
    runnerState.gameStarted = false;
    runnerState.lastDeathTime = performance.now();
    elements.player.classList.remove('running', 'crouching');
    elements.player.classList.add('dead');
    runnerState.jumpHoldStart = null;
    runnerState.jumpKeyPressed = false;
    runnerState.crouching = false;

    setStatus('💥 你撞到了！');
    elements.startBtn.disabled = true;
    elements.startBtn.textContent = '重新開始 (等待...)';

    if (runnerState.animationFrame) {
        cancelAnimationFrame(runnerState.animationFrame);
        runnerState.animationFrame = null;
    }

    // 播放完死亡動畫後，檢查是否為高分並彈出輸入視窗
    const finalScore = runnerState.score;
    setTimeout(() => {
        checkAndPromptHighScore(finalScore);
    }, 600);

    // 1 秒冷卻結束後，才顯示可按 Space 重開，並啟用按鈕
    setTimeout(() => {
        if (runnerState.gameOver) {
            setStatus('💥 你撞到了！按 Space 重新開始', 'loss');
            elements.startBtn.disabled = false;
            elements.startBtn.textContent = '重新開始 (Space)';
        }
    }, 1000);
}

function gameLoop(timestamp) {
    if (!runnerState.gameStarted || runnerState.gameOver) return;

    if (!runnerState.lastTime) runnerState.lastTime = timestamp;
    const delta = timestamp - runnerState.lastTime;
    runnerState.lastTime = timestamp;

    runnerState.score += delta * 0.0072 * runnerState.speedMultiplier;
    updateScore();

    // 漸進式加速：從分數 80 分開始平滑增加，避免瞬間加速的抖動感
    if (runnerState.score > 80) {
        runnerState.speedMultiplier = 1 + Math.min(1.7, (runnerState.score - 80) / 160);
        updateSpeed();
        updateRunAnimation();
    }

    // 隱藏長短跳設定邏輯：
    // 若玩家正在上升 (playerVelocity < 0) 且長按跳躍鍵 (jumpKeyPressed 且 holdTime 未超出設定值)
    // 則會套用 holdGravityMult 倍率 (極低重力) 以飛得更高 (長跳)，否則套用正常重力 (短跳)
    let currentGravity = runnerState.gravity;
    if (runnerState.playerVelocity < 0) {
        if (runnerState.jumpHoldStart !== null) {
            const holdTime = timestamp - runnerState.jumpHoldStart;
            if (runnerState.jumpKeyPressed && holdTime < hiddenConfig.maxJumpHold) {
                currentGravity = runnerState.gravity * hiddenConfig.holdGravityMult;
            } else {
                runnerState.jumpHoldStart = null; // 超過時間或放開按鍵，回到正常重力
            }
        }
    }

    runnerState.playerVelocity += currentGravity;
    runnerState.playerY += runnerState.playerVelocity * delta * 0.028;
    if (runnerState.playerY > 0) {
        runnerState.playerY = 0;
        runnerState.playerVelocity = 0;
        elements.player.classList.remove('jumping');
        runnerState.jumpHoldStart = null; // 著地後重設跳躍狀態
    }
    elements.player.style.setProperty('--player-y', `${runnerState.playerY}px`);

    const moveSpeed = 5.4 * runnerState.speedMultiplier;
    runnerState.obstacles.forEach((item) => {
        item.x -= moveSpeed * delta * 0.044;
        item.el.style.left = `${item.x}px`;
    });

    runnerState.obstacles = runnerState.obstacles.filter((item) => {
        const remove = item.x < -180;
        if (remove) {
            item.el.remove();
        }
        return !remove;
    });

    runnerState.lastSpawn += delta;
    if (runnerState.lastSpawn > runnerState.spawnDelay) {
        spawnObstacle();
        runnerState.spawnDelay = getSpawnDelay();
        runnerState.lastSpawn = 0;
    }

    checkCollision();
    if (!runnerState.gameOver) {
        runnerState.animationFrame = requestAnimationFrame(gameLoop);
    }
}

function checkCollision() {
    const playerRect = elements.player.getBoundingClientRect();
    // 額外的高度坐標容錯判定 (安全高度)
    const safeJump = runnerState.playerY < -20;
    const safeHighJump = runnerState.playerY < -60;

    runnerState.obstacles.forEach((item) => {
        const obstacleRect = item.el.getBoundingClientRect();
        
        // 縮減左右和上下的碰撞箱 (Hitbox)，使判定極度精準，符合實際身體視覺寬度
        const hPad = 20; // 水平縮減 20px (左右各 20px，避開貓帽沿和空白區)
        const vPad = 12; // 垂直縮減 12px (上下各 12px)

        const intersects =
            (playerRect.right - hPad) > (obstacleRect.left + hPad) &&
            (playerRect.left + hPad) < (obstacleRect.right - hPad) &&
            (playerRect.bottom - vPad) > (obstacleRect.top + vPad) &&
            (playerRect.top + vPad) < (obstacleRect.bottom - vPad);

        if (!intersects) return;

        let safe = false;
        if (item.type === 'low') {
            safe = safeJump;
        } else if (item.type === 'mid') {
            safe = safeHighJump || runnerState.crouching;
        } else if (item.type === 'high') {
            safe = runnerState.crouching;
        }

        if (!safe) {
            endGame();
        }
    });
}

window.addEventListener('keydown', (event) => {
    // 如果彈出視窗是打開狀態，不要執行遊戲按鍵操作
    if (elements.nameModal.classList.contains('active') || elements.leaderboardModal.classList.contains('active')) {
        // 如果是在輸入框輸入名字，允許使用 Space 鍵
        if (document.activeElement === elements.playerNameInput) {
            return;
        }
        event.preventDefault(); // 阻擋其它按鍵預設行為 (例如空白鍵滾動)
        return; 
    }

    // 專門防呆：避免按下 Space / ArrowDown / ArrowUp / KeyS / KeyW 時，網頁視窗往下/上滾動
    if (['Space', 'ArrowDown', 'ArrowUp', 'KeyS', 'KeyW'].includes(event.code)) {
        event.preventDefault();
    }

    if (event.repeat) return; // 防止鍵盤連點/長按自動觸發多個事件

    if (event.code === 'Space') {
        if (!runnerState.gameStarted || runnerState.gameOver) {
            startGame();
            return; // 開始或重開遊戲時，不應該自動跳躍一次
        }
        runnerState.jumpKeyPressed = true; // 標記為按住狀態
        beginJumpHold();
    }

    if (event.code === 'ArrowDown' || event.code === 'KeyS') {
        duck();
    }
});

window.addEventListener('keyup', (event) => {
    if (elements.nameModal.classList.contains('active') || elements.leaderboardModal.classList.contains('active')) {
        return;
    }

    if (event.code === 'Space') {
        runnerState.jumpKeyPressed = false; // 標記已鬆開按鍵
        releaseJump();
    }

    if (event.code === 'ArrowDown' || event.code === 'KeyS') {
        standUp();
    }
});

elements.startBtn.addEventListener('click', () => {
    // 彈窗開啟時停用按鈕點擊
    if (elements.nameModal.classList.contains('active') || elements.leaderboardModal.classList.contains('active')) {
        return;
    }
    if (!runnerState.gameStarted || runnerState.gameOver) {
        startGame();
    } else if (!runnerState.crouching) {
        beginJumpHold();
    }
});

window.addEventListener('blur', () => {
    // 視窗失去焦點時重置按鍵狀態，避免按鍵卡死
    if (runnerState.gameStarted && !runnerState.gameOver) {
        runnerState.jumpKeyPressed = false;
        releaseJump();
        standUp();
    }
});

window.addEventListener('resize', () => {
    if (elements.gameStage) {
        runnerState.gameStageWidth = elements.gameStage.clientWidth;
    }
});

// 排行榜相關按鈕事件監聽
elements.leaderboardBtn.addEventListener('click', () => {
    elements.leaderboardModal.classList.add('active');
    currentTab = 'local';
    elements.tabLocal.classList.add('active');
    elements.tabGlobal.classList.remove('active');
    updateLeaderboardView();
});

elements.closeLeaderboardBtn.addEventListener('click', () => {
    elements.leaderboardModal.classList.remove('active');
});

// 切換排行榜頁籤
elements.tabLocal.addEventListener('click', () => {
    currentTab = 'local';
    elements.tabLocal.classList.add('active');
    elements.tabGlobal.classList.remove('active');
    updateLeaderboardView();
});

elements.tabGlobal.addEventListener('click', () => {
    currentTab = 'global';
    elements.tabLocal.classList.remove('active');
    elements.tabGlobal.classList.add('active');
    updateLeaderboardView();
});

// 送出姓名及分數
elements.submitScoreBtn.addEventListener('click', async () => {
    const name = elements.playerNameInput.value.trim() || '神秘魔導士';
    
    // 儲存至本地 (立即完成)
    saveLocalScore(name, currentScoreToSave);
    
    // 儲存至全球資料庫 (kvdb.io 在背景執行)
    saveGlobalScore(name, currentScoreToSave);

    closeNameModal();
    
    // 送出後直接開啟排行榜展示
    elements.leaderboardModal.classList.add('active');
    currentTab = 'local';
    elements.tabLocal.classList.add('active');
    elements.tabGlobal.classList.remove('active');
    updateLeaderboardView();
});

// 輸入框內按 Enter 自動送出
elements.playerNameInput.addEventListener('keydown', (event) => {
    if (event.code === 'Enter') {
        event.preventDefault();
        elements.submitScoreBtn.click();
    }
});

createPlayerElements();
resetGame();

