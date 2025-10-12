import { useState, useRef, useEffect } from 'react';

const AudioRecorder = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState('Disconnected');
  const [transcript, setTranscript] = useState([]);
  const [error, setError] = useState(null);

  const peerConnectionRef = useRef(null);
  const dataChannelRef = useRef(null);
  const audioElementRef = useRef(null);
  const messageIdCounterRef = useRef(0);
  const pendingUserTranscriptRef = useRef(false);
  const placeholderAddedRef = useRef(false);

  // Generate unique ID for transcript entries
  const generateId = () => {
    messageIdCounterRef.current += 1;
    return `msg-${Date.now()}-${messageIdCounterRef.current}`;
  };

  // Transcript management
  const addTranscript = (role, text) => {
    setTranscript((prev) => [...prev, { role, text, id: generateId() }]);
  };

  const insertUserTranscript = (text) => {
    setTranscript((prev) => {
      const placeholderIndex = prev.findIndex(
        (entry) => entry.role === 'user' && entry.text === '[Speaking...]'
      );

      if (placeholderIndex !== -1) {
        const newTranscript = [...prev];
        newTranscript[placeholderIndex] = {
          role: 'user',
          text,
          id: newTranscript[placeholderIndex].id,
        };
        return newTranscript;
      } else {
        return [...prev, { role: 'user', text, id: generateId() }];
      }
    });
  };

  const addOrUpdateTranscript = (role, text) => {
    setTranscript((prev) => {
      const lastEntry = prev[prev.length - 1];
      if (
        lastEntry &&
        lastEntry.role === role &&
        lastEntry.text !== '[Speaking...]'
      ) {
        return [
          ...prev.slice(0, -1),
          { ...lastEntry, text: lastEntry.text + text },
        ];
      }
      return [...prev, { role, text, id: generateId() }];
    });
  };

  // Handle messages from OpenAI
  const handleRealtimeEvent = (event) => {
    console.log('Realtime event:', event.type, event);

    // Log all function/tool related events for debugging
    if (event.type.includes('function') || event.type.includes('tool')) {
      console.log('🔧 TOOL EVENT:', event.type, JSON.stringify(event, null, 2));
    }

    switch (event.type) {
      case 'session.created':
        setStatus('Connected');
        console.log('Session created:', event.session);
        break;

      case 'session.updated':
        setStatus('Ready - Speak now!');
        console.log('Session updated:', event.session);
        break;

      case 'input_audio_buffer.speech_started':
        setStatus('Listening...');
        pendingUserTranscriptRef.current = true;
        placeholderAddedRef.current = false;
        break;

      case 'input_audio_buffer.speech_stopped':
        setStatus('Processing...');
        break;

      case 'conversation.item.input_audio_transcription.completed':
        insertUserTranscript(event.transcript);
        pendingUserTranscriptRef.current = false;
        placeholderAddedRef.current = false;
        break;

      case 'response.audio_transcript.delta':
        if (event.delta) {
          // Add placeholder only once if we're still waiting for user transcript
          if (pendingUserTranscriptRef.current && !placeholderAddedRef.current) {
            addTranscript('user', '[Speaking...]');
            placeholderAddedRef.current = true;
          }
          addOrUpdateTranscript('assistant', event.delta);
        }
        break;

      case 'response.audio_transcript.done':
        console.log('Audio transcript completed');
        break;

      case 'response.function_call_arguments.delta':
        console.log('Function call arguments delta:', event);
        break;

      case 'response.function_call_arguments.done':
        console.log('Function call completed:', event);
        addTranscript('system', `[Executing tool: ${event.name || 'unknown'}...]`);
        break;

      case 'response.output_item.added':
        console.log('Output item added:', event);
        if (event.item?.type === 'function_call') {
          addTranscript('system', `[Calling tool: ${event.item.name}]`);
        }
        break;

      case 'response.output_item.done':
        console.log('Output item done:', event);
        if (event.item?.type === 'function_call') {
          addTranscript('system', `[Tool ${event.item.name} completed]`);
        }
        // After function call completes, explicitly continue the response
        if (event.item?.type === 'function_call' && dataChannelRef.current?.readyState === 'open') {
          console.log('Sending response.create after function call');
          const responseCreate = {
            type: 'response.create',
          };
          dataChannelRef.current.send(JSON.stringify(responseCreate));
        }
        break;

      case 'conversation.item.created':
        console.log('Conversation item created:', event);
        if (event.item?.type === 'function_call_output') {
          addTranscript('system', `[Tool result received]`);
          // Trigger response after receiving function output
          if (dataChannelRef.current?.readyState === 'open') {
            console.log('Sending response.create after function output');
            const responseCreate = {
              type: 'response.create',
            };
            dataChannelRef.current.send(JSON.stringify(responseCreate));
          }
        }
        break;

      case 'response.mcp_call.in_progress':
        console.log('MCP call in progress:', event);
        addTranscript('system', `[Executing MCP tool...]`);
        break;

      case 'response.mcp_call.completed':
        console.log('MCP call completed:', event);
        addTranscript('system', `[MCP tool completed]`);
        // After MCP call completes, trigger a new response to process the results
        if (dataChannelRef.current?.readyState === 'open') {
          console.log('Sending response.create after MCP call completion');
          const responseCreate = {
            type: 'response.create',
          };
          dataChannelRef.current.send(JSON.stringify(responseCreate));
        }
        break;

      case 'response.done':
        console.log('Response done:', event);
        setStatus('Ready - Speak now!');
        break;

      case 'error':
        console.error('OpenAI error:', event);
        setError(event.error?.message || 'Unknown error');
        setStatus('Error');
        break;

      default:
        // Log other events for debugging
        if (event.type.startsWith('error')) {
          console.error('Error event:', event);
        }
        break;
    }
  };

  // Connect using WebRTC
  const connect = async () => {
    try {
      setStatus('Connecting...');
      setError(null);

      // Get ephemeral token from our server
      const tokenResponse = await fetch('http://localhost:3001/session');
      if (!tokenResponse.ok) {
        throw new Error('Failed to get session token');
      }

      const { client_secret } = await tokenResponse.json();
      console.log('Got ephemeral token');

      // Create peer connection
      const pc = new RTCPeerConnection();
      peerConnectionRef.current = pc;

      // Set up audio element for playback
      const audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      audioElementRef.current = audioEl;
      pc.ontrack = (e) => {
        console.log('Received remote track');
        audioEl.srcObject = e.streams[0];
      };

      // Add local audio track from microphone
      const ms = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      pc.addTrack(ms.getTracks()[0]);

      // Set up data channel for sending/receiving events
      const dc = pc.createDataChannel('oai-events');
      dataChannelRef.current = dc;

      dc.addEventListener('open', () => {
        console.log('Data channel opened');
        setIsConnected(true);

        // Configure the session
        const sessionUpdate = {
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: 'You are a helpful AI assistant. Respond naturally to user queries.',
            voice: 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1',
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500,
            },
          },
        };

        dc.send(JSON.stringify(sessionUpdate));
      });

      dc.addEventListener('message', (e) => {
        try {
          const event = JSON.parse(e.data);
          handleRealtimeEvent(event);
        } catch (err) {
          console.error('Error parsing event:', err);
        }
      });

      dc.addEventListener('close', () => {
        console.log('Data channel closed');
        setIsConnected(false);
        setStatus('Disconnected');
      });

      dc.addEventListener('error', (e) => {
        console.error('Data channel error:', e);
        setError('Data channel error');
      });

      // Create and set local description
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send offer to OpenAI and get answer
      const baseUrl = 'https://api.openai.com/v1/realtime';
      const model = 'gpt-4o-realtime-preview-2024-12-17';
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${client_secret}`,
          'Content-Type': 'application/sdp',
        },
      });

      if (!sdpResponse.ok) {
        throw new Error(`Failed to connect: ${sdpResponse.status}`);
      }

      const answerSdp = await sdpResponse.text();
      const answer = {
        type: 'answer',
        sdp: answerSdp,
      };

      await pc.setRemoteDescription(answer);
      console.log('WebRTC connection established');

    } catch (err) {
      console.error('Connection error:', err);
      setError(err.message || 'Connection failed');
      setStatus('Error');
      setIsConnected(false);
    }
  };

  // Disconnect
  const disconnect = () => {
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (audioElementRef.current) {
      audioElementRef.current.srcObject = null;
      audioElementRef.current = null;
    }

    setIsConnected(false);
    setStatus('Disconnected');
    console.log('Disconnected');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return (
    <div className="audio-recorder">
      <div className="header">
        <h1>Speech-to-Speech AI</h1>
        <div className={`status ${status.toLowerCase().replace(/\s+/g, '-')}`}>
          Status: {status}
        </div>
      </div>

      {error && (
        <div className="error-message">
          Error: {error}
        </div>
      )}

      <div className="controls">
        {!isConnected ? (
          <button onClick={connect} className="btn btn-connect">
            <span className="btn-icon">▶</span>
            <span className="btn-text">Start</span>
          </button>
        ) : (
          <button onClick={disconnect} className="btn btn-disconnect">
            <span className="btn-icon">⏹</span>
            <span className="btn-text">Disconnect</span>
          </button>
        )}
      </div>

      <div className="transcript">
        <h2>Transcript</h2>
        <div className="transcript-content">
          {transcript.length === 0 ? (
            <p className="placeholder">Conversation will appear here...</p>
          ) : (
            transcript.map((entry) => (
              <div key={entry.id} className={`transcript-entry ${entry.role}`}>
                <strong>{entry.role === 'user' ? 'You' : 'AI'}:</strong>{' '}
                {entry.text}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AudioRecorder;
