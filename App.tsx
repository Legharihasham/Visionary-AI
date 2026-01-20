import { SpeedInsights } from "@vercel/speed-insights/next";
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { ConnectionStatus, TranscriptionLine } from './types';
import { 
  decode, 
  encode, 
  decodeAudioData, 
  createAudioBlob, 
  blobToBase64 
} from './utils/audioUtils';

const SAMPLE_RATE_IN = 16000;
const SAMPLE_RATE_OUT = 24000;
const FRAME_RATE = 1; // 1 frame per second for UI analysis
const JPEG_QUALITY = 0.6;

const App: React.FC = () => {
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [transcriptions, setTranscriptions] = useState<TranscriptionLine[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Refs for audio/video stream handling
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const frameIntervalRef = useRef<number | null>(null);

  // Transcription buffer
  const currentInputTransRef = useRef<string>('');
  const currentOutputTransRef = useRef<string>('');

  const stopAll = useCallback(() => {
    if (frameIntervalRef.current) window.clearInterval(frameIntervalRef.current);
    if (sessionRef.current) sessionRef.current.close();
    
    activeSourcesRef.current.forEach(source => source.stop());
    activeSourcesRef.current.clear();

    if (screenVideoRef.current?.srcObject) {
      (screenVideoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }

    setStatus(ConnectionStatus.DISCONNECTED);
  }, []);

  const startSession = async () => {
    try {
      setStatus(ConnectionStatus.CONNECTING);
      setErrorMessage(null);

      // 1. Get Screen Stream
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'monitor' },
        audio: false
      });
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = screenStream;
      }

      // 2. Setup Audio Contexts
      inputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: SAMPLE_RATE_IN });
      outputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: SAMPLE_RATE_OUT });

      // 3. Connect to Gemini Live
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction: `You are a real-time visual assistant. 
          You can see the user's screen through captured frames. 
          You hear the user's voice. 
          Analyze the UI, identify buttons, forms, layouts, and errors. 
          Explain what you see and provide verbal step-by-step guidance to help the user navigate or fix issues. 
          Be natural, concise, and helpful.`,
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            console.log('Gemini Live Connection Opened');
            setStatus(ConnectionStatus.CONNECTED);
            
            // Start streaming microphone
            navigator.mediaDevices.getUserMedia({ audio: true }).then(micStream => {
              const source = inputAudioCtxRef.current!.createMediaStreamSource(micStream);
              const processor = inputAudioCtxRef.current!.createScriptProcessor(4096, 1, 1);
              
              processor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmBlob = createAudioBlob(inputData);
                sessionPromise.then(session => {
                  session.sendRealtimeInput({ media: pcmBlob });
                });
              };

              source.connect(processor);
              processor.connect(inputAudioCtxRef.current!.destination);
            });

            // Start streaming screen frames
            frameIntervalRef.current = window.setInterval(async () => {
              if (screenVideoRef.current && canvasRef.current) {
                const video = screenVideoRef.current;
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');
                if (ctx && video.readyState >= 2) {
                  canvas.width = video.videoWidth;
                  canvas.height = video.videoHeight;
                  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                  
                  canvas.toBlob(async (blob) => {
                    if (blob) {
                      const base64Data = await blobToBase64(blob);
                      sessionPromise.then(session => {
                        session.sendRealtimeInput({
                          media: { data: base64Data, mimeType: 'image/jpeg' }
                        });
                      });
                    }
                  }, 'image/jpeg', JPEG_QUALITY);
                }
              }
            }, 1000 / FRAME_RATE);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Audio Transcription
            if (message.serverContent?.outputTranscription) {
              currentOutputTransRef.current += message.serverContent.outputTranscription.text;
            } else if (message.serverContent?.inputTranscription) {
              currentInputTransRef.current += message.serverContent.inputTranscription.text;
            }

            if (message.serverContent?.turnComplete) {
              const input = currentInputTransRef.current;
              const output = currentOutputTransRef.current;
              if (input || output) {
                setTranscriptions(prev => [
                  ...prev,
                  ...(input ? [{ type: 'user' as const, text: input, timestamp: Date.now() }] : []),
                  ...(output ? [{ type: 'ai' as const, text: output, timestamp: Date.now() }] : [])
                ].slice(-20)); // Keep last 20 messages
              }
              currentInputTransRef.current = '';
              currentOutputTransRef.current = '';
            }

            // Handle Audio Data
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputAudioCtxRef.current) {
              const ctx = outputAudioCtxRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              
              const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, SAMPLE_RATE_OUT, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              
              source.onended = () => {
                activeSourcesRef.current.delete(source);
              };

              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              activeSourcesRef.current.add(source);
            }

            // Handle Interruption
            if (message.serverContent?.interrupted) {
              activeSourcesRef.current.forEach(s => s.stop());
              activeSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => {
            console.error('Gemini error:', e);
            setErrorMessage('Connection encountered an error. Please try again.');
            stopAll();
          },
          onclose: () => {
            console.log('Gemini connection closed');
            stopAll();
          }
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to initialize session. Ensure screen capture and microphone access are granted.');
      setStatus(ConnectionStatus.ERROR);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
              Visionary AI
            </h1>
            <p className="text-sm text-gray-400">Real-time Multimodal Screen Assistant</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {status === ConnectionStatus.DISCONNECTED && (
            <button
              onClick={startSession}
              className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-full font-semibold transition-all shadow-lg active:scale-95 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Start Session
            </button>
          )}
          {status === ConnectionStatus.CONNECTED && (
            <button
              onClick={stopAll}
              className="bg-red-600 hover:bg-red-500 text-white px-8 py-3 rounded-full font-semibold transition-all shadow-lg active:scale-95 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Stop Session
            </button>
          )}
          {status === ConnectionStatus.CONNECTING && (
            <div className="flex items-center gap-2 text-blue-400">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
              <span>Connecting...</span>
            </div>
          )}
        </div>
      </header>

      {errorMessage && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>{errorMessage}</p>
        </div>
      )}

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
        {/* Left: Screen View */}
        <div className="lg:col-span-2 bg-gray-900 rounded-2xl border border-gray-800 flex flex-col overflow-hidden relative group">
          <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
            <h2 className="font-semibold text-gray-300 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${status === ConnectionStatus.CONNECTED ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`}></span>
              Live Screen Input
            </h2>
            <div className="text-xs text-gray-500 uppercase tracking-widest font-bold">1 FPS Analysis</div>
          </div>
          <div className="flex-1 bg-black flex items-center justify-center relative">
            <video 
              ref={screenVideoRef} 
              autoPlay 
              muted 
              className={`w-full h-full object-contain ${status !== ConnectionStatus.CONNECTED && 'hidden'}`}
            />
            {status !== ConnectionStatus.CONNECTED && (
              <div className="flex flex-col items-center gap-4 text-gray-600">
                <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p className="text-lg">Waiting for screen capture...</p>
              </div>
            )}
            
            {/* Visual indicator for voice activity */}
            {status === ConnectionStatus.CONNECTED && (
              <div className="absolute bottom-6 right-6 z-10">
                <div className="relative flex items-center justify-center w-16 h-16">
                  <div className="pulse-ring"></div>
                  <div className="bg-blue-600 rounded-full w-12 h-12 flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* Hidden Canvas for capture */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Right: Interaction Panel */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-800 bg-gray-900/50">
            <h2 className="font-semibold text-gray-300">Live Transcript</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {transcriptions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 opacity-30">
                <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <p>Start a session and speak to begin the analysis.</p>
              </div>
            ) : (
              transcriptions.map((t, idx) => (
                <div 
                  key={idx} 
                  className={`flex flex-col ${t.type === 'user' ? 'items-end' : 'items-start'} animate-in fade-in zoom-in-95 duration-300`}
                >
                  <div 
                    className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm ${
                      t.type === 'user' 
                        ? 'bg-blue-600 text-white rounded-br-none' 
                        : 'bg-gray-800 text-gray-200 rounded-bl-none'
                    }`}
                  >
                    {t.text}
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1 uppercase">
                    {t.type === 'user' ? 'You' : 'Gemini'} • {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
          <div className="p-4 bg-gray-900/80 border-t border-gray-800">
             <div className="flex items-center gap-3 text-sm text-gray-400">
                <div className={`w-2 h-2 rounded-full ${status === ConnectionStatus.CONNECTED ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span>{status === ConnectionStatus.CONNECTED ? 'Listening to voice & screen...' : 'System offline'}</span>
             </div>
          </div>
        </div>
      </main>

      <footer className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-900/40 p-4 rounded-xl border border-gray-800/50 flex items-center gap-4">
          <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="text-xs">
            <p className="font-bold text-gray-300 uppercase tracking-wide">Vision Intelligence</p>
            <p className="text-gray-500">Gemini 2.5 Multimodal Reasoning</p>
          </div>
        </div>
        <div className="bg-gray-900/40 p-4 rounded-xl border border-gray-800/50 flex items-center gap-4">
          <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          </div>
          <div className="text-xs">
            <p className="font-bold text-gray-300 uppercase tracking-wide">Neural Voice Output</p>
            <p className="text-gray-500">Low-latency Real-time Speech</p>
          </div>
        </div>
        <div className="bg-gray-900/40 p-4 rounded-xl border border-gray-800/50 flex items-center gap-4">
          <div className="p-2 bg-green-500/10 rounded-lg text-green-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div className="text-xs">
            <p className="font-bold text-gray-300 uppercase tracking-wide">Self-contained UI</p>
            <p className="text-gray-500">Zero-Backend Architecture</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
