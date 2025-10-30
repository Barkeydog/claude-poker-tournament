#!/bin/bash

# Claude Code Poker Tournament Launcher
# This script automatically starts the server and 5 player clients

# Find a free port between 4000-4010
find_free_port() {
  for port in {4000..4010}; do
    if ! lsof -i :$port >/dev/null 2>&1; then
      echo $port
      return
    fi
  done
  echo "4000"  # fallback
}

PORT=$(find_free_port)
SERVER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/server" && pwd)"
CLIENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/player-client" && pwd)"

echo "🃏 Starting Claude Code Poker Tournament..."
echo ""

# Check if server dependencies are installed
if [ ! -d "$SERVER_DIR/node_modules" ]; then
  echo "📦 Installing server dependencies..."
  cd "$SERVER_DIR" && npm install
fi

# Check if client dependencies are installed
if [ ! -d "$CLIENT_DIR/node_modules" ]; then
  echo "📦 Installing client dependencies..."
  cd "$CLIENT_DIR" && npm install
fi

echo ""
echo "🎮 Starting game server on port $PORT..."
cd "$SERVER_DIR"

# Start server in background
PORT=$PORT node server.js > /tmp/poker-server.log 2>&1 &
SERVER_PID=$!
echo "✅ Server started (PID: $SERVER_PID)"
sleep 2

# Check if server started successfully
if ! kill -0 $SERVER_PID 2>/dev/null; then
  echo "❌ Server failed to start. Check /tmp/poker-server.log for errors"
  exit 1
fi

echo ""
echo "🌐 Open browser to: http://localhost:$PORT"
echo ""
echo "🤖 Starting 5 Claude Code players..."
echo ""

# Start 5 players in separate terminal windows based on OS
cd "$CLIENT_DIR"

PLAYER_NAMES=("Alice" "Bob" "Charlie" "Diana" "Eve")

for i in {0..4}; do
  PLAYER_NAME="${PLAYER_NAMES[$i]}"

  # Detect OS and open appropriate terminal
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    osascript -e "tell app \"Terminal\" to do script \"cd '$CLIENT_DIR' && SERVER_URL=http://localhost:$PORT node player-client.js '$PLAYER_NAME'\""
  elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux - try different terminal emulators
    if command -v gnome-terminal &> /dev/null; then
      gnome-terminal -- bash -c "cd '$CLIENT_DIR' && SERVER_URL=http://localhost:$PORT node player-client.js '$PLAYER_NAME'; exec bash"
    elif command -v xterm &> /dev/null; then
      xterm -hold -e "cd '$CLIENT_DIR' && SERVER_URL=http://localhost:$PORT node player-client.js '$PLAYER_NAME'" &
    elif command -v konsole &> /dev/null; then
      konsole --hold -e bash -c "cd '$CLIENT_DIR' && SERVER_URL=http://localhost:$PORT node player-client.js '$PLAYER_NAME'" &
    else
      echo "⚠️  Could not find terminal emulator. Please run manually:"
      echo "   cd '$CLIENT_DIR' && SERVER_URL=http://localhost:$PORT node player-client.js '$PLAYER_NAME'"
    fi
  else
    echo "⚠️  OS not supported for auto-launch. Please run manually:"
    echo "   cd '$CLIENT_DIR' && SERVER_URL=http://localhost:$PORT node player-client.js '$PLAYER_NAME'"
  fi

  echo "  ✅ Launched player: $PLAYER_NAME"
  sleep 0.5
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎰 Tournament Ready!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Server: http://localhost:$PORT"
echo "📝 Server logs: /tmp/poker-server.log"
echo "🎮 5 players launched in separate terminals"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Wait for server process
wait $SERVER_PID
