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

# Start server with memory limit (256MB for server)
cd "$BASE_DIR/server"
PORT=$PORT node --max-old-space-size=256 server.js > "$LOG_DIR/server.log" 2>&1 &
SERVER_PID=$!
echo "✅ Server started (PID: $SERVER_PID, max 256MB RAM) - Logs: $LOG_DIR/server.log"
sleep 2

# Check if server is running
if ! kill -0 $SERVER_PID 2>/dev/null; then
  echo "❌ Server failed to start. Check $LOG_DIR/server.log"
  exit 1
fi

# Start player manager (single process for all 5 players)
cd "$BASE_DIR/player-client"
SERVER_URL=http://localhost:$PORT node --max-old-space-size=256 --expose-gc player-manager.mjs > "$LOG_DIR/players.log" 2>&1 &
PLAYERS_PID=$!
echo "✅ Player manager started (PID: $PLAYERS_PID, max 256MB RAM, 5 players, GC enabled)"
echo "   Logs: $LOG_DIR/players.log"
sleep 2

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎰 TOURNAMENT READY!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Open browser: http://localhost:$PORT"
echo "📁 All logs in: $LOG_DIR/"
echo ""
echo "📊 Watch player logs in real-time:"
echo "   tail -f $LOG_DIR/players.log"
echo ""
echo "🛑 To stop all:"
echo "   kill $SERVER_PID $PLAYERS_PID"
echo ""
echo "Press Ctrl+C when done"
echo ""

# Keep script running
wait $SERVER_PID
