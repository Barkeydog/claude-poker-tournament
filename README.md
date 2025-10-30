# 🃏 Claude Code Poker Tournament

A distributed Texas Hold'em poker tournament where 5 Claude Code AI instances compete as autonomous players, with a web-based spectator interface featuring indie/pixel art aesthetics.

## Features

- **5 Claude AI Players** - Each player runs as an independent Claude Code instance with personality-driven decision making
- **Texas Hold'em Rules** - Full implementation including betting rounds, hand evaluation, and tournament elimination
- **Real-time Web Spectator** - Watch the game unfold with pixel art styling and live AI commentary
- **Tournament Mode** - Players are eliminated when they run out of chips, last one standing wins
- **AI Commentary** - Each AI explains their poker decisions in entertaining ways

## Project Structure

```
claude-poker/
├── server/                 # Game server
│   ├── server.js          # Express + Socket.io server
│   ├── src/
│   │   ├── game-engine.js # Texas Hold'em game logic
│   │   └── deck-manager.js # Card deck management
│   └── public/            # Web spectator interface
│       ├── index.html
│       ├── styles.css
│       └── app.js
├── player-client/         # Claude AI player client
│   └── player-client.js   # AI player script
└── README.md
```

## Prerequisites

- **Node.js** (v16 or higher)
- **Claude Code CLI** - The `claude` command must be available in your PATH

## Installation

1. **Install server dependencies:**
```bash
cd server
npm install
```

2. **Install player client dependencies:**
```bash
cd player-client
npm install
```

## Running the Tournament

### Option 1: Auto-Launch Script (Easiest!)

Just run the launcher script:

```bash
./launch-tournament.sh
```

This will automatically:
- Start the game server on port 4000
- Open 5 terminal windows with Claude players
- Display the server URL

Then:
1. Open `http://localhost:4000` in your browser
2. Wait for players to connect
3. Click the **START GAME** button!

### Option 2: Manual Launch

If the auto-launcher doesn't work on your system:

**Step 1: Start the Game Server**

```bash
cd server
PORT=4000 node server.js
```

**Step 2: Open the Spectator Interface**

Open your browser to:
```
http://localhost:4000
```

**Step 3: Launch 5 Claude Code Players**

Open **5 separate terminal windows** and run:

**Terminal 1:**
```bash
cd player-client
SERVER_URL=http://localhost:4000 node player-client.js "Alice"
```

**Terminal 2:**
```bash
cd player-client
SERVER_URL=http://localhost:4000 node player-client.js "Bob"
```

**Terminal 3:**
```bash
cd player-client
SERVER_URL=http://localhost:4000 node player-client.js "Charlie"
```

**Terminal 4:**
```bash
cd player-client
SERVER_URL=http://localhost:4000 node player-client.js "Diana"
```

**Terminal 5:**
```bash
cd player-client
SERVER_URL=http://localhost:4000 node player-client.js "Eve"
```

Each player client will use the `claude` CLI command to make poker decisions!

**Step 4: Start the Tournament**

Once players join, click the **START GAME** button in the browser to begin!

## How It Works

### Game Server
- Manages the poker game state (deck, players, chips, pot)
- Implements Texas Hold'em rules and betting rounds
- Exposes REST API for player actions
- Broadcasts real-time updates to spectators via WebSocket

### Claude Player Client
- Polls the server to check if it's their turn
- Calls the `claude` CLI command with the game state
- Claude Code analyzes hand strength, pot odds, and opponent behavior
- Parses Claude's JSON response and submits action (fold/call/raise) with entertaining commentary
- Continues until eliminated or wins the tournament

### Web Interface
- Real-time visualization of the poker table
- Pixel art aesthetic with retro styling
- Shows player positions, chips, cards, and community cards
- Live commentary feed displaying AI reasoning
- Winner celebration screen

## Game Rules

- **Starting Chips:** 1000 per player
- **Blinds:** Small blind: 10, Big blind: 20
- **Betting Rounds:** Preflop → Flop → Turn → River → Showdown
- **Elimination:** Players with 0 chips are eliminated
- **Winner:** Last player standing

## Configuration

### Server Port
Change the port by setting the `PORT` environment variable:
```bash
PORT=8080 npm start
```

### Server URL (for remote play)
If running the server on a different machine:
```bash
SERVER_URL="http://192.168.1.100:3000" node player-client.js "PlayerName"
```

## Troubleshooting

### Players can't connect
- Make sure the server is running on port 3000
- Verify the `claude` CLI command is available in your PATH
- Check that you're authenticated with Claude Code (`claude auth login`)
- Verify no firewall is blocking connections

### Game not starting
- Ensure exactly 5 players have joined
- Check server console for errors
- Refresh the browser spectator page

### AI making invalid moves
- The player client has fallback logic to fold on errors
- Check Claude API rate limits
- Verify API key is valid

## Future Enhancements

- Multiple simultaneous tournaments
- Configurable blind structures
- AI personality customization (aggressive/conservative/bluffer)
- Tournament statistics and replays
- Mobile-responsive design
- Network play across different machines

## License

MIT

## Credits

Built with:
- Node.js + Express
- Socket.io for WebSockets
- Anthropic Claude AI
- pokersolver for hand evaluation
- Press Start 2P font for pixel aesthetic

---

**Have fun watching the AIs play poker!** 🎰🤖
