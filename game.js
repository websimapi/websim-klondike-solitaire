import { SUITS, RANKS, CARD_VALUES, SUIT_COLORS, PILE_TYPES } from './constants.js';

class Card {
    constructor(suit, rank) {
        this.suit = suit;
        this.rank = rank;
        this.value = CARD_VALUES[rank];
        this.color = SUIT_COLORS[suit];
        this.isFaceUp = false;
        this.id = `${rank}-${suit}`;
    }
}

export class Game {
    constructor() {
        this.deck = [];
        this.stock = [];
        this.waste = [];
        this.foundations = [[], [], [], []]; // H, D, C, S
        this.tableau = [[], [], [], [], [], [], []];
        this.moveHistory = [];
        this.stats = { moves: 0, score: 0, startTime: null, timer: null };
    }

    startNewGame() {
        this.createDeck();
        this.shuffleDeck();
        this.dealCards();
        this.stats = { moves: 0, score: 0, startTime: Date.now(), timer: null };
        this.moveHistory = [];
    }

    createDeck() {
        this.deck = [];
        for (const suit of Object.values(SUITS)) {
            for (const rank of RANKS) {
                this.deck.push(new Card(suit, rank));
            }
        }
    }

    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    dealCards() {
        // Reset piles
        this.stock = [];
        this.waste = [];
        this.foundations = [[], [], [], []];
        this.tableau = [[], [], [], [], [], [], []];

        // Deal to tableau
        for (let i = 0; i < 7; i++) {
            for (let j = i; j < 7; j++) {
                this.tableau[j].push(this.deck.pop());
            }
        }

        // Flip top card of each tableau pile
        this.tableau.forEach(pile => {
            if (pile.length > 0) {
                pile[pile.length - 1].isFaceUp = true;
            }
        });

        // Remaining cards go to stock
        this.stock = this.deck;
        this.deck = [];
    }
    
    recordMove(move) {
        this.moveHistory.push(move);
        this.stats.moves++;
    }

    undoMove() {
        if (this.moveHistory.length === 0) return false;
        const lastMove = this.moveHistory.pop();
        
        const { type, cards, from, to, fromIndex, toIndex, wasFaceDown, flippedCard } = lastMove;
        
        const sourcePile = this.getPile(from.type, from.index);
        const destPile = this.getPile(to.type, to.index);

        // Move cards back
        const movedCards = destPile.splice(destPile.length - cards.length, cards.length);
        sourcePile.push(...movedCards.reverse());

        // Restore face-down state
        if (wasFaceDown) {
            sourcePile[sourcePile.length - 1].isFaceUp = false;
        }

        if (flippedCard) {
            const pile = this.getPile(from.type, from.index);
            if (pile.length > 0) {
                pile[pile.length - 1].isFaceUp = false;
            }
        }
        
        if (type === 'draw') {
            this.stock.push(...this.waste.splice(this.waste.length - cards.length, cards.length).reverse());
        } else if (type === 'reset-stock') {
             this.waste = cards;
             this.stock = [];
        }

        this.stats.moves--;
        return true;
    }

    getPile(type, index = 0) {
        switch (type) {
            case PILE_TYPES.STOCK: return this.stock;
            case PILE_TYPES.WASTE: return this.waste;
            case PILE_TYPES.TABLEAU: return this.tableau[index];
            case PILE_TYPES.FOUNDATION: return this.foundations[index];
        }
    }

    isValidMove(cards, fromPile, toPile) {
        if (!cards || cards.length === 0) return false;
        const cardToMove = cards[0];

        if (toPile.type === PILE_TYPES.FOUNDATION) {
            if (cards.length > 1) return false; // Only single cards to foundation
            const foundation = this.getPile(toPile.type, toPile.index);
            const topCard = foundation.length > 0 ? foundation[foundation.length - 1] : null;
            if (topCard) {
                return topCard.suit === cardToMove.suit && cardToMove.value === topCard.value + 1;
            } else {
                return cardToMove.rank === 'A';
            }
        }

        if (toPile.type === PILE_TYPES.TABLEAU) {
            const tableau = this.getPile(toPile.type, toPile.index);
            const topCard = tableau.length > 0 ? tableau[tableau.length - 1] : null;
            if (topCard) {
                return topCard.color !== cardToMove.color && cardToMove.value === topCard.value - 1;
            } else {
                return cardToMove.rank === 'K'; // Only Kings on empty tableau
            }
        }
        
        return false;
    }

