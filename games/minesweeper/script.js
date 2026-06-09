// 踩地雷遊戲邏輯

class Minesweeper {
    constructor() {
        this.difficulty = 'medium';
        this.board = [];
        this.revealed = [];
        this.flagged = [];
        this.gameOver = false;
        this.gameWon = false;
        this.timer = 0;
        this.timerInterval = null;

        this.difficulties = {
            easy: { rows: 8, cols: 8, mines: 10 },
            medium: { rows: 12, cols: 12, mines: 30 },
            hard: { rows: 16, cols: 16, mines: 60 }
        };

        this.init();
    }

    init() {
        const diffSelect = document.getElementById('difficulty');
        const newGameBtn = document.getElementById('new-game-btn');

        diffSelect.addEventListener('change', (e) => {
            this.difficulty = e.target.value;
            this.newGame();
        });

        newGameBtn.addEventListener('click', () => this.newGame());

        this.newGame();
    }

    newGame() {
        this.gameOver = false;
        this.gameWon = false;
        this.timer = 0;
        clearInterval(this.timerInterval);

        const config = this.difficulties[this.difficulty];
        this.rows = config.rows;
        this.cols = config.cols;
        this.mineCount = config.mines;

        this.board = this.generateBoard();
        this.revealed = Array(this.rows).fill(null).map(() => Array(this.cols).fill(false));
        this.flagged = Array(this.rows).fill(null).map(() => Array(this.cols).fill(false));

        this.render();
        this.updateStats();
        this.clearStatus();

        // 更新難度類名
        const gameBoard = document.getElementById('game-board');
        gameBoard.className = 'game-board ' + this.difficulty;
    }

    generateBoard() {
        // 建立空白板
        const board = Array(this.rows).fill(null).map(() => Array(this.cols).fill(0));

        // 隨機放置地雷
        let minesPlaced = 0;
        while (minesPlaced < this.mineCount) {
            const r = Math.floor(Math.random() * this.rows);
            const c = Math.floor(Math.random() * this.cols);

            if (board[r][c] !== 'M') {
                board[r][c] = 'M';
                minesPlaced++;
            }
        }

        // 計算每格周圍地雷數
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (board[r][c] !== 'M') {
                    board[r][c] = this.countAdjacentMines(board, r, c);
                }
            }
        }

        return board;
    }

    countAdjacentMines(board, r, c) {
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                const nr = r + dr;
                const nc = c + dc;
                if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                    if (board[nr][nc] === 'M') count++;
                }
            }
        }
        return count;
    }

    revealCell(r, c) {
        if (this.gameOver || this.gameWon) return;
        if (this.revealed[r][c] || this.flagged[r][c]) return;

        this.revealed[r][c] = true;

        if (this.board[r][c] === 'M') {
            this.gameOver = true;
            this.showStatus('💥 遊戲結束！你踩到地雷了！', 'loss');
            this.revealAllMines();
            return;
        }

        // 如果是 0，自動展開周圍
        if (this.board[r][c] === 0) {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = r + dr;
                    const nc = c + dc;
                    if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                        if (!this.revealed[nr][nc]) {
                            this.revealCell(nr, nc);
                        }
                    }
                }
            }
        }

        this.checkWin();
        this.render();
    }

    toggleFlag(r, c) {
        if (this.gameOver || this.gameWon) return;
        if (this.revealed[r][c]) return;

        this.flagged[r][c] = !this.flagged[r][c];
        this.updateStats();
        this.render();
    }

    revealAllMines() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.board[r][c] === 'M') {
                    this.revealed[r][c] = true;
                }
            }
        }
        this.render();
    }

    checkWin() {
        let allNonMinesRevealed = true;
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.board[r][c] !== 'M' && !this.revealed[r][c]) {
                    allNonMinesRevealed = false;
                    break;
                }
            }
            if (!allNonMinesRevealed) break;
        }

        if (allNonMinesRevealed) {
            this.gameWon = true;
            this.showStatus('🎉 恭喜！你贏了！', 'win');
        }
    }

    updateStats() {
        const flaggedCount = this.flagged.flat().filter(Boolean).length;
        const minesLeft = Math.max(0, this.mineCount - flaggedCount);
        document.getElementById('mines-left').textContent = minesLeft;
    }

    showStatus(message, className) {
        const statusEl = document.getElementById('game-status');
        statusEl.textContent = message;
        statusEl.className = 'game-status ' + className;
    }

    clearStatus() {
        document.getElementById('game-status').textContent = '';
        document.getElementById('game-status').className = 'game-status';
    }

    startTimer() {
        if (!this.timerInterval && !this.gameOver && !this.gameWon) {
            this.timerInterval = setInterval(() => {
                this.timer++;
                document.getElementById('timer').textContent = this.timer;
            }, 1000);
        }
    }

    render() {
        const gameBoard = document.getElementById('game-board');
        gameBoard.innerHTML = '';

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';

                if (this.revealed[r][c]) {
                    cell.classList.add('revealed');

                    const value = this.board[r][c];
                    if (value === 'M') {
                        cell.classList.add('mine');
                        cell.textContent = '💣';
                    } else if (value === 0) {
                        cell.classList.add('zero');
                        cell.textContent = '';
                    } else {
                        cell.classList.add(`${value}`);
                        cell.textContent = value;
                    }
                } else if (this.flagged[r][c]) {
                    cell.classList.add('flagged');
                    cell.textContent = '🚩';
                } else {
                    cell.textContent = '';
                }

                cell.addEventListener('click', () => {
                    if (!this.timerInterval && this.timer === 0 && !this.gameOver && !this.gameWon) {
                        this.startTimer();
                    }
                    this.revealCell(r, c);
                });

                cell.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    if (!this.timerInterval && this.timer === 0 && !this.gameOver && !this.gameWon) {
                        this.startTimer();
                    }
                    this.toggleFlag(r, c);
                });

                gameBoard.appendChild(cell);
            }
        }
    }
}

// 初始化遊戲
document.addEventListener('DOMContentLoaded', () => {
    new Minesweeper();
});
