#!/bin/bash
# Test if claude CLI works with poker prompts

echo "Testing claude CLI..."
echo ""

cat << 'EOF' | claude
You are playing poker. Respond with ONLY this exact JSON, nothing else:
{"action": "call", "commentary": "Testing the waters"}
EOF
