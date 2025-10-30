class DeckManager {
  constructor() {
    this.suits = ['h', 'd', 'c', 's']; // hearts, diamonds, clubs, spades
    this.ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
    this.deck = [];
    this.shuffle();
  }

  shuffle() {
    this.deck = [];
    for (const suit of this.suits) {
      for (const rank of this.ranks) {
        this.deck.push(rank + suit);
      }
    }

    // Fisher-Yates shuffle
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  dealCard() {
    if (this.deck.length === 0) {
      this.shuffle();
    }
    return this.deck.pop();
  }

  dealCards(count) {
    const cards = [];
    for (let i = 0; i < count; i++) {
      cards.push(this.dealCard());
    }
    return cards;
  }

  reset() {
    this.shuffle();
  }
}

module.exports = DeckManager;
