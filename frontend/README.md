# Speech-to-Speech AI Web App

A real-time speech-to-speech web application that uses OpenAI's Realtime API to enable natural voice conversations with an AI assistant.

## Features

- Real-time audio recording and streaming
- Speech-to-speech interaction with OpenAI's GPT-4o Realtime model
- Live transcription of both user and AI responses
- WebSocket-based communication for low latency
- Modern, responsive UI with status indicators
- Secure backend relay to protect API keys

## Architecture

- **Frontend**: React + Vite with Web Audio API for audio capture and playback
- **Backend**: Express.js WebSocket server that relays between client and OpenAI
- **Audio Format**: PCM16 at 24kHz sample rate
- **AI Model**: gpt-4o-realtime-preview-2024-10-01

## Prerequisites

- Node.js (v18 or higher recommended)
- OpenAI API key with access to Realtime API
- Modern web browser with microphone support

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   - Edit `.env` file and add your OpenAI API key:
   ```
   OPENAI_API_KEY=your_actual_api_key_here
   PORT=3001
   ```

3. **Get your OpenAI API key**:
   - Go to https://platform.openai.com/api-keys
   - Create a new API key
   - Make sure you have access to the Realtime API

## Running the Application

1. **Start the backend server**:
   ```bash
   npm run server
   ```
   Server will run on `http://localhost:3001`

2. **Start the frontend** (in a new terminal):
   ```bash
   npm run dev
   ```
   Frontend will run on `http://localhost:5173` (or another port if 5173 is busy)

3. **Open your browser** and navigate to the frontend URL

## Usage

1. Click **Connect** to establish connection with the backend and OpenAI
2. Allow microphone access when prompted by your browser
3. Click **Start Recording** to begin speaking
4. Speak naturally - the AI will detect when you've finished speaking
5. The AI will respond with both voice and text
6. Click **Stop Recording** when you want to pause
7. Click **Disconnect** to end the session

## How It Works

### Audio Flow
1. Microphone captures audio → Web Audio API
2. Audio converted to PCM16 format
3. Sent via WebSocket to Express backend
4. Backend relays to OpenAI Realtime API
5. OpenAI processes and responds with audio
6. Audio streamed back through backend to frontend
7. Frontend plays audio and displays transcript

### Security
- API keys are stored server-side in `.env` file
- Client never has direct access to OpenAI API key
- Express server acts as secure relay

## Project Structure

```
firminia-frontend/
├── server.js                 # Express WebSocket server
├── src/
│   ├── App.jsx              # Main app component
│   ├── App.css              # Styles
│   ├── main.jsx             # React entry point
│   └── components/
│       └── AudioRecorder.jsx # Audio recording component
├── .env                      # Environment variables (not in git)
├── .env.example             # Environment template
└── package.json             # Dependencies and scripts
```

## Troubleshooting

### "Microphone access denied"
- Check browser permissions and allow microphone access
- On macOS, check System Preferences → Security & Privacy → Microphone

### "Connection error"
- Make sure backend server is running on port 3001
- Check that `.env` file has valid OpenAI API key
- Verify firewall isn't blocking WebSocket connections

### "OpenAI connection error"
- Verify your API key is correct
- Ensure you have access to the Realtime API
- Check OpenAI API status: https://status.openai.com

### No audio playback
- Check browser console for errors
- Verify audio output device is working
- Try refreshing the page

## API Costs

OpenAI's Realtime API charges based on:
- Audio input tokens
- Audio output tokens
- Text tokens

Monitor your usage at: https://platform.openai.com/usage

## Development

- Frontend hot-reload is enabled via Vite
- Backend requires restart after changes
- Check browser console and terminal for debug logs

## Technologies Used

- **React 19** - UI framework
- **Vite** - Build tool and dev server
- **Express.js 5** - Backend server
- **ws** - WebSocket library
- **Web Audio API** - Audio capture and playback
- **OpenAI Realtime API** - Speech-to-speech AI

## License

This project is for educational and development purposes.
