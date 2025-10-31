const Hand = require('pokersolver').Hand;
const DeckManager = require('./deck-manager');

class GameEngine {
  constructor() {
    this.deck = new DeckManager();
    this.actionQueue = [];
    this.isProcessingQueue = false;
    this.gameState = {
      gameId: 'tournament-' + Date.now(),
      players: [],
      communityCards: [],
      pot: 0,
      currentBet: 0,
      dealerButton: 0,
      activePlayer: 0,
      phase: 'waiting',
      eliminated: [],
      handNumber: 0,
      smallBlind: 10,
      bigBlind: 20
    };
  }

  addPlayer(playerId, name) {
    if (this.gameState.players.length >= 5) {
      return { success: false, message: 'Game is full' };
    }

    const player = {
      id: playerId,
      name: name,
      chips: 1000,
      cards: [],
      status: 'active',
      position: this.gameState.players.length,
      lastAction: null,
      commentary: ''
    };

    this.gameState.players.push(player);

    // Don't auto-start - wait for manual start
    // if (this.gameState.players.length === 5) {
    //   setTimeout(() => this.startNewHand(), 2000);
    // }

    return { success: true, message: 'Joined game', player };
  }

  startNewHand() {
    // Check for tournament end
    const activePlayers = this.gameState.players.filter(p => p.status !== 'eliminated');
    if (activePlayers.length === 1) {
      this.gameState.phase = 'tournament-end';
      return;
    }

    this.gameState.handNumber++;
    this.deck.reset();
    this.gameState.communityCards = [];
    this.gameState.pot = 0;
    this.gameState.currentBet = 0;
    this.gameState.phase = 'preflop';

    // Reset players
    for (const player of this.gameState.players) {
      if (player.status !== 'eliminated') {
        player.cards = this.deck.dealCards(2);
        player.status = 'active';
        player.lastAction = null;
        player.commentary = '';
      }
    }

    // Move dealer button
    this.gameState.dealerButton = (this.gameState.dealerButton + 1) % this.gameState.players.length;

    // Post blinds
    this.postBlinds();

    // Set first active player (after big blind)
    this.gameState.activePlayer = this.getNextActivePlayer(this.getBigBlindPosition());
  }

  getSmallBlindPosition() {
    return (this.gameState.dealerButton + 1) % this.gameState.players.length;
  }

  getBigBlindPosition() {
    return (this.gameState.dealerButton + 2) % this.gameState.players.length;
  }

  postBlinds() {
    const sbPos = this.getSmallBlindPosition();
    const bbPos = this.getBigBlindPosition();

    const sbPlayer = this.gameState.players[sbPos];
    const bbPlayer = this.gameState.players[bbPos];

    if (sbPlayer && sbPlayer.status !== 'eliminated') {
      const sbAmount = Math.min(this.gameState.smallBlind, sbPlayer.chips);
      sbPlayer.chips -= sbAmount;
      this.gameState.pot += sbAmount;
      sbPlayer.lastAction = { action: 'small blind', amount: sbAmount };
    }

    if (bbPlayer && bbPlayer.status !== 'eliminated') {
      const bbAmount = Math.min(this.gameState.bigBlind, bbPlayer.chips);
      bbPlayer.chips -= bbAmount;
      this.gameState.pot += bbAmount;
      this.gameState.currentBet = bbAmount;
      bbPlayer.lastAction = { action: 'big blind', amount: bbAmount };
    }
  }

  getNextActivePlayer(fromPosition) {
    let nextPos = (fromPosition + 1) % this.gameState.players.length;
    let checked = 0;

    while (checked < this.gameState.players.length) {
      const player = this.gameState.players[nextPos];
      if (player.status === 'active' && player.chips > 0) {
        return nextPos;
      }
      nextPos = (nextPos + 1) % this.gameState.players.length;
      checked++;
    }

    return -1; // No active players
  }

  processAction(playerId, action, amount, commentary) {
    const player = this.gameState.players.find(p => p.id === playerId);

    if (!player) {
      return { success: false, message: 'Player not found' };
    }

    if (this.gameState.players[this.gameState.activePlayer].id !== playerId) {
      return { success: false, message: 'Not your turn' };
    }

    // Queue the action for smooth UI flow
    this.actionQueue.push({
      playerId,
      playerName: player.name,
      action,
      amount,
      commentary,
      timestamp: Date.now()
    });

    // Start processing queue if not already running
    if (!this.isProcessingQueue) {
      this.processQueue();
    }

    return { success: true, queued: true };
  }

