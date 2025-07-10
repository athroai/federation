#!/bin/bash

echo "🔄 Restarting development servers..."

# Kill processes on conflicting ports
echo "🚨 Killing processes on conflicting ports..."

# Kill dashboard port (5210)
if lsof -ti:5210 >/dev/null 2>&1; then
    echo "   Killing process on port 5210..."
    lsof -ti:5210 | xargs kill -9
fi

# Kill workspace port (5175)  
if lsof -ti:5175 >/dev/null 2>&1; then
    echo "   Killing process on port 5175..."
    lsof -ti:5175 | xargs kill -9
fi

# Kill other common dev ports
for port in 5173 5174 5176 5177; do
    if lsof -ti:$port >/dev/null 2>&1; then
        echo "   Killing process on port $port..."
        lsof -ti:$port | xargs kill -9
    fi
done

# Wait a moment for processes to die
sleep 2

echo "✅ Ports cleared!"

# Restart development server
echo "🚀 Starting development server..."
npm run dev 