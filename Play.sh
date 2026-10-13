#!/bin/sh
# Pressure Point launcher - double-click to play with full graphics (lighting, bloom, fog).
# Starts a tiny local server (still 100% offline) and opens the game in your browser.
cd "$(dirname "$0")"

if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3 is required but was not found."
  read -r -p "Press Enter to close." _
  exit 1
fi

PORT=8000
python3 -m http.server "$PORT" >/dev/null 2>&1 &
SERVER_PID=$!
sleep 1
(xdg-open "http://localhost:$PORT/" 2>/dev/null || sensible-browser "http://localhost:$PORT/" 2>/dev/null) &

echo "Pressure Point is running at http://localhost:$PORT/"
echo "Play in the browser window that just opened."
echo "Close this window when you're done to stop the server."
wait $SERVER_PID
