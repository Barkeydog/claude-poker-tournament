const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const GameEngine = require('./src/game-engine');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const game = new GameEngine();

// REST API Endpoints
app.post('/api/join', (req, res) => {
  const { name } = req.body;
  const playerId = 'player-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

  const result = game.addPlayer(playerId, name);

  if (result.success) {
    console.log(`✅ Player ${name} joined (${playerId})`);
    console.log(`📡 Emitting player-joined and game-state-update events`);
    io.emit('player-joined', { playerId, name });
    io.emit('game-state-update', game.getGameState());
    res.json({ success: true, playerId, message: result.message });
  } else {
    res.status(400).json(result);
  }
});

app.get('/api/status/:playerId', (req, res) => {
  const { playerId } = req.params;
  const gameState = game.getPlayerView(playerId);
  const currentPlayer = gameState.players[gameState.activePlayer];

  // Only set isYourTurn to true if game is actually in progress
  const isYourTurn = gameState.phase !== 'waiting' &&
                     gameState.phase !== 'tournament-end' &&
                     currentPlayer &&
                     currentPlayer.id === playerId;

  res.json({
    isYourTurn,
    gameState
  });
});

app.post('/api/action', (req, res) => {
  const { playerId, action, amount, commentary } = req.body;

  const result = game.processAction(playerId, action, amount || 0, commentary);

  if (result.success) {
    const player = game.getGameState().players.find(p => p.id === playerId);
    io.emit('player-action', {
      playerId,
      playerName: player.name,
      action,
      amount: amount || 0,
      commentary
    });
    io.emit('game-state-update', game.getGameState());

    // Check for eliminations
    const eliminated = game.getGameState().players.filter(p => p.status === 'eliminated');
    eliminated.forEach(p => {
      if (!p.eliminationBroadcast) {
        p.eliminationBroadcast = true;
        io.emit('player-eliminated', { playerId: p.id, name: p.name });
      }
    });

    // Check for tournament end
    const activePlayers = game.getGameState().players.filter(p => p.status !== 'eliminated');
    if (activePlayers.length === 1) {
      io.emit('tournament-winner', {
        playerId: activePlayers[0].id,
        name: activePlayers[0].name,
        chips: activePlayers[0].chips
      });
    }

    res.json(result);
  } else {
    res.status(400).json(result);
  }
});

app.get('/api/game-state', (req, res) => {
  res.json(game.getGameState());
});

app.post('/api/start-game', (req, res) => {
  const gameState = game.getGameState();

  if (gameState.players.length < 2) {
    return res.status(400).json({ success: false, message: 'Need at least 2 players to start' });
  }

  if (gameState.phase !== 'waiting') {
    return res.status(400).json({ success: false, message: 'Game already started' });
  }

  game.startNewHand();
  io.emit('game-state-update', game.getGameState());
  io.emit('game-started', { playerCount: gameState.players.length });

  res.json({ success: true, message: 'Game started!' });
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('👀 Spectator connected:', socket.id);

  // Send current game state to new spectator
  const currentState = game.getGameState();
  console.log(`📤 Sending initial state: ${currentState.players.length} players`);
  socket.emit('game-state-update', currentState);

  socket.on('disconnect', () => {
    console.log('👋 Spectator disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🃏 Claude Poker Server running on http://localhost:${PORT}`);
  console.log(`👀 Open browser to watch the game`);
  console.log(`🤖 Start player clients with: node player-client/player-client.js <name>`);
});
