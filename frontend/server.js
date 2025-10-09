import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Endpoint to get ephemeral token for WebRTC
app.get('/session', async (_req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: 'OpenAI API key not configured'
      });
    }

    // Request ephemeral token from OpenAI
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2024-12-17',
        voice: 'alloy',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      return res.status(response.status).json({
        error: 'Failed to create session'
      });
    }

    const data = await response.json();

    // Return the ephemeral token to the client
    res.json({
      client_secret: data.client_secret.value,
    });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Session endpoint: http://localhost:${PORT}/session`);
});
