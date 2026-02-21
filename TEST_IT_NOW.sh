#!/bin/bash
echo "================================================"
echo "ZENITH AI FINANCE - FINAL TEST"
echo "================================================"
echo ""

# Kill any running servers
pkill -f vite 2>/dev/null
sleep 1

# Clean everything
echo "🧹 Cleaning caches..."
rm -rf dist .vite node_modules/.vite

# Build
echo "🔨 Building..."
npm run build > /tmp/build.log 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Build SUCCESS"
else
    echo "❌ Build FAILED - check /tmp/build.log"
    exit 1
fi

# Start dev server
echo "🚀 Starting dev server..."
npm run dev > /tmp/vite.log 2>&1 &
DEV_PID=$!
sleep 5

# Test server
echo "🧪 Testing http://localhost:5173..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Server responding: $HTTP_CODE"
else
    echo "❌ Server error: $HTTP_CODE"
    kill $DEV_PID 2>/dev/null
    exit 1
fi

echo ""
echo "================================================"
echo "✅ ALL TESTS PASSED - APP IS WORKING!"
echo "================================================"
echo ""
echo "Open your browser to: http://localhost:5173"
echo ""
echo "Expected console output:"
echo "  [SDK] ✓ LLM backend ready"
echo "  [SDK] ✓ Voice backend ready"
echo "  [App] All systems ready"
echo ""
echo "Dev server PID: $DEV_PID"
echo "To stop: kill $DEV_PID"
echo ""
