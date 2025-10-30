console.log('🎮 Poker UI starting...');

// Detect if we're running through a proxy
const isProxy = window.location.pathname.includes('/vscode/proxy/');
const socketPath = isProxy ? window.location.pathname.replace(/\/$/, '') + '/socket.io' : '/socket.io';

console.log('🔧 Socket path:', socketPath);

const socket = io({
  path: socketPath
});
console.log('🔌 Socket.io initialized:', socket);

let gameState = null;

// Card symbol mapping
const cardSymbols = {
  'h': '♥️', 'd': '♦️', 'c': '♣️', 's': '♠️',
  '2': '2', '3': '3', '4': '4', '5': '5', '6': '6',
  '7': '7', '8': '8', '9': '9', 'T': '10',
  'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A'
};

const cardColor = {
  'h': 'red', 'd': 'red', 'c': 'black', 's': 'black'
};

function formatCard(card) {
  if (card === '??' || !card) {
    return '🂠';
  }
  const rank = card[0];
  const suit = card[1];
  return `${cardSymbols[rank]}${cardSymbols[suit]}`;
}

function updateGameDisplay(state) {
  gameState = state;

  // Update header info
  document.getElementById('handNumber').textContent = `Hand: ${state.handNumber}`;
  document.getElementById('phase').textContent = `Phase: ${state.phase.toUpperCase()}`;

  // Update pot
  document.getElementById('potAmount').textContent = `💰 ${state.pot}`;

  // Update community cards
  const communityCardsContainer = document.getElementById('communityCards');
  communityCardsContainer.innerHTML = '';

  for (let i = 0; i < 5; i++) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card';

    if (i < state.communityCards.length) {
      cardDiv.textContent = formatCard(state.communityCards[i]);
      const suit = state.communityCards[i][1];
      cardDiv.style.color = cardColor[suit] || 'black';
    } else {
      cardDiv.className = 'card card-empty';
      cardDiv.textContent = '?';
    }

    communityCardsContainer.appendChild(cardDiv);
  }

  // Update players
  for (let i = 0; i < 5; i++) {
    const playerSlot = document.getElementById(`player-${i}`);

    if (i < state.players.length) {
      const player = state.players[i];

      playerSlot.classList.remove('active', 'eliminated');

      if (state.activePlayer === i && state.phase !== 'showdown' && state.phase !== 'waiting') {
        playerSlot.classList.add('active');
      }

      if (player.status === 'eliminated') {
        playerSlot.classList.add('eliminated');
      }

      // Update player info
      playerSlot.querySelector('.player-name').textContent = player.name;
      playerSlot.querySelector('.player-chips').textContent = `💰 ${player.chips}`;

      // Update status
      const statusEl = playerSlot.querySelector('.player-status');
      if (player.lastAction) {
        statusEl.textContent = `${player.lastAction.action}${player.lastAction.amount ? ' ' + player.lastAction.amount : ''}`;
      } else if (player.status === 'eliminated') {
        statusEl.textContent = 'ELIMINATED';
      } else if (player.status === 'folded') {
        statusEl.textContent = 'FOLDED';
      } else {
        statusEl.textContent = '';
      }

      // Update cards
      const cardsContainer = playerSlot.querySelector('.player-cards');
      cardsContainer.innerHTML = '';

      for (let j = 0; j < 2; j++) {
        const cardDiv = document.createElement('div');

        if (player.cards && player.cards[j] && player.cards[j] !== '??') {
          cardDiv.className = 'card';
          cardDiv.textContent = formatCard(player.cards[j]);
          const suit = player.cards[j][1];
          cardDiv.style.color = cardColor[suit] || 'black';
        } else {
          cardDiv.className = 'card card-back';
          cardDiv.textContent = '🂠';
        }

        cardsContainer.appendChild(cardDiv);
      }
    } else {
      playerSlot.querySelector('.player-name').textContent = 'Empty';
      playerSlot.querySelector('.player-chips').textContent = '💰 0';
      playerSlot.querySelector('.player-status').textContent = '';

      const cardsContainer = playerSlot.querySelector('.player-cards');
      cardsContainer.innerHTML = `
        <div class="card card-back">🂠</div>
        <div class="card card-back">🂠</div>
      `;
    }
  }
}

