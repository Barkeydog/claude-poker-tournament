#!/bin/bash

echo "🛑 Stopping Claude Code Poker Tournament..."
echo ""

# Kill all player clients
pkill -f 'player-client.js' 2>/dev/null && echo "✅ Killed all player clients"

# Kill server
pkill -f 'server/server.js' 2>/dev/null && echo "✅ Killed server"

# Clean up logs
rm -rf /tmp/poker-logs 2>/dev/null && echo "✅ Cleaned up logs"

echo ""
echo "✅ All stopped!"
