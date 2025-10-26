import { PILE_TYPES } from './constants.js';

export class UI {
    constructor(game, onMove) {
        this.game = game;
        this.onMove = onMove;
        this.elements = {
            board: document.getElementById('game-board'),
            stock: document.getElementById('stock'),
            waste: document.getElementById('waste'),
            foundations: Array.from(document.querySelectorAll('.foundation')),
            tableau: Array.from(document.querySelectorAll('.tableau-pile')),
            winScreen: document.getElementById('win-screen'),
            winStats: document.getElementById('win-stats'),
            moves: document.getElementById('moves'),
            time: document.getElementById('time'),
        };
        this.dragState = {
            isDragging: false,
            draggedCards: [],
            draggedElements: [],
            from: null,
            offsetX: 0,
            offsetY: 0,
        };
        this.hintTimeout = null;
    }

    init() {
        this.render();
        this.attachEventListeners();
    }
    
    attachEventListeners() {
        this.elements.stock.addEventListener('click', () => this.onMove({ type: 'draw' }));

        this.elements.board.addEventListener('pointerdown', this.onPointerDown.bind(this));
        this.elements.board.addEventListener('pointermove', this.onPointerMove.bind(this));
        this.elements.board.addEventListener('pointerup', this.onPointerUp.bind(this));
        this.elements.board.addEventListener('dblclick', this.onDoubleClick.bind(this));
    }
    
    getCardElementById(cardId) {
        return document.querySelector(`.card[data-id="${cardId}"]`);
    }

    showHint(hint) {
        clearTimeout(this.hintTimeout);
        this.clearHints();
        
        if (!hint) return;
        
        if (hint.from.type === PILE_TYPES.STOCK) {
             this.elements.stock.classList.add('hint');
             this.hintTimeout = setTimeout(() => this.clearHints(), 1500);
             return;
        }

        const cardElement = this.getCardElementById(hint.card.id);
        if (cardElement) {
            cardElement.classList.add('hint');
        }
        
        let targetElement;
        if(hint.to) {
            if(hint.to.type === PILE_TYPES.TABLEAU) targetElement = this.elements.tableau[hint.to.index];
            if(hint.to.type === PILE_TYPES.FOUNDATION) targetElement = this.elements.foundations[hint.to.index];
        }
        
        if(targetElement) {
             const pile = this.game.getPile(hint.to.type, hint.to.index);
             if(pile.length === 0) {
                 targetElement.classList.add('hint');
             } else {
                 const topCard = pile[pile.length - 1];
                 const topCardEl = this.getCardElementById(topCard.id);
                 if(topCardEl) topCardEl.classList.add('hint');
             }
        }
        
        this.hintTimeout = setTimeout(() => this.clearHints(), 1500);
    }

    clearHints() {
        document.querySelectorAll('.hint').forEach(el => el.classList.remove('hint'));
    }

    onPointerDown(e) {
        if(e.target.closest('#stock')) return;
        const cardElement = e.target.closest('.card');
        if (!cardElement || cardElement.classList.contains('face-down')) return;

        e.preventDefault();
        
        const { from, cards } = this.getPileInfoFromElement(cardElement);
        if (!cards || cards.length === 0) return;

        this.dragState = {
            isDragging: true,
            draggedCards: cards,
            draggedElements: [],
            from,
            offsetX: e.clientX - cardElement.getBoundingClientRect().left,
            offsetY: e.clientY - cardElement.getBoundingClientRect().top,
        };

        const fromPile = this.game.getPile(from.type, from.index);
        const cardIndex = fromPile.findIndex(c => c.id === cards[0].id);

        for (let i = 0; i < cards.length; i++) {
            const el = this.getCardElementById(cards[i].id);
            if (el) {
                el.classList.add('dragging');
                el.style.zIndex = 1000 + i;
                this.dragState.draggedElements.push(el);
            }
        }
    }