    makeMove(cards, from, to) {
        const fromPile = this.getPile(from.type, from.index);
        const toPile = this.getPile(to.type, to.index);
        let flippedCard = null;

        const cardIndex = fromPile.findIndex(c => c.id === cards[0].id);
        const movedCards = fromPile.splice(cardIndex, cards.length);
        toPile.push(...movedCards);
        
        // Flip new top card in 'from' pile if it was tableau
        if (from.type === PILE_TYPES.TABLEAU && fromPile.length > 0) {
            const topCard = fromPile[fromPile.length - 1];
            if (!topCard.isFaceUp) {
                topCard.isFaceUp = true;
                flippedCard = topCard;
            }
        }
        
        this.recordMove({ type: 'move', cards: movedCards, from, to, flippedCard });
    }

    drawFromStock() {
        if (this.stock.length === 0) return this.resetStock();
        
        const cardsToDraw = this.stock.splice(this.stock.length - 1, 1);
        cardsToDraw.forEach(c => c.isFaceUp = true);
        this.waste.push(...cardsToDraw);
        
        this.recordMove({ type: 'draw', cards: cardsToDraw, from: {type: PILE_TYPES.STOCK}, to: {type: PILE_TYPES.WASTE} });
        return true;
    }

    resetStock() {
        if (this.stock.length > 0) return false;
        const oldWaste = [...this.waste];
        this.stock = this.waste.reverse();
        this.stock.forEach(c => c.isFaceUp = false);
        this.waste = [];
        
        this.recordMove({ type: 'reset-stock', cards: oldWaste, from: {type: PILE_TYPES.WASTE}, to: {type: PILE_TYPES.STOCK} });
        return true;
    }
    
    checkForWin() {
        return this.foundations.every(pile => pile.length === 13);
    }
    
    findHint() {
        // 1. Tableau/Waste to Foundation
        for(let i=0; i<7; i++) {
            const pile = this.tableau[i];
            if(pile.length > 0) {
                const card = pile[pile.length-1];
                for(let j=0; j<4; j++) {
                   if(this.isValidMove([card], {type: PILE_TYPES.TABLEAU, index: i}, {type: PILE_TYPES.FOUNDATION, index: j}))
                       return { card, from: {type: PILE_TYPES.TABLEAU, index: i}, to: {type: PILE_TYPES.FOUNDATION, index: j} };
                }
            }
        }
        if(this.waste.length > 0) {
            const card = this.waste[this.waste.length-1];
            for(let j=0; j<4; j++) {
                if(this.isValidMove([card], {type: PILE_TYPES.WASTE}, {type: PILE_TYPES.FOUNDATION, index: j}))
                    return { card, from: {type: PILE_TYPES.WASTE}, to: {type: PILE_TYPES.FOUNDATION, index: j} };
            }
        }

        // 2. Tableau to Tableau
        for (let i = 0; i < 7; i++) {
            for (let j = 0; j < this.tableau[i].length; j++) {
                if (this.tableau[i][j].isFaceUp) {
                    const cardsToMove = this.tableau[i].slice(j);
                    for (let k = 0; k < 7; k++) {
                        if (i === k) continue;
                        if (this.isValidMove(cardsToMove, {type: PILE_TYPES.TABLEAU, index: i}, {type: PILE_TYPES.TABLEAU, index: k})) {
                             // Prioritize moves that reveal a face-down card
                            if(j > 0 && !this.tableau[i][j-1].isFaceUp) {
                                return { card: cardsToMove[0], from: {type: PILE_TYPES.TABLEAU, index: i}, to: {type: PILE_TYPES.TABLEAU, index: k} };
                            }
                        }
                    }
                }
            }
        }
        
        // 3. Waste to Tableau
        if(this.waste.length > 0) {
            const card = this.waste[this.waste.length-1];
            for(let i=0; i<7; i++) {
                if(this.isValidMove([card], {type: PILE_TYPES.WASTE}, {type: PILE_TYPES.TABLEAU, index: i})) {
                    return { card, from: {type: PILE_TYPES.WASTE}, to: {type: PILE_TYPES.TABLEAU, index: i} };
                }
            }
        }
        
        // 4. Draw from stock
        if(this.stock.length > 0) {
            return { from: { type: PILE_TYPES.STOCK }};
        }

        return null; // No moves found
    }
}

