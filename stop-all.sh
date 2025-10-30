#!/bin/bash

echo "🛑 Stopping Claude Code Poker Tournament..."
echo ""

# Kill player manager
pkill -f 'player-manager.mjs' 2>/dev/null && echo "✅ Killed player manager"
pkill -f 'player-client-sdk.mjs' 2>/dev/null
pkill -f 'player-client.js' 2>/dev/null

# Kill server
pkill -f 'server/server.js' 2>/dev/null && echo "✅ Killed server"

# Clean up logs
rm -rf /tmp/poker-logs 2>/dev/null && echo "✅ Cleaned up logs"

echo ""
echo "✅ All stopped!"
