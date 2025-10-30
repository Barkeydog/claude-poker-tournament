#!/bin/bash

# Simple launcher that runs everything in background with logs

# Find a free port
find_free_port() {
  for port in {4000..4010}; do
    if ! lsof -i :$port >/dev/null 2>&1; then
      echo $port
      return
    fi
  done
  echo "4000"
}

PORT=$(find_free_port)
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="/tmp/poker-logs"

mkdir -p "$LOG_DIR"

echo "🃏 Starting Claude Code Poker Tournament on port $PORT"
echo ""

# Start server
cd "$BASE_DIR/server"
PORT=$PORT node server.js > "$LOG_DIR/server.log" 2>&1 &
SERVER_PID=$!
echo "✅ Server started (PID: $SERVER_PID) - Logs: $LOG_DIR/server.log"
sleep 2

# Check if server is running
if ! kill -0 $SERVER_PID 2>/dev/null; then
  echo "❌ Server failed to start. Check $LOG_DIR/server.log"
  exit 1
fi

# Start 5 players
cd "$BASE_DIR/player-client"
PLAYER_NAMES=("Alice" "Bob" "Charlie" "Diana" "Eve")

for name in "${PLAYER_NAMES[@]}"; do
  SERVER_URL=http://localhost:$PORT node player-client.js "$name" > "$LOG_DIR/$name.log" 2>&1 &
  PLAYER_PID=$!
  echo "✅ $name started (PID: $PLAYER_PID) - Logs: $LOG_DIR/$name.log"
  sleep 0.5
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎰 TOURNAMENT READY!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Open browser: http://localhost:$PORT"
echo "📁 All logs in: $LOG_DIR/"
echo ""
echo "📊 Watch player logs in real-time:"
echo "   tail -f $LOG_DIR/Alice.log"
echo ""
echo "🛑 To stop all:"
echo "   kill $SERVER_PID"
echo "   pkill -f 'player-client.js'"
echo ""
echo "Press Ctrl+C when done"
echo ""

# Keep script running
wait $SERVER_PID