    onPointerMove(e) {
        if (!this.dragState.isDragging) return;
        e.preventDefault();

        const { draggedElements, offsetX, offsetY } = this.dragState;
        
        draggedElements.forEach((el, i) => {
            el.style.left = `${e.clientX - this.elements.board.offsetLeft - offsetX}px`;
            el.style.top = `${e.clientY - this.elements.board.offsetTop - offsetY + (i * 30)}px`;
        });
    }

    onPointerUp(e) {
        if (!this.dragState.isDragging) return;
        
        const { draggedCards, draggedElements, from } = this.dragState;
        
        draggedElements.forEach(el => el.classList.remove('dragging'));

        const dropTarget = this.findDropTarget(e);

        if (dropTarget && this.game.isValidMove(draggedCards, from, dropTarget)) {
            this.onMove({ type: 'move', cards: draggedCards, from, to: dropTarget });
        } else {
            this.render(); // Snap back
        }

        this.dragState.isDragging = false;
    }
    
    onDoubleClick(e) {
        const cardElement = e.target.closest('.card');
        if (!cardElement || cardElement.classList.contains('face-down')) return;
        
        const { from, cards } = this.getPileInfoFromElement(cardElement);
        if (!cards || cards.length > 1) return; // Only auto-move single cards

        const card = cards[0];

        // Try foundation first
        for (let i = 0; i < 4; i++) {
            const to = { type: PILE_TYPES.FOUNDATION, index: i };
            if (this.game.isValidMove([card], from, to)) {
                this.onMove({ type: 'move', cards: [card], from, to });
                return;
            }
        }
    }

    findDropTarget(e) {
        const dropEl = document.elementFromPoint(e.clientX, e.clientY);
        if (!dropEl) return null;

        const targetCard = dropEl.closest('.card:not(.dragging)');
        if (targetCard) return this.getPileInfoFromElement(targetCard).from;

        const targetPile = dropEl.closest('.pile, .pile-placeholder');
        if (targetPile) return this.getPileInfoFromElement(targetPile).from;

        return null;
    }
    
    getPileInfoFromElement(element) {
        const cardId = element.dataset.id;
        
        // Tableau
        for(let i=0; i<7; i++) {
            const pileEl = this.elements.tableau[i];
            if(pileEl.contains(element)) {
                const pile = this.game.tableau[i];
                if (!cardId) return { from: { type: PILE_TYPES.TABLEAU, index: i }, cards: [] };
                const cardIndex = pile.findIndex(c => c.id === cardId);
                return { from: { type: PILE_TYPES.TABLEAU, index: i }, cards: pile.slice(cardIndex) };
            }
        }
        // Foundations
        for(let i=0; i<4; i++) {
            const pileEl = this.elements.foundations[i];
            if(pileEl.contains(element)) {
                 const pile = this.game.foundations[i];
                 if (!cardId) return { from: { type: PILE_TYPES.FOUNDATION, index: i }, cards: [] };
                 return { from: { type: PILE_TYPES.FOUNDATION, index: i }, cards: [pile[pile.length - 1]] };
            }
        }
        // Waste
        if(this.elements.waste.contains(element)) {
            const pile = this.game.waste;
            if (pile.length === 0) return { from: { type: PILE_TYPES.WASTE }, cards: [] };
            return { from: { type: PILE_TYPES.WASTE }, cards: [pile[pile.length - 1]] };
        }
        
        return { from: null, cards: [] };
    }

    render() {
        this.renderPiles();
        this.updateStats();
    }

