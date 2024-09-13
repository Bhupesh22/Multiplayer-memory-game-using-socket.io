# Build Instructions
## Backend Setup:

## Twilio Account: Sign up for a Twilio account (no credit card required) and get $15 in free credits.

## API Keys: Create an API key and secret under "Settings" > "API Keys."

## Environment Variables: Create a .env file in the townService directory and add:

TWILIO_ACCOUNT_SID: Visible on your Twilio dashboard.
TWILIO_API_KEY_SID: The SID of your API key.
TWILIO_API_KEY_SECRET: Secret for the API key.
TWILIO_API_AUTH_TOKEN: Visible on your Twilio dashboard.

# Run Backend:

Install dependencies: npm install (only the first time).
Start server: ```npx ts-node server.ts```.

#Frontend Setup:
Environment Variables: Create a .env file in the frontend directory with:

NEXT_PUBLIC_TOWNS_SERVICE_URL=http://localhost:8081
Optional: NEXT_PUBLIC_TOWN_DEV_MODE=true for debugging without Twilio.
Run Frontend:

Install dependencies: npm install (only the first time).
Start server:``` npm start```.

# Features:

Memory Game: Two modes available (competitive and casual).
Leaderboard: Competitive scores can be submitted.
Administrator Panel: Control leaderboard visibility, game settings, and difficulty levels.
Technical Overview:
Frontend: Built using React with components for game control and rendering.
Backend: Implemented with MemoryGame.ts, MemoryGameGameArea.ts, and default settings classes that extend existing game logic.