function addCommentary(playerName, text, type = 'normal') {
  const feed = document.getElementById('commentaryFeed');

  const item = document.createElement('div');
  item.className = `commentary-item ${type}`;

  const playerSpan = document.createElement('span');
  playerSpan.className = 'commentary-player';
  playerSpan.textContent = `${playerName}:`;

  const textSpan = document.createElement('span');
  textSpan.className = 'commentary-text';
  textSpan.textContent = text;

  item.appendChild(playerSpan);
  item.appendChild(textSpan);

  feed.appendChild(item);
  feed.scrollTop = feed.scrollHeight;
}

function addActionCommentary(playerName, action, amount, commentary) {
  const feed = document.getElementById('commentaryFeed');

  const item = document.createElement('div');
  item.className = 'commentary-item';

  const playerSpan = document.createElement('span');
  playerSpan.className = 'commentary-player';
  playerSpan.textContent = `${playerName}:`;

  const textSpan = document.createElement('span');
  textSpan.className = 'commentary-text';
  textSpan.textContent = commentary;

  const actionSpan = document.createElement('span');
  actionSpan.className = 'commentary-action';
  actionSpan.textContent = `→ ${action.toUpperCase()}${amount ? ' ' + amount : ''}`;

  item.appendChild(playerSpan);
  item.appendChild(textSpan);
  item.appendChild(actionSpan);

  feed.appendChild(item);
  feed.scrollTop = feed.scrollHeight;
}

// Socket event handlers
socket.on('connect', () => {
  console.log('✅ Connected to server - Socket ID:', socket.id);
  addCommentary('System', 'Connected to tournament server', 'system');
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
  addCommentary('System', 'Disconnected from server', 'system');
});

socket.on('game-state-update', (state) => {
  console.log('📊 Game state update received:', state.players.length, 'players');
  updateGameDisplay(state);
  updateStartButton(state);
});

socket.on('player-joined', (data) => {
  console.log('👤 Player joined event:', data.name);
  addCommentary('System', `${data.name} has joined the tournament!`, 'system');
});

socket.on('player-action', (action) => {
  addActionCommentary(action.playerName, action.action, action.amount, action.commentary);
});

socket.on('player-eliminated', (data) => {
  addCommentary('System', `💀 ${data.name} has been eliminated from the tournament!`, 'elimination');
});

socket.on('tournament-winner', (data) => {
  addCommentary('System', `🏆 ${data.name} wins the tournament with ${data.chips} chips!`, 'system');

  // Show winner overlay
  document.getElementById('winnerName').textContent = data.name;
  document.getElementById('winnerChips').textContent = `💰 ${data.chips} Chips`;
  document.getElementById('winnerOverlay').style.display = 'flex';
});

// Start button handler
document.getElementById('startButton').addEventListener('click', async () => {
  const button = document.getElementById('startButton');
  button.disabled = true;
  button.textContent = 'STARTING...';

  try {
    // Use relative path that works with proxy
    const apiUrl = window.location.pathname.endsWith('/')
      ? 'api/start-game'
      : window.location.pathname + '/api/start-game';

    console.log('🎮 Starting game, API URL:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();

    if (data.success) {
      addCommentary('System', '🎰 Game started! Let the poker begin!', 'system');
      button.textContent = 'GAME IN PROGRESS';
    } else {
      addCommentary('System', `❌ ${data.message}`, 'system');
      button.disabled = false;
      button.textContent = 'START GAME';
    }
  } catch (error) {
    console.error('Error starting game:', error);
    addCommentary('System', '❌ Failed to start game', 'system');
    button.disabled = false;
    button.textContent = 'START GAME';
  }
});

// Update button state based on game state
function updateStartButton(state) {
  const button = document.getElementById('startButton');

  if (state.phase === 'waiting') {
    button.disabled = state.players.length < 2;
    button.textContent = state.players.length < 2 ? 'NEED 2+ PLAYERS' : 'START GAME';
  } else {
    button.disabled = true;
    button.textContent = 'GAME IN PROGRESS';
  }
}

// Initialize
addCommentary('System', '🃏 Welcome to Claude Code Poker Tournament! 🃏', 'system');
addCommentary('System', 'Waiting for players to join...', 'system');