  async processQueue() {
    if (this.isProcessingQueue || this.actionQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.actionQueue.length > 0) {
      const queuedAction = this.actionQueue.shift();
      const { playerId, action, amount, commentary } = queuedAction;

      const player = this.gameState.players.find(p => p.id === playerId);
      if (!player) {
        continue;
      }

      player.commentary = commentary;

      if (action === 'fold') {
        player.status = 'folded';
        player.lastAction = { action: 'fold', amount: player.lastAction?.amount || 0 };
      } else if (action === 'call') {
        const previousBet = player.lastAction?.amount || 0;
        const callAmount = Math.min(this.gameState.currentBet - previousBet, player.chips);
        player.chips -= callAmount;
        this.gameState.pot += callAmount;
        const newTotal = previousBet + callAmount;
        player.lastAction = { action: 'call', amount: newTotal };
      } else if (action === 'raise') {
        const previousBet = player.lastAction?.amount || 0;
        const totalBet = amount; // This is the new total bet amount
        const additionalChips = Math.min(totalBet - previousBet, player.chips);
        player.chips -= additionalChips;
        this.gameState.pot += additionalChips;
        const newTotal = previousBet + additionalChips;
        this.gameState.currentBet = Math.max(this.gameState.currentBet, newTotal);
        player.lastAction = { action: 'raise', amount: newTotal };
      }

      // Emit action event (will be picked up by server)
      if (this.onActionProcessed) {
        this.onActionProcessed(queuedAction, this.gameState);
      }

      // Smooth delay between actions (600ms for readability)
      await new Promise(resolve => setTimeout(resolve, 600));

      // Check if betting round is complete
      if (this.isBettingRoundComplete()) {
        this.advancePhase();
      } else {
        this.gameState.activePlayer = this.getNextActivePlayer(this.gameState.activePlayer);
      }
    }

    this.isProcessingQueue = false;
  }

  isBettingRoundComplete() {
    const activePlayers = this.gameState.players.filter(p => p.status === 'active');

    if (activePlayers.length === 0) return true;
    if (activePlayers.length === 1) return true;

    // Check if all active players have acted and matched the current bet
    for (const player of activePlayers) {
      if (!player.lastAction) return false;
      if (player.chips > 0 && (player.lastAction.amount || 0) < this.gameState.currentBet) {
        return false;
      }
    }

    return true;
  }

  advancePhase() {
    // Check if only one player remains (everyone else folded)
    const activePlayers = this.gameState.players.filter(p => p.status === 'active');
    if (activePlayers.length === 1) {
      // Award pot to remaining player and start new hand
      activePlayers[0].chips += this.gameState.pot;
      this.gameState.phase = 'showdown';
      this.checkEliminations();
      setTimeout(() => this.startNewHand(), 1000);
      return;
    }

    if (this.gameState.phase === 'preflop') {
      this.gameState.phase = 'flop';
      this.gameState.communityCards = this.deck.dealCards(3);
      this.gameState.currentBet = 0;
      this.resetBettingRound();
    } else if (this.gameState.phase === 'flop') {
      this.gameState.phase = 'turn';
      this.gameState.communityCards.push(this.deck.dealCard());
      this.gameState.currentBet = 0;
      this.resetBettingRound();
    } else if (this.gameState.phase === 'turn') {
      this.gameState.phase = 'river';
      this.gameState.communityCards.push(this.deck.dealCard());
      this.gameState.currentBet = 0;
      this.resetBettingRound();
    } else if (this.gameState.phase === 'river') {
      this.showdown();
    }
  }

  resetBettingRound() {
    for (const player of this.gameState.players) {
      if (player.status === 'active') {
        player.lastAction = null;
      }
    }
    this.gameState.activePlayer = this.getNextActivePlayer(this.gameState.dealerButton);
  }

  showdown() {
    const activePlayers = this.gameState.players.filter(p => p.status === 'active');

    if (activePlayers.length === 1) {
      // Everyone else folded
      activePlayers[0].chips += this.gameState.pot;
      this.checkEliminations();
      setTimeout(() => this.startNewHand(), 1500);
      return;
    }

    // Evaluate hands
    const hands = activePlayers.map(player => {
      const allCards = [...player.cards, ...this.gameState.communityCards];
      const hand = Hand.solve(allCards);
      return { player, hand };
    });

    // Find winner
    const winners = Hand.winners(hands.map(h => h.hand));
    const winnerData = hands.filter(h => winners.includes(h.hand));

    const potShare = Math.floor(this.gameState.pot / winnerData.length);
    winnerData.forEach(w => {
      w.player.chips += potShare;
    });

    this.gameState.phase = 'showdown';
    this.checkEliminations();

    setTimeout(() => this.startNewHand(), 5000);
  }

  checkEliminations() {
    for (const player of this.gameState.players) {
      if (player.chips === 0 && player.status !== 'eliminated') {
        player.status = 'eliminated';
        this.gameState.eliminated.push(player.id);
      }
    }
  }

  getGameState() {
    return this.gameState;
  }

  getPlayerView(playerId) {
    // Return game state with only this player's cards visible
    const state = { ...this.gameState };
    state.players = state.players.map(p => {
      if (p.id === playerId) {
        return p;
      } else {
        // Hide other players' cards if they're active and have cards
        return { ...p, cards: (p.status === 'active' && p.cards && p.cards.length > 0) ? ['??', '??'] : (p.cards || []) };
      }
    });
    return state;
  }
}

module.exports = GameEngine;
