import { Game } from './game.js';
import { UI } from './ui.js';

class AppController {
    constructor() {
        this.game = new Game();
        this.ui = new UI(this.game, this.handleMove.bind(this));
        
        this.newGameBtn = document.getElementById('new-game');
        this.winNewGameBtn = document.getElementById('win-new-game');
        this.undoBtn = document.getElementById('undo');
        this.hintBtn = document.getElementById('hint');

        this.newGameBtn.addEventListener('click', () => this.startNewGame());
        this.winNewGameBtn.addEventListener('click', () => this.startNewGame());
        this.undoBtn.addEventListener('click', () => this.handleUndo());
        this.hintBtn.addEventListener('click', () => this.handleHint());

        this.startNewGame();
    }

    startNewGame() {
        this.game.startNewGame();
        this.ui.init();
        document.getElementById('win-screen').classList.add('hidden');
        if (this.game.stats.timer) clearInterval(this.game.stats.timer);
        this.game.stats.timer = setInterval(() => this.ui.updateStats(), 1000);
    }
    
    handleUndo() {
        if(this.game.undoMove()) {
            this.ui.render();
        }
    }
    
    handleHint() {
        const hint = this.game.findHint();
        this.ui.showHint(hint);
    }

    handleMove(action) {
        let moveMade = false;
        switch(action.type) {
            case 'draw':
                if (this.game.drawFromStock()) {
                    moveMade = true;
                }
                break;
            case 'move':
                this.game.makeMove(action.cards, action.from, action.to);
                moveMade = true;
                break;
        }

        if (moveMade) {
            this.ui.render();
            if (this.game.checkForWin()) {
                clearInterval(this.game.stats.timer);
                this.ui.showWinScreen();
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new AppController();
});

