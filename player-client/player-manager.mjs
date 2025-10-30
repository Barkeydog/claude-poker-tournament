import axios from 'axios';
import { query } from '@anthropic-ai/claude-agent-sdk';

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const POLL_INTERVAL = 1000;

const PLAYER_NAMES = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'];

class PlayerManager {
  constructor() {
    this.players = [];
    this.isRunning = true;
  }

  async joinAllPlayers() {
    console.log(`\n🃏 Claude Poker Player Manager Starting...`);
    console.log(`👥 Managing ${PLAYER_NAMES.length} players in single process\n`);

    for (const name of PLAYER_NAMES) {
      try {
        const response = await axios.post(`${SERVER_URL}/api/join`, { name });
        const playerId = response.data.playerId;

        this.players.push({
          id: playerId,
          name: name,
          sessionId: `poker-${playerId}` // Unique session ID per player
        });

        console.log(`✅ ${name} joined (${playerId})`);
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`❌ Failed to join ${name}:`, error.response?.data || error.message);
      }
    }

    console.log(`\n⏳ All players joined, waiting for game to start...\n`);
  }

  async getClaudeDecision(player, gameState) {
    const playerData = gameState.players.find(p => p.id === player.id);

    if (!playerData) {
      return { action: 'fold', amount: null, commentary: 'Error: Could not find my player data' };
    }

    const otherPlayers = gameState.players
      .filter(p => p.id !== player.id && p.status !== 'eliminated')
      .map(p => `${p.name}: ${p.chips} chips, ${p.lastAction ? p.lastAction.action : 'no action yet'}`)
      .join('\n');

    const callAmount = gameState.currentBet - (playerData.lastAction?.amount || 0);
    const minRaise = Math.max(gameState.currentBet * 2, gameState.bigBlind);
    const maxRaise = playerData.chips;

    const prompt = `You are playing in a Texas Hold'em poker tournament as ${player.name}.

CURRENT SITUATION:
- Your hole cards: ${playerData.cards[0]} ${playerData.cards[1]}
- Community cards: ${gameState.communityCards.length > 0 ? gameState.communityCards.join(' ') : 'none yet'}
- Your chips: ${playerData.chips}
- Pot size: ${gameState.pot}
- Current bet to call: ${callAmount}
- Phase: ${gameState.phase}
- Hand number: ${gameState.handNumber}

OTHER PLAYERS:
${otherPlayers}

YOUR OPTIONS:
1. fold - Give up this hand (no cost)
2. call - Match current bet (cost: ${callAmount} chips)
3. raise - Increase the bet (min: ${minRaise}, max: ${maxRaise} chips)

INSTRUCTIONS:
1. Analyze your hand strength and situation
2. Consider pot odds, position, and opponent behavior patterns
3. PLAY AGGRESSIVELY - Don't fold unless you have terrible cards AND facing a big bet
4. BLUFF and RAISE more often - make the game exciting!
5. Only fold with truly bad hands (like 7-2 offsuit) when facing significant bets
6. Add entertaining commentary about your decision (1-2 sentences, stay in character for ${player.name})

Respond ONLY with valid JSON in this exact format:
{
  "action": "fold" | "call" | "raise",
  "amount": <number or null>,
  "commentary": "<your entertaining comment>"
}

If raising, set "amount" to the total bet amount (between ${minRaise} and ${maxRaise}).
If folding or calling, set "amount" to null.`;

    try {
      const q = await query({
        prompt: prompt,
        options: {
          maxTurns: 1,
          sessionId: player.sessionId // Separate session per player
        }
      });

      let responseText = '';
      for await (const message of q.sdkMessages) {
        if (message.type === 'assistant' && message.message?.content) {
          for (const block of message.message.content) {
            if (block.type === 'text') {
              responseText += block.text;
            }
          }
        }
      }

      // Strip markdown if present
      responseText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

      // Find JSON in response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const decision = JSON.parse(jsonMatch[0]);
        return decision;
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (error) {
      console.error(`❌ [${player.name}] Error getting Claude decision:`, error.message);

      // Fallback: make a simple strategic decision
      if (callAmount < playerData.chips * 0.1) {
        return {
          action: 'call',
          amount: null,
          commentary: `Playing it safe with a call (system fallback)`
        };
      } else {
        return {
          action: 'fold',
          amount: null,
          commentary: 'Folding due to system error'
        };
      }
    }
  }

  async pollAndActForPlayer(player) {
    try {
      const response = await axios.get(`${SERVER_URL}/api/status/${player.id}`);
      const { isYourTurn, gameState } = response.data;

      if (gameState.phase === 'tournament-end') {
        const winner = gameState.players.find(p => p.status !== 'eliminated');
        if (winner?.id === player.id) {
          console.log(`\n🏆🎉 ${player.name} WON THE TOURNAMENT! 🎉🏆\n`);
        }
        return 'tournament-end';
      }

      const playerData = gameState.players.find(p => p.id === player.id);
      if (playerData?.status === 'eliminated') {
        console.log(`💀 ${player.name} eliminated`);
        return 'eliminated';
      }

      if (isYourTurn) {
        console.log(`🎰 ${player.name}'s turn - ${playerData.cards.join(' ')} | Chips: ${playerData.chips}`);

        const decision = await this.getClaudeDecision(player, gameState);

        console.log(`📤 ${player.name}: ${decision.action}${decision.amount ? ' ' + decision.amount : ''}`);
        console.log(`💬 "${decision.commentary}"\n`);

        await axios.post(`${SERVER_URL}/api/action`, {
          playerId: player.id,
          action: decision.action,
          amount: decision.amount,
          commentary: decision.commentary
        });
      }

      return 'playing';
    } catch (error) {
      if (error.response?.status !== 400) {
        console.error(`❌ [${player.name}] Error:`, error.message);
      }
      return 'error';
    }
  }

  async startGameLoop() {
    // Memory monitoring
    setInterval(() => {
      const usage = process.memoryUsage();
      const heapUsedMB = (usage.heapUsed / 1024 / 1024).toFixed(2);
      const heapTotalMB = (usage.heapTotal / 1024 / 1024).toFixed(2);

      console.log(`💾 Memory: ${heapUsedMB}MB / ${heapTotalMB}MB (${((usage.heapUsed / usage.heapTotal) * 100).toFixed(1)}%)`);

      if (usage.heapUsed / 1024 / 1024 > 200) {
        console.log(`⚠️  High memory usage!`);
        if (global.gc) {
          console.log('🗑️  Running garbage collection...');
          global.gc();
        }
      }
    }, 30000);

    // Main game loop - poll for all active players
    const pollInterval = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(pollInterval);
        return;
      }

      // Check each player sequentially
      for (const player of this.players) {
        const status = await this.pollAndActForPlayer(player);
        if (status === 'tournament-end') {
          this.isRunning = false;
          clearInterval(pollInterval);
          setTimeout(() => process.exit(0), 2000);
          return;
        }
      }
    }, POLL_INTERVAL);

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log(`\n👋 Player manager shutting down...\n`);
      this.isRunning = false;
      clearInterval(pollInterval);
      process.exit(0);
    });
  }
}

// Start the manager
const manager = new PlayerManager();
await manager.joinAllPlayers();
await manager.startGameLoop();