    renderPiles() {
        // Clear board
        [...this.elements.tableau, ...this.elements.foundations, this.elements.waste].forEach(p => p.innerHTML = '');
        this.elements.stock.innerHTML = '';
        
        // Render Tableau
        this.game.tableau.forEach((pile, i) => {
            pile.forEach((card, j) => {
                const cardEl = this.createCardElement(card);
                cardEl.style.top = `${j * (card.isFaceUp ? 30 : 15)}px`;
                cardEl.style.zIndex = j;
                this.elements.tableau[i].appendChild(cardEl);
            });
        });

        // Render Foundations
        this.game.foundations.forEach((pile, i) => {
            if (pile.length > 0) {
                const card = pile[pile.length - 1];
                const cardEl = this.createCardElement(card);
                this.elements.foundations[i].appendChild(cardEl);
            }
        });

        // Render Waste
        if (this.game.waste.length > 0) {
            const card = this.game.waste[this.game.waste.length-1];
            const cardEl = this.createCardElement(card);
            this.elements.waste.appendChild(cardEl);
        }

        // Render Stock
        if (this.game.stock.length > 0) {
            const cardEl = this.createCardElement(this.game.stock[0]); // Show back of a card
            // cardEl.classList.add('face-down'); // createCardElement handles this now.
            this.elements.stock.appendChild(cardEl);
        } else {
            this.elements.stock.classList.add('empty-stock-placeholder');
        }
    }
    
    createCardElement(card) {
        const el = document.createElement('div');
        el.className = 'card';
        el.dataset.id = card.id;
        if (card.isFaceUp) {
            el.classList.add('face-up');
            const suitSVGs = {
                hearts: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`,
                diamonds: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 12l10 10 10-12L12 2z"/></svg>`,
                clubs: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.5,8A3.5,3.5 0 0,0 12,11.5A3.5,3.5 0 0,0 15.5,15A3.5,3.5 0 0,0 19,11.5A3.5,3.5 0 0,0 15.5,8M15.5,13A1.5,1.5 0 0,1 14,11.5A1.5,1.5 0 0,1 15.5,10A1.5,1.5 0 0,1 17,11.5A1.5,1.5 0 0,1 15.5,13M8.5,8A3.5,3.5 0 0,0 5,11.5A3.5,3.5 0 0,0 8.5,15A3.5,3.5 0 0,0 12,11.5A3.5,3.5 0 0,0 8.5,8M8.5,13A1.5,1.5 0 0,1 7,11.5A1.5,1.5 0 0,1 8.5,10A1.5,1.5 0 0,1 10,11.5A1.5,1.5 0 0,1 8.5,13M12,2A3.5,3.5 0 0,0 8.5,5.5A3.5,3.5 0 0,0 12,9A3.5,3.5 0 0,0 15.5,5.5A3.5,3.5 0 0,0 12,2M12,7A1.5,1.5 0 0,1 10.5,5.5A1.5,1.5 0 0,1 12,4A1.5,1.5 0 0,1 13.5,5.5A1.5,1.5 0 0,1 12,7M12,9.5L11.2,10.2L12,11L12.8,10.2L12,9.5M12,12.3L10.7,11.6C10.1,12.5 9.4,13.2 8.5,13.7V22H15.5V13.7C14.6,13.2 13.9,12.5 13.3,11.6L12,12.3Z" /></svg>`,
                spades: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12,2L2,12H5V20H19V12H22L12,2M12,14.5L9.5,12H14.5L12,14.5M17,11H7V12L12,17L17,12V11Z" /></svg>`
            };
            const color = (card.suit === 'hearts' || card.suit === 'diamonds') ? 'red' : 'black';
            
            const rankDisplay = card.rank;

            const corner = (position) => `
                <div class="card-corner ${position}">
                    <div class="rank">${rankDisplay}</div>
                    <div class="suit">${suitSVGs[card.suit]}</div>
                </div>
            `;
            
            el.innerHTML = corner('top-left') + corner('bottom-right');
            el.style.color = color;
        } else {
            el.classList.add('face-down');
        }
        return el;
    }
    
    updateStats() {
        this.elements.moves.textContent = `Moves: ${this.game.stats.moves}`;
        const elapsed = Math.floor((Date.now() - this.game.stats.startTime) / 1000);
        const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const seconds = String(elapsed % 60).padStart(2, '0');
        this.elements.time.textContent = `Time: ${minutes}:${seconds}`;
    }

    showWinScreen() {
        this.elements.winStats.textContent = `You won in ${this.game.stats.moves} moves! Time: ${this.elements.time.textContent.replace('Time: ', '')}`;
        this.elements.winScreen.classList.remove('hidden');
    }
}