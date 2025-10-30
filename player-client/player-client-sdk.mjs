import axios from 'axios';
import { query } from '@anthropic-ai/claude-agent-sdk';

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const POLL_INTERVAL = 1000; // 1 second for faster gameplay

const playerName = process.argv[2] || 'Player-' + Math.random().toString(36).substr(2, 5);

let playerId = null;
let isRunning = true;

async function joinGame() {
  try {
    const response = await axios.post(`${SERVER_URL}/api/join`, { name: playerName });
    playerId = response.data.playerId;
    console.log(`✅ ${playerName} joined game with ID: ${playerId}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to join game:`, error.response?.data || error.message);
    return false;
  }
}

async function getClaudeDecision(gameState) {
  const player = gameState.players.find(p => p.id === playerId);

  if (!player) {
    return { action: 'fold', amount: null, commentary: 'Error: Could not find my player data' };
  }

  const otherPlayers = gameState.players
    .filter(p => p.id !== playerId && p.status !== 'eliminated')
    .map(p => `${p.name}: ${p.chips} chips, ${p.lastAction ? p.lastAction.action : 'no action yet'}`)
    .join('\n');

  const callAmount = gameState.currentBet - (player.lastAction?.amount || 0);
  const minRaise = Math.max(gameState.currentBet * 2, gameState.bigBlind);
  const maxRaise = player.chips;

  const prompt = `You are playing in a Texas Hold'em poker tournament as ${playerName}.

CURRENT SITUATION:
- Your hole cards: ${player.cards[0]} ${player.cards[1]}
- Community cards: ${gameState.communityCards.length > 0 ? gameState.communityCards.join(' ') : 'none yet'}
- Your chips: ${player.chips}
- Pot size: ${gameState.pot}
- Current bet to call: ${callAmount}
- Phase: ${gameState.phase}
- Hand number: ${gameState.handNumber}

OTHER PLAYERS:
${otherPlayers}

YOUR OPTIONS:
1. Fold: Give up the hand
2. Call: Match current bet of ${callAmount} chips
3. Raise: Increase bet (minimum ${minRaise}, maximum ${maxRaise})

INSTRUCTIONS:
1. Analyze your hand strength and situation
2. Consider pot odds, position, and opponent behavior patterns
3. PLAY AGGRESSIVELY - Don't fold unless you have terrible cards AND facing a big bet
4. BLUFF and RAISE more often - make the game exciting!
5. Only fold with truly bad hands (like 7-2 offsuit) when facing significant bets
6. Make your decision and explain your reasoning in 1-2 entertaining sentences with personality
7. Be strategic but also entertaining for spectators
8. Response must be valid JSON

RESPONSE FORMAT (respond with ONLY valid JSON, no other text):
{
  "action": "fold" | "call" | "raise",
  "amount": <number if raising, otherwise null>,
  "commentary": "<your entertaining explanation>"
}

Example responses:
{"action": "raise", "amount": 200, "commentary": "Pocket rockets baby! Time to make them pay for staying in this hand!"}
{"action": "raise", "amount": 100, "commentary": "Let's spice things up! Raising to put pressure on these players!"}
{"action": "call", "commentary": "Drawing to a flush here - pot odds say it's worth a shot!"}
{"action": "call", "commentary": "I'm seeing this flop - could be a winning hand!"}

AGGRESSIVE PLAY: Prefer raising or calling over folding. Make the game exciting!`;

  try {
    console.log(`\n🤖 Asking Claude via Agent SDK...`);

    const q = await query({
      prompt: prompt,
      options: {
        maxTurns: 1
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

    console.log(`📨 Claude response: ${responseText}\n`);

    // Remove markdown code blocks if present
    responseText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '');

    // Try to parse JSON from response
    let jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const decision = JSON.parse(jsonMatch[0]);

      // Validate the decision
      if (!decision.action || !['fold', 'call', 'raise'].includes(decision.action)) {
        throw new Error('Invalid action in response');
      }

      return decision;
    } else {
      throw new Error('No JSON found in response');
    }
  } catch (error) {
    console.error(`❌ Error getting Claude decision:`, error.message);
    // Fallback: make a simple strategic decision
    const callAmount = gameState.currentBet - (player.lastAction?.amount || 0);

    // If call is cheap (less than 10% of chips), call, otherwise fold
    if (callAmount < player.chips * 0.1) {
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

async function pollAndAct() {
  try {
    const response = await axios.get(`${SERVER_URL}/api/status/${playerId}`);
    const { isYourTurn, gameState } = response.data;

    if (gameState.phase === 'tournament-end') {
      const winner = gameState.players.find(p => p.status !== 'eliminated');
      if (winner?.id === playerId) {
        console.log(`\n🏆🎉 ${playerName} WON THE TOURNAMENT! 🎉🏆\n`);
      } else {
        console.log(`\n💀 ${playerName} was eliminated. Better luck next time!\n`);
      }
      isRunning = false;
      process.exit(0);
      return;
    }

    const player = gameState.players.find(p => p.id === playerId);
    if (player?.status === 'eliminated') {
      console.log(`\n💀 ${playerName} has been eliminated from the tournament!\n`);
      isRunning = false;
      process.exit(0);
      return;
    }

    if (isYourTurn) {
      console.log(`\n🎰 It's ${playerName}'s turn!`);
      const cards = player.cards && player.cards.length > 0 ? player.cards.join(' ') : 'No cards yet';
      console.log(`Cards: ${cards}, Chips: ${player.chips}, Pot: ${gameState.pot}`);

      const decision = await getClaudeDecision(gameState);

      console.log(`📤 ${playerName} action: ${decision.action}${decision.amount ? ' ' + decision.amount : ''}`);
      console.log(`💬 "${decision.commentary}"\n`);

      await axios.post(`${SERVER_URL}/api/action`, {
        playerId,
        action: decision.action,
        amount: decision.amount,
        commentary: decision.commentary
      });
    }
  } catch (error) {
    if (error.response?.status === 400) {
      console.log(`⚠️ ${error.response.data.message}`);
    } else {
      console.error(`❌ Error polling server:`, error.message);
    }
  }
}

async function main() {
  console.log(`\n🃏 Claude Poker Player Client (Agent SDK) Starting...`);
  console.log(`👤 Player Name: ${playerName}\n`);

  const joined = await joinGame();
  if (!joined) {
    process.exit(1);
  }

  console.log(`⏳ Waiting for game to start...\n`);

  // Memory monitoring (prevent crashes)
  setInterval(() => {
    const usage = process.memoryUsage();
    const heapUsedMB = (usage.heapUsed / 1024 / 1024).toFixed(2);

    // Warn if memory usage is high (over 100MB for client)
    if (usage.heapUsed / 1024 / 1024 > 100) {
      console.log(`⚠️  [${playerName}] High memory: ${heapUsedMB}MB`);
      if (global.gc) {
        global.gc();
      }
    }
  }, 30000); // Check every 30 seconds

  // Main game loop
  const pollInterval = setInterval(async () => {
    if (!isRunning) {
      clearInterval(pollInterval);
      return;
    }
    await pollAndAct();
  }, POLL_INTERVAL);

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log(`\n👋 ${playerName} leaving the game...\n`);
    isRunning = false;
    clearInterval(pollInterval);
    process.exit(0);
  });
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
