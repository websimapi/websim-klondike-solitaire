export const SUITS = {
    HEARTS: 'hearts',
    DIAMONDS: 'diamonds',
    CLUBS: 'clubs',
    SPADES: 'spades'
};

export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export const CARD_VALUES = {
    'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
};

export const SUIT_COLORS = {
    [SUITS.HEARTS]: 'red',
    [SUITS.DIAMONDS]: 'red',
    [SUITS.CLUBS]: 'black',
    [SUITS.SPADES]: 'black'
};

export const PILE_TYPES = {
    STOCK: 'stock',
    WASTE: 'waste',
    TABLEAU: 'tableau',
    FOUNDATION: 'foundation'
};

export const CARD_DIMENSIONS = {
    WIDTH: 1024 / 13, // width of one card from the sprite sheet
    HEIGHT: 600 / 4, // height of one card from the sprite sheet
    ASPECT_RATIO: 1.4
};

